"""Sample data generator for the FamDo dev server."""

from __future__ import annotations

import importlib.util as _ilu
import os
import sys
from datetime import datetime, timedelta

# Import models directly to avoid pulling in homeassistant via the package __init__
_famdo_dir = os.path.join(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    "custom_components", "famdo",
)


def _load_module(name: str, path: str):
    spec = _ilu.spec_from_file_location(name, path)
    mod = _ilu.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


_const = _load_module("custom_components.famdo.const", os.path.join(_famdo_dir, "const.py"))
_models = _load_module("custom_components.famdo.models", os.path.join(_famdo_dir, "models.py"))

FamDoData = _models.FamDoData
FamilyMember = _models.FamilyMember
Chore = _models.Chore
Reward = _models.Reward
TodoItem = _models.TodoItem
CalendarEvent = _models.CalendarEvent

ROLE_PARENT = _const.ROLE_PARENT
ROLE_CHILD = _const.ROLE_CHILD
CHORE_STATUS_PENDING = _const.CHORE_STATUS_PENDING
CHORE_STATUS_CLAIMED = _const.CHORE_STATUS_CLAIMED
RECURRENCE_NONE = _const.RECURRENCE_NONE
RECURRENCE_DAILY = _const.RECURRENCE_DAILY
RECURRENCE_WEEKLY = _const.RECURRENCE_WEEKLY
RECURRENCE_ALWAYS_ON = _const.RECURRENCE_ALWAYS_ON


def _next_weekday(weekday: int) -> str:
    """Return ISO date string for the next occurrence of a weekday (0=Mon, 6=Sun)."""
    today = datetime.now().date()
    days_ahead = weekday - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    return (today + timedelta(days=days_ahead)).isoformat()


