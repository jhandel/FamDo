"""WebSocket API for FamDo integration."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN

if TYPE_CHECKING:
    from .coordinator import FamDoCoordinator

_LOGGER = logging.getLogger(__name__)


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register WebSocket API handlers."""
    websocket_api.async_register_command(hass, websocket_get_data)
    websocket_api.async_register_command(hass, websocket_add_member)
    websocket_api.async_register_command(hass, websocket_update_member)
    websocket_api.async_register_command(hass, websocket_remove_member)
    websocket_api.async_register_command(hass, websocket_add_chore)
    websocket_api.async_register_command(hass, websocket_update_chore)
    websocket_api.async_register_command(hass, websocket_claim_chore)
    websocket_api.async_register_command(hass, websocket_complete_chore)
    websocket_api.async_register_command(hass, websocket_approve_chore)
    websocket_api.async_register_command(hass, websocket_reject_chore)
    websocket_api.async_register_command(hass, websocket_delete_chore)
    websocket_api.async_register_command(hass, websocket_add_reward)
    websocket_api.async_register_command(hass, websocket_update_reward)
    websocket_api.async_register_command(hass, websocket_claim_reward)
    websocket_api.async_register_command(hass, websocket_delete_reward)
    websocket_api.async_register_command(hass, websocket_add_todo)
    websocket_api.async_register_command(hass, websocket_update_todo)
    websocket_api.async_register_command(hass, websocket_complete_todo)
    websocket_api.async_register_command(hass, websocket_delete_todo)
    websocket_api.async_register_command(hass, websocket_add_event)
    websocket_api.async_register_command(hass, websocket_update_event)
    websocket_api.async_register_command(hass, websocket_delete_event)
    websocket_api.async_register_command(hass, websocket_update_settings)
    websocket_api.async_register_command(hass, websocket_subscribe)
    websocket_api.async_register_command(hass, websocket_get_ha_calendars)
    websocket_api.async_register_command(hass, websocket_get_ha_calendar_events)


def _get_coordinator(hass: HomeAssistant) -> FamDoCoordinator:
    """Get the FamDo coordinator."""
    return hass.data[DOMAIN]["coordinator"]


# ==================== Data Retrieval ====================


@websocket_api.websocket_command({vol.Required("type"): "famdo/get_data"})
@websocket_api.async_response
async def websocket_get_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get all FamDo data."""
    coordinator = _get_coordinator(hass)
    data = coordinator.famdo_data

    connection.send_result(msg["id"], data.to_dict())


# ==================== Subscription ====================


@websocket_api.websocket_command({vol.Required("type"): "famdo/subscribe"})
@websocket_api.async_response
async def websocket_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Subscribe to FamDo data updates."""
    coordinator = _get_coordinator(hass)

    @callback
    def async_update() -> None:
        """Send update to subscriber."""
        connection.send_message(
            websocket_api.event_message(
                msg["id"],
                {"data": coordinator.famdo_data.to_dict()},
            )
        )

    # Send initial data
    connection.send_result(msg["id"], coordinator.famdo_data.to_dict())

    # Subscribe to updates
    unsub = coordinator.async_add_listener(async_update)
    connection.subscriptions[msg["id"]] = unsub


