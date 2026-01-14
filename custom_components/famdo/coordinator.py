"""DataUpdateCoordinator for FamDo integration."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import (
    DOMAIN,
    EVENT_CHORE_COMPLETED,
    EVENT_POINTS_UPDATED,
    EVENT_REWARD_CLAIMED,
    CHORE_STATUS_PENDING,
    CHORE_STATUS_CLAIMED,
    CHORE_STATUS_AWAITING_APPROVAL,
    CHORE_STATUS_COMPLETED,
    CHORE_STATUS_REJECTED,
    CHORE_STATUS_OVERDUE,
    RECURRENCE_DAILY,
    RECURRENCE_WEEKLY,
    RECURRENCE_MONTHLY,
    ROLE_PARENT,
)
from .models import (
    FamilyMember,
    Chore,
    Reward,
    RewardClaim,
    TodoItem,
    CalendarEvent,
    FamDoData,
)
from .storage import FamDoStore

_LOGGER = logging.getLogger(__name__)


class FamDoCoordinator(DataUpdateCoordinator[FamDoData]):
    """Coordinator for FamDo data."""

    def __init__(self, hass: HomeAssistant, store: FamDoStore) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(minutes=1),  # Check for overdue chores
        )
        self.store = store
        self._data: FamDoData | None = None

    async def _async_update_data(self) -> FamDoData:
        """Fetch data and check for overdue chores."""
        if self._data is None:
            self._data = await self.store.async_load()

        # Check for overdue chores
        await self._check_overdue_chores()

        # Reset recurring chores
        await self._reset_recurring_chores()

        return self._data

    async def _check_overdue_chores(self) -> None:
        """Mark overdue chores."""
        if self._data is None:
            return

        now = datetime.now()
        changed = False

        for chore in self._data.chores:
            if chore.status in [CHORE_STATUS_PENDING, CHORE_STATUS_CLAIMED]:
                if chore.due_date:
                    due = datetime.fromisoformat(chore.due_date)
                    if chore.due_time:
                        time_parts = chore.due_time.split(":")
                        due = due.replace(
                            hour=int(time_parts[0]),
                            minute=int(time_parts[1]) if len(time_parts) > 1 else 0,
                        )
                    if now > due:
                        chore.status = CHORE_STATUS_OVERDUE
                        changed = True

        if changed:
            await self.store.async_save()

    async def _reset_recurring_chores(self) -> None:
        """Reset completed recurring chores when due."""
        if self._data is None:
            return

        now = datetime.now()
        changed = False

        for chore in self._data.chores:
            if chore.status == CHORE_STATUS_COMPLETED and chore.recurrence != "none":
                if chore.last_reset:
                    last_reset = datetime.fromisoformat(chore.last_reset)
                else:
                    last_reset = datetime.fromisoformat(chore.completed_at) if chore.completed_at else now

                should_reset = False
                if chore.recurrence == RECURRENCE_DAILY:
                    should_reset = (now - last_reset) >= timedelta(days=1)
                elif chore.recurrence == RECURRENCE_WEEKLY:
                    should_reset = (now - last_reset) >= timedelta(weeks=1)
                elif chore.recurrence == RECURRENCE_MONTHLY:
                    should_reset = (now - last_reset) >= timedelta(days=30)

                if should_reset:
                    chore.status = CHORE_STATUS_PENDING
                    chore.claimed_by = None
                    chore.completed_at = None
                    chore.approved_by = None
                    chore.last_reset = now.isoformat()
                    # Update due date if set
                    if chore.due_date:
                        old_due = datetime.fromisoformat(chore.due_date)
                        if chore.recurrence == RECURRENCE_DAILY:
                            new_due = old_due + timedelta(days=1)
                        elif chore.recurrence == RECURRENCE_WEEKLY:
                            new_due = old_due + timedelta(weeks=1)
                        elif chore.recurrence == RECURRENCE_MONTHLY:
                            new_due = old_due + timedelta(days=30)
                        else:
                            new_due = old_due
                        chore.due_date = new_due.date().isoformat()
                    changed = True

        if changed:
            await self.store.async_save()
            self.async_set_updated_data(self._data)

    @property
    def famdo_data(self) -> FamDoData:
        """Get the FamDo data."""
        if self._data is None:
            raise RuntimeError("Data not loaded")
        return self._data

    # ==================== Member Management ====================

    async def async_add_member(
        self,
        name: str,
        role: str = "child",
        color: str = "#4ECDC4",
        avatar: str = "mdi:account",
    ) -> FamilyMember:
        """Add a new family member."""
        member = FamilyMember(
            name=name,
            role=role,
            color=color,
            avatar=avatar,
        )
        self.famdo_data.members.append(member)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return member

    async def async_update_member(
        self,
        member_id: str,
        **kwargs: Any,
    ) -> FamilyMember | None:
        """Update a family member."""
        member = self.famdo_data.get_member_by_id(member_id)
        if member is None:
            return None

        for key, value in kwargs.items():
            if hasattr(member, key):
                setattr(member, key, value)

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return member

    async def async_remove_member(self, member_id: str) -> bool:
        """Remove a family member."""
        member = self.famdo_data.get_member_by_id(member_id)
        if member is None:
            return False

        self.famdo_data.members.remove(member)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return True

    async def async_add_points(self, member_id: str, points: int) -> int | None:
        """Add points to a member."""
        member = self.famdo_data.get_member_by_id(member_id)
        if member is None:
            return None

        member.points += points
        await self.store.async_save()

        self.hass.bus.async_fire(
            EVENT_POINTS_UPDATED,
            {"member_id": member_id, "points": member.points, "added": points},
        )

        self.async_set_updated_data(self._data)
        return member.points

    # ==================== Chore Management ====================

    async def async_add_chore(
        self,
        name: str,
        description: str = "",
        points: int = 10,
        assigned_to: str | None = None,
        recurrence: str = "none",
        due_date: str | None = None,
        due_time: str | None = None,
        icon: str = "mdi:broom",
    ) -> Chore:
        """Add a new chore."""
        chore = Chore(
            name=name,
            description=description,
            points=points,
            assigned_to=assigned_to,
            recurrence=recurrence,
            due_date=due_date,
            due_time=due_time,
            icon=icon,
        )
        self.famdo_data.chores.append(chore)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return chore

    async def async_update_chore(
        self,
        chore_id: str,
        **kwargs: Any,
    ) -> Chore | None:
        """Update a chore."""
        chore = self.famdo_data.get_chore_by_id(chore_id)
        if chore is None:
            return None

        for key, value in kwargs.items():
            if hasattr(chore, key):
                setattr(chore, key, value)

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return chore

    async def async_claim_chore(self, chore_id: str, member_id: str) -> Chore | None:
        """Claim a chore for a member."""
        chore = self.famdo_data.get_chore_by_id(chore_id)
        if chore is None:
            return None

        if chore.status not in [CHORE_STATUS_PENDING, CHORE_STATUS_OVERDUE]:
            return None

        chore.status = CHORE_STATUS_CLAIMED
        chore.claimed_by = member_id
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return chore

    async def async_complete_chore(self, chore_id: str, member_id: str) -> Chore | None:
        """Mark a chore as completed (awaiting approval)."""
        chore = self.famdo_data.get_chore_by_id(chore_id)
        if chore is None:
            return None

        if chore.claimed_by != member_id:
            return None

        chore.status = CHORE_STATUS_AWAITING_APPROVAL
        chore.completed_at = datetime.now().isoformat()
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return chore

    async def async_approve_chore(
        self, chore_id: str, approver_id: str
    ) -> Chore | None:
        """Approve a completed chore and award points."""
        chore = self.famdo_data.get_chore_by_id(chore_id)
        if chore is None:
            return None

        # Verify approver is a parent
        approver = self.famdo_data.get_member_by_id(approver_id)
        if approver is None or approver.role != ROLE_PARENT:
            _LOGGER.warning("Only parents can approve chores")
            return None

        if chore.status != CHORE_STATUS_AWAITING_APPROVAL:
            return None

        chore.status = CHORE_STATUS_COMPLETED
        chore.approved_by = approver_id

        # Award points
        if chore.claimed_by:
            await self.async_add_points(chore.claimed_by, chore.points)

        self.hass.bus.async_fire(
            EVENT_CHORE_COMPLETED,
            {
                "chore_id": chore_id,
                "member_id": chore.claimed_by,
                "points": chore.points,
            },
        )

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return chore

    async def async_reject_chore(
        self, chore_id: str, approver_id: str
    ) -> Chore | None:
        """Reject a completed chore."""
        chore = self.famdo_data.get_chore_by_id(chore_id)
        if chore is None:
            return None

        # Verify approver is a parent
        approver = self.famdo_data.get_member_by_id(approver_id)
        if approver is None or approver.role != ROLE_PARENT:
            return None

        if chore.status != CHORE_STATUS_AWAITING_APPROVAL:
            return None

        chore.status = CHORE_STATUS_REJECTED
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return chore

    async def async_delete_chore(self, chore_id: str) -> bool:
        """Delete a chore."""
        chore = self.famdo_data.get_chore_by_id(chore_id)
        if chore is None:
            return False

        self.famdo_data.chores.remove(chore)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return True

    # ==================== Reward Management ====================

    async def async_add_reward(
        self,
        name: str,
        description: str = "",
        points_cost: int = 50,
        icon: str = "mdi:gift",
        image_url: str | None = None,
        quantity: int = -1,
    ) -> Reward:
        """Add a new reward."""
        reward = Reward(
            name=name,
            description=description,
            points_cost=points_cost,
            icon=icon,
            image_url=image_url,
            quantity=quantity,
        )
        self.famdo_data.rewards.append(reward)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return reward

    async def async_update_reward(
        self,
        reward_id: str,
        **kwargs: Any,
    ) -> Reward | None:
        """Update a reward."""
        reward = self.famdo_data.get_reward_by_id(reward_id)
        if reward is None:
            return None

        for key, value in kwargs.items():
            if hasattr(reward, key):
                setattr(reward, key, value)

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return reward

    async def async_claim_reward(
        self, reward_id: str, member_id: str
    ) -> RewardClaim | None:
        """Claim a reward."""
        reward = self.famdo_data.get_reward_by_id(reward_id)
        member = self.famdo_data.get_member_by_id(member_id)

        if reward is None or member is None:
            return None

        if not reward.available:
            return None

        if reward.quantity == 0:
            return None

        if member.points < reward.points_cost:
            return None

        # Deduct points
        member.points -= reward.points_cost

        # Decrement quantity if limited
        if reward.quantity > 0:
            reward.quantity -= 1
            if reward.quantity == 0:
                reward.available = False

        # Create claim record
        claim = RewardClaim(
            reward_id=reward_id,
            member_id=member_id,
            points_spent=reward.points_cost,
        )
        self.famdo_data.reward_claims.append(claim)

        self.hass.bus.async_fire(
            EVENT_REWARD_CLAIMED,
            {
                "reward_id": reward_id,
                "member_id": member_id,
                "points_spent": reward.points_cost,
            },
        )

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return claim

    async def async_delete_reward(self, reward_id: str) -> bool:
        """Delete a reward."""
        reward = self.famdo_data.get_reward_by_id(reward_id)
        if reward is None:
            return False

        self.famdo_data.rewards.remove(reward)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return True

    # ==================== Todo Management ====================

    async def async_add_todo(
        self,
        title: str,
        description: str = "",
        assigned_to: str | None = None,
        due_date: str | None = None,
        priority: str = "normal",
        category: str = "general",
        created_by: str | None = None,
    ) -> TodoItem:
        """Add a new todo item."""
        todo = TodoItem(
            title=title,
            description=description,
            assigned_to=assigned_to,
            due_date=due_date,
            priority=priority,
            category=category,
            created_by=created_by,
        )
        self.famdo_data.todos.append(todo)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return todo

    async def async_update_todo(
        self,
        todo_id: str,
        **kwargs: Any,
    ) -> TodoItem | None:
        """Update a todo item."""
        for todo in self.famdo_data.todos:
            if todo.id == todo_id:
                for key, value in kwargs.items():
                    if hasattr(todo, key):
                        setattr(todo, key, value)
                await self.store.async_save()
                self.async_set_updated_data(self._data)
                return todo
        return None

    async def async_complete_todo(self, todo_id: str) -> TodoItem | None:
        """Mark a todo as completed."""
        for todo in self.famdo_data.todos:
            if todo.id == todo_id:
                todo.completed = True
                todo.completed_at = datetime.now().isoformat()
                await self.store.async_save()
                self.async_set_updated_data(self._data)
                return todo
        return None

    async def async_delete_todo(self, todo_id: str) -> bool:
        """Delete a todo item."""
        for todo in self.famdo_data.todos:
            if todo.id == todo_id:
                self.famdo_data.todos.remove(todo)
                await self.store.async_save()
                self.async_set_updated_data(self._data)
                return True
        return False

    # ==================== Calendar Event Management ====================

    async def async_add_event(
        self,
        title: str,
        start_date: str,
        description: str = "",
        end_date: str | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        all_day: bool = True,
        member_ids: list[str] | None = None,
        color: str | None = None,
        recurrence: str = "none",
        location: str = "",
    ) -> CalendarEvent:
        """Add a new calendar event."""
        event = CalendarEvent(
            title=title,
            description=description,
            start_date=start_date,
            end_date=end_date,
            start_time=start_time,
            end_time=end_time,
            all_day=all_day,
            member_ids=member_ids or [],
            color=color,
            recurrence=recurrence,
            location=location,
        )
        self.famdo_data.events.append(event)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return event

    async def async_update_event(
        self,
        event_id: str,
        **kwargs: Any,
    ) -> CalendarEvent | None:
        """Update a calendar event."""
        for event in self.famdo_data.events:
            if event.id == event_id:
                for key, value in kwargs.items():
                    if hasattr(event, key):
                        setattr(event, key, value)
                await self.store.async_save()
                self.async_set_updated_data(self._data)
                return event
        return None

    async def async_delete_event(self, event_id: str) -> bool:
        """Delete a calendar event."""
        for event in self.famdo_data.events:
            if event.id == event_id:
                self.famdo_data.events.remove(event)
                await self.store.async_save()
                self.async_set_updated_data(self._data)
                return True
        return False

    # ==================== Settings ====================

    async def async_update_settings(self, **kwargs: Any) -> dict:
        """Update settings."""
        self.famdo_data.settings.update(kwargs)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return self.famdo_data.settings

    async def async_update_family_name(self, name: str) -> str:
        """Update family name."""
        self.famdo_data.family_name = name
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return name