def create_seed_data() -> FamDoData:
    """Return a pre-populated FamDoData instance with sample data."""
    now = datetime.now()
    recent = (now - timedelta(days=3)).isoformat()
    today_str = now.date().isoformat()

    # ── Family Members ───────────────────────────────────────────────
    members = [
        FamilyMember(
            id="parent1", name="Mom", role=ROLE_PARENT,
            color="#FF6B6B", avatar="mdi:face-woman", points=0, created_at=recent,
        ),
        FamilyMember(
            id="parent2", name="Dad", role=ROLE_PARENT,
            color="#45B7D1", avatar="mdi:face-man", points=0, created_at=recent,
        ),
        FamilyMember(
            id="child1", name="Emma", role=ROLE_CHILD,
            color="#4ECDC4", avatar="mdi:account-child", points=75, created_at=recent,
        ),
        FamilyMember(
            id="child2", name="Jake", role=ROLE_CHILD,
            color="#96CEB4", avatar="mdi:account-child", points=120, created_at=recent,
        ),
    ]

    # ── Chores ───────────────────────────────────────────────────────
    chores = [
        # 1. Make Bed — daily recurring template + instance
        Chore(
            id="chore-makebed-t", name="Make Bed", description="Make your bed every morning",
            points=5, assigned_to="child1", status=CHORE_STATUS_PENDING,
            recurrence=RECURRENCE_DAILY, icon="mdi:bed", created_at=recent,
            is_template=True,
        ),
        Chore(
            id="chore-makebed-1", name="Make Bed", description="Make your bed every morning",
            points=5, assigned_to="child1", status=CHORE_STATUS_PENDING,
            recurrence=RECURRENCE_DAILY, due_date=today_str, icon="mdi:bed",
            created_at=recent, template_id="chore-makebed-t",
        ),
        # 2. Take Out Trash — one-time, unassigned
        Chore(
            id="chore-trash", name="Take Out Trash", description="Take the trash to the curb",
            points=10, status=CHORE_STATUS_PENDING, recurrence=RECURRENCE_NONE,
            icon="mdi:delete", created_at=recent,
        ),
        # 3. Do Homework — claimed by child2, due today
        Chore(
            id="chore-homework", name="Do Homework",
            description="Complete all homework assignments",
            points=15, status=CHORE_STATUS_CLAIMED, claimed_by="child2",
            recurrence=RECURRENCE_NONE, due_date=today_str, icon="mdi:book-open-variant",
            created_at=recent,
        ),
        # 4. Clean Room — weekly recurring template + instance
        Chore(
            id="chore-cleanroom-t", name="Clean Room", description="Tidy up your room",
            points=20, status=CHORE_STATUS_PENDING, recurrence=RECURRENCE_WEEKLY,
            icon="mdi:broom", created_at=recent, is_template=True,
        ),
        Chore(
            id="chore-cleanroom-1", name="Clean Room", description="Tidy up your room",
            points=20, status=CHORE_STATUS_PENDING, recurrence=RECURRENCE_WEEKLY,
            due_date=_next_weekday(6),  # next Sunday
            icon="mdi:broom", created_at=recent, template_id="chore-cleanroom-t",
        ),
        # 5. Walk the Dog — always_on recurring template + instance
        Chore(
            id="chore-walkdog-t", name="Walk the Dog",
            description="Take the dog for a walk around the block",
            points=10, status=CHORE_STATUS_PENDING, recurrence=RECURRENCE_ALWAYS_ON,
            icon="mdi:dog-side", created_at=recent, is_template=True,
        ),
        Chore(
            id="chore-walkdog-1", name="Walk the Dog",
            description="Take the dog for a walk around the block",
            points=10, status=CHORE_STATUS_PENDING, recurrence=RECURRENCE_ALWAYS_ON,
            icon="mdi:dog-side", created_at=recent, template_id="chore-walkdog-t",
        ),
    ]

    # ── Rewards ──────────────────────────────────────────────────────
    rewards = [
        Reward(
            id="reward-screen", name="Extra Screen Time (30 min)",
            description="Earn 30 minutes of extra screen time",
            points_cost=30, icon="mdi:television", created_at=recent,
        ),
        Reward(
            id="reward-dinner", name="Choose Dinner",
            description="Pick what the family has for dinner",
            points_cost=50, icon="mdi:food", created_at=recent,
        ),
        Reward(
            id="reward-movie", name="Movie Night Pick",
            description="Choose the movie for family movie night",
            points_cost=75, icon="mdi:movie", created_at=recent,
        ),
    ]

    # ── Todos ────────────────────────────────────────────────────────
    todos = [
        TodoItem(
            id="todo-groceries", title="Buy groceries",
            description="Weekly grocery shopping", priority="high",
            assigned_to="parent1", created_at=recent,
        ),
        TodoItem(
            id="todo-dentist", title="Schedule dentist appointment",
            description="Book checkups for the kids", priority="normal",
            created_at=recent,
        ),
    ]

    # ── Calendar Events ──────────────────────────────────────────────
    next_saturday = _next_weekday(5)
    next_friday = _next_weekday(4)

    events = [
        CalendarEvent(
            id="event-soccer", title="Soccer Practice",
            description="Weekly soccer practice at the park",
            start_date=next_saturday, all_day=True,
            member_ids=["child1"], color="#4ECDC4", created_at=recent,
        ),
        CalendarEvent(
            id="event-gamenight", title="Family Game Night",
            description="Board games and fun for the whole family",
            start_date=next_friday, all_day=False,
            start_time="19:00", end_time="21:00", created_at=recent,
        ),
    ]

    # ── Assemble ─────────────────────────────────────────────────────
    return FamDoData(
        family_name="The Handel Family",
        members=members,
        chores=chores,
        rewards=rewards,
        todos=todos,
        events=events,
    )


if __name__ == "__main__":
    data = create_seed_data()
    print(f"Family: {data.family_name}")
    print(f"  {len(data.members)} members: {[m.name for m in data.members]}")
    print(f"  {len(data.chores)} chores: {[c.name for c in data.chores]}")
    print(f"  {len(data.rewards)} rewards: {[r.name for r in data.rewards]}")
    print(f"  {len(data.todos)} todos: {[t.title for t in data.todos]}")
    print(f"  {len(data.events)} events: {[e.title for e in data.events]}")
