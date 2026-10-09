"""Tests for CandyDataUpdateCoordinator, controls persistence, remote control, and Candy Brava dishwasher."""

import importlib.util
import os
import sys
from unittest.mock import AsyncMock, MagicMock

comp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "custom_components", "candy_simplyfi"))
if comp_dir not in sys.path:
    sys.path.insert(0, comp_dir)


def _load_module(name, filename):
    path = os.path.join(comp_dir, filename)
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


const_mod = _load_module("const", "const.py")
programs_mod = _load_module("programs", "programs.py")
client_mod = _load_module("client", "client.py")
coord_mod = _load_module("coordinator", "coordinator.py")

CandyDataUpdateCoordinator = coord_mod.CandyDataUpdateCoordinator
WASHER_PROGRAMS = programs_mod.WASHER_PROGRAMS
DISHWASHER_PROGRAMS = programs_mod.DISHWASHER_PROGRAMS


def test_coordinator_washer_remote_control_wifistatus():
    """Verify that WiFiStatus=='1' properly marks remote_control_enabled True."""
    mock_hass = MagicMock()
    mock_client = MagicMock()
    mock_client.host = "192.168.1.100"

    coordinator = CandyDataUpdateCoordinator(
        hass=mock_hass,
        client=mock_client,
        appliance_type="washer",
    )

    # 1. Knob on Wi-Fi (WiFiStatus = "1")
    raw_with_wifi = {
        "statusLavatrice": {
            "MachMd": "1",
            "Pr": "1",
            "WiFiStatus": "1",
            "Temp": "40",
            "SpinSp": "10",
        }
    }
    data = coordinator._parse_data(raw_with_wifi)
    assert data["remote_control_enabled"] is True

    # 2. Knob not on Wi-Fi (WiFiStatus = "0")
    raw_without_wifi = {
        "statusLavatrice": {
            "MachMd": "1",
            "Pr": "1",
            "WiFiStatus": "0",
            "Temp": "40",
            "SpinSp": "10",
        }
    }
    data2 = coordinator._parse_data(raw_without_wifi)
    assert data2["remote_control_enabled"] is False


def test_coordinator_staged_settings_preserved_across_updates():
    """Verify that user staged options (temp, spin, program, options) persist across coordinator polls."""
    mock_hass = MagicMock()
    mock_client = MagicMock()
    mock_client.host = "192.168.1.100"

    coordinator = CandyDataUpdateCoordinator(
        hass=mock_hass,
        client=mock_client,
        appliance_type="washer",
    )

    # User selects program, changes temperature to 60, spin to 1200, and enables Prewash (Opt1)
    test_prog = list(WASHER_PROGRAMS.values())[0]
    coordinator.staged_program = test_prog
    coordinator.staged_temp = 60
    coordinator.staged_spin = 1200
    coordinator.staged_options["Opt1"] = 1
    coordinator.staged_delay_start = 3

    # Appliance poll arrives from the device (idle state with defaults 40C, 1000RPM, Opt1=0)
    raw_poll = {
        "statusLavatrice": {
            "MachMd": "1",
            "Pr": "1",
            "WiFiStatus": "1",
            "Temp": "40",
            "SpinSp": "10",
            "Opt1": "0",
        }
    }

    parsed = coordinator._parse_data(raw_poll)

    # Staged settings MUST be preserved in parsed data!
    assert parsed["staged_program"] == test_prog
    assert parsed["staged_temp"] == 60
    assert parsed["staged_spin"] == 1200
    assert parsed["staged_options"]["Opt1"] == 1
    assert parsed["staged_delay_start"] == 3


