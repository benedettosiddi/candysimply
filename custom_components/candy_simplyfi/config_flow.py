"""Config flow for Candy Simply-Fi Local integration."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
import homeassistant.helpers.config_validation as cv

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

_LOGGER = logging.getLogger(__name__)


class CandySimplyFiConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Candy Simply-Fi."""

    VERSION = 1

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> config_entries.FlowResult:
        """Handle the initial step."""
        errors: Dict[str, str] = {}

        if user_input is not None:
            ip_address = user_input[CONF_IP_ADDRESS].strip()
            key = user_input.get(CONF_KEY, "").strip()
            auto_detect = user_input.get(CONF_AUTO_DETECT_KEY, True)
            appliance_type = user_input.get(CONF_APPLIANCE_TYPE, APPLIANCE_TYPE_AUTO)

            session = async_get_clientsession(self.hass)
            client = CandyLocalClient(
                host=ip_address,
                key=key if key else None,
                session=session,
            )

            try:
                # Test connectivity and attempt status read
                data = await client.async_read_status()
                
                # Check if client recovered a key
                final_key = client.key or key
                use_encryption = client.use_encryption

                # Infer device title
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
                vol.Required(CONF_IP_ADDRESS): str,
                vol.Optional(
                    CONF_KEY,
                    default="",
                    description={"suggested_value": ""},
                ): str,
                vol.Optional(CONF_AUTO_DETECT_KEY, default=True): bool,
                vol.Optional(CONF_APPLIANCE_TYPE, default=APPLIANCE_TYPE_AUTO): vol.In(
                    APPLIANCE_TYPES
                ),
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
            description_placeholders={
                "doc_url": "https://github.com/benedettosiddi/candysimply"
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
