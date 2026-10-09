"""Number platform for Candy Simply-Fi delayed start setting."""

from __future__ import annotations

from typing import Optional

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import APPLIANCE_TYPE_DISHWASHER, DOMAIN
from .coordinator import CandyDataUpdateCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Candy number entities based on a config entry."""
    coordinator: CandyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    async_add_entities([CandyDelayStartNumber(coordinator)])


class CandyDelayStartNumber(CoordinatorEntity[CandyDataUpdateCoordinator], NumberEntity):
    """Number entity allowing user to set delayed start in hours."""

    _attr_has_entity_name = True
    _attr_mode = NumberMode.BOX
    _attr_native_min_value = 0
    _attr_native_max_value = 24
    _attr_native_step = 1
    _attr_native_unit_of_measurement = "h"

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize number entity."""
        super().__init__(coordinator)
        self._attr_translation_key = "delay_start"
        self._attr_name = "Partenza Ritardata"
        self._attr_icon = "mdi:clock-start"
        self._attr_unique_id = f"{coordinator.unique_id}_delay_start"
        self._value = 0

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info."""
        app_type = self.coordinator.appliance_type
        model = "Lavastoviglie Simply-Fi" if app_type == APPLIANCE_TYPE_DISHWASHER else "Lavasciuga Simply-Fi"
        return DeviceInfo(
            identifiers={(DOMAIN, self.coordinator.unique_id)},
            name=f"Candy {model}",
            manufacturer="Candy / Hoover",
            model=model,
            sw_version="1.0 (Local API)",
            configuration_url=f"http://{self.coordinator.client.host}",
        )

    @property
    def native_value(self) -> float:
        """Return staged or active delay hours."""
        data = self.coordinator.data or {}
        if data.get("is_running"):
            return float(data.get("delay_value", 0))
        return float(self.coordinator.staged_delay_start)

    async def async_set_native_value(self, value: float) -> None:
        """Set staged delay hours."""
        self._value = int(value)
        self.coordinator.staged_delay_start = int(value)
        self.async_write_ha_state()
        self.coordinator.async_update_listeners()
