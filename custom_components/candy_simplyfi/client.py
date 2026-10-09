"""Asynchronous local API client for Candy and Hoover Simply-Fi appliances."""

from __future__ import annotations

import asyncio
import itertools
import json
import logging
import re
from typing import Any, Dict, Optional, Tuple

try:
    import aiohttp
except ImportError:
    aiohttp = None  # type: ignore

_LOGGER = logging.getLogger(__name__)

KEY_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
_MAX_COMBOS = 200000

STATUS_ROOTS = {
    "statusLavatrice": "washer",
    "statusWD": "washer_dryer",
    "statusTD": "tumbledryer",
    "statusDWash": "dishwasher",
    "statusLavastoviglie": "dishwasher",
    "StatoDWash": "dishwasher",
    "statusDishwasher": "dishwasher",
    "statusForno": "oven",
    "statusHob": "hob",
    "statusRX": "fridge",
    "statusWCool": "wine_cooler",
}

# Per-host lock and rate limiting to prevent crashing appliance microcontrollers
_HOST_LOCKS: dict[str, asyncio.Lock] = {}
_HOST_LAST_REQ: dict[str, float] = {}
_LOCKS_GUARD = asyncio.Lock()


async def _get_host_lock(host: str) -> asyncio.Lock:
    """Get or create an asyncio Lock for a specific appliance IP."""
    async with _LOCKS_GUARD:
        if host not in _HOST_LOCKS:
            _HOST_LOCKS[host] = asyncio.Lock()
        return _HOST_LOCKS[host]


class CandyClientError(Exception):
    """Base exception for Candy client errors."""


class CandyAuthError(CandyClientError):
    """Exception for encryption key/authentication issues."""


class CandyConnectionError(CandyClientError):
    """Exception for network connection failures."""


def xor_bytes(data: bytes, key: bytes) -> bytes:
    """XOR bytes with key."""
    if not key:
        return data
    key_len = len(key)
    return bytes(b ^ key[i % key_len] for i, b in enumerate(data))


def encrypt_payload(plaintext: str, key: str) -> str:
    """Repeating-key XOR -> uppercase hex string."""
    return xor_bytes(plaintext.encode("utf-8"), key.encode("utf-8")).hex().upper()


def decrypt_hex_response(hex_data: str, key: str) -> str:
    """Convert hex response to bytes and XOR decrypt to string."""
    try:
        clean_hex = hex_data.strip().replace(" ", "").replace("\r", "").replace("\n", "")
        cipher_bytes = bytes.fromhex(clean_hex)
        decrypted_bytes = xor_bytes(cipher_bytes, key.encode("utf-8"))
        return decrypted_bytes.decode("utf-8", errors="replace")
    except Exception as err:
        raise CandyClientError(f"Failed to decrypt hex payload: {err}") from err


def _get_key_prefixes() -> list[bytes]:
    """Generate known-plaintext prefixes for key recovery, accounting for CRLF and tab formatting."""
    gaps = ("", "\r\n\t", "\n\t", "\r\n  ", "\n  ", " ", "\r\n\t\t", "\n\t\t")
    out = []
    for root in STATUS_ROOTS:
        for after_brace in gaps:
            for after_colon in ("", " "):
                for after_inner in gaps:
                    out.append(
                        (
                            "{"
                            + after_brace
                            + '"'
                            + root
                            + '":'
                            + after_colon
                            + "{"
                            + after_inner
                            + '"'
                        ).encode()
                    )
    return sorted(set(out), key=len, reverse=True)


