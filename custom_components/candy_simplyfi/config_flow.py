"""Config flow for Candy Simply-Fi Local integration with autodiscovery."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from urllib.parse import urlparse
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .client import CandyAuthError, CandyClientError, CandyConnectionError, CandyLocalClient
from .const import (
    APPLIANCE_TYPE_AUTO,
    APPLIANCE_TYPES,
    CONF_APPLIANCE_TYPE,
    CONF_AUTO_DETECT_KEY,
    CONF_ENCRYPTED,
    CONF_IP_ADDRESS,
    CONF_KEY,
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
)
from .discovery import async_discover_candy_devices, async_probe_candy_device

_LOGGER = logging.getLogger(__name__)

CONF_SELECT_DEVICE = "selected_device"
MANUAL_IP = "manual"


class CandySimplyFiConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Candy Simply-Fi with automatic discovery."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow."""
        self._discovered_host: Optional[str] = None
        self._discovered_name: Optional[str] = None

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Handle initial step: check for discovered devices or prompt user."""
        errors: Dict[str, str] = {}

        if user_input is not None:
            selected = user_input.get(CONF_SELECT_DEVICE)
            if selected:
                if selected == MANUAL_IP:
                    return await self.async_step_manual()
                self._discovered_host = selected
                self._discovered_name = f"Candy ({selected})"
                return await self.async_step_discovery_confirm()

            ip_address = user_input.get(CONF_IP_ADDRESS, "").strip()
            if ip_address:
                key = user_input.get(CONF_KEY, "").strip()
                appliance_type = user_input.get(CONF_APPLIANCE_TYPE, APPLIANCE_TYPE_AUTO)
                return await self._async_create_candy_entry(
                    ip_address=ip_address,
                    key=key,
                    appliance_type=appliance_type,
                    errors=errors,
                    step_id="manual",
                )

        # Proactively scan LAN for Candy devices
        discovered = await async_discover_candy_devices(self.hass, max_hosts_to_scan=40)
        if discovered:
            device_options = {d.host: d.name for d in discovered}
            device_options[MANUAL_IP] = "Inserisci indirizzo IP manualmente..."

            schema = vol.Schema(
                {
                    vol.Required(
                        CONF_SELECT_DEVICE, default=list(device_options.keys())[0]
                    ): vol.In(device_options)
                }
            )
            return self.async_show_form(
                step_id="user",
                data_schema=schema,
                errors=errors,
            )

        return await self.async_step_manual()

    async def async_step_manual(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Handle manual IP entry."""
        errors: Dict[str, str] = {}

        if user_input is not None:
            ip_address = user_input[CONF_IP_ADDRESS].strip()
            key = user_input.get(CONF_KEY, "").strip()
            appliance_type = user_input.get(CONF_APPLIANCE_TYPE, APPLIANCE_TYPE_AUTO)
            return await self._async_create_candy_entry(
                ip_address=ip_address,
                key=key,
                appliance_type=appliance_type,
                errors=errors,
                step_id="manual",
            )

        schema = vol.Schema(
            {
                vol.Required(CONF_IP_ADDRESS): str,
                vol.Optional(CONF_KEY, default=""): str,
                vol.Optional(CONF_AUTO_DETECT_KEY, default=True): bool,
                vol.Optional(CONF_APPLIANCE_TYPE, default=APPLIANCE_TYPE_AUTO): vol.In(
                    APPLIANCE_TYPES
                ),
            }
        )
        return self.async_show_form(
            step_id="manual",
            data_schema=schema,
            errors=errors,
            description_placeholders={
                "doc_url": "https://github.com/benedettosiddi/candysimply"
            },
        )

    async def async_step_zeroconf(
        self, discovery_info: Any
    ) -> config_entries.FlowResult:
        """Handle Zeroconf / mDNS discovery."""
        host = getattr(discovery_info, "host", "") or getattr(discovery_info, "ip_address", "")
        if not host:
            return self.async_abort(reason="cannot_connect")

        props = getattr(discovery_info, "properties", {}) or {}
        mac = props.get("mac")
        unique_id = f"candy_{mac.replace(':', '').lower()}" if mac else f"candy_{host.replace('.', '_')}"

        await self.async_set_unique_id(unique_id)
        self._abort_if_unique_id_configured(updates={CONF_IP_ADDRESS: host})

        session = async_get_clientsession(self.hass)
        probe = await async_probe_candy_device(host, session, timeout=1.2)
        if not probe:
            return self.async_abort(reason="not_candy_device")

        self._discovered_host = host
        self._discovered_name = probe.name
        _LOGGER.info("Zeroconf verified Candy appliance at %s (%s)", host, probe.name)
        return await self.async_step_discovery_confirm()

    async def async_step_dhcp(
        self, discovery_info: Any
    ) -> config_entries.FlowResult:
        """Handle DHCP discovery."""
        host = getattr(discovery_info, "ip", "")
        mac = getattr(discovery_info, "macaddress", "")
        if not host:
            return self.async_abort(reason="cannot_connect")

        unique_id = f"candy_{mac.replace(':', '').lower()}" if mac else f"candy_{host.replace('.', '_')}"
        await self.async_set_unique_id(unique_id)
        self._abort_if_unique_id_configured(updates={CONF_IP_ADDRESS: host})

        session = async_get_clientsession(self.hass)
        probe = await async_probe_candy_device(host, session, timeout=1.2)
        if not probe:
            return self.async_abort(reason="not_candy_device")

        self._discovered_host = host
        self._discovered_name = probe.name
        _LOGGER.info("DHCP verified Candy appliance: host=%s, name=%s", host, probe.name)
        return await self.async_step_discovery_confirm()

    async def async_step_ssdp(
        self, discovery_info: Any
    ) -> config_entries.FlowResult:
        """Handle SSDP discovery."""
        location = getattr(discovery_info, "ssdp_location", "")
        host = urlparse(location).hostname if location else ""
        if not host:
            return self.async_abort(reason="cannot_connect")

        unique_id = f"candy_{host.replace('.', '_')}"
        await self.async_set_unique_id(unique_id)
        self._abort_if_unique_id_configured(updates={CONF_IP_ADDRESS: host})

        session = async_get_clientsession(self.hass)
        probe = await async_probe_candy_device(host, session, timeout=1.2)
        if not probe:
            return self.async_abort(reason="not_candy_device")

        self._discovered_host = host
        self._discovered_name = probe.name
        _LOGGER.info("SSDP verified Candy appliance at %s (%s)", host, probe.name)
        return await self.async_step_discovery_confirm()

    async def async_step_discovery_confirm(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Confirm discovery of a Candy appliance."""
        errors: Dict[str, str] = {}
        host = self._discovered_host or ""

        if user_input is not None:
            key = user_input.get(CONF_KEY, "").strip()
            appliance_type = user_input.get(CONF_APPLIANCE_TYPE, APPLIANCE_TYPE_AUTO)
            return await self._async_create_candy_entry(
                ip_address=host,
                key=key,
                appliance_type=appliance_type,
                errors=errors,
                step_id="discovery_confirm",
            )

        schema = vol.Schema(
            {
                vol.Optional(CONF_KEY, default=""): str,
                vol.Optional(CONF_AUTO_DETECT_KEY, default=True): bool,
                vol.Optional(CONF_APPLIANCE_TYPE, default=APPLIANCE_TYPE_AUTO): vol.In(
                    APPLIANCE_TYPES
                ),
            }
        )

        return self.async_show_form(
            step_id="discovery_confirm",
            data_schema=schema,
            description_placeholders={
                "name": self._discovered_name or f"Candy ({host})",
                "ip": host,
            },
            errors=errors,
        )

    async def _async_create_candy_entry(
        self,
        ip_address: str,
        key: str,
        appliance_type: str,
        errors: Dict[str, str],
        step_id: str,
    ) -> config_entries.FlowResult:
        """Test and create Candy configuration entry."""
        session = async_get_clientsession(self.hass)
        client = CandyLocalClient(
            host=ip_address,
            key=key if key else None,
            session=session,
        )

        try:
            await client.async_read_status()
            final_key = client.key or key
            use_encryption = client.use_encryption
            detected_type = client.detected_appliance_type or appliance_type
            type_name = APPLIANCE_TYPES.get(detected_type, "Elettrodomestico")
            title = f"Candy {type_name} ({ip_address})"

            await self.async_set_unique_id(f"candy_{ip_address.replace('.', '_')}")
            self._abort_if_unique_id_configured()

            return self.async_create_entry(
                title=title,
                data={
                    CONF_IP_ADDRESS: ip_address,
                    CONF_KEY: final_key,
                    CONF_ENCRYPTED: use_encryption,
                    CONF_APPLIANCE_TYPE: detected_type,
                    CONF_UPDATE_INTERVAL: DEFAULT_UPDATE_INTERVAL,
                },
            )
        except CandyConnectionError:
            errors["base"] = "cannot_connect"
        except CandyAuthError:
            errors["base"] = "invalid_auth"
        except CandyClientError as err:
            _LOGGER.error("Candy setup error: %s", err)
            errors["base"] = "unknown"
        except Exception as err:
            _LOGGER.exception("Unexpected error during Candy setup: %s", err)
            errors["base"] = "unknown"

        schema = vol.Schema(
            {
                vol.Required(CONF_IP_ADDRESS, default=ip_address): str,
                vol.Optional(CONF_KEY, default=key): str,
                vol.Optional(CONF_AUTO_DETECT_KEY, default=True): bool,
                vol.Optional(CONF_APPLIANCE_TYPE, default=appliance_type): vol.In(
                    APPLIANCE_TYPES
                ),
            }
        )
        return self.async_show_form(
            step_id=step_id,
            data_schema=schema,
            errors=errors,
            description_placeholders={
                "name": self._discovered_name or f"Candy ({ip_address})",
                "ip": ip_address,
                "doc_url": "https://github.com/benedettosiddi/candysimply",
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return CandySimplyFiOptionsFlow(config_entry)


class CandySimplyFiOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for Candy Simply-Fi."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Manage options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        current_interval = self.config_entry.options.get(
            CONF_UPDATE_INTERVAL,
            self.config_entry.data.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL),
        )
        current_type = self.config_entry.options.get(
            CONF_APPLIANCE_TYPE,
            self.config_entry.data.get(CONF_APPLIANCE_TYPE, APPLIANCE_TYPE_AUTO),
        )

        schema = vol.Schema(
            {
                vol.Optional(
                    CONF_UPDATE_INTERVAL, default=current_interval
                ): vol.All(vol.Coerce(int), vol.Range(min=5, max=120)),
                vol.Optional(CONF_APPLIANCE_TYPE, default=current_type): vol.In(
                    APPLIANCE_TYPES
                ),
            }
        )

        return self.async_show_form(step_id="init", data_schema=schema)
