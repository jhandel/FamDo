"""Sensor platform for FamDo integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, CHORE_STATUS_PENDING, CHORE_STATUS_AWAITING_APPROVAL
from .coordinator import FamDoCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up FamDo sensors."""
    coordinator: FamDoCoordinator = hass.data[DOMAIN]["coordinator"]

    entities: list[SensorEntity] = [
        FamDoFamilySensor(coordinator),
        FamDoPendingChoresSensor(coordinator),
        FamDoAwaitingApprovalSensor(coordinator),
        FamDoTotalPointsSensor(coordinator),
        FamDoActiveTodosSensor(coordinator),
        FamDoUpcomingEventsSensor(coordinator),
    ]

    # Add per-member point sensors
    for member in coordinator.famdo_data.members:
        entities.append(FamDoMemberPointsSensor(coordinator, member.id))

    async_add_entities(entities)

    # Listen for member changes to add new sensors
    @callback
    def async_check_new_members() -> None:
        """Check for new members and add sensors."""
        existing_member_ids = {
            e._member_id
            for e in entities
            if isinstance(e, FamDoMemberPointsSensor)
        }
        new_members = [
            m
            for m in coordinator.famdo_data.members
            if m.id not in existing_member_ids
        ]
        if new_members:
            new_entities = [
                FamDoMemberPointsSensor(coordinator, m.id) for m in new_members
            ]
            entities.extend(new_entities)
            async_add_entities(new_entities)

    entry.async_on_unload(coordinator.async_add_listener(async_check_new_members))


class FamDoBaseSensor(CoordinatorEntity[FamDoCoordinator], SensorEntity):
    """Base class for FamDo sensors."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info."""
        return DeviceInfo(
            identifiers={(DOMAIN, "famdo")},
            name=f"FamDo - {self.coordinator.famdo_data.family_name}",
            manufacturer="FamDo",
            model="Family Dashboard",
            sw_version="1.0.0",
        )


class FamDoFamilySensor(FamDoBaseSensor):
    """Sensor showing family information."""

    _attr_name = "Family Overview"
    _attr_icon = "mdi:home-heart"

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_family_overview"

    @property
    def native_value(self) -> str:
        """Return the family name."""
        return self.coordinator.famdo_data.family_name

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes."""
        data = self.coordinator.famdo_data
        return {
            "member_count": len(data.members),
            "chore_count": len(data.chores),
            "reward_count": len(data.rewards),
            "todo_count": len(data.todos),
            "event_count": len(data.events),
            "members": [
                {"id": m.id, "name": m.name, "role": m.role, "points": m.points}
                for m in data.members
            ],
        }


class FamDoPendingChoresSensor(FamDoBaseSensor):
    """Sensor showing pending chores count."""

    _attr_name = "Pending Chores"
    _attr_icon = "mdi:clipboard-list"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_pending_chores"

    @property
    def native_value(self) -> int:
        """Return count of pending chores."""
        return len(
            [
                c
                for c in self.coordinator.famdo_data.chores
                if c.status == CHORE_STATUS_PENDING
            ]
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return pending chores details."""
        pending = [
            c
            for c in self.coordinator.famdo_data.chores
            if c.status == CHORE_STATUS_PENDING
        ]
        return {
            "chores": [
                {
                    "id": c.id,
                    "name": c.name,
                    "points": c.points,
                    "assigned_to": c.assigned_to,
                    "due_date": c.due_date,
                }
                for c in pending
            ]
        }


