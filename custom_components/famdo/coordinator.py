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
    RECURRENCE_NONE,
    RECURRENCE_ALWAYS_ON,
    RECURRENCE_DAILY,
    RECURRENCE_WEEKLY,
    RECURRENCE_MONTHLY,
    DEFAULT_MAX_INSTANCES,
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
        """Mark overdue chores and apply negative points."""
        if self._data is None:
            return

        now = datetime.now()
        changed = False

        for chore in self._data.chores:
            # Skip templates - only check instances
            if chore.is_template:
                continue

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

                        # Apply negative points if not already applied
                        if chore.negative_points > 0 and not chore.overdue_applied:
                            # Deduct from assigned member or claimed member
                            member_id = chore.claimed_by or chore.assigned_to
                            if member_id:
                                member = self._data.get_member_by_id(member_id)
                                if member:
                                    member.points = max(0, member.points - chore.negative_points)
                                    _LOGGER.info(
                                        "Applied -%d points to %s for overdue chore: %s",
                                        chore.negative_points,
                                        member.name,
                                        chore.name,
                                    )
                            chore.overdue_applied = True

        if changed:
            await self.store.async_save()

    async def _reset_recurring_chores(self) -> None:
        """Create new instances for time-based recurring chores."""
        if self._data is None:
            return

        now = datetime.now()
        today = now.date()
        changed = False

        # Find all recurring templates (time-based only, not always_on)
        templates = [
            c for c in self._data.chores
            if c.is_template and c.recurrence in [RECURRENCE_DAILY, RECURRENCE_WEEKLY, RECURRENCE_MONTHLY]
        ]

        for template in templates:
            # Count active (non-completed) instances for this template
            active_instances = self._count_active_instances(template.id)

            # Don't create more instances if at max
            if active_instances >= template.max_instances:
                continue

            # Check if we need to create a new instance based on time
            last_created = self._get_last_instance_created(template.id)

            should_create = False
            if last_created is None:
                # No instances exist, create one
                should_create = True
            else:
                last_date = datetime.fromisoformat(last_created).date()
                if template.recurrence == RECURRENCE_DAILY:
                    should_create = today > last_date
                elif template.recurrence == RECURRENCE_WEEKLY:
                    should_create = (today - last_date).days >= 7
                elif template.recurrence == RECURRENCE_MONTHLY:
                    should_create = (today - last_date).days >= 30

            if should_create:
                # Calculate due date for the new instance
                due_date = self._calculate_next_due_date(template, today)
                await self._create_chore_instance(template, due_date)
                changed = True

        if changed:
            await self.store.async_save()

    def _count_active_instances(self, template_id: str) -> int:
        """Count non-completed instances of a template."""
        if self._data is None:
            return 0
        return sum(
            1 for c in self._data.chores
            if c.template_id == template_id and c.status != CHORE_STATUS_COMPLETED
        )

    def _get_last_instance_created(self, template_id: str) -> str | None:
        """Get the creation time of the most recent instance."""
        if self._data is None:
            return None
        instances = [
            c for c in self._data.chores
            if c.template_id == template_id
        ]
        if not instances:
            return None
        return max(c.created_at for c in instances)

    def _calculate_next_due_date(self, template: Chore, from_date) -> str | None:
        """Calculate the next due date based on recurrence."""
        if template.recurrence == RECURRENCE_DAILY:
            return from_date.isoformat()
        elif template.recurrence == RECURRENCE_WEEKLY:
            # Due at end of week (or same day next week)
            return (from_date + timedelta(days=7)).isoformat()
        elif template.recurrence == RECURRENCE_MONTHLY:
            return (from_date + timedelta(days=30)).isoformat()
        elif template.recurrence == RECURRENCE_ALWAYS_ON:
            # Always-on chores don't have due dates by default
            return None
        return None

    async def _create_chore_instance(
        self, template: Chore, due_date: str | None = None
    ) -> Chore:
        """Create a new instance from a template."""
        from .models import generate_id

        instance = Chore(
            id=generate_id(),
            name=template.name,
            description=template.description,
            points=template.points,
            assigned_to=template.assigned_to,
            status=CHORE_STATUS_PENDING,
            recurrence=template.recurrence,  # Keep for reference
            due_date=due_date,
            due_time=template.due_time,
            icon=template.icon,
            is_template=False,
            template_id=template.id,
            negative_points=template.negative_points,
            max_instances=template.max_instances,
        )
        self._data.chores.append(instance)
        _LOGGER.debug("Created new instance of recurring chore: %s", template.name)
        return instance

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
        negative_points: int = 0,
        max_instances: int = DEFAULT_MAX_INSTANCES,
    ) -> Chore:
        """Add a new chore.

        For recurring chores (recurrence != 'none'), creates a template
        and an initial instance.
        """
        is_recurring = recurrence != RECURRENCE_NONE

        if is_recurring:
            # Create the template
            template = Chore(
                name=name,
                description=description,
                points=points,
                assigned_to=assigned_to,
                recurrence=recurrence,
                due_date=None,  # Templates don't have due dates
                due_time=due_time,
                icon=icon,
                is_template=True,
                negative_points=negative_points,
                max_instances=max_instances,
            )
            self.famdo_data.chores.append(template)

            # Create the first instance
            instance = await self._create_chore_instance(template, due_date)
            await self.store.async_save()
            self.async_set_updated_data(self._data)
            return instance  # Return the instance, not the template
        else:
            # One-time chore
            chore = Chore(
                name=name,
                description=description,
                points=points,
                assigned_to=assigned_to,
                recurrence=recurrence,
                due_date=due_date,
                due_time=due_time,
                icon=icon,
                is_template=False,
                negative_points=negative_points,
                max_instances=1,
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

        # For always_on recurring chores, create a new instance immediately
        if chore.template_id and chore.recurrence == RECURRENCE_ALWAYS_ON:
            template = self.famdo_data.get_chore_by_id(chore.template_id)
            if template and template.is_template:
                # Check if we're under the max instances limit
                active_count = self._count_active_instances(template.id)
                if active_count < template.max_instances:
                    await self._create_chore_instance(template)
                    _LOGGER.info(
                        "Created new always-on instance for chore: %s",
                        template.name
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

    async def async_retry_chore(
        self, chore_id: str, member_id: str
    ) -> Chore | None:
        """Retry a rejected chore - sets it back to claimed status."""
        chore = self.famdo_data.get_chore_by_id(chore_id)
        if chore is None:
            return None

        # Verify the member is the one who claimed it
        if chore.claimed_by != member_id:
            return None

        if chore.status != CHORE_STATUS_REJECTED:
            return None

        chore.status = CHORE_STATUS_CLAIMED
        chore.completed_at = None  # Clear completed timestamp
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
