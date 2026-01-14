"""Config flow for FamDo integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN, CONF_FAMILY_NAME

_LOGGER = logging.getLogger(__name__)


class FamDoConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for FamDo."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        # Check if already configured (single instance only)
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        errors: dict[str, str] = {}

        if user_input is not None:
            return self.async_create_entry(
                title=user_input.get(CONF_FAMILY_NAME, "FamDo"),
                data=user_input,
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_FAMILY_NAME, default="My Family"): str,
                }
            ),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> FamDoOptionsFlow:
        """Get the options flow."""
        return FamDoOptionsFlow(config_entry)


class FamDoOptionsFlow(config_entries.OptionsFlow):
    """Handle FamDo options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_FAMILY_NAME,
                        default=self.config_entry.data.get(
                            CONF_FAMILY_NAME, "My Family"
                        ),
                    ): str,
                }
            ),
        )
