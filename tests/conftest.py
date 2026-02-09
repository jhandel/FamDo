"""Shared pytest fixtures for FamDo tests."""
import sys
import os
from types import ModuleType
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Mock homeassistant and voluptuous so we can import models/const
# without a full Home Assistant installation.
_HA_MOCKS = [
    "homeassistant",
    "homeassistant.components",
    "homeassistant.components.calendar",
    "homeassistant.components.frontend",
    "homeassistant.components.http",
    "homeassistant.components.sensor",
    "homeassistant.config_entries",
    "homeassistant.const",
    "homeassistant.core",
    "homeassistant.data_entry_flow",
    "homeassistant.helpers",
    "homeassistant.helpers.entity",
    "homeassistant.helpers.entity_platform",
    "homeassistant.helpers.storage",
    "homeassistant.helpers.update_coordinator",
    "voluptuous",
]
for _mod in _HA_MOCKS:
    sys.modules.setdefault(_mod, MagicMock())

import pytest

from custom_components.famdo.models import (
    FamilyMember, Chore, Reward, RewardClaim, TodoItem, CalendarEvent, FamDoData
)
from custom_components.famdo.const import (
    CHORE_STATUS_PENDING, CHORE_STATUS_CLAIMED, RECURRENCE_NONE, RECURRENCE_DAILY,
    ROLE_PARENT, ROLE_CHILD
)


@pytest.fixture
def sample_data():
    """Return a FamDoData instance populated with sample data."""
    members = [
        FamilyMember(
            id="parent1",
            name="Mom",
            role=ROLE_PARENT,
            color="#FF6B6B",
            avatar="mdi:face-woman",
            points=0,
            created_at="2024-01-01T00:00:00",
        ),
        FamilyMember(
            id="parent2",
            name="Dad",
            role=ROLE_PARENT,
            color="#4ECDC4",
            avatar="mdi:face-man",
            points=0,
            created_at="2024-01-01T00:00:00",
        ),
        FamilyMember(
            id="child1",
            name="Emma",
            role=ROLE_CHILD,
            color="#45B7D1",
            avatar="mdi:account-child",
            points=50,
            created_at="2024-01-01T00:00:00",
        ),
        FamilyMember(
            id="child2",
            name="Jake",
            role=ROLE_CHILD,
            color="#96CEB4",
            avatar="mdi:account-child",
            points=30,
            created_at="2024-01-01T00:00:00",
        ),
    ]

    chores = [
        Chore(
            id="chore1",
            name="Clean Room",
            description="Clean and organize your room",
            points=10,
            assigned_to="child1",
            status=CHORE_STATUS_PENDING,
            recurrence=RECURRENCE_NONE,
            created_at="2024-01-01T00:00:00",
        ),
        Chore(
            id="chore2",
            name="Do Dishes",
            description="Wash and dry the dishes",
            points=15,
            assigned_to="child2",
            status=CHORE_STATUS_CLAIMED,
            recurrence=RECURRENCE_NONE,
            claimed_by="child2",
            created_at="2024-01-01T00:00:00",
        ),
        Chore(
            id="chore3",
            name="Take Out Trash",
            description="Take the trash to the curb",
            points=5,
            recurrence=RECURRENCE_DAILY,
            is_template=True,
            created_at="2024-01-01T00:00:00",
        ),
        Chore(
            id="chore3-inst1",
            name="Take Out Trash",
            description="Take the trash to the curb",
            points=5,
            assigned_to="child1",
            status=CHORE_STATUS_PENDING,
            recurrence=RECURRENCE_NONE,
            template_id="chore3",
            created_at="2024-01-02T00:00:00",
        ),
    ]

    rewards = [
        Reward(
            id="reward1",
            name="Extra Screen Time",
            description="30 minutes of extra screen time",
            points_cost=25,
            icon="mdi:television",
            available=True,
            quantity=-1,
            created_at="2024-01-01T00:00:00",
        ),
        Reward(
            id="reward2",
            name="Ice Cream Trip",
            description="A trip to the ice cream shop",
            points_cost=100,
            icon="mdi:ice-cream",
            available=True,
            quantity=3,
            created_at="2024-01-01T00:00:00",
        ),
    ]

    reward_claims = [
        RewardClaim(
            id="claim1",
            reward_id="reward1",
            member_id="child1",
            points_spent=25,
            status="pending",
            claimed_at="2024-01-15T10:00:00",
        ),
    ]

    todos = [
        TodoItem(
            id="todo1",
            title="Buy groceries",
            description="Milk, eggs, bread",
            completed=False,
            assigned_to="parent1",
            priority="high",
            category="shopping",
            created_by="parent1",
            created_at="2024-01-10T00:00:00",
        ),
        TodoItem(
            id="todo2",
            title="Schedule dentist",
            description="Annual checkup for kids",
            completed=False,
            assigned_to="parent2",
            priority="normal",
            category="health",
            created_by="parent2",
            created_at="2024-01-11T00:00:00",
        ),
    ]

    events = [
        CalendarEvent(
            id="event1",
            title="Soccer Practice",
            description="Weekly soccer practice",
            start_date="2024-01-20",
            end_date="2024-01-20",
            start_time="16:00",
            end_time="17:30",
            all_day=False,
            member_ids=["child1", "child2"],
            color="#45B7D1",
            recurrence=RECURRENCE_NONE,
            location="City Park",
            created_at="2024-01-01T00:00:00",
        ),
    ]

    return FamDoData(
        family_name="Test Family",
        members=members,
        chores=chores,
        rewards=rewards,
        reward_claims=reward_claims,
        todos=todos,
        events=events,
        settings={"timezone": "America/New_York"},
    )


@pytest.fixture
def empty_data():
    """Return an empty FamDoData instance."""
    return FamDoData()