def recover_xor_key(cipher_hex: str, key_lengths: tuple[int, ...] = (16, 8, 32)) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Recover appliance key from encrypted reply using whitespace-aware known-plaintext attack.

    Returns (recovered_key, parsed_json_dict) on success, or None.
    """
    try:
        clean_hex = cipher_hex.strip().replace(" ", "").replace("\r", "").replace("\n", "")
        ct = bytes.fromhex(clean_hex)
    except ValueError:
        return None

    prefixes = _get_key_prefixes()

    for klen in key_lengths:
        if len(ct) < klen:
            continue
        for prefix in prefixes:
            known = min(len(prefix), klen)
            key = [ct[i] ^ prefix[i] for i in range(known)]
            if not all(chr(c) in KEY_ALPHABET for c in key):
                continue

            # Pin remaining unknown key bytes using printable ASCII criteria
            options, combos = [], 1
            for i in range(known, klen):
                positions = range(i, len(ct), klen)
                ok = [
                    ord(c)
                    for c in KEY_ALPHABET
                    if all(32 <= (ct[j] ^ ord(c)) < 127 for j in positions)
                ]
                if not ok:
                    options = None
                    break
                options.append(ok)
                combos *= len(ok)

            if options is None or combos > _MAX_COMBOS:
                continue

            for tail in itertools.product(*options) if options else [()]:
                cand = bytes(key + list(tail))
                try:
                    decrypted_text = xor_bytes(ct, cand).decode("utf-8")
                except UnicodeDecodeError:
                    continue

                if not decrypted_text.startswith(prefix.decode("utf-8", errors="ignore")[:known]):
                    continue

                # Strip trailing commas common in Candy firmware JSON
                cleaned_json = re.sub(r",\s*([}\]])", r"\1", decrypted_text)
                try:
                    data = json.loads(cleaned_json)
                    if isinstance(data, dict):
                        recovered_key_str = cand.decode("latin1")
                        _LOGGER.info(
                            "Recovered Candy encryption key '%s' matching prefix %s",
                            recovered_key_str,
                            prefix[:16],
                        )
                        return recovered_key_str, data
                except (ValueError, json.JSONDecodeError):
                    continue

    return None


class CandyLocalClient:
    """Async client communicating directly with the Candy appliance on port 80."""

    def __init__(
        self,
        host: str,
        key: Optional[str] = None,
        use_encryption: Optional[bool] = None,
        session: Optional[aiohttp.ClientSession] = None,
        timeout: int = 8,
    ) -> None:
        """Initialize the client."""
        self.host = host.strip()
        self.key = key.strip() if key else None
        self.use_encryption = use_encryption
        self._session = session
        self._internal_session = False
        self._timeout = aiohttp.ClientTimeout(total=timeout) if aiohttp else timeout
        self.detected_appliance_type: Optional[str] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Return the active ClientSession or create a managed one."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self._timeout)
            self._internal_session = True
        return self._session

    async def close(self) -> None:
        """Close the internal session if created by this instance."""
        if self._internal_session and self._session and not self._session.closed:
            await self._session.close()

    async def _fetch_url(self, url: str) -> str:
        """Fetch URL with strict per-host serialization and rate limiting to prevent appliance lockup."""
        lock = await _get_host_lock(self.host)
        session = await self._get_session()
        async with lock:
            loop = asyncio.get_running_loop()
            now = loop.time()
            last_time = _HOST_LAST_REQ.get(self.host, 0.0)
            elapsed = now - last_time
            if elapsed < 1.5:
                await asyncio.sleep(1.5 - elapsed)
            _HOST_LAST_REQ[self.host] = loop.time()
            async with session.get(url, headers={"Connection": "close"}) as resp:
                text = await resp.text()
                if resp.status != 200:
                    raise CandyConnectionError(f"HTTP {resp.status} from {url}: {text}")
                return text.strip()

    async def async_read_status(self) -> Dict[str, Any]:
        """Read and parse current appliance state, auto-recovering key if needed."""
        # Try both unencrypted and encrypted modes
        modes_to_try = []
        if self.use_encryption is False:
            modes_to_try = [0, 1]
        elif self.use_encryption is True or self.key:
            modes_to_try = [1, 0]
        else:
            # Auto mode: try 0 first, then 1
            modes_to_try = [0, 1]

        last_err: Optional[Exception] = None

        for enc in modes_to_try:
            url = f"http://{self.host}/http-read.json?encrypted={enc}"
            try:
                raw_text = await self._fetch_url(url)
            except Exception as exc:
                last_err = exc
                continue

            # Check if plaintext JSON
            if raw_text.startswith("{") and raw_text.endswith("}"):
                cleaned = re.sub(r",\s*([}\]])", r"\1", raw_text)
                try:
                    data = json.loads(cleaned)
                    # Verify that response is valid telemetry, not an error like {"response":"BAD REQUEST"}
                    if isinstance(data, dict) and not any(k in data for k in ("response", "error", "Error")) and any(
                        k in data for k in STATUS_ROOTS
                    ):
                        self.use_encryption = False
                        self._detect_type_from_data(data)
                        return data
                except json.JSONDecodeError:
                    pass

            # If hex response
            if re.match(r"^[0-9A-Fa-f]+$", raw_text):
                # 0. Check if hex response is unencrypted hex-encoded ASCII (Candy Brava / hOn transition)
                try:
                    clean_hex = raw_text.strip().replace(" ", "").replace("\r", "").replace("\n", "")
                    raw_bytes = bytes.fromhex(clean_hex)
                    decoded_ascii = raw_bytes.decode("utf-8", errors="ignore").strip().strip("\x00").strip()
                    if (decoded_ascii.startswith("{") and decoded_ascii.endswith("}")) or (
                        "status" in decoded_ascii or "Stato" in decoded_ascii
                    ):
                        cleaned = re.sub(r",\s*([}\]])", r"\1", decoded_ascii)
                        data = json.loads(cleaned)
                        _LOGGER.info("Candy appliance at %s returned unencrypted hex response (Brava/Simply-Fi)", self.host)
                        self.use_encryption = True
                        self.key = ""
                        self._detect_type_from_data(data)
                        return data
                except Exception as err:
                    _LOGGER.debug("Hex response is not unencrypted ASCII JSON: %s", err)

                # 1. Try with user-supplied key if present
                if self.key:
                    try:
                        decrypted = decrypt_hex_response(raw_text, self.key)
                        cleaned = re.sub(r",\s*([}\]])", r"\1", decrypted)
                        data = json.loads(cleaned)
                        self.use_encryption = True
                        self._detect_type_from_data(data)
                        return data
                    except Exception as err:
                        _LOGGER.warning("Provided key failed to decrypt, running key recovery: %s", err)

                # 2. Run auto-recovery
                recovered = recover_xor_key(raw_text)
                if recovered:
                    self.key, data = recovered
                    self.use_encryption = True
                    self._detect_type_from_data(data)
                    return data

        if last_err:
            raise CandyConnectionError(f"Errore di comunicazione con {self.host}: {last_err}") from last_err

        raise CandyAuthError(
            f"Impossibile leggere o decifrare lo stato da {self.host}. Verifica IP e chiave crittografica."
        )

    def _detect_type_from_data(self, data: Dict[str, Any]) -> Optional[str]:
        """Detect whether device is washer, washer-dryer, dishwasher, etc."""
        if "statusLavatrice" in data:
            inner = data.get("statusLavatrice", {})
            if "DryT" in inner or "DryProg" in inner or "DelVal" in inner:
                self.detected_appliance_type = "washer_dryer"
            else:
                self.detected_appliance_type = "washer"
        elif (
            "statusDWash" in data
            or "statusLavastoviglie" in data
            or "StatoDWash" in data
            or "statusDishwasher" in data
        ):
            self.detected_appliance_type = "dishwasher"
        elif "statusWD" in data:
            self.detected_appliance_type = "washer_dryer"
        elif "statusTD" in data:
            self.detected_appliance_type = "dryer"
        elif "statusForno" in data:
            self.detected_appliance_type = "oven"
        elif "statusHob" in data:
            self.detected_appliance_type = "hob"
        elif "statusRX" in data:
            self.detected_appliance_type = "fridge"
        elif "statusWCool" in data:
            self.detected_appliance_type = "wine_cooler"
        else:
            self.detected_appliance_type = None
        return self.detected_appliance_type

    async def async_write_parameters(self, params: Dict[str, Any]) -> bool:
        """Send write parameters to http-write.json with encryption if required."""
        param_parts = [f"{k}={v}" for k, v in params.items()]
        param_str = "&".join(param_parts)

        if self.use_encryption and self.key:
            enc_hex = encrypt_payload(param_str, self.key)
            url = f"http://{self.host}/http-write.json?encrypted=1&data={enc_hex}"
        elif self.use_encryption and not self.key:
            raw_hex = param_str.encode("utf-8").hex().upper()
            url = f"http://{self.host}/http-write.json?encrypted=1&data={raw_hex}"
        else:
            url = f"http://{self.host}/http-write.json?encrypted=0&{param_str}"

        _LOGGER.debug("Sending Candy write command to %s: %s", self.host, param_str)
        try:
            resp_text = await self._fetch_url(url)
            _LOGGER.debug("Candy write reply from %s: %s", self.host, resp_text)
            return True
        except Exception as err:
            if self.use_encryption and not self.key:
                fallback_url = f"http://{self.host}/http-write.json?encrypted=0&{param_str}"
                try:
                    await self._fetch_url(fallback_url)
                    return True
                except Exception:
                    pass
            raise CandyConnectionError(f"Errore durante l'invio del comando a {self.host}: {err}") from err

    async def async_start_program_washer(
        self,
        pr: int,
        pr_code: Optional[int] = None,
        temp: Optional[int] = None,
        spin: Optional[int] = None,
        dry_time: Optional[int] = None,
        options: Optional[Dict[str, int]] = None,
        delay_hours: int = 0,
    ) -> bool:
        """Start a wash / wash-dry / dry cycle on washer or washer-dryer."""
        params: Dict[str, Any] = {
            "Write": "1",
            "StartStop": "1",
            "StSt": "1",
            "PrNm": str(pr),
            "Pr": str(pr),
        }
        if pr_code is not None:
            params["PrCode"] = str(pr_code)
        if temp is not None:
            params["Temp"] = str(temp)
        if spin is not None:
            params["SpinSp"] = str(spin // 100 if spin >= 100 else spin)
        if dry_time is not None:
            params["DryT"] = str(dry_time)
        if delay_hours > 0:
            params["DelayStart"] = str(delay_hours)
            params["DelMd"] = "1"
        else:
            params["DelMd"] = "0"

        if options:
            for k, v in options.items():
                params[k] = str(v)

        return await self.async_write_parameters(params)

    async def async_start_program_dishwasher(
        self,
        program_code: str,
        half_load: bool = False,
        tabs_3in1: bool = False,
        extra_dry: bool = False,
        open_door: bool = False,
        eco: bool = False,
        delay_hours: int = 0,
    ) -> bool:
        """Start a program on dishwasher."""
        clean_prog = program_code.upper()
        if not clean_prog.startswith("P"):
            clean_prog = f"P{clean_prog}"

        params: Dict[str, Any] = {
            "StartStop": "1",
            "Program": clean_prog,
            "DelayStart": str(delay_hours),
            "ExtraDry": "1" if extra_dry else "0",
            "OpenDoorOpt": "7" if open_door else "0",
            "TreinUno": "1" if tabs_3in1 else "0",
            "MetaCarico": "1" if half_load else "0",
            "eco": "1" if eco else "0",
            "W1": "1",
            "OpzProg": "p",
        }
        return await self.async_write_parameters(params)

    async def async_stop_or_reset(self) -> bool:
        """Stop or reset appliance."""
        return await self.async_write_parameters({"Reset": "1", "StartStop": "0", "StSt": "0"})

    async def async_pause(self) -> bool:
        """Pause current program."""
        return await self.async_write_parameters({"Pa": "1"})

    async def async_beep_buzzer(self) -> bool:
        """Sound buzzer on appliance."""
        return await self.async_write_parameters({"BM": "1"})

    async def async_provision_wifi(
        self, ssid: str, password: str, encryption_key: str
    ) -> bool:
        """Provision WiFi credentials to appliance in setup AP mode."""
        url = (
            f"http://{self.host}/http-config.json?"
            f"encrypted=1&NTW_MODE=3&SSID={ssid}&PASSWORD={password}&ENCRYPT_KEY={encryption_key}"
        )
        try:
            resp_text = await self._fetch_url(url)
            return "SUCCESS" in resp_text.upper() or len(resp_text) > 0
        except Exception as err:
            raise CandyConnectionError(f"Errore durante configurazione WiFi: {err}") from err
