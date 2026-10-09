"""Select platform for Candy Simply-Fi program, temperature, spin, and drying configuration."""

from __future__ import annotations

import logging
from typing import Optional

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    APPLIANCE_TYPE_DISHWASHER,
    DOMAIN,
    DRYING_LEVELS,
    SPIN_SPEEDS,
    TEMPERATURES,
)
from .coordinator import CandyDataUpdateCoordinator
from .programs import (
    DISHWASHER_PROGRAMS,
    WASHER_PROGRAMS,
    get_dishwasher_program_by_code,
    get_washer_program_by_pr,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Candy select entities based on a config entry."""
    coordinator: CandyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    appliance_type = coordinator.appliance_type

    entities: list[SelectEntity] = []

    if appliance_type == APPLIANCE_TYPE_DISHWASHER:
        entities.append(CandyDishwasherProgramSelect(coordinator))
    else:
        entities.extend(
            [
                CandyWasherProgramSelect(coordinator),
                CandyTemperatureSelect(coordinator),
                CandySpinSpeedSelect(coordinator),
                CandyDryingSelect(coordinator),
            ]
        )

    async_add_entities(entities)


class CandyBaseSelect(CoordinatorEntity[CandyDataUpdateCoordinator], SelectEntity):
    """Base select entity for Candy appliances."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        key: str,
        name: str,
        icon: Optional[str] = None,
    ) -> None:
        """Initialize base select."""
        super().__init__(coordinator)
        self._key = key
        self._attr_translation_key = key
        self._attr_name = name
        if icon:
            self._attr_icon = icon
        self._attr_unique_id = f"{coordinator.unique_id}_{key}"

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


class CandyWasherProgramSelect(CandyBaseSelect):
    """Select entity holding all washer and washer-dryer programs."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize program selector with all programs."""
        super().__init__(
            coordinator,
            "select_washer_program",
            "Seleziona Programma di Lavaggio / Asciugatura",
            icon="mdi:washing-machine",
        )
        # Build map: Human readable Italian name -> program object
        self._programs_by_name = {
            prog.name_it: prog for prog in WASHER_PROGRAMS.values()
        }
        self._attr_options = list(self._programs_by_name.keys())
        self._selected_option = list(self._programs_by_name.keys())[0]

    @property
    def current_option(self) -> Optional[str]:
        """Return currently selected or active program name."""
        data = self.coordinator.data or {}
        pr_val = data.get("pr", 0)
        pr_code_val = data.get("pr_code")
        active_prog = get_washer_program_by_pr(pr_val, pr_code_val)
        if active_prog and active_prog.name_it in self._programs_by_name:
            return active_prog.name_it
        return self._selected_option

    async def async_select_option(self, option: str) -> None:
        """Set the selected program and update coordinator state staging."""
        self._selected_option = option
        self.coordinator.data["staged_program"] = self._programs_by_name.get(option)
        self.async_write_ha_state()


class CandyDishwasherProgramSelect(CandyBaseSelect):
    """Select entity holding all dishwasher wash programs (P1..P20+)."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize dishwasher program selector."""
        super().__init__(
            coordinator,
            "select_dishwasher_program",
            "Seleziona Programma Lavastoviglie",
            icon="mdi:dishwasher",
        )
        self._programs_by_name = {
            f"{prog.name_it} ({prog.code})": prog for prog in DISHWASHER_PROGRAMS.values()
        }
        self._attr_options = list(self._programs_by_name.keys())
        self._selected_option = list(self._programs_by_name.keys())[0]

    @property
    def current_option(self) -> Optional[str]:
        """Return currently running or selected program."""
        data = self.coordinator.data or {}
        active_code = data.get("program", "P1")
        prog = get_dishwasher_program_by_code(active_code)
        if prog:
            key = f"{prog.name_it} ({prog.code})"
            if key in self._programs_by_name:
                return key
        return self._selected_option

    async def async_select_option(self, option: str) -> None:
        """Select a dishwasher program."""
        self._selected_option = option
        self.coordinator.data["staged_dw_program"] = self._programs_by_name.get(option)
        self.async_write_ha_state()


class CandyTemperatureSelect(CandyBaseSelect):
    """Select entity for wash temperature."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize temperature select."""
        super().__init__(
            coordinator,
            "select_temperature",
            "Imposta Temperatura (°C)",
            icon="mdi:thermometer",
        )
        self._attr_options = [f"{t}°C" if t != "0" else "Freddo (0°C)" for t in TEMPERATURES]
        self._selected_option = "40°C"

    @property
    def current_option(self) -> Optional[str]:
        """Return current temperature option."""
        data = self.coordinator.data or {}
        temp = data.get("temp", 40)
        formatted = f"{temp}°C" if temp > 0 else "Freddo (0°C)"
        if formatted in self._attr_options:
            return formatted
        return self._selected_option

    async def async_select_option(self, option: str) -> None:
        """Change staged wash temperature."""
        self._selected_option = option
        val = 0 if "Freddo" in option else int(option.replace("°C", ""))
        self.coordinator.data["staged_temp"] = val
        self.async_write_ha_state()


class CandySpinSpeedSelect(CandyBaseSelect):
    """Select entity for spin speed."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize spin selector."""
        super().__init__(
            coordinator,
            "select_spin_speed",
            "Imposta Centrifuga (RPM)",
            icon="mdi:rotate-right",
        )
        self._attr_options = [f"{s} RPM" if s != "0" else "No Centrifuga (0 RPM)" for s in SPIN_SPEEDS]
        self._selected_option = "1000 RPM"

    @property
    def current_option(self) -> Optional[str]:
        """Return current spin option."""
        data = self.coordinator.data or {}
        spin = data.get("spin_speed", 1000)
        formatted = f"{spin} RPM" if spin > 0 else "No Centrifuga (0 RPM)"
        if formatted in self._attr_options:
            return formatted
        return self._selected_option

    async def async_select_option(self, option: str) -> None:
        """Change staged spin speed."""
        self._selected_option = option
        val = 0 if "No Centrifuga" in option else int(option.replace(" RPM", ""))
        self.coordinator.data["staged_spin"] = val
        self.async_write_ha_state()


class CandyDryingSelect(CandyBaseSelect):
    """Select entity for drying mode/time."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize drying selector."""
        super().__init__(
            coordinator,
            "select_drying_mode",
            "Imposta Asciugatura (Lavasciuga)",
            icon="mdi:tumble-dryer",
        )
        self._attr_options = list(DRYING_LEVELS.values())
        self._selected_option = list(DRYING_LEVELS.values())[0]

    @property
    def current_option(self) -> Optional[str]:
        """Return current drying setting."""
        data = self.coordinator.data or {}
        dry_t = str(data.get("dry_t", "0"))
        name = DRYING_LEVELS.get(dry_t)
        if name and name in self._attr_options:
            return name
        return self._selected_option

    async def async_select_option(self, option: str) -> None:
        """Change staged drying setting."""
        self._selected_option = option
        for code, label in DRYING_LEVELS.items():
            if label == option:
                self.coordinator.data["staged_dry_time"] = int(code)
                break
        self.async_write_ha_state()
