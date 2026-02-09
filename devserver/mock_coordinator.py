"""Standalone coordinator that replicates FamDoCoordinator business logic without Home Assistant."""
from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Any, Callable

# ---------------------------------------------------------------------------
# Import models / constants without pulling in homeassistant
# ---------------------------------------------------------------------------
import importlib.util as _ilu

_famdo_dir = os.path.join(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    "custom_components", "famdo",
)


def _load_module(name: str, path: str):
    if name in sys.modules:
        return sys.modules[name]
    spec = _ilu.spec_from_file_location(name, path)
    mod = _ilu.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


_load_module("custom_components.famdo.const", os.path.join(_famdo_dir, "const.py"))
_models = _load_module("custom_components.famdo.models", os.path.join(_famdo_dir, "models.py"))

from custom_components.famdo.const import (  # noqa: E402
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
    EVENT_CHORE_COMPLETED,
    EVENT_POINTS_UPDATED,
    EVENT_REWARD_CLAIMED,
    EVENT_REWARD_FULFILLED,
)
from custom_components.famdo.models import (  # noqa: E402
    FamilyMember,
    Chore,
    Reward,
    RewardClaim,
    TodoItem,
    CalendarEvent,
    FamDoData,
    generate_id,
)

from .mock_storage import MockStore  # noqa: E402

_LOGGER = logging.getLogger(__name__)


