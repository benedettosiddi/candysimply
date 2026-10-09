"""Button platform for Candy Simply-Fi appliance execution controls."""

from __future__ import annotations

import logging
from typing import Optional

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import APPLIANCE_TYPE_DISHWASHER, DOMAIN
from .coordinator import CandyDataUpdateCoordinator
from .programs import (
    DISHWASHER_PROGRAMS,
    WASHER_PROGRAMS,
    DishwasherProgram,
    WasherProgram,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Candy buttons based on a config entry."""
    coordinator: CandyDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    entities: list[ButtonEntity] = [
        CandyStartProgramButton(coordinator),
        CandyPauseButton(coordinator),
        CandyStopResetButton(coordinator),
        CandyBeepBuzzerButton(coordinator),
    ]

    async_add_entities(entities)


class CandyBaseButton(CoordinatorEntity[CandyDataUpdateCoordinator], ButtonEntity):
    """Base button entity for Candy appliances."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: CandyDataUpdateCoordinator,
        key: str,
        name: str,
        icon: Optional[str] = None,
    ) -> None:
        """Initialize button."""
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


class CandyStartProgramButton(CandyBaseButton):
    """Button to start the selected cycle with all staged options."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize start button."""
        super().__init__(coordinator, "start_program", "Avvia Programma Selezionato", icon="mdi:play-circle")

    async def async_press(self) -> None:
        """Execute the start command."""
        data = self.coordinator.data or {}
        client = self.coordinator.client
        app_type = self.coordinator.appliance_type

        if app_type == APPLIANCE_TYPE_DISHWASHER:
            # Dishwasher Start
            staged_prog: Optional[DishwasherProgram] = data.get("staged_dw_program")
            prog_code = staged_prog.code if staged_prog else data.get("program", "P1")

            half_load = bool(data.get("staged_half_load", data.get("half_load", False)))
            tabs_3in1 = bool(data.get("staged_tabs_3in1", data.get("tabs_3in1", False)))
            extra_dry = bool(data.get("staged_extra_dry", data.get("extra_dry", False)))
            open_door = bool(data.get("staged_open_door_opt", data.get("open_door_opt", False)))
            eco = bool(data.get("staged_eco", data.get("eco", False)))
            delay = int(data.get("staged_delay_start", 0))

            _LOGGER.info(
                "Starting dishwasher %s: program=%s, half_load=%s, tabs=%s, extra_dry=%s, delay=%s",
                client.host,
                prog_code,
                half_load,
                tabs_3in1,
                extra_dry,
                delay,
            )
            await client.async_start_program_dishwasher(
                program_code=prog_code,
                half_load=half_load,
                tabs_3in1=tabs_3in1,
                extra_dry=extra_dry,
                open_door=open_door,
                eco=eco,
                delay_hours=delay,
            )

        else:
            # Washer / Washer-Dryer Start
            staged_prog: Optional[WasherProgram] = data.get("staged_program")
            if not staged_prog:
                # Default to Cottons if none explicitly staged
                staged_prog = list(WASHER_PROGRAMS.values())[0]

            temp = data.get("staged_temp", staged_prog.default_temp)
            spin = data.get("staged_spin", staged_prog.default_spin)
            dry_t = data.get("staged_dry_time")
            opts = data.get("staged_options", {})
            delay = int(data.get("staged_delay_start", 0))

            _LOGGER.info(
                "Starting washer %s: pr=%s (%s), pr_code=%s, temp=%s, spin=%s, dry=%s, delay=%s",
                client.host,
                staged_prog.pr,
                staged_prog.name_it,
                staged_prog.pr_code,
                temp,
                spin,
                dry_t,
                delay,
            )
            await client.async_start_program_washer(
                pr=staged_prog.pr,
                pr_code=staged_prog.pr_code,
                temp=temp,
                spin=spin,
                dry_time=dry_t,
                options=opts,
                delay_hours=delay,
            )

        await self.coordinator.async_request_refresh()


class CandyPauseButton(CandyBaseButton):
    """Button to pause current cycle."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize pause button."""
        super().__init__(coordinator, "pause", "Metti in Pausa", icon="mdi:pause-circle")

    async def async_press(self) -> None:
        """Send pause command."""
        await self.coordinator.client.async_pause()
        await self.coordinator.async_request_refresh()


class CandyStopResetButton(CandyBaseButton):
    """Button to cancel and reset current cycle."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize stop button."""
        super().__init__(coordinator, "stop_reset", "Annulla / Stop Ciclo", icon="mdi:stop-circle")

    async def async_press(self) -> None:
        """Send stop/reset command."""
        await self.coordinator.client.async_stop_or_reset()
        await self.coordinator.async_request_refresh()


class CandyBeepBuzzerButton(CandyBaseButton):
    """Button to trigger audible chime."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize buzzer button."""
        super().__init__(coordinator, "buzzer", "Segnale Acustico / Bip", icon="mdi:volume-high")

    async def async_press(self) -> None:
        """Sound buzzer on appliance."""
        await self.coordinator.client.async_beep_buzzer()
