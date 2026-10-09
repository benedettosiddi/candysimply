"""Sensor platform for Candy Simply-Fi integration."""

from __future__ import annotations

from typing import Any, Dict, Optional

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    APPLIANCE_TYPE_DISHWASHER,
    DISHWASHER_MODES,
    DOMAIN,
    DRYING_LEVELS,
    WASHER_MODES,
    WASHER_PHASES,
    get_device_model_name,
)
from .coordinator import CandyDataUpdateCoordinator
from .programs import (
    format_remaining_time,
    get_dishwasher_program_by_code,
    get_washer_program_by_pr,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Candy sensors based on a config entry."""
    coordinator: CandyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    appliance_type = coordinator.appliance_type

    entities: list[SensorEntity] = [
        CandyStatusSensor(coordinator),
        CandyProgramSensor(coordinator),
        CandyRemainingTimeSensor(coordinator),
        CandyErrorCodeSensor(coordinator),
    ]

    if appliance_type != APPLIANCE_TYPE_DISHWASHER:
        entities.extend(
            [
                CandyProgramPhaseSensor(coordinator),
                CandyTemperatureSensor(coordinator),
                CandySpinSpeedSensor(coordinator),
                CandyDryingSensor(coordinator),
            ]
        )

    async_add_entities(entities)


class CandyBaseSensor(CoordinatorEntity[CandyDataUpdateCoordinator], SensorEntity):
    """Base sensor for Candy appliances."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        key: str,
        name: str,
        icon: Optional[str] = None,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._key = key
        self._attr_translation_key = key
        self._attr_name = name
        if icon:
            self._attr_icon = icon
        self._attr_unique_id = f"{coordinator.unique_id}_{key}"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device information."""
        model = get_device_model_name(self.coordinator.appliance_type)

        return DeviceInfo(
            identifiers={(DOMAIN, self.coordinator.unique_id)},
            name=f"Candy {model}",
            manufacturer="Candy / Hoover",
            model=model,
            sw_version="1.0 (Local API)",
            configuration_url=f"http://{self.coordinator.client.host}",
        )


class CandyStatusSensor(CandyBaseSensor):
    """Sensor reporting the main machine status."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize status sensor."""
        icon = (
            "mdi:dishwasher"
            if coordinator.appliance_type == APPLIANCE_TYPE_DISHWASHER
            else "mdi:washing-machine"
        )
        super().__init__(coordinator, "status", "Stato Elettrodomestico", icon=icon)

    @property
    def native_value(self) -> str:
        """Return the current operating mode description."""
        data = self.coordinator.data or {}
        if self.coordinator.appliance_type == APPLIANCE_TYPE_DISHWASHER:
            if not data.get("is_running") and not data.get("is_paused"):
                if data.get("is_finished"):
                    return "Ciclo terminato"
                return "In attesa / Standby"
            mode = str(data.get("stato_dwash", "1"))
            return DISHWASHER_MODES.get(mode, f"Stato {mode}")
        
        mode = str(data.get("mach_md", "1"))
        return WASHER_MODES.get(mode, f"Stato {mode}")

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return detailed machine attributes."""
        data = self.coordinator.data or {}
        return {
            "is_running": data.get("is_running", False),
            "is_paused": data.get("is_paused", False),
            "is_finished": data.get("is_finished", False),
            "remote_control_ready": data.get("remote_control_enabled", True),
        }


class CandyProgramSensor(CandyBaseSensor):
    """Sensor reporting the selected/running program name."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize program sensor."""
        super().__init__(coordinator, "program", "Programma Attivo", icon="mdi:playlist-play")

    @property
    def native_value(self) -> str:
        """Return human-readable program name."""
        data = self.coordinator.data or {}
        if self.coordinator.appliance_type == APPLIANCE_TYPE_DISHWASHER:
            code = data.get("program", "P1")
            prog = get_dishwasher_program_by_code(code)
            if prog:
                return f"{prog.name_it} ({prog.code})"
            return f"Programma {code}"

        pr_val = data.get("pr", 0)
        pr_code_val = data.get("pr_code")
        prog = get_washer_program_by_pr(pr_val, pr_code_val)
        if prog:
            return prog.name_it
        if pr_val > 0:
            return f"Programma {pr_val}"
        return "Nessun programma selezionato"

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return additional program metadata."""
        data = self.coordinator.data or {}
        if self.coordinator.appliance_type == APPLIANCE_TYPE_DISHWASHER:
            code = data.get("program", "P1")
            prog = get_dishwasher_program_by_code(code)
            if prog:
                return {
                    "program_code": prog.code,
                    "target_temp_c": prog.temp,
                    "duration_approx_min": prog.duration_approx,
                    "description": prog.description,
                }
            return {"program_code": code}

        pr_val = data.get("pr", 0)
        pr_code_val = data.get("pr_code")
        prog = get_washer_program_by_pr(pr_val, pr_code_val)
        if prog:
            return {
                "dial_position": prog.pr,
                "program_code": prog.pr_code,
                "supports_drying": prog.supports_drying,
                "description": prog.description,
            }
        return {"dial_position": pr_val, "pr_code": pr_code_val}


class CandyProgramPhaseSensor(CandyBaseSensor):
    """Sensor reporting the current wash/dry cycle phase."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize cycle phase sensor."""
        super().__init__(coordinator, "phase", "Fase del Ciclo", icon="mdi:progress-clock")

    @property
    def native_value(self) -> str:
        """Return phase description."""
        data = self.coordinator.data or {}
        phase_raw = str(data.get("pr_ph", "0"))
        pr_code = data.get("pr_code")
        if pr_code == 45 and phase_raw == "2":
            return "Generazione Vapore & Distensione Fibre"
        return WASHER_PHASES.get(phase_raw, f"Fase {phase_raw}")


class CandyRemainingTimeSensor(CandyBaseSensor):
    """Sensor reporting remaining cycle time."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize remaining time sensor."""
        super().__init__(coordinator, "remaining_time", "Tempo Rimanente", icon="mdi:timer-outline")

    @property
    def native_value(self) -> str:
        """Return formatted remaining time string."""
        data = self.coordinator.data or {}
        raw_val = data.get("rem_time_raw", 0)
        is_dw = self.coordinator.appliance_type == APPLIANCE_TYPE_DISHWASHER
        return format_remaining_time(raw_val, is_dishwasher=is_dw)

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return raw seconds and minutes."""
        data = self.coordinator.data or {}
        raw = data.get("rem_time_raw", 0)
        is_dw = self.coordinator.appliance_type == APPLIANCE_TYPE_DISHWASHER
        try:
            val = int(raw)
            minutes = val if is_dw else round(val / 60)
        except (ValueError, TypeError):
            val = 0
            minutes = 0
        return {"raw_value": val, "remaining_minutes": minutes, "is_dishwasher": is_dw}


class CandyTemperatureSensor(CandyBaseSensor):
    """Sensor reporting current water temperature."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize temperature sensor."""
        super().__init__(coordinator, "temperature", "Temperatura Selezionata", icon="mdi:thermometer")

    @property
    def native_value(self) -> Optional[int]:
        """Return temperature in °C."""
        data = self.coordinator.data or {}
        temp = data.get("temp")
        return temp if temp is not None and temp > 0 else 0


class CandySpinSpeedSensor(CandyBaseSensor):
    """Sensor reporting current spin speed."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "RPM"

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize spin speed sensor."""
        super().__init__(coordinator, "spin_speed", "Velocità Centrifuga", icon="mdi:rotate-right")

    @property
    def native_value(self) -> Optional[int]:
        """Return spin speed in RPM."""
        data = self.coordinator.data or {}
        return data.get("spin_speed", 0)


class CandyDryingSensor(CandyBaseSensor):
    """Sensor reporting drying level or duration."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize drying level sensor."""
        super().__init__(coordinator, "drying_level", "Livello / Modalità Asciugatura", icon="mdi:tumble-dryer")

    @property
    def native_value(self) -> str:
        """Return drying level name."""
        data = self.coordinator.data or {}
        dry_t = str(data.get("dry_t", "0"))
        return DRYING_LEVELS.get(dry_t, f"Livello {dry_t}")


class CandyErrorCodeSensor(CandyBaseSensor):
    """Sensor reporting current error code and diagnostics."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize error code sensor."""
        super().__init__(coordinator, "error_code", "Codice Diagnostico / Errore", icon="mdi:alert-circle-outline")

    @property
    def native_value(self) -> str:
        """Return error code."""
        data = self.coordinator.data or {}
        return data.get("error_code", "E0")

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        """Return diagnostic description."""
        data = self.coordinator.data or {}
        return {
            "description": data.get("error_description", "Nessun errore rilevato"),
            "has_error": data.get("error_code", "E0") not in ("E0", "0", ""),
        }