# ==================== Member Management ====================


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/add_member",
        vol.Required("name"): str,
        vol.Optional("role", default="child"): str,
        vol.Optional("color", default="#4ECDC4"): str,
        vol.Optional("avatar", default="mdi:account"): str,
    }
)
@websocket_api.async_response
async def websocket_add_member(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a family member."""
    coordinator = _get_coordinator(hass)
    member = await coordinator.async_add_member(
        name=msg["name"],
        role=msg["role"],
        color=msg["color"],
        avatar=msg["avatar"],
    )
    connection.send_result(msg["id"], member.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/update_member",
        vol.Required("member_id"): str,
        vol.Optional("name"): str,
        vol.Optional("role"): str,
        vol.Optional("color"): str,
        vol.Optional("avatar"): str,
        vol.Optional("points"): int,
    }
)
@websocket_api.async_response
async def websocket_update_member(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a family member."""
    coordinator = _get_coordinator(hass)
    msg_id = msg["id"]
    member_id = msg["member_id"]

    # Extract only the update fields
    update_data = {}
    for key in ["name", "role", "color", "avatar", "points"]:
        if key in msg:
            update_data[key] = msg[key]

    member = await coordinator.async_update_member(member_id, **update_data)
    if member:
        connection.send_result(msg_id, member.to_dict())
    else:
        connection.send_error(msg_id, "not_found", "Member not found")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/remove_member",
        vol.Required("member_id"): str,
    }
)
@websocket_api.async_response
async def websocket_remove_member(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Remove a family member."""
    coordinator = _get_coordinator(hass)
    success = await coordinator.async_remove_member(msg["member_id"])
    connection.send_result(msg["id"], {"success": success})


# ==================== Chore Management ====================


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/add_chore",
        vol.Required("name"): str,
        vol.Optional("description", default=""): str,
        vol.Optional("points", default=10): int,
        vol.Optional("assigned_to"): vol.Any(str, None),
        vol.Optional("recurrence", default="none"): str,
        vol.Optional("due_date"): vol.Any(str, None),
        vol.Optional("due_time"): vol.Any(str, None),
        vol.Optional("icon", default="mdi:broom"): str,
    }
)
@websocket_api.async_response
async def websocket_add_chore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a chore."""
    coordinator = _get_coordinator(hass)
    chore = await coordinator.async_add_chore(
        name=msg["name"],
        description=msg.get("description", ""),
        points=msg.get("points", 10),
        assigned_to=msg.get("assigned_to"),
        recurrence=msg.get("recurrence", "none"),
        due_date=msg.get("due_date"),
        due_time=msg.get("due_time"),
        icon=msg.get("icon", "mdi:broom"),
    )
    connection.send_result(msg["id"], chore.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/update_chore",
        vol.Required("chore_id"): str,
        vol.Optional("name"): str,
        vol.Optional("description"): str,
        vol.Optional("points"): int,
        vol.Optional("assigned_to"): vol.Any(str, None),
        vol.Optional("recurrence"): str,
        vol.Optional("due_date"): vol.Any(str, None),
        vol.Optional("due_time"): vol.Any(str, None),
        vol.Optional("icon"): str,
        vol.Optional("status"): str,
    }
)
@websocket_api.async_response
async def websocket_update_chore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a chore."""
    coordinator = _get_coordinator(hass)
    chore_id = msg.pop("chore_id")
    msg.pop("type")
    msg_id = msg.pop("id")

    chore = await coordinator.async_update_chore(chore_id, **msg)
    if chore:
        connection.send_result(msg_id, chore.to_dict())
    else:
        connection.send_error(msg_id, "not_found", "Chore not found")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/claim_chore",
        vol.Required("chore_id"): str,
        vol.Required("member_id"): str,
    }
)
@websocket_api.async_response
async def websocket_claim_chore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Claim a chore."""
    coordinator = _get_coordinator(hass)
    chore = await coordinator.async_claim_chore(msg["chore_id"], msg["member_id"])
    if chore:
        connection.send_result(msg["id"], chore.to_dict())
    else:
        connection.send_error(msg["id"], "failed", "Could not claim chore")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/complete_chore",
        vol.Required("chore_id"): str,
        vol.Required("member_id"): str,
    }
)
@websocket_api.async_response
async def websocket_complete_chore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Complete a chore."""
    coordinator = _get_coordinator(hass)
    chore = await coordinator.async_complete_chore(msg["chore_id"], msg["member_id"])
    if chore:
        connection.send_result(msg["id"], chore.to_dict())
    else:
        connection.send_error(msg["id"], "failed", "Could not complete chore")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/approve_chore",
        vol.Required("chore_id"): str,
        vol.Required("approver_id"): str,
    }
)
@websocket_api.async_response
async def websocket_approve_chore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Approve a chore."""
    coordinator = _get_coordinator(hass)
    chore = await coordinator.async_approve_chore(msg["chore_id"], msg["approver_id"])
    if chore:
        connection.send_result(msg["id"], chore.to_dict())
    else:
        connection.send_error(msg["id"], "failed", "Could not approve chore")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/reject_chore",
        vol.Required("chore_id"): str,
        vol.Required("approver_id"): str,
    }
)
@websocket_api.async_response
async def websocket_reject_chore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reject a chore."""
    coordinator = _get_coordinator(hass)
    chore = await coordinator.async_reject_chore(msg["chore_id"], msg["approver_id"])
    if chore:
        connection.send_result(msg["id"], chore.to_dict())
    else:
        connection.send_error(msg["id"], "failed", "Could not reject chore")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/delete_chore",
        vol.Required("chore_id"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_chore(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a chore."""
    coordinator = _get_coordinator(hass)
    success = await coordinator.async_delete_chore(msg["chore_id"])
    connection.send_result(msg["id"], {"success": success})


