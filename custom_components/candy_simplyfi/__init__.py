"""Integration for Candy and Hoover Simply-Fi local control."""

from __future__ import annotations

import logging
from typing import Final

from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .client import CandyLocalClient
from .const import (
    CONF_APPLIANCE_TYPE,
    CONF_ENCRYPTED,
    CONF_IP_ADDRESS,
    CONF_KEY,
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
)
from .coordinator import CandyDataUpdateCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: Final = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.SWITCH,
    Platform.SELECT,
    Platform.BUTTON,
    Platform.NUMBER,
]


async def _async_register_frontend(hass: HomeAssistant) -> None:
    """Register static path for custom Candy Lovelace card."""
    frontend_dir = Path(__file__).parent / "frontend"
    if not frontend_dir.exists():
        return

    url_path = "/candy_simplyfi"
    card_url = f"{url_path}/candy-card.js"

    try:
        if hasattr(hass.http, "async_register_static_paths"):
            from homeassistant.components.http import StaticPathConfig

            await hass.http.async_register_static_paths(
                [StaticPathConfig(url_path, str(frontend_dir), False)]
            )
        else:
            hass.http.register_static_path(url_path, str(frontend_dir), cache_headers=False)
        _LOGGER.debug("Registered Candy Simply-Fi static path %s", url_path)
    except Exception as err:
        _LOGGER.debug("Static path registration notice: %s", err)

    # Automatically register Lovelace resource if storage mode is present
    try:
        lovelace = hass.data.get("lovelace")
        if lovelace and hasattr(lovelace, "resources"):
            resources = lovelace.resources
            if hasattr(resources, "async_items") and hasattr(resources, "async_create_item"):
                items = resources.async_items()
                if not any(item.get("url") == card_url for item in items):
                    await resources.async_create_item({"res_type": "module", "url": card_url})
                    _LOGGER.info("Registered Lovelace card resource: %s", card_url)
    except Exception as err:
        _LOGGER.debug("Lovelace resource auto-registration notice: %s", err)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Candy Simply-Fi integration component."""
    await _async_register_frontend(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Candy Simply-Fi from a config entry."""
    await _async_register_frontend(hass)
    hass.data.setdefault(DOMAIN, {})

    ip_address = entry.data[CONF_IP_ADDRESS]
    key = entry.data.get(CONF_KEY)
    use_encryption = entry.data.get(CONF_ENCRYPTED)
    appliance_type = entry.data.get(CONF_APPLIANCE_TYPE, "auto")
    update_interval = entry.options.get(
        CONF_UPDATE_INTERVAL,
        entry.data.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL),
    )

    session = async_get_clientsession(hass)
    client = CandyLocalClient(
        host=ip_address,
        key=key,
        use_encryption=use_encryption,
        session=session,
    )

    coordinator = CandyDataUpdateCoordinator(
        hass=hass,
        client=client,
        appliance_type=appliance_type,
        update_interval_sec=update_interval,
    )

    # Initial data refresh
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = {
        "client": client,
        "coordinator": coordinator,
    }

    # Register platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    entry.async_on_unload(entry.add_update_listener(async_reload_entry))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        data = hass.data[DOMAIN].pop(entry.entry_id, None)
        if data and "client" in data:
            await data["client"].close()

    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry when options change."""
    await hass.config_entries.async_reload(entry.entry_id)
