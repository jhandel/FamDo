"""Calendar platform for FamDo integration."""
from __future__ import annotations

from datetime import datetime, date, timedelta
import logging
from typing import Any

from homeassistant.components.calendar import (
    CalendarEntity,
    CalendarEvent as HACalendarEvent,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import FamDoCoordinator
from .models import CalendarEvent, Chore

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up FamDo calendar."""
    coordinator: FamDoCoordinator = hass.data[DOMAIN]["coordinator"]

    entities = [
        FamDoCalendar(coordinator),
        FamDoChoresCalendar(coordinator),
    ]

    async_add_entities(entities)


class FamDoCalendar(CoordinatorEntity[FamDoCoordinator], CalendarEntity):
    """Calendar for family events."""

    _attr_has_entity_name = True
    _attr_name = "Family Calendar"

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the calendar."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_family_calendar"
        self._event: HACalendarEvent | None = None

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

    @property
    def event(self) -> HACalendarEvent | None:
        """Return the next upcoming event."""
        today = date.today()
        now = datetime.now()

        upcoming = []
        for event in self.coordinator.famdo_data.events:
            try:
                start = date.fromisoformat(event.start_date)
                if start >= today:
                    upcoming.append(event)
            except (ValueError, TypeError):
                continue

        if not upcoming:
            return None

        # Sort by start date
        upcoming.sort(key=lambda x: x.start_date)
        next_event = upcoming[0]

        return self._convert_event(next_event)

    def _convert_event(self, event: CalendarEvent) -> HACalendarEvent:
        """Convert FamDo event to Home Assistant calendar event."""
        start_date = date.fromisoformat(event.start_date)

        if event.all_day:
            end_date = date.fromisoformat(event.end_date) if event.end_date else start_date
            return HACalendarEvent(
                summary=event.title,
                start=start_date,
                end=end_date + timedelta(days=1),  # HA expects end to be exclusive
                description=event.description,
                location=event.location,
                uid=event.id,
            )
        else:
            # Timed event
            start_time = event.start_time or "00:00"
            end_time = event.end_time or "23:59"

            start_parts = start_time.split(":")
            end_parts = end_time.split(":")

            start_dt = datetime.combine(
                start_date,
                datetime.strptime(f"{start_parts[0]}:{start_parts[1] if len(start_parts) > 1 else '00'}", "%H:%M").time(),
            )

            end_date = date.fromisoformat(event.end_date) if event.end_date else start_date
            end_dt = datetime.combine(
                end_date,
                datetime.strptime(f"{end_parts[0]}:{end_parts[1] if len(end_parts) > 1 else '00'}", "%H:%M").time(),
            )

            return HACalendarEvent(
                summary=event.title,
                start=start_dt,
                end=end_dt,
                description=event.description,
                location=event.location,
                uid=event.id,
            )

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[HACalendarEvent]:
        """Return events in a date range."""
        events = []
        start = start_date.date() if isinstance(start_date, datetime) else start_date
        end = end_date.date() if isinstance(end_date, datetime) else end_date

        for event in self.coordinator.famdo_data.events:
            try:
                event_start = date.fromisoformat(event.start_date)
                event_end = (
                    date.fromisoformat(event.end_date)
                    if event.end_date
                    else event_start
                )

                # Check if event overlaps with the requested range
                if event_start <= end and event_end >= start:
                    events.append(self._convert_event(event))
            except (ValueError, TypeError):
                continue

        return events


class FamDoChoresCalendar(CoordinatorEntity[FamDoCoordinator], CalendarEntity):
    """Calendar for chores with due dates."""

    _attr_has_entity_name = True
    _attr_name = "Chores Calendar"

    def __init__(self, coordinator: FamDoCoordinator) -> None:
        """Initialize the calendar."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{DOMAIN}_chores_calendar"

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

    @property
    def event(self) -> HACalendarEvent | None:
        """Return the next upcoming chore."""
        today = date.today()

        upcoming = []
        for chore in self.coordinator.famdo_data.chores:
            if chore.due_date and chore.status not in ["completed"]:
                try:
                    due = date.fromisoformat(chore.due_date)
                    if due >= today:
                        upcoming.append(chore)
                except (ValueError, TypeError):
                    continue

        if not upcoming:
            return None

        # Sort by due date
        upcoming.sort(key=lambda x: x.due_date)
        next_chore = upcoming[0]

        return self._convert_chore(next_chore)

    def _convert_chore(self, chore: Chore) -> HACalendarEvent:
        """Convert FamDo chore to Home Assistant calendar event."""
        due_date = date.fromisoformat(chore.due_date) if chore.due_date else date.today()

        # Get member name if assigned
        member_name = ""
        if chore.assigned_to:
            member = self.coordinator.famdo_data.get_member_by_id(chore.assigned_to)
            if member:
                member_name = f" ({member.name})"

        summary = f"{chore.name}{member_name} - {chore.points} pts"

        if chore.due_time:
            time_parts = chore.due_time.split(":")
            due_dt = datetime.combine(
                due_date,
                datetime.strptime(f"{time_parts[0]}:{time_parts[1] if len(time_parts) > 1 else '00'}", "%H:%M").time(),
            )
            return HACalendarEvent(
                summary=summary,
                start=due_dt,
                end=due_dt + timedelta(hours=1),
                description=chore.description,
                uid=f"chore_{chore.id}",
            )
        else:
            return HACalendarEvent(
                summary=summary,
                start=due_date,
                end=due_date + timedelta(days=1),
                description=chore.description,
                uid=f"chore_{chore.id}",
            )

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[HACalendarEvent]:
        """Return chores in a date range."""
        events = []
        start = start_date.date() if isinstance(start_date, datetime) else start_date
        end = end_date.date() if isinstance(end_date, datetime) else end_date

        for chore in self.coordinator.famdo_data.chores:
            if chore.due_date:
                try:
                    due = date.fromisoformat(chore.due_date)
                    if start <= due <= end:
                        events.append(self._convert_chore(chore))
                except (ValueError, TypeError):
                    continue

        return events
