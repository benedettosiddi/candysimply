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
    """Register static path and www copy for custom Candy Lovelace card."""
    frontend_dir = Path(__file__).parent / "frontend"
    card_file = frontend_dir / "candy-card.js"
    if not frontend_dir.exists() or not card_file.exists():
        _LOGGER.warning("Candy frontend directory or candy-card.js not found at %s", frontend_dir)
        return

    url_path = "/candy_simplyfi"
    card_url = f"{url_path}/candy-card.js"

    try:
        if hasattr(hass.http, "async_register_static_paths"):
            from homeassistant.components.http import StaticPathConfig

            await hass.http.async_register_static_paths(
                [
                    StaticPathConfig(url_path, str(frontend_dir), False),
                    StaticPathConfig(card_url, str(card_file), False),
                ]
            )
        else:
            hass.http.register_static_path(url_path, str(frontend_dir), cache_headers=False)
            hass.http.register_static_path(card_url, str(card_file), cache_headers=False)
        _LOGGER.debug("Registered Candy Simply-Fi static paths (%s, %s)", url_path, card_url)
    except Exception as err:
        _LOGGER.debug("Static path registration notice: %s", err)

    # Also automatically copy to config/www/ if available so /local/candy-card.js works natively
    try:
        www_dir = Path(hass.config.path("www"))
        if not www_dir.exists():
            www_dir.mkdir(parents=True, exist_ok=True)
        dest_card = www_dir / "candy-card.js"
        import shutil
        shutil.copy2(card_file, dest_card)
        _LOGGER.debug("Copied candy-card.js to %s for /local/candy-card.js access", dest_card)
    except Exception as err:
        _LOGGER.debug("www auto-copy notice: %s", err)

    # Automatically register Lovelace resource if storage mode is present
    try:
        lovelace = hass.data.get("lovelace")
        if lovelace and hasattr(lovelace, "resources"):
            resources = lovelace.resources
            if hasattr(resources, "async_items") and hasattr(resources, "async_create_item"):
                items = resources.async_items()
                has_res = any(
                    card_url in item.get("url", "") or "/local/candy-card.js" in item.get("url", "")
                    for item in items
                )
                if not has_res:
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
    key = entry.options.get(CONF_KEY, entry.data.get(CONF_KEY))
    use_encryption = entry.data.get(CONF_ENCRYPTED)
    appliance_type = entry.options.get(
        CONF_APPLIANCE_TYPE,
        entry.data.get(CONF_APPLIANCE_TYPE, "auto"),
    )
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

    # Clean up stale entities in case appliance_type changed
    try:
        from homeassistant.helpers import entity_registry as er
        ent_reg = er.async_get(hass)
        existing_entries = er.async_entries_for_config_entry(ent_reg, entry.entry_id)
        current_type = coordinator.appliance_type
        for ent in existing_entries:
            if current_type == "dishwasher":
                if any(ent.unique_id.endswith(sfx) for sfx in (
                    "_temp", "_spin_speed", "_pr_ph", "_dry_time", "_is_drying",
                    "_opt1_prewash", "_opt2_hygiene", "_opt3_extra_rinse", "_opt4_easy_iron",
                    "_opt5_night", "_opt7_steam", "_opt8_wifi", "_door_locked",
                    "_temp_ctrl", "_spin_ctrl", "_dry_ctrl", "_opt_1", "_opt_2",
                    "_opt_3", "_opt_4", "_opt_5", "_opt_7", "_opt_8",
                    "_program_select", "_temp_select", "_spin_select", "_dry_select"
                )):
                    _LOGGER.info("Pruning obsolete washer entity for dishwasher: %s", ent.entity_id)
                    ent_reg.async_remove(ent.entity_id)
            elif current_type in ("washer", "washer_dryer"):
                if any(ent.unique_id.endswith(sfx) for sfx in (
                    "_door_open", "_miss_salt", "_miss_rinse", "_half_load",
                    "_tabs_3in1", "_extra_dry", "_open_door_opt", "_tabs", "_door",
                    "_dw_half_load", "_dw_tabs", "_dw_extra_dry", "_dw_open_door",
                    "_dw_program_select"
                )):
                    _LOGGER.info("Pruning obsolete dishwasher entity for washer: %s", ent.entity_id)
                    ent_reg.async_remove(ent.entity_id)
    except Exception as exc:
        _LOGGER.debug("Entity registry cleanup notice: %s", exc)

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
