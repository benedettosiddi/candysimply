"""Tests for Candy Simply-Fi autodiscovery module."""

import importlib.util
import os
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest
import aiohttp

comp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "custom_components", "candy_simplyfi"))
if comp_dir not in sys.path:
    sys.path.insert(0, comp_dir)

# Load const
const_path = os.path.join(comp_dir, "const.py")
spec_const = importlib.util.spec_from_file_location("const", const_path)
const_mod = importlib.util.module_from_spec(spec_const)
sys.modules["const"] = const_mod
spec_const.loader.exec_module(const_mod)

APPLIANCE_TYPE_DISHWASHER = const_mod.APPLIANCE_TYPE_DISHWASHER
APPLIANCE_TYPE_WASHER = const_mod.APPLIANCE_TYPE_WASHER
APPLIANCE_TYPE_WASHER_DRYER = const_mod.APPLIANCE_TYPE_WASHER_DRYER

# Load discovery
disc_path = os.path.join(comp_dir, "discovery.py")
spec_disc = importlib.util.spec_from_file_location("discovery", disc_path)
disc_mod = importlib.util.module_from_spec(spec_disc)
sys.modules["discovery"] = disc_mod
spec_disc.loader.exec_module(disc_mod)

DiscoveredCandyDevice = disc_mod.DiscoveredCandyDevice
_get_local_ip_subnets = disc_mod._get_local_ip_subnets
async_probe_candy_device = disc_mod.async_probe_candy_device


@pytest.mark.asyncio
async def test_probe_unencrypted_washer():
    """Test probing an unencrypted washing machine."""
    mock_session = MagicMock(spec=aiohttp.ClientSession)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.text.return_value = '{"statusLavatrice":{"MachMd":"1","PrPh":"0"}}'

    mock_session.get.return_value.__aenter__.return_value = mock_resp

    result = await async_probe_candy_device("192.168.1.50", mock_session, timeout=0.5)
    assert result is not None
    assert result.host == "192.168.1.50"
    assert result.appliance_type == APPLIANCE_TYPE_WASHER
    assert result.encrypted is False


@pytest.mark.asyncio
async def test_probe_unencrypted_washer_dryer():
    """Test probing an unencrypted washer-dryer with DryT attribute."""
    mock_session = MagicMock(spec=aiohttp.ClientSession)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.text.return_value = '{"statusLavatrice":{"MachMd":"1","DryT":"0"}}'

    mock_session.get.return_value.__aenter__.return_value = mock_resp

    result = await async_probe_candy_device("192.168.1.51", mock_session, timeout=0.5)
    assert result is not None
    assert result.host == "192.168.1.51"
    assert result.appliance_type == APPLIANCE_TYPE_WASHER_DRYER
    assert result.encrypted is False


@pytest.mark.asyncio
async def test_probe_unencrypted_dishwasher():
    """Test probing an unencrypted dishwasher."""
    mock_session = MagicMock(spec=aiohttp.ClientSession)
    mock_resp = AsyncMock()
    mock_resp.status = 200
    mock_resp.text.return_value = '{"statusLavastoviglie":{"StatoDWash":"1"}}'

    mock_session.get.return_value.__aenter__.return_value = mock_resp

    result = await async_probe_candy_device("192.168.1.52", mock_session, timeout=0.5)
    assert result is not None
    assert result.host == "192.168.1.52"
    assert result.appliance_type == APPLIANCE_TYPE_DISHWASHER
    assert result.encrypted is False


@pytest.mark.asyncio
async def test_probe_non_candy_device():
    """Test probing a device that is not a Candy appliance."""
    mock_session = MagicMock(spec=aiohttp.ClientSession)
    mock_resp = AsyncMock()
    mock_resp.status = 404
    mock_resp.text.return_value = "Not Found"

    mock_session.get.return_value.__aenter__.return_value = mock_resp

    result = await async_probe_candy_device("192.168.1.99", mock_session, timeout=0.5)
    assert result is None


def test_get_local_ip_subnets():
    """Test local subnet resolution helper."""
    subnets = _get_local_ip_subnets()
    assert isinstance(subnets, list)
    assert len(subnets) > 0
    assert "/24" in subnets[0]
