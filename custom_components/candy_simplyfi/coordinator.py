"""DataUpdateCoordinator for Candy Simply-Fi appliances."""

from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any, Dict, Optional

try:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
except ImportError:
    HomeAssistant = Any  # type: ignore

    from typing import Generic, TypeVar
    _T = TypeVar("_T")

    class DataUpdateCoordinator(Generic[_T]):  # type: ignore
        """Mock DataUpdateCoordinator for standalone test environment."""

        def __init__(self, hass: Any, logger: Any, name: str, update_interval: Any) -> None:
            self.hass = hass
            self.logger = logger
            self.name = name
            self.update_interval = update_interval
            self.data: Dict[str, Any] = {}

        def async_update_listeners(self) -> None:
            pass

        async def async_request_refresh(self) -> None:
            pass

    class UpdateFailed(Exception):  # type: ignore
        """Mock UpdateFailed exception."""
        pass

try:
    from .client import CandyAuthError, CandyClientError, CandyConnectionError, CandyLocalClient
    from .const import (
        APPLIANCE_TYPE_AUTO,
        APPLIANCE_TYPE_DISHWASHER,
        APPLIANCE_TYPE_WASHER,
        APPLIANCE_TYPE_WASHER_DRYER,
        DEFAULT_UPDATE_INTERVAL,
        DOMAIN,
        ERROR_CODES,
    )
except ImportError:
    from client import CandyAuthError, CandyClientError, CandyConnectionError, CandyLocalClient  # type: ignore
    from const import (  # type: ignore
        APPLIANCE_TYPE_AUTO,
        APPLIANCE_TYPE_DISHWASHER,
        APPLIANCE_TYPE_WASHER,
        APPLIANCE_TYPE_WASHER_DRYER,
        DEFAULT_UPDATE_INTERVAL,
        DOMAIN,
        ERROR_CODES,
    )

_LOGGER = logging.getLogger(__name__)