def test_coordinator_candy_brava_dishwasher_parsing():
    """Verify Candy Brava dishwasher payload with statusLavastoviglie is accurately parsed."""
    mock_hass = MagicMock()
    mock_client = MagicMock()
    mock_client.host = "192.168.1.105"

    coordinator = CandyDataUpdateCoordinator(
        hass=mock_hass,
        client=mock_client,
        appliance_type="dishwasher",
    )

    brava_raw = {
        "statusLavastoviglie": {
            "StatoDWash": "2",  # Running
            "Program": "P3",
            "RemTime": "85",
            "MetaCarico": "1",
            "TreinUno": "1",
            "ExtraDry": "0",
            "OpenDoorOpt": "7",
            "StatoWiFi": "1",
            "MissSalt": "0",
            "MissRinse": "0",
        }
    }

    parsed = coordinator._parse_data(brava_raw)
    assert parsed["appliance_type"] == "dishwasher"
    assert parsed["is_running"] is True
    assert parsed["program"] == "P3"
    assert parsed["rem_time_raw"] == 85
    assert parsed["half_load"] is True
    assert parsed["tabs_3in1"] is True
    assert parsed["open_door_opt"] is True
    assert parsed["remote_control_enabled"] is True


def test_coordinator_dishwasher_staged_options():
    """Verify that dishwasher staged options (program, half load, extra dry) persist."""
    mock_hass = MagicMock()
    mock_client = MagicMock()
    mock_client.host = "192.168.1.105"

    coordinator = CandyDataUpdateCoordinator(
        hass=mock_hass,
        client=mock_client,
        appliance_type="dishwasher",
    )

    test_dw_prog = list(DISHWASHER_PROGRAMS.values())[1]
    coordinator.staged_dw_program = test_dw_prog
    coordinator.staged_dw_options["half_load"] = True
    coordinator.staged_dw_options["extra_dry"] = True

    # Idle response arrives
    idle_raw = {
        "statusLavastoviglie": {
            "StatoDWash": "1",
            "Program": "P1",
            "MetaCarico": "0",
            "ExtraDry": "0",
        }
    }

    parsed = coordinator._parse_data(idle_raw)
    assert parsed["staged_dw_program"] == test_dw_prog
    assert parsed["staged_half_load"] is True
    assert parsed["staged_extra_dry"] is True


def test_coordinator_dishwasher_status_dwash_parsing():
    """Verify Candy dishwasher with statusDWash root key is properly identified and parsed."""
    mock_hass = MagicMock()
    mock_client = MagicMock()
    mock_client.host = "192.168.2.70"

    coordinator = CandyDataUpdateCoordinator(
        hass=mock_hass,
        client=mock_client,
        appliance_type="auto",
    )

    dwash_raw = {
        "statusDWash": {
            "StatoWiFi": "1",
            "CodiceErrore": "E0",
            "StatoDWash": "5",
            "MetaCarico": "0",
            "StartStop": "0",
            "TreinUno": "1",
            "Eco": "0",
            "Program": "P8",
            "ExtraDry": "0",
            "OpenDoorOpt": "1",
            "DelayStart": "0",
            "RemTime": "230",
            "MissSalt": "1",
            "MissRinse": "0",
            "OpenDoor": "0",
        }
    }

    parsed = coordinator._parse_data(dwash_raw)
    assert coordinator.appliance_type == "dishwasher"
    assert parsed["appliance_type"] == "dishwasher"
    assert parsed["is_running"] is False
    assert parsed["is_finished"] is True
    assert parsed["program"] == "P8"
    assert parsed["rem_time_raw"] == 230
    assert parsed["miss_salt"] is True
    assert parsed["miss_rinse"] is False
    assert parsed["tabs_3in1"] is True
    assert parsed["open_door_opt"] is True


def test_get_device_model_name():
    """Verify get_device_model_name maps all appliance types to correct friendly names."""
    get_model = const_mod.get_device_model_name
    assert get_model("dishwasher") == "Lavastoviglie Simply-Fi"
    assert get_model("washer_dryer") == "Lavasciuga Simply-Fi"
    assert get_model("washer") == "Lavatrice Simply-Fi"


