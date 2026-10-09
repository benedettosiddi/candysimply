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
                if "statusLavastoviglie" in text or "StatoDWash" in text:
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
                    # Attempt key recovery to determine appliance type
                    client = CandyLocalClient(host=host, session=session)
                    try:
                        data = await client.async_read_status()
                        app_type = client.detected_appliance_type or APPLIANCE_TYPE_AUTO
                        type_name = "Lavasciuga" if app_type == APPLIANCE_TYPE_WASHER_DRYER else (
                            "Lavastoviglie" if app_type == APPLIANCE_TYPE_DISHWASHER else "Lavatrice"
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
                            name=f"Candy Elettrodomestico Cifrato ({host})",
                            encrypted=True,
                        )
    except Exception:
        pass

    return None


def _get_local_ip_subnets() -> List[str]:
    """Retrieve local IPv4 subnets from active network interfaces."""
    subnets: List[str] = []
    try:
        # Get host IP by connecting to a dummy external address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        try:
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            # Construct /24 subnet from local IP
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


async def async_discover_candy_devices(
    hass: HomeAssistant,
    max_hosts_to_scan: int = 40,
    timeout_per_probe: float = 1.0,
) -> List[DiscoveredCandyDevice]:
    """Scan local subnet for Candy appliances concurrently."""
    session = async_get_clientsession(hass)
    subnets = _get_local_ip_subnets()
    found_devices: List[DiscoveredCandyDevice] = []

    for subnet_str in subnets:
        try:
            net = ipaddress.ip_network(subnet_str, strict=False)
            hosts = [str(ip) for ip in net.hosts()][:max_hosts_to_scan]

            semaphore = asyncio.Semaphore(20)

            async def _probe_with_limit(ip_str: str) -> Optional[DiscoveredCandyDevice]:
                async with semaphore:
                    return await async_probe_candy_device(
                        ip_str, session, timeout=timeout_per_probe
                    )

            tasks = [_probe_with_limit(h) for h in hosts]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for res in results:
                if isinstance(res, DiscoveredCandyDevice):
                    found_devices.append(res)

        except Exception as err:
            _LOGGER.debug("Error during Candy LAN subnet scan: %s", err)

    return found_devices