class MockCoordinator:
    """Coordinator that mirrors FamDoCoordinator without any Home Assistant dependency."""

    def __init__(self, store: MockStore) -> None:
        """Initialize the coordinator."""
        self.store = store
        self._data: FamDoData | None = None
        self._listeners: list[Callable[[], None]] = []
        self._event_log: list[dict[str, Any]] = []

    # ------------------------------------------------------------------
    # Listener / notification helpers (replace HA DataUpdateCoordinator)
    # ------------------------------------------------------------------

    def async_add_listener(self, callback: Callable[[], None]) -> Callable[[], None]:
        """Register a listener; returns an unsubscribe function."""
        self._listeners.append(callback)

        def _unsub() -> None:
            self._listeners.remove(callback)

        return _unsub

    def async_set_updated_data(self, data: FamDoData | None) -> None:
        """Notify all listeners that data changed (replaces HA helper)."""
        for cb in list(self._listeners):
            try:
                cb()
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Error in listener callback")

    def _fire_event(self, event_type: str, data: dict[str, Any]) -> None:
        """Log an event (replaces hass.bus.async_fire)."""
        entry = {"event_type": event_type, **data}
        self._event_log.append(entry)
        _LOGGER.debug("Event fired: %s %s", event_type, data)

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    async def async_init(self) -> None:
        """Load data from storage."""
        self._data = await self.store.async_load()

    @property
    def famdo_data(self) -> FamDoData:
        """Get the FamDo data."""
        if self._data is None:
            raise RuntimeError("Data not loaded")
        return self._data

    # ------------------------------------------------------------------
    # Periodic maintenance (replaces _async_update_data polling)
    # ------------------------------------------------------------------

    async def async_refresh(self) -> FamDoData:
        """Run the same checks the HA coordinator does on every poll."""
        if self._data is None:
            self._data = await self.store.async_load()
        await self._check_overdue_chores()
        await self._reset_recurring_chores()
        return self._data

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

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
        """Count active (non-completed, non-rejected) instances of a template."""
        if self._data is None:
            return 0
        return sum(
            1 for c in self._data.chores
            if c.template_id == template_id and c.status not in (CHORE_STATUS_COMPLETED, CHORE_STATUS_REJECTED)
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
            return (from_date + timedelta(days=7)).isoformat()
        elif template.recurrence == RECURRENCE_MONTHLY:
            return (from_date + timedelta(days=30)).isoformat()
        elif template.recurrence == RECURRENCE_ALWAYS_ON:
            return None
        return None

    async def _create_chore_instance(
        self, template: Chore, due_date: str | None = None, assigned_to: str | None = None
    ) -> Chore:
        """Create a new instance from a template."""
        instance = Chore(
            id=generate_id(),
            name=template.name,
            description=template.description,
            points=template.points,
            assigned_to=assigned_to if assigned_to else template.assigned_to,
            status=CHORE_STATUS_PENDING,
            recurrence=template.recurrence,
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

        self._fire_event(
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
                due_date=None,
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
            return instance
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

        self._fire_event(
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
                active_count = self._count_active_instances(template.id)
                if active_count < template.max_instances:
                    await self._create_chore_instance(template, assigned_to=template.assigned_to)
                    _LOGGER.info(
                        "Created new always-on instance for chore: %s (assigned to: %s)",
                        template.name,
                        template.assigned_to,
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

        # For always_on recurring chores, create a new instance immediately
        if chore.template_id and chore.recurrence == RECURRENCE_ALWAYS_ON:
            template = self.famdo_data.get_chore_by_id(chore.template_id)
            if template and template.is_template:
                active_count = self._count_active_instances(template.id)
                if active_count < template.max_instances:
                    await self._create_chore_instance(template, assigned_to=template.assigned_to)
                    _LOGGER.info(
                        "Created new always-on instance after rejection: %s (assigned to: %s)",
                        template.name,
                        template.assigned_to,
                    )

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

        if chore.claimed_by != member_id:
            return None

        if chore.status != CHORE_STATUS_REJECTED:
            return None

        chore.status = CHORE_STATUS_CLAIMED
        chore.completed_at = None
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return chore

    async def async_reactivate_template(
        self, template_id: str, approver_id: str
    ) -> Chore | None:
        """Create a new instance from a recurring template."""
        template = self.famdo_data.get_chore_by_id(template_id)
        if template is None or not template.is_template:
            return None

        # Verify approver is a parent
        approver = self.famdo_data.get_member_by_id(approver_id)
        if approver is None or approver.role != ROLE_PARENT:
            return None

        active_count = self._count_active_instances(template.id)
        if active_count >= template.max_instances:
            return None

        today = datetime.now().date()
        due_date = self._calculate_next_due_date(template, today)
        instance = await self._create_chore_instance(template, due_date)

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return instance

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

        self._fire_event(
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

    async def async_fulfill_reward_claim(
        self, claim_id: str, fulfiller_id: str
    ) -> RewardClaim | None:
        """Mark a reward claim as fulfilled."""
        claim = self.famdo_data.get_reward_claim_by_id(claim_id)
        if claim is None:
            return None

        # Verify fulfiller is a parent
        fulfiller = self.famdo_data.get_member_by_id(fulfiller_id)
        if fulfiller is None or fulfiller.role != ROLE_PARENT:
            _LOGGER.warning("Only parents can fulfill reward claims")
            return None

        # Can only fulfill pending claims
        if claim.status != "pending":
            return None

        claim.status = "fulfilled"
        claim.fulfilled_at = datetime.now().isoformat()

        self._fire_event(
            EVENT_REWARD_FULFILLED,
            {
                "claim_id": claim_id,
                "reward_id": claim.reward_id,
                "member_id": claim.member_id,
                "fulfiller_id": fulfiller_id,
            },
        )

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return claim

    async def async_update_reward_claim(
        self,
        claim_id: str,
        **kwargs: Any,
    ) -> RewardClaim | None:
        """Update a reward claim."""
        claim = self.famdo_data.get_reward_claim_by_id(claim_id)
        if claim is None:
            return None

        for key, value in kwargs.items():
            if hasattr(claim, key):
                setattr(claim, key, value)

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return claim

    async def async_delete_reward_claim(self, claim_id: str) -> bool:
        """Delete a reward claim."""
        claim = self.famdo_data.get_reward_claim_by_id(claim_id)
        if claim is None:
            return False

        self.famdo_data.reward_claims.remove(claim)
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        return True

    async def async_delete_all_reward_claims(self) -> int:
        """Delete all reward claims."""
        count = len(self.famdo_data.reward_claims)
        self.famdo_data.reward_claims.clear()
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        _LOGGER.info("Deleted %d reward claims", count)
        return count

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

    async def async_delete_all_todos(self) -> int:
        """Delete all todo items."""
        count = len(self.famdo_data.todos)
        self.famdo_data.todos.clear()
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        _LOGGER.info("Deleted %d todos", count)
        return count

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

    async def async_delete_all_events(self) -> int:
        """Delete all calendar events."""
        count = len(self.famdo_data.events)
        self.famdo_data.events.clear()
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        _LOGGER.info("Deleted %d events", count)
        return count

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

    # ==================== Bulk Delete Operations ====================

    async def async_delete_all_chores(self, keep_templates: bool = False) -> int:
        """Delete all chores."""
        if keep_templates:
            to_delete = [c for c in self.famdo_data.chores if not c.is_template]
        else:
            to_delete = list(self.famdo_data.chores)

        count = len(to_delete)
        for chore in to_delete:
            self.famdo_data.chores.remove(chore)

        await self.store.async_save()
        self.async_set_updated_data(self._data)
        _LOGGER.info("Deleted %d chores (keep_templates=%s)", count, keep_templates)
        return count

    async def async_delete_all_rewards(self) -> int:
        """Delete all rewards."""
        count = len(self.famdo_data.rewards)
        self.famdo_data.rewards.clear()
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        _LOGGER.info("Deleted %d rewards", count)
        return count

    async def async_delete_all_members(self) -> int:
        """Delete all family members."""
        count = len(self.famdo_data.members)
        self.famdo_data.members.clear()
        await self.store.async_save()
        self.async_set_updated_data(self._data)
        _LOGGER.info("Deleted %d members", count)
        return count

    async def async_clear_all_data(self, keep_members: bool = False) -> dict:
        """Clear all data - reset the entire installation."""
        counts = {
            "chores": len(self.famdo_data.chores),
            "rewards": len(self.famdo_data.rewards),
            "reward_claims": len(self.famdo_data.reward_claims),
            "todos": len(self.famdo_data.todos),
            "events": len(self.famdo_data.events),
            "members": 0 if keep_members else len(self.famdo_data.members),
        }

        self.famdo_data.chores.clear()
        self.famdo_data.rewards.clear()
        self.famdo_data.reward_claims.clear()
        self.famdo_data.todos.clear()
        self.famdo_data.events.clear()

        if keep_members:
            for member in self.famdo_data.members:
                member.points = 0
        else:
            self.famdo_data.members.clear()

        if not keep_members:
            self.famdo_data.family_name = "Our Family"
        self.famdo_data.settings = {}

        await self.store.async_save()
        self.async_set_updated_data(self._data)

        _LOGGER.warning(
            "Cleared all data (keep_members=%s): %s",
            keep_members,
            counts,
        )
        return counts
