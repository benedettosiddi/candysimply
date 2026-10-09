"""Binary sensor platform for Candy Simply-Fi integration."""

from __future__ import annotations

from typing import Optional

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
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
    """Set up Candy binary sensors based on a config entry."""
    coordinator: CandyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    appliance_type = coordinator.appliance_type

    entities: list[BinarySensorEntity] = [
        CandyRunningBinarySensor(coordinator),
        CandyProblemBinarySensor(coordinator),
    ]

    if appliance_type == APPLIANCE_TYPE_DISHWASHER:
        entities.extend(
            [
                CandyDoorOpenBinarySensor(coordinator),
                CandyMissSaltBinarySensor(coordinator),
                CandyMissRinseBinarySensor(coordinator),
                CandyHalfLoadBinarySensor(coordinator),
                CandyTabsBinarySensor(coordinator),
                CandyExtraDryBinarySensor(coordinator),
                CandyOpenDoorOptBinarySensor(coordinator),
            ]
        )
    else:
        entities.extend(
            [
                CandyDoorLockedBinarySensor(coordinator),
                CandyRemoteControlBinarySensor(coordinator),
                CandyDryingActiveBinarySensor(coordinator),
                CandyOptionBinarySensor(coordinator, "opt1_prewash", "Prelavaggio Attivo", "mdi:washing-machine"),
                CandyOptionBinarySensor(coordinator, "opt2_hygiene", "Igiene+ Attivo", "mdi:shield-check"),
                CandyOptionBinarySensor(coordinator, "opt3_extra_rinse", "Risciacquo Extra Attivo", "mdi:water-plus"),
                CandyOptionBinarySensor(coordinator, "opt4_easy_iron", "Stiro Facile Attivo", "mdi:iron"),
                CandyOptionBinarySensor(coordinator, "opt7_steam", "Trattamento Vapore Attivo", "mdi:cloud-outline"),
            ]
        )

    async_add_entities(entities)


class CandyBaseBinarySensor(CoordinatorEntity[CandyDataUpdateCoordinator], BinarySensorEntity):
    """Base binary sensor for Candy appliances."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        key: str,
        name: str,
        device_class: Optional[BinarySensorDeviceClass] = None,
        icon: Optional[str] = None,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)
        self._key = key
        self._attr_translation_key = key
        self._attr_name = name
        if device_class:
            self._attr_device_class = device_class
        if icon:
            self._attr_icon = icon
        self._attr_unique_id = f"{coordinator.unique_id}_{key}"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device information."""
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


class CandyRunningBinarySensor(CandyBaseBinarySensor):
    """Binary sensor indicating if the appliance is currently running."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize running sensor."""
        super().__init__(
            coordinator,
            "running",
            "In Funzione",
            device_class=BinarySensorDeviceClass.RUNNING,
        )

    @property
    def is_on(self) -> bool:
        """Return True if machine is currently executing a program."""
        data = self.coordinator.data or {}
        return data.get("is_running", False)


class CandyProblemBinarySensor(CandyBaseBinarySensor):
    """Binary sensor indicating if a fault or error code is present."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize problem sensor."""
        super().__init__(
            coordinator,
            "problem",
            "Anomalia / Errore",
            device_class=BinarySensorDeviceClass.PROBLEM,
        )

    @property
    def is_on(self) -> bool:
        """Return True if an error is detected."""
        data = self.coordinator.data or {}
        err = data.get("error_code", "E0")
        return err not in ("E0", "0", "", None)


# --- Washer Specific Binary Sensors ---

class CandyDoorLockedBinarySensor(CandyBaseBinarySensor):
    """Binary sensor indicating door lock status."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize door lock sensor."""
        super().__init__(
            coordinator,
            "door_locked",
            "Oblò Bloccato (Sicurezza)",
            device_class=BinarySensorDeviceClass.LOCK,
            icon="mdi:door-closed-lock",
        )

    @property
    def is_on(self) -> bool:
        """Return True if door is locked (not safe to open)."""
        data = self.coordinator.data or {}
        # False means unlocked, True means locked
        return not data.get("door_locked", False)


class CandyRemoteControlBinarySensor(CandyBaseBinarySensor):
    """Binary sensor indicating if physical knob is in Wi-Fi position."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize remote control sensor."""
        super().__init__(
            coordinator,
            "remote_control",
            "Controllo Remoto Abilitato (Manopola su Wi-Fi)",
            icon="mdi:remote",
        )

    @property
    def is_on(self) -> bool:
        """Return True if knob is set to Wi-Fi to accept commands."""
        data = self.coordinator.data or {}
        return data.get("remote_control_enabled", True)


