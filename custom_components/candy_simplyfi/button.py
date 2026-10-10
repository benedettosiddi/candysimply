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

from .const import APPLIANCE_TYPE_DISHWASHER, DOMAIN, get_device_model_name
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
        model = get_device_model_name(self.coordinator.appliance_type)
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

        # Note remote control state (log info, do not block prematurely to avoid cache race conditions)
        if not data.get("remote_control_enabled", True):
            _LOGGER.info(
                "Remote control not reported active in cache for %s. Sending command anyway in case of cache delay.",
                client.host,
            )

        if app_type == APPLIANCE_TYPE_DISHWASHER:
            # Dishwasher Start
            staged_prog: Optional[DishwasherProgram] = self.coordinator.staged_dw_program or data.get("staged_dw_program")
            prog_code = staged_prog.code if staged_prog else data.get("program", "P1")

            half_load = bool(self.coordinator.staged_dw_options.get("half_load", data.get("half_load", False)))
            tabs_3in1 = bool(self.coordinator.staged_dw_options.get("tabs_3in1", data.get("tabs_3in1", False)))
            extra_dry = bool(self.coordinator.staged_dw_options.get("extra_dry", data.get("extra_dry", False)))
            open_door = bool(self.coordinator.staged_dw_options.get("open_door_opt", data.get("open_door_opt", False)))
            eco = bool(self.coordinator.staged_dw_options.get("eco", data.get("eco", False)))
            delay = int(self.coordinator.staged_delay_start)

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
            staged_prog: Optional[WasherProgram] = self.coordinator.staged_program or data.get("staged_program")
            if not staged_prog:
                # Default to Cottons if none explicitly staged
                staged_prog = list(WASHER_PROGRAMS.values())[0]

            temp = self.coordinator.staged_temp if self.coordinator.staged_temp is not None else staged_prog.default_temp
            spin = self.coordinator.staged_spin if self.coordinator.staged_spin is not None else staged_prog.default_spin
            dry_t = self.coordinator.staged_dry_time
            if dry_t is None and staged_prog:
                dry_t = getattr(staged_prog, "default_dry_time", None)
            if getattr(staged_prog, "is_dry_only", False) and (dry_t is None or dry_t == 0):
                dry_t = 2

            opts = dict(self.coordinator.staged_options)
            delay = int(self.coordinator.staged_delay_start)

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

        # Allow appliance microcontroller time to transition state before querying
        import asyncio
        await asyncio.sleep(2.5)
        await self.coordinator.async_request_refresh()


class CandyPauseButton(CandyBaseButton):
    """Button to pause current cycle."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize pause button."""
        super().__init__(coordinator, "pause", "Metti in Pausa", icon="mdi:pause-circle")

    async def async_press(self) -> None:
        """Send pause command."""
        await self.coordinator.client.async_pause()
        import asyncio
        await asyncio.sleep(2.0)
        await self.coordinator.async_request_refresh()


class CandyStopResetButton(CandyBaseButton):
    """Button to cancel and reset current cycle."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize stop button."""
        super().__init__(coordinator, "stop_reset", "Annulla / Stop Ciclo", icon="mdi:stop-circle")

    async def async_press(self) -> None:
        """Send stop/reset command."""
        await self.coordinator.client.async_stop_or_reset()
        import asyncio
        await asyncio.sleep(2.0)
        await self.coordinator.async_request_refresh()


class CandyBeepBuzzerButton(CandyBaseButton):
    """Button to trigger audible chime."""

    def __init__(self, coordinator: CandyDataUpdateCoordinator) -> None:
        """Initialize buzzer button."""
        super().__init__(coordinator, "buzzer", "Segnale Acustico / Bip", icon="mdi:volume-high")

    async def async_press(self) -> None:
        """Sound buzzer on appliance."""
        await self.coordinator.client.async_beep_buzzer()
