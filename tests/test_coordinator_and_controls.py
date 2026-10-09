"""Tests for CandyDataUpdateCoordinator, controls persistence, remote control, and Candy Brava dishwasher."""

import importlib.util
import os
import sys
from unittest.mock import AsyncMock, MagicMock
import pytest

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