# ==================== Reward Management ====================


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/add_reward",
        vol.Required("name"): str,
        vol.Optional("description", default=""): str,
        vol.Optional("points_cost", default=50): int,
        vol.Optional("icon", default="mdi:gift"): str,
        vol.Optional("image_url"): vol.Any(str, None),
        vol.Optional("quantity", default=-1): int,
    }
)
@websocket_api.async_response
async def websocket_add_reward(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a reward."""
    coordinator = _get_coordinator(hass)
    reward = await coordinator.async_add_reward(
        name=msg["name"],
        description=msg.get("description", ""),
        points_cost=msg.get("points_cost", 50),
        icon=msg.get("icon", "mdi:gift"),
        image_url=msg.get("image_url"),
        quantity=msg.get("quantity", -1),
    )
    connection.send_result(msg["id"], reward.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/update_reward",
        vol.Required("reward_id"): str,
        vol.Optional("name"): str,
        vol.Optional("description"): str,
        vol.Optional("points_cost"): int,
        vol.Optional("icon"): str,
        vol.Optional("image_url"): vol.Any(str, None),
        vol.Optional("quantity"): int,
        vol.Optional("available"): bool,
    }
)
@websocket_api.async_response
async def websocket_update_reward(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a reward."""
    coordinator = _get_coordinator(hass)
    reward_id = msg.pop("reward_id")
    msg.pop("type")
    msg_id = msg.pop("id")

    reward = await coordinator.async_update_reward(reward_id, **msg)
    if reward:
        connection.send_result(msg_id, reward.to_dict())
    else:
        connection.send_error(msg_id, "not_found", "Reward not found")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/claim_reward",
        vol.Required("reward_id"): str,
        vol.Required("member_id"): str,
    }
)
@websocket_api.async_response
async def websocket_claim_reward(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Claim a reward."""
    coordinator = _get_coordinator(hass)
    claim = await coordinator.async_claim_reward(msg["reward_id"], msg["member_id"])
    if claim:
        connection.send_result(msg["id"], claim.to_dict())
    else:
        connection.send_error(msg["id"], "failed", "Could not claim reward")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/delete_reward",
        vol.Required("reward_id"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_reward(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a reward."""
    coordinator = _get_coordinator(hass)
    success = await coordinator.async_delete_reward(msg["reward_id"])
    connection.send_result(msg["id"], {"success": success})


# ==================== Todo Management ====================


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/add_todo",
        vol.Required("title"): str,
        vol.Optional("description", default=""): str,
        vol.Optional("assigned_to"): vol.Any(str, None),
        vol.Optional("due_date"): vol.Any(str, None),
        vol.Optional("priority", default="normal"): str,
        vol.Optional("category", default="general"): str,
        vol.Optional("created_by"): vol.Any(str, None),
    }
)
@websocket_api.async_response
async def websocket_add_todo(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a todo item."""
    coordinator = _get_coordinator(hass)
    todo = await coordinator.async_add_todo(
        title=msg["title"],
        description=msg.get("description", ""),
        assigned_to=msg.get("assigned_to"),
        due_date=msg.get("due_date"),
        priority=msg.get("priority", "normal"),
        category=msg.get("category", "general"),
        created_by=msg.get("created_by"),
    )
    connection.send_result(msg["id"], todo.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/update_todo",
        vol.Required("todo_id"): str,
        vol.Optional("title"): str,
        vol.Optional("description"): str,
        vol.Optional("assigned_to"): vol.Any(str, None),
        vol.Optional("due_date"): vol.Any(str, None),
        vol.Optional("priority"): str,
        vol.Optional("category"): str,
        vol.Optional("completed"): bool,
    }
)
@websocket_api.async_response
async def websocket_update_todo(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a todo item."""
    coordinator = _get_coordinator(hass)
    todo_id = msg.pop("todo_id")
    msg.pop("type")
    msg_id = msg.pop("id")

    todo = await coordinator.async_update_todo(todo_id, **msg)
    if todo:
        connection.send_result(msg_id, todo.to_dict())
    else:
        connection.send_error(msg_id, "not_found", "Todo not found")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/complete_todo",
        vol.Required("todo_id"): str,
    }
)
@websocket_api.async_response
async def websocket_complete_todo(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Complete a todo item."""
    coordinator = _get_coordinator(hass)
    todo = await coordinator.async_complete_todo(msg["todo_id"])
    if todo:
        connection.send_result(msg["id"], todo.to_dict())
    else:
        connection.send_error(msg["id"], "not_found", "Todo not found")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/delete_todo",
        vol.Required("todo_id"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_todo(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a todo item."""
    coordinator = _get_coordinator(hass)
    success = await coordinator.async_delete_todo(msg["todo_id"])
    connection.send_result(msg["id"], {"success": success})


# ==================== Calendar Event Management ====================


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/add_event",
        vol.Required("title"): str,
        vol.Required("start_date"): str,
        vol.Optional("description", default=""): str,
        vol.Optional("end_date"): vol.Any(str, None),
        vol.Optional("start_time"): vol.Any(str, None),
        vol.Optional("end_time"): vol.Any(str, None),
        vol.Optional("all_day", default=True): bool,
        vol.Optional("member_ids"): vol.Any(list, None),
        vol.Optional("color"): vol.Any(str, None),
        vol.Optional("recurrence", default="none"): str,
        vol.Optional("location", default=""): str,
    }
)
@websocket_api.async_response
async def websocket_add_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Add a calendar event."""
    coordinator = _get_coordinator(hass)
    event = await coordinator.async_add_event(
        title=msg["title"],
        start_date=msg["start_date"],
        description=msg.get("description", ""),
        end_date=msg.get("end_date"),
        start_time=msg.get("start_time"),
        end_time=msg.get("end_time"),
        all_day=msg.get("all_day", True),
        member_ids=msg.get("member_ids"),
        color=msg.get("color"),
        recurrence=msg.get("recurrence", "none"),
        location=msg.get("location", ""),
    )
    connection.send_result(msg["id"], event.to_dict())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/update_event",
        vol.Required("event_id"): str,
        vol.Optional("title"): str,
        vol.Optional("description"): str,
        vol.Optional("start_date"): str,
        vol.Optional("end_date"): vol.Any(str, None),
        vol.Optional("start_time"): vol.Any(str, None),
        vol.Optional("end_time"): vol.Any(str, None),
        vol.Optional("all_day"): bool,
        vol.Optional("member_ids"): vol.Any(list, None),
        vol.Optional("color"): vol.Any(str, None),
        vol.Optional("recurrence"): str,
        vol.Optional("location"): str,
    }
)
@websocket_api.async_response
async def websocket_update_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update a calendar event."""
    coordinator = _get_coordinator(hass)
    event_id = msg.pop("event_id")
    msg.pop("type")
    msg_id = msg.pop("id")

    event = await coordinator.async_update_event(event_id, **msg)
    if event:
        connection.send_result(msg_id, event.to_dict())
    else:
        connection.send_error(msg_id, "not_found", "Event not found")


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/delete_event",
        vol.Required("event_id"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_event(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Delete a calendar event."""
    coordinator = _get_coordinator(hass)
    success = await coordinator.async_delete_event(msg["event_id"])
    connection.send_result(msg["id"], {"success": success})


# ==================== Settings ====================


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/update_settings",
        vol.Optional("family_name"): str,
        vol.Optional("selected_calendars"): list,
        vol.Optional("calendar_colors"): dict,
        vol.Optional("time_format"): str,  # "12h" or "24h"
    }
)
@websocket_api.async_response
async def websocket_update_settings(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update settings."""
    coordinator = _get_coordinator(hass)
    msg.pop("type")
    msg_id = msg.pop("id")

    if "family_name" in msg:
        await coordinator.async_update_family_name(msg.pop("family_name"))

    if "selected_calendars" in msg:
        await coordinator.async_update_settings(selected_calendars=msg.pop("selected_calendars"))

    if "calendar_colors" in msg:
        await coordinator.async_update_settings(calendar_colors=msg.pop("calendar_colors"))

    if "time_format" in msg:
        await coordinator.async_update_settings(time_format=msg.pop("time_format"))

    if msg:
        await coordinator.async_update_settings(**msg)

    connection.send_result(msg_id, {"success": True})


# ==================== Home Assistant Calendar Integration ====================


@websocket_api.websocket_command({vol.Required("type"): "famdo/get_ha_calendars"})
@websocket_api.async_response
async def websocket_get_ha_calendars(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get list of Home Assistant calendar entities."""
    calendars = []
    for entity_id in hass.states.async_entity_ids("calendar"):
        state = hass.states.get(entity_id)
        if state:
            calendars.append({
                "entity_id": entity_id,
                "name": state.attributes.get("friendly_name", entity_id),
            })
    connection.send_result(msg["id"], {"calendars": calendars})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "famdo/get_ha_calendar_events",
        vol.Required("entity_id"): str,
        vol.Required("start"): str,
        vol.Required("end"): str,
    }
)
@websocket_api.async_response
async def websocket_get_ha_calendar_events(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Get events from a Home Assistant calendar entity."""
    from datetime import datetime

    entity_id = msg["entity_id"]
    start = datetime.fromisoformat(msg["start"])
    end = datetime.fromisoformat(msg["end"])

    try:
        # Use the calendar component to get events
        calendar_component = hass.data.get("calendar")
        if calendar_component:
            entity = calendar_component.get_entity(entity_id)
            if entity and hasattr(entity, "async_get_events"):
                events = await entity.async_get_events(hass, start, end)
                event_list = []
                for event in events:
                    event_list.append({
                        "summary": event.summary,
                        "start": event.start.isoformat() if event.start else None,
                        "end": event.end.isoformat() if event.end else None,
                        "description": event.description,
                        "location": event.location,
                        "uid": getattr(event, "uid", None),
                    })
                connection.send_result(msg["id"], {"events": event_list})
                return

        # Fallback: try using service call
        connection.send_result(msg["id"], {"events": []})
    except Exception as e:
        _LOGGER.error("Error fetching calendar events: %s", e)
        connection.send_result(msg["id"], {"events": []})