class FamDoAwaitingApprovalSensor(FamDoBaseSensor):
    """Sensor showing chores awaiting approval."""

    _attr_name = "Chores Awaiting Approval"
    _attr_icon = "mdi:clipboard-check"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_awaiting_approval"

    @property
    def native_value(self) -> int:
        """Return count of chores awaiting approval."""
        return len(
            [
                c
                for c in self.coordinator.famdo_data.chores
                if c.status == CHORE_STATUS_AWAITING_APPROVAL
            ]
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return chores awaiting approval details."""
        awaiting = [
            c
            for c in self.coordinator.famdo_data.chores
            if c.status == CHORE_STATUS_AWAITING_APPROVAL
        ]
        return {
            "chores": [
                {
                    "id": c.id,
                    "name": c.name,
                    "points": c.points,
                    "claimed_by": c.claimed_by,
                    "completed_at": c.completed_at,
                }
                for c in awaiting
            ]
        }


class FamDoTotalPointsSensor(FamDoBaseSensor):
    """Sensor showing total family points."""

    _attr_name = "Total Family Points"
    _attr_icon = "mdi:star"
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_total_points"

    @property
    def native_value(self) -> int:
        """Return total points across all members."""
        return sum(m.points for m in self.coordinator.famdo_data.members)


class FamDoMemberPointsSensor(FamDoBaseSensor):
    """Sensor showing individual member points."""

    _attr_icon = "mdi:star-circle"
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(self, coordinator: FamDoCoordinator, member_id: str) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._member_id = member_id
        self._attr_unique_id = f"{DOMAIN}_member_{member_id}_points"

    @property
    def name(self) -> str:
        """Return sensor name."""
        member = self.coordinator.famdo_data.get_member_by_id(self._member_id)
        if member:
            return f"{member.name} Points"
        return "Unknown Member Points"

    @property
    def native_value(self) -> int:
        """Return member's points."""
        member = self.coordinator.famdo_data.get_member_by_id(self._member_id)
        return member.points if member else 0

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return member details."""
        member = self.coordinator.famdo_data.get_member_by_id(self._member_id)
        if not member:
            return {}

        # Count completed chores
        completed = len(
            [
                c
                for c in self.coordinator.famdo_data.chores
                if c.claimed_by == self._member_id and c.status == "completed"
            ]
        )

        return {
            "member_id": member.id,
            "name": member.name,
            "role": member.role,
            "color": member.color,
            "avatar": member.avatar,
            "completed_chores": completed,
        }

    @property
    def available(self) -> bool:
        """Return if sensor is available."""
        return self.coordinator.famdo_data.get_member_by_id(self._member_id) is not None


class FamDoActiveTodosSensor(FamDoBaseSensor):
    """Sensor showing active todos count."""

    _attr_name = "Active Todos"
    _attr_icon = "mdi:format-list-checks"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_active_todos"

    @property
    def native_value(self) -> int:
        """Return count of active todos."""
        return len(
            [t for t in self.coordinator.famdo_data.todos if not t.completed]
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return active todos details."""
        active = [t for t in self.coordinator.famdo_data.todos if not t.completed]
        return {
            "todos": [
                {
                    "id": t.id,
                    "title": t.title,
                    "priority": t.priority,
                    "assigned_to": t.assigned_to,
                    "due_date": t.due_date,
                }
                for t in active
            ]
        }


class FamDoUpcomingEventsSensor(FamDoBaseSensor):
    """Sensor showing upcoming events count."""

    _attr_name = "Upcoming Events"
    _attr_icon = "mdi:calendar"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_upcoming_events"

    @property
    def native_value(self) -> int:
        """Return count of upcoming events."""
        from datetime import date

        today = date.today().isoformat()
        return len(
            [e for e in self.coordinator.famdo_data.events if e.start_date >= today]
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return upcoming events details."""
        from datetime import date

        today = date.today().isoformat()
        upcoming = [
            e for e in self.coordinator.famdo_data.events if e.start_date >= today
        ]
        upcoming.sort(key=lambda x: x.start_date)
        return {
            "events": [
                {
                    "id": e.id,
                    "title": e.title,
                    "start_date": e.start_date,
                    "member_ids": e.member_ids,
                    "location": e.location,
                }
                for e in upcoming[:10]  # Limit to 10 upcoming events
            ]
        }