class CandyDryingActiveBinarySensor(CandyBaseBinarySensor):
    """Binary sensor indicating if drying phase is currently active."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize drying sensor."""
        super().__init__(
            coordinator,
            "drying_active",
            "Fase Asciugatura Attiva",
            icon="mdi:tumble-dryer",
        )

    @property
    def is_on(self) -> bool:
        """Return True if currently drying."""
        data = self.coordinator.data or {}
        return data.get("is_drying", False)


class CandyOptionBinarySensor(CandyBaseBinarySensor):
    """Binary sensor for custom wash option flags."""

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        field_name: str,
        name: str,
        icon: str,
    ) -> None:
        """Initialize option sensor."""
        super().__init__(coordinator, field_name, name, icon=icon)
        self._field_name = field_name

    @property
    def is_on(self) -> bool:
        """Return True if option flag is set."""
        data = self.coordinator.data or {}
        return bool(data.get(self._field_name, False))


# --- Dishwasher Specific Binary Sensors ---

class CandyDoorOpenBinarySensor(CandyBaseBinarySensor):
    """Binary sensor for dishwasher door open status."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize door open sensor."""
        super().__init__(
            coordinator,
            "door_open",
            "Sportello Aperto",
            device_class=BinarySensorDeviceClass.DOOR,
        )

    @property
    def is_on(self) -> bool:
        """Return True if door is physically open."""
        data = self.coordinator.data or {}
        return data.get("door_open", False)


class CandyMissSaltBinarySensor(CandyBaseBinarySensor):
    """Binary sensor warning when salt container is empty."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize salt warning sensor."""
        super().__init__(
            coordinator,
            "missing_salt",
            "Mancanza Sale Rigenerante",
            device_class=BinarySensorDeviceClass.PROBLEM,
            icon="mdi:shaker-outline",
        )

    @property
    def is_on(self) -> bool:
        """Return True if salt is missing."""
        data = self.coordinator.data or {}
        return data.get("miss_salt", False)


class CandyMissRinseBinarySensor(CandyBaseBinarySensor):
    """Binary sensor warning when rinse aid is empty."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize rinse aid warning sensor."""
        super().__init__(
            coordinator,
            "missing_rinse_aid",
            "Mancanza Brillantante",
            device_class=BinarySensorDeviceClass.PROBLEM,
            icon="mdi:bottle-tonic-outline",
        )

    @property
    def is_on(self) -> bool:
        """Return True if rinse aid is missing."""
        data = self.coordinator.data or {}
        return data.get("miss_rinse", False)


class CandyHalfLoadBinarySensor(CandyBaseBinarySensor):
    """Binary sensor for half load option."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize half load sensor."""
        super().__init__(coordinator, "half_load_active", "Mezzo Carico Attivo", icon="mdi:fraction-one-half")

    @property
    def is_on(self) -> bool:
        """Return True if half load is active."""
        data = self.coordinator.data or {}
        return data.get("half_load", False)


class CandyTabsBinarySensor(CandyBaseBinarySensor):
    """Binary sensor for 3-in-1 tab mode."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize tab sensor."""
        super().__init__(coordinator, "tabs_3in1_active", "Pastiglia 3-in-1 Attiva", icon="mdi:pill")

    @property
    def is_on(self) -> bool:
        """Return True if 3-in-1 tab mode is enabled."""
        data = self.coordinator.data or {}
        return data.get("tabs_3in1", False)


class CandyExtraDryBinarySensor(CandyBaseBinarySensor):
    """Binary sensor for extra dry option."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize extra dry sensor."""
        super().__init__(coordinator, "extra_dry_active", "Asciugatura Extra Attiva", icon="mdi:weather-sunny")

    @property
    def is_on(self) -> bool:
        """Return True if extra dry is enabled."""
        data = self.coordinator.data or {}
        return data.get("extra_dry", False)


class CandyOpenDoorOptBinarySensor(CandyBaseBinarySensor):
    """Binary sensor for automatic door opening at end of cycle."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize smart door opening sensor."""
        super().__init__(
            coordinator,
            "smart_door_open_active",
            "Apertura Automatica Sportello Fine Ciclo",
            icon="mdi:door-open",
        )

    @property
    def is_on(self) -> bool:
        """Return True if smart door open option is enabled."""
        data = self.coordinator.data or {}
        return data.get("open_door_opt", False)
