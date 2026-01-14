"""FamDo - Family Dashboard integration for Home Assistant."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
import voluptuous as vol

from .const import (
    DOMAIN,
    CONF_FAMILY_NAME,
    SERVICE_ADD_MEMBER,
    SERVICE_REMOVE_MEMBER,
    SERVICE_ADD_CHORE,
    SERVICE_COMPLETE_CHORE,
    SERVICE_APPROVE_CHORE,
    SERVICE_REJECT_CHORE,
    SERVICE_ADD_REWARD,
    SERVICE_CLAIM_REWARD,
    SERVICE_ADD_TODO,
    SERVICE_COMPLETE_TODO,
    SERVICE_ADD_EVENT,
)
from .coordinator import FamDoCoordinator
from .storage import FamDoStore
from .websocket_api import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.CALENDAR]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up FamDo from a config entry."""
    _LOGGER.debug("Setting up FamDo integration")

    # Initialize storage
    store = FamDoStore(hass)
    await store.async_load()

    # Update family name from config if changed
    family_name = entry.data.get(CONF_FAMILY_NAME, "My Family")
    if store.data.family_name != family_name:
        store.data.family_name = family_name
        await store.async_save()

    # Initialize coordinator
    coordinator = FamDoCoordinator(hass, store)
    await coordinator.async_config_entry_first_refresh()

    # Store references
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["coordinator"] = coordinator
    hass.data[DOMAIN]["store"] = store

    # Register WebSocket API
    async_register_websocket_api(hass)

    # Register services
    await async_register_services(hass, coordinator)

    # Register panel
    await async_register_panel(hass)

    # Set up platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        hass.data.pop(DOMAIN, None)

    return unload_ok


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the FamDo panel."""
    # Serve frontend from within the integration directory
    frontend_path = Path(__file__).parent / "www"

    await hass.http.async_register_static_paths(
        [StaticPathConfig("/famdo", str(frontend_path), cache_headers=False)]
    )

    async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title="FamDo",
        sidebar_icon="mdi:home-heart",
        frontend_url_path="famdo",
        config={"url": "/famdo/index.html"},
        require_admin=False,
    )


async def async_register_services(
    hass: HomeAssistant, coordinator: FamDoCoordinator
) -> None:
    """Register FamDo services."""

    async def handle_add_member(call: ServiceCall) -> None:
        """Handle add member service."""
        await coordinator.async_add_member(
            name=call.data["name"],
            role=call.data.get("role", "child"),
            color=call.data.get("color", "#4ECDC4"),
            avatar=call.data.get("avatar", "mdi:account"),
        )

    async def handle_remove_member(call: ServiceCall) -> None:
        """Handle remove member service."""
        await coordinator.async_remove_member(call.data["member_id"])

    async def handle_add_chore(call: ServiceCall) -> None:
        """Handle add chore service."""
        await coordinator.async_add_chore(
            name=call.data["name"],
            description=call.data.get("description", ""),
            points=call.data.get("points", 10),
            assigned_to=call.data.get("assigned_to"),
            recurrence=call.data.get("recurrence", "none"),
            due_date=call.data.get("due_date"),
            due_time=call.data.get("due_time"),
            icon=call.data.get("icon", "mdi:broom"),
        )

    async def handle_complete_chore(call: ServiceCall) -> None:
        """Handle complete chore service."""
        await coordinator.async_complete_chore(
            call.data["chore_id"],
            call.data["member_id"],
        )

    async def handle_approve_chore(call: ServiceCall) -> None:
        """Handle approve chore service."""
        await coordinator.async_approve_chore(
            call.data["chore_id"],
            call.data["approver_id"],
        )

    async def handle_reject_chore(call: ServiceCall) -> None:
        """Handle reject chore service."""
        await coordinator.async_reject_chore(
            call.data["chore_id"],
            call.data["approver_id"],
        )

    async def handle_add_reward(call: ServiceCall) -> None:
        """Handle add reward service."""
        await coordinator.async_add_reward(
            name=call.data["name"],
            description=call.data.get("description", ""),
            points_cost=call.data.get("points_cost", 50),
            icon=call.data.get("icon", "mdi:gift"),
            image_url=call.data.get("image_url"),
            quantity=call.data.get("quantity", -1),
        )

    async def handle_claim_reward(call: ServiceCall) -> None:
        """Handle claim reward service."""
        await coordinator.async_claim_reward(
            call.data["reward_id"],
            call.data["member_id"],
        )

    async def handle_add_todo(call: ServiceCall) -> None:
        """Handle add todo service."""
        await coordinator.async_add_todo(
            title=call.data["title"],
            description=call.data.get("description", ""),
            assigned_to=call.data.get("assigned_to"),
            due_date=call.data.get("due_date"),
            priority=call.data.get("priority", "normal"),
            category=call.data.get("category", "general"),
            created_by=call.data.get("created_by"),
        )

    async def handle_complete_todo(call: ServiceCall) -> None:
        """Handle complete todo service."""
        await coordinator.async_complete_todo(call.data["todo_id"])

    async def handle_add_event(call: ServiceCall) -> None:
        """Handle add event service."""
        await coordinator.async_add_event(
            title=call.data["title"],
            start_date=call.data["start_date"],
            description=call.data.get("description", ""),
            end_date=call.data.get("end_date"),
            start_time=call.data.get("start_time"),
            end_time=call.data.get("end_time"),
            all_day=call.data.get("all_day", True),
            member_ids=call.data.get("member_ids"),
            color=call.data.get("color"),
            recurrence=call.data.get("recurrence", "none"),
            location=call.data.get("location", ""),
        )

    # Register all services
    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_MEMBER,
        handle_add_member,
        schema=vol.Schema(
            {
                vol.Required("name"): str,
                vol.Optional("role", default="child"): str,
                vol.Optional("color", default="#4ECDC4"): str,
                vol.Optional("avatar", default="mdi:account"): str,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REMOVE_MEMBER,
        handle_remove_member,
        schema=vol.Schema({vol.Required("member_id"): str}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_CHORE,
        handle_add_chore,
        schema=vol.Schema(
            {
                vol.Required("name"): str,
                vol.Optional("description", default=""): str,
                vol.Optional("points", default=10): int,
                vol.Optional("assigned_to"): str,
                vol.Optional("recurrence", default="none"): str,
                vol.Optional("due_date"): str,
                vol.Optional("due_time"): str,
                vol.Optional("icon", default="mdi:broom"): str,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_COMPLETE_CHORE,
        handle_complete_chore,
        schema=vol.Schema(
            {
                vol.Required("chore_id"): str,
                vol.Required("member_id"): str,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_APPROVE_CHORE,
        handle_approve_chore,
        schema=vol.Schema(
            {
                vol.Required("chore_id"): str,
                vol.Required("approver_id"): str,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_REJECT_CHORE,
        handle_reject_chore,
        schema=vol.Schema(
            {
                vol.Required("chore_id"): str,
                vol.Required("approver_id"): str,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_REWARD,
        handle_add_reward,
        schema=vol.Schema(
            {
                vol.Required("name"): str,
                vol.Optional("description", default=""): str,
                vol.Optional("points_cost", default=50): int,
                vol.Optional("icon", default="mdi:gift"): str,
                vol.Optional("image_url"): str,
                vol.Optional("quantity", default=-1): int,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_CLAIM_REWARD,
        handle_claim_reward,
        schema=vol.Schema(
            {
                vol.Required("reward_id"): str,
                vol.Required("member_id"): str,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_TODO,
        handle_add_todo,
        schema=vol.Schema(
            {
                vol.Required("title"): str,
                vol.Optional("description", default=""): str,
                vol.Optional("assigned_to"): str,
                vol.Optional("due_date"): str,
                vol.Optional("priority", default="normal"): str,
                vol.Optional("category", default="general"): str,
                vol.Optional("created_by"): str,
            }
        ),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_COMPLETE_TODO,
        handle_complete_todo,
        schema=vol.Schema({vol.Required("todo_id"): str}),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_ADD_EVENT,
        handle_add_event,
        schema=vol.Schema(
            {
                vol.Required("title"): str,
                vol.Required("start_date"): str,
                vol.Optional("description", default=""): str,
                vol.Optional("end_date"): str,
                vol.Optional("start_time"): str,
                vol.Optional("end_time"): str,
                vol.Optional("all_day", default=True): bool,
                vol.Optional("member_ids"): list,
                vol.Optional("color"): str,
                vol.Optional("recurrence", default="none"): str,
                vol.Optional("location", default=""): str,
            }
        ),
    )