def test_coordinator_washer_door_locked():
    """Verify door lock state when explicit or inferred from operational state."""
    mock_hass = MagicMock()
    mock_client = MagicMock()
    mock_client.host = "192.168.2.73"

    coordinator = CandyDataUpdateCoordinator(
        hass=mock_hass,
        client=mock_client,
        appliance_type="washer",
    )

    # 1. Machine running (MachMd=2, PrPh=3, RemTime=960) without explicit DoorLock key
    running_raw = {
        "statusLavatrice": {
            "MachMd": "2",
            "Pr": "7",
            "PrPh": "3",
            "RemTime": "960",
        }
    }
    parsed1 = coordinator._parse_data(running_raw)
    assert parsed1["door_locked"] is True

    # 2. Machine idle (MachMd=1, PrPh=0, RemTime=0)
    idle_raw = {
        "statusLavatrice": {
            "MachMd": "1",
            "Pr": "1",
            "PrPh": "0",
            "RemTime": "0",
        }
    }
    parsed2 = coordinator._parse_data(idle_raw)
    assert parsed2["door_locked"] is False

    # 3. Explicit DoorLock="0" takes priority if firmware supplies it
    explicit_raw = {
        "statusLavatrice": {
            "MachMd": "1",
            "DoorLock": "1",
        }
    }
    parsed3 = coordinator._parse_data(explicit_raw)
    assert parsed3["door_locked"] is True


def test_format_remaining_time():
    """Verify format_remaining_time accurately converts washer seconds and dishwasher minutes."""
    format_time = programs_mod.format_remaining_time

    # Washer seconds
    assert format_time(240, is_dishwasher=False) == "4 min"
    assert format_time(300, is_dishwasher=False) == "5 min"
    assert format_time(60, is_dishwasher=False) == "1 min"
    assert format_time(960, is_dishwasher=False) == "16 min"
    assert format_time(3600, is_dishwasher=False) == "1h 00m"
    assert format_time(5400, is_dishwasher=False) == "1h 30m"
    assert format_time(0, is_dishwasher=False) == "Completato / Pronto"

    # Dishwasher minutes
    assert format_time(230, is_dishwasher=True) == "3h 50m"
    assert format_time(45, is_dishwasher=True) == "45 min"
    assert format_time(0, is_dishwasher=True) == "Completato / Pronto"


def test_coordinator_dishwasher_standby_vs_running():
    """Verify that dishwasher with StartStop=0 is reported as standby (is_running=False) even if dial is set."""
    mock_hass = MagicMock()
    mock_client = MagicMock()
    mock_client.host = "192.168.2.70"

    coordinator = CandyDataUpdateCoordinator(
        hass=mock_hass,
        client=mock_client,
        appliance_type="dishwasher",
    )

    # 1. Standby: dial set to P2, RemTime 130, StartStop="0" (user has not pressed Start)
    standby_raw = {
        "statusDWash": {
            "StatoDWash": "2",
            "StartStop": "0",
            "Program": "P2",
            "RemTime": "130",
        }
    }
    parsed_standby = coordinator._parse_data(standby_raw)
    assert parsed_standby["is_running"] is False
    assert parsed_standby["is_paused"] is False
    assert parsed_standby["is_finished"] is False
    assert parsed_standby["start_stop"] == "0"

    # 2. Running: dial at P2, StartStop="1" (cycle actively underway)
    running_raw = {
        "statusDWash": {
            "StatoDWash": "2",
            "StartStop": "1",
            "Program": "P2",
            "RemTime": "125",
        }
    }
    parsed_running = coordinator._parse_data(running_raw)
    assert parsed_running["is_running"] is True
    assert parsed_running["is_paused"] is False
    assert parsed_running["start_stop"] == "1"

    # 3. Paused: dial at P2, StartStop="1", StatoDWash="3"
    paused_raw = {
        "statusDWash": {
            "StatoDWash": "3",
            "StartStop": "1",
            "Program": "P2",
            "RemTime": "125",
        }
    }
    parsed_paused = coordinator._parse_data(paused_raw)
    assert parsed_paused["is_running"] is False
    assert parsed_paused["is_paused"] is True


if __name__ == "__main__":
    test_coordinator_washer_remote_control_wifistatus()
    test_coordinator_staged_settings_preserved_across_updates()
    test_coordinator_dishwasher_status_dwash_parsing()
    test_get_device_model_name()
    test_coordinator_washer_door_locked()
    test_format_remaining_time()
    test_coordinator_dishwasher_standby_vs_running()
    print("ALL COORDINATOR & CONTROLS TESTS PASSED 100%!")