class CandyDataUpdateCoordinator(DataUpdateCoordinator[Dict[str, Any]]):
    """Coordinator to manage fetching data from Candy appliance."""

    def __init__(
        self,
        hass: HomeAssistant,
        client: CandyLocalClient,
        appliance_type: str = APPLIANCE_TYPE_AUTO,
        update_interval_sec: int = DEFAULT_UPDATE_INTERVAL,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}_{client.host}",
            update_interval=timedelta(seconds=update_interval_sec),
        )
        self.client = client
        self.appliance_type = appliance_type
        self.unique_id = f"candy_{client.host.replace('.', '_')}"

        # Persistent staged controls across coordinator polls
        self.staged_program: Optional[Any] = None
        self.staged_temp: Optional[int] = None
        self.staged_spin: Optional[int] = None
        self.staged_dry_time: Optional[int] = None
        self.staged_options: Dict[str, int] = {}
        self.staged_dw_program: Optional[Any] = None
        self.staged_dw_options: Dict[str, bool] = {}
        self.staged_delay_start: int = 0

    async def _async_update_data(self) -> Dict[str, Any]:
        """Fetch status from appliance via local API."""
        try:
            raw_data = await self.client.async_read_status()
            
            # Resolve auto appliance type
            if self.appliance_type == APPLIANCE_TYPE_AUTO:
                self.appliance_type = self.client.detected_appliance_type or APPLIANCE_TYPE_WASHER_DRYER

            parsed = self._parse_data(raw_data)
            return parsed

        except CandyAuthError as err:
            raise UpdateFailed(f"Errore di crittografia/chiave per {self.client.host}: {err}") from err
        except CandyConnectionError as err:
            raise UpdateFailed(f"Impossibile raggiungere {self.client.host}: {err}") from err
        except CandyClientError as err:
            raise UpdateFailed(f"Errore comunicazione con {self.client.host}: {err}") from err
        except Exception as err:
            raise UpdateFailed(f"Errore imprevisto durante l'aggiornamento da {self.client.host}: {err}") from err

    def _parse_data(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Parse raw device response into normalized dictionary."""
        data: Dict[str, Any] = {
            "raw": raw,
            "appliance_type": self.appliance_type,
            "is_online": True,
        }

        has_dishwasher_data = any(
            k in raw for k in ("statusDWash", "statusLavastoviglie", "StatoDWash", "statusDishwasher")
        )
        has_washer_data = any(
            k in raw for k in ("statusLavatrice", "statusWD")
        )

        # Check for Dishwasher
        if (
            has_dishwasher_data
            or (self.appliance_type == APPLIANCE_TYPE_DISHWASHER and not has_washer_data)
        ):
            if has_dishwasher_data and self.appliance_type != APPLIANCE_TYPE_DISHWASHER:
                _LOGGER.info("Detected dishwasher telemetry from %s, setting appliance_type to dishwasher", self.client.host)
                self.appliance_type = APPLIANCE_TYPE_DISHWASHER
                data["appliance_type"] = APPLIANCE_TYPE_DISHWASHER

            sub = (
                raw.get("statusDWash")
                or raw.get("statusLavastoviglie")
                or raw.get("statusDishwasher")
                or (raw if ("StatoDWash" in raw or "Program" in raw) else {})
            )

            # Dishwasher state
            stato_dwash = str(sub.get("StatoDWash", "1"))
            data["stato_dwash"] = stato_dwash
            data["is_running"] = stato_dwash in ("2", "3", "4")
            data["is_paused"] = stato_dwash == "3"
            data["is_finished"] = stato_dwash == "5"

            # Program
            prog_raw = str(sub.get("Program", "P1")).strip().upper()
            if not prog_raw.startswith("P"):
                prog_raw = f"P{prog_raw}"
            data["program"] = prog_raw

            # Remaining time
            try:
                data["rem_time_raw"] = int(sub.get("RemTime", 0))
            except (ValueError, TypeError):
                data["rem_time_raw"] = 0

            # Dishwasher Options & Alerts
            data["half_load"] = str(sub.get("MetaCarico", "0")) == "1"
            data["tabs_3in1"] = str(sub.get("TreinUno", "0")) == "1"
            data["extra_dry"] = str(sub.get("ExtraDry", "0")) == "1"
            data["open_door_opt"] = str(sub.get("OpenDoorOpt", "0")) in ("1", "7")
            data["door_open"] = str(sub.get("OpenDoor", "0")) == "1"
            data["miss_salt"] = str(sub.get("MissSalt", "0")) == "1"
            data["miss_rinse"] = str(sub.get("MissRinse", "0")) == "1"
            data["eco"] = str(sub.get("Eco", sub.get("eco", "0"))) == "1"
            data["buzzer_mute"] = str(sub.get("BM", "0")) == "1"

            # Remote control status for dishwasher
            data["remote_control_enabled"] = (
                str(sub.get("StatoWiFi", "")).strip() == "1"
                or str(sub.get("WiFiStatus", "")).strip() == "1"
                or str(sub.get("CheckWiFi", "")).strip() == "1"
                or True
            )

            # Error code
            err_code = str(sub.get("CodiceErrore", "E0")).strip()
            data["error_code"] = err_code
            data["error_description"] = ERROR_CODES.get(err_code, f"Errore {err_code}")

            # Wi-Fi status
            data["wifi_status"] = str(sub.get("StatoWiFi", "1")) == "1"

        # Check for Washer / Washer-Dryer
        elif (
            has_washer_data
            or self.appliance_type in (APPLIANCE_TYPE_WASHER, APPLIANCE_TYPE_WASHER_DRYER)
        ):
            sub = raw.get("statusLavatrice", raw.get("statusWD", {}))
            
            # Machine state
            mach_md = str(sub.get("MachMd", "1"))
            data["mach_md"] = mach_md
            data["is_running"] = mach_md in ("2", "5")
            data["is_paused"] = mach_md == "3"
            data["is_finished"] = mach_md == "7"

            # Program information
            pr_val = sub.get("Pr", 0)
            try:
                pr_int = int(pr_val)
            except (ValueError, TypeError):
                pr_int = 0
            data["pr"] = pr_int

            pr_code_val = sub.get("PrCode")
            try:
                data["pr_code"] = int(pr_code_val) if pr_code_val is not None else None
            except (ValueError, TypeError):
                data["pr_code"] = None

            # Program phase
            data["pr_ph"] = str(sub.get("PrPh", "0"))

            # Remaining time
            rem_time_raw = sub.get("RemTime", sub.get("Ssec", 0))
            try:
                data["rem_time_raw"] = int(rem_time_raw)
            except (ValueError, TypeError):
                data["rem_time_raw"] = 0

            # Temperature and Spin
            try:
                data["temp"] = int(sub.get("Temp", 0))
            except (ValueError, TypeError):
                data["temp"] = 0

            spin_raw = sub.get("SpinSp", 0)
            try:
                spin_int = int(spin_raw)
                data["spin_speed"] = spin_int * 100 if spin_int < 20 else spin_int
            except (ValueError, TypeError):
                data["spin_speed"] = 0

            # Drying options (for Washer-Dryer)
            dry_t_raw = sub.get("DryT", "0")
            data["dry_t"] = str(dry_t_raw)
            data["is_drying"] = data["dry_t"] != "0" or data["pr_ph"] == "5"

            # Options
            data["opt1_prewash"] = str(sub.get("Opt1", "0")) == "1"
            data["opt2_hygiene"] = str(sub.get("Opt2", "0")) == "1"
            data["opt3_extra_rinse"] = str(sub.get("Opt3", "0")) == "1"
            data["opt4_easy_iron"] = str(sub.get("Opt4", "0")) == "1"
            data["opt5_night"] = str(sub.get("Opt5", "0")) == "1"
            data["opt7_steam"] = str(sub.get("Opt7", "0")) == "1"

            # Door lock & Remote Control status
            # In Candy washing machines, WiFiStatus == "1" when physical dial is in Wi-Fi / Remote position
            wifi_stat = str(sub.get("WiFiStatus", "")).strip()
            stato_wifi = str(sub.get("StatoWiFi", "")).strip()
            check_wifi = str(sub.get("CheckWiFi", "")).strip()
            opt8 = str(sub.get("Opt8", "0")).strip()
            data["remote_control_enabled"] = (
                wifi_stat == "1"
                or stato_wifi == "1"
                or check_wifi == "1"
                or pr_int == 16
                or opt8 == "1"
            )
            # Check explicit door lock attributes if provided by firmware
            door_keys = ("DoorLock", "DoorState", "Door", "Door_Lock", "Lock", "DoorStat", "Porta")
            explicit_door = None
            for dk in door_keys:
                if dk in sub:
                    explicit_door = sub[dk]
                    break

            if explicit_door is not None:
                data["door_locked"] = str(explicit_door).strip() in ("1", "true", "True", "on", "ON")
            else:
                # In Candy Simply-Fi washing machines, the physical PTC safety door lock
                # is engaged whenever the machine is running (MachMd in 2, 5),
                # paused mid-cycle (MachMd == 3), or in active phases (wash, rinse, spin, dry).
                # It unlocks after the cycle finishes (MachMd == 7) or in standby (MachMd == 1).
                data["door_locked"] = (
                    mach_md in ("2", "3", "5")
                    or (data["pr_ph"] not in ("0", "6") and data["rem_time_raw"] > 0)
                )

            # Error code
            err_code = str(sub.get("CodiceErrore", "E0")).strip()
            data["error_code"] = err_code
            data["error_description"] = ERROR_CODES.get(err_code, f"Errore {err_code}")

            # Wi-Fi status
            data["wifi_status"] = str(sub.get("StatoWiFi", "1")) == "1"


        # Merge persistent staged selections so UI picks are never wiped out by background polls
        data["staged_program"] = self.staged_program
        data["staged_temp"] = self.staged_temp
        data["staged_spin"] = self.staged_spin
        data["staged_dry_time"] = self.staged_dry_time
        data["staged_options"] = dict(self.staged_options)
        data["staged_dw_program"] = self.staged_dw_program
        data["staged_delay_start"] = self.staged_delay_start
        for opt_k, opt_v in self.staged_dw_options.items():
            data[f"staged_{opt_k}"] = opt_v

        return data
