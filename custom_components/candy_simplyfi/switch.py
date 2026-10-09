"""Switch platform for Candy Simply-Fi appliance options."""

from __future__ import annotations

from typing import Any, Optional

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import APPLIANCE_TYPE_DISHWASHER, DOMAIN, get_device_model_name
from .coordinator import CandyDataUpdateCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Candy switches based on a config entry."""
    coordinator: CandyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    appliance_type = coordinator.appliance_type

    entities: list[SwitchEntity] = []

    if appliance_type == APPLIANCE_TYPE_DISHWASHER:
        entities.extend(
            [
                CandyDishwasherOptionSwitch(coordinator, "half_load", "Opzione Mezzo Carico", "mdi:fraction-one-half"),
                CandyDishwasherOptionSwitch(coordinator, "tabs_3in1", "Opzione Pastiglie 3-in-1", "mdi:pill"),
                CandyDishwasherOptionSwitch(coordinator, "extra_dry", "Opzione Asciugatura Extra", "mdi:weather-sunny"),
                CandyDishwasherOptionSwitch(coordinator, "open_door_opt", "Apertura Automatica Sportello", "mdi:door-open"),
                CandyDishwasherOptionSwitch(coordinator, "eco", "Modalità Eco Risparmio", "mdi:leaf"),
            ]
        )
    else:
        entities.extend(
            [
                CandyWasherOptionSwitch(coordinator, "opt1_prewash", "Prelavaggio", "Opt1", "mdi:washing-machine"),
                CandyWasherOptionSwitch(coordinator, "opt2_hygiene", "Igiene+", "Opt2", "mdi:shield-check"),
                CandyWasherOptionSwitch(coordinator, "opt3_extra_rinse", "Risciacquo Extra", "Opt3", "mdi:water-plus"),
                CandyWasherOptionSwitch(coordinator, "opt4_easy_iron", "Stiro Facile", "Opt4", "mdi:iron"),
                CandyWasherOptionSwitch(coordinator, "opt5_night", "Ciclo Notturno Silenzioso", "Opt5", "mdi:weather-night"),
                CandyWasherOptionSwitch(coordinator, "opt7_steam", "Trattamento Vapore", "Opt7", "mdi:cloud-outline"),
            ]
        )

    async_add_entities(entities)


class CandyBaseSwitch(CoordinatorEntity[CandyDataUpdateCoordinator], SwitchEntity):
    """Base switch for Candy appliances."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        key: str,
        name: str,
        icon: Optional[str] = None,
    ) -> None:
        """Initialize switch."""
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
        model = get_device_model_name(self.coordinator.appliance_type)
        return DeviceInfo(
            identifiers={(DOMAIN, self.coordinator.unique_id)},
            name=f"Candy {model}",
            manufacturer="Candy / Hoover",
            model=model,
            sw_version="1.0 (Local API)",
            configuration_url=f"http://{self.coordinator.client.host}",
        )


class CandyWasherOptionSwitch(CandyBaseSwitch):
    """Switch for washer options (Opt1..Opt8)."""

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        field_name: str,
        name: str,
        opt_key: str,
        icon: str,
    ) -> None:
        """Initialize washer option switch."""
        super().__init__(coordinator, field_name, name, icon=icon)
        self._field_name = field_name
        self._opt_key = opt_key

    @property
    def is_on(self) -> bool:
        """Return True if option is set."""
        data = self.coordinator.data or {}
        if data.get("is_running"):
            return bool(data.get(self._field_name, False))
        staged = self.coordinator.staged_options.get(self._opt_key)
        if staged is not None:
            return bool(staged)
        return bool(data.get(self._field_name, False))

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Stage option ON."""
        self.coordinator.staged_options[self._opt_key] = 1
        if self._opt_key == "Opt7":
            self.coordinator.staged_options["Steam"] = "1"
        self.async_write_ha_state()
        self.coordinator.async_update_listeners()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Stage option OFF."""
        self.coordinator.staged_options[self._opt_key] = 0
        if self._opt_key == "Opt7":
            self.coordinator.staged_options["Steam"] = "0"
        self.async_write_ha_state()
        self.coordinator.async_update_listeners()


class CandyDishwasherOptionSwitch(CandyBaseSwitch):
    """Switch for dishwasher options."""

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        field_name: str,
        name: str,
        icon: str,
    ) -> None:
        """Initialize dishwasher option switch."""
        super().__init__(coordinator, field_name, name, icon=icon)
        self._field_name = field_name

    @property
    def is_on(self) -> bool:
        """Return True if option is active."""
        data = self.coordinator.data or {}
        if data.get("is_running"):
            return bool(data.get(self._field_name, False))
        staged = self.coordinator.staged_dw_options.get(self._field_name)
        if staged is not None:
            return bool(staged)
        return bool(data.get(self._field_name, False))

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Enable dishwasher option."""
        self.coordinator.staged_dw_options[self._field_name] = True
        self.async_write_ha_state()
        self.coordinator.async_update_listeners()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Disable dishwasher option."""
        self.coordinator.staged_dw_options[self._field_name] = False
        self.async_write_ha_state()
        self.coordinator.async_update_listeners()
