"""Autodiscovery utilities for Candy and Hoover Simply-Fi appliances."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import ipaddress
import logging
import socket
from typing import Any, List, Optional

import aiohttp

try:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
except ImportError:
    HomeAssistant = Any  # type: ignore
    async_get_clientsession = None  # type: ignore

try:
    from .client import CandyLocalClient
    from .const import (
        APPLIANCE_TYPE_AUTO,
        APPLIANCE_TYPE_DISHWASHER,
        APPLIANCE_TYPE_WASHER,
        APPLIANCE_TYPE_WASHER_DRYER,
    )
except ImportError:
    from client import CandyLocalClient  # type: ignore
    from const import (  # type: ignore
        APPLIANCE_TYPE_AUTO,
        APPLIANCE_TYPE_DISHWASHER,
        APPLIANCE_TYPE_WASHER,
        APPLIANCE_TYPE_WASHER_DRYER,
    )

_LOGGER = logging.getLogger(__name__)


@dataclass
class DiscoveredCandyDevice:
    """Represents a Candy appliance discovered on the local network."""

    host: str
    appliance_type: str
    name: str
    encrypted: bool
    mac: Optional[str] = None


async def async_probe_candy_device(
    host: str,
    session: aiohttp.ClientSession,
    timeout: float = 1.2,
) -> Optional[DiscoveredCandyDevice]:
    """Probe an IP address on port 80 to check if it is a Candy Simply-Fi appliance."""
    url_unencrypted = f"http://{host}/http-read.json?encrypted=0"
    url_encrypted = f"http://{host}/http-read.json?encrypted=1"

    client_timeout = aiohttp.ClientTimeout(total=timeout, connect=timeout)

    # 1. Try unencrypted read first
    try:
        async with session.get(url_unencrypted, timeout=client_timeout) as resp:
            if resp.status == 200:
                text = await resp.text()
                if "statusLavatrice" in text or "MachMd" in text or "PrPh" in text:
                    is_dryer = "DryT" in text or "DryP" in text
                    app_type = APPLIANCE_TYPE_WASHER_DRYER if is_dryer else APPLIANCE_TYPE_WASHER
                    name = "Candy Lavasciuga" if is_dryer else "Candy Lavatrice"
                    return DiscoveredCandyDevice(
                        host=host,
                        appliance_type=app_type,
                        name=f"{name} ({host})",
                        encrypted=False,
                    )
                if (
                    "statusLavastoviglie" in text
                    or "statusDWash" in text
                    or "StatoDWash" in text
                    or "statusDishwasher" in text
                ):
                    return DiscoveredCandyDevice(
                        host=host,
                        appliance_type=APPLIANCE_TYPE_DISHWASHER,
                        name=f"Candy Lavastoviglie ({host})",
                        encrypted=False,
                    )
    except Exception:
        pass

    # 2. Try encrypted read (returns hexadecimal string)
    try:
        async with session.get(url_encrypted, timeout=client_timeout) as resp:
            if resp.status == 200:
                text = (await resp.text()).strip()
                # Encrypted payload is an even-length hex string of at least 32 chars
                if len(text) >= 32 and all(c in "0123456789abcdefABCDEF" for c in text):
                    # Check if unencrypted hex ASCII
                    try:
                        clean_hex = text.strip()
                        raw_bytes = bytes.fromhex(clean_hex)
                        ascii_str = raw_bytes.decode("utf-8", errors="ignore").strip().strip("\x00").strip()
                        if "statusLavastoviglie" in ascii_str or "statusDWash" in ascii_str or "StatoDWash" in ascii_str:
                            return DiscoveredCandyDevice(
                                host=host,
                                appliance_type=APPLIANCE_TYPE_DISHWASHER,
                                name=f"Candy Lavastoviglie Brava ({host})",
                                encrypted=True,
                            )
                        if "statusLavatrice" in ascii_str or "MachMd" in ascii_str:
                            is_dryer = "DryT" in ascii_str or "DryP" in ascii_str
                            app_type = APPLIANCE_TYPE_WASHER_DRYER if is_dryer else APPLIANCE_TYPE_WASHER
                            name = "Candy Lavasciuga" if is_dryer else "Candy Lavatrice"
                            return DiscoveredCandyDevice(
                                host=host,
                                appliance_type=app_type,
                                name=f"{name} ({host})",
                                encrypted=True,
                            )
                    except Exception:
                        pass

                    # Attempt key recovery to determine appliance type
                    client = CandyLocalClient(host=host, session=session)
                    try:
                        data = await client.async_read_status()
                        app_type = client.detected_appliance_type or APPLIANCE_TYPE_AUTO
                        type_name = "Lavasciuga" if app_type == APPLIANCE_TYPE_WASHER_DRYER else (
                            "Lavastoviglie Brava" if app_type == APPLIANCE_TYPE_DISHWASHER else "Lavatrice"
                        )
                        return DiscoveredCandyDevice(
                            host=host,
                            appliance_type=app_type,
                            name=f"Candy {type_name} ({host})",
                            encrypted=True,
                        )
                    except Exception:
                        return DiscoveredCandyDevice(
                            host=host,
                            appliance_type=APPLIANCE_TYPE_AUTO,
                            name=f"Candy Elettrodomestico ({host})",
                            encrypted=True,
                        )
    except Exception:
        pass

    return None


async def _async_get_local_ip_subnets(hass: HomeAssistant) -> List[str]:
    """Retrieve local IPv4 subnets using Home Assistant network helper or fallback socket."""
    subnets: List[str] = []
    if hass is not None:
        try:
            from homeassistant.components.network import async_get_source_ip
            source_ip = await async_get_source_ip(hass)
            if source_ip and not source_ip.startswith("127."):
                parts = source_ip.split(".")
                if len(parts) == 4:
                    subnets.append(f"{parts[0]}.{parts[1]}.{parts[2]}.0/24")
        except Exception:
            pass

    if not subnets:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.1)
            try:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                parts = local_ip.split(".")
                if len(parts) == 4 and not local_ip.startswith("127."):
                    subnets.append(f"{parts[0]}.{parts[1]}.{parts[2]}.0/24")
            finally:
                s.close()
        except Exception as err:
            _LOGGER.debug("Could not resolve local network subnet: %s", err)

    if not subnets:
        subnets.append("192.168.1.0/24")

    return list(dict.fromkeys(subnets))


def _get_local_ip_subnets() -> List[str]:
    """Retrieve local IPv4 subnets from active network interfaces (synchronous compatibility)."""
    subnets: List[str] = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        try:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            parts = local_ip.split(".")
            if len(parts) == 4 and not local_ip.startswith("127."):
                subnets.append(f"{parts[0]}.{parts[1]}.{parts[2]}.0/24")
        finally:
            s.close()
    except Exception as err:
        _LOGGER.debug("Could not resolve local network subnet: %s", err)

    if not subnets:
        subnets.append("192.168.1.0/24")

    return subnets


def _get_arp_candidate_ips() -> List[str]:
    """Inspect local ARP table to find candidate IPs matching Espressif/Murata MACs."""
    import re
    import subprocess

    candidates: List[str] = []
    try:
        out = subprocess.check_output(
            ["arp", "-a"], timeout=1.5, stderr=subprocess.DEVNULL
        ).decode("ascii", errors="ignore")
        espressif_ouis = (
            "24-6f-28", "30-ae-a4", "a4-cf-12", "24-0a-c4", "84-f3-eb", "68-c6-3a",
            "60-01-94", "5c-cf-7f", "48-3f-da", "40-91-51", "2c-f4-32", "18-fe-34",
            "10-52-1c", "08-3a-8d", "00-05-4f", "00-13-e0", "d8-80-39", "a0-20-a6",
            "b4-e6-2d", "c4-4f-33", "dc-4f-22", "e8-68-e7", "f0-08-d1", "cc-50-e3"
        )
        for line in out.splitlines():
            line_clean = line.strip().lower()
            for oui in espressif_ouis:
                oui_colon = oui.replace("-", ":")
                if oui in line_clean or oui_colon in line_clean:
                    ip_match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line_clean)
                    if ip_match:
                        ip = ip_match.group(1)
                        if not ip.endswith(".255") and ip not in candidates:
                            candidates.append(ip)
    except Exception:
        pass
    return candidates


async def async_discover_candy_devices(
    hass: HomeAssistant,
    max_hosts_to_scan: int = 254,
    timeout_per_probe: float = 1.0,
) -> List[DiscoveredCandyDevice]:
    """Scan local subnet for Candy appliances concurrently, prioritizing Espressif devices."""
    session = async_get_clientsession(hass)
    subnets = await _async_get_local_ip_subnets(hass)
    found_devices: List[DiscoveredCandyDevice] = []
    seen_ips: set[str] = set()

    # 1. Fast-track: Probe ARP candidates (Espressif / Murata MAC addresses)
    loop = asyncio.get_running_loop()
    arp_candidates = await loop.run_in_executor(None, _get_arp_candidate_ips)

    for candidate_ip in arp_candidates:
        seen_ips.add(candidate_ip)
        dev = await async_probe_candy_device(candidate_ip, session, timeout=timeout_per_probe)
        if dev:
            _LOGGER.info("Fast-tracked Candy appliance discovered via ARP OUI at %s", candidate_ip)
            found_devices.append(dev)

    # 2. Subnet scan for all remaining hosts (range 1..254)
    for subnet_str in subnets:
        try:
            net = ipaddress.ip_network(subnet_str, strict=False)
            hosts = [str(ip) for ip in net.hosts() if str(ip) not in seen_ips][:max_hosts_to_scan]

            semaphore = asyncio.Semaphore(35)

            async def _probe_with_limit(ip_str: str) -> Optional[DiscoveredCandyDevice]:
                async with semaphore:
                    return await async_probe_candy_device(
                        ip_str, session, timeout=timeout_per_probe
                    )

            tasks = [_probe_with_limit(h) for h in hosts]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for res in results:
                if isinstance(res, DiscoveredCandyDevice):
                    if res.host not in seen_ips:
                        seen_ips.add(res.host)
                        found_devices.append(res)

        except Exception as err:
            _LOGGER.debug("Error during Candy LAN subnet scan: %s", err)

    return found_devices
