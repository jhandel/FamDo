"""Data models for FamDo integration."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, date
from typing import Any, Optional
from uuid import uuid4

from .const import (
    ROLE_CHILD,
    CHORE_STATUS_PENDING,
    RECURRENCE_NONE,
)


def generate_id() -> str:
    """Generate a unique ID."""
    return str(uuid4())[:8]


@dataclass
class FamilyMember:
    """Represents a family member."""

    id: str = field(default_factory=generate_id)
    name: str = ""
    role: str = ROLE_CHILD
    color: str = "#4ECDC4"
    avatar: str = "mdi:account"
    points: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    ha_user_id: Optional[str] = None  # Link to Home Assistant user ID for auth

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> FamilyMember:
        """Create from dictionary."""
        # Handle legacy members without ha_user_id
        data.setdefault("ha_user_id", None)
        return cls(**data)


@dataclass
class Chore:
    """Represents a chore.

    Recurring chores work as follows:
    - A "template" chore (is_template=True) defines the recurrence rules
    - "Instance" chores are created from templates and can be completed
    - Templates are not directly completable

    Recurrence types:
    - none: One-time chore (not a template)
    - always_on: New instance created immediately after previous is approved
    - daily/weekly/monthly: Time-based, new instances created on schedule
    """

    id: str = field(default_factory=generate_id)
    name: str = ""
    description: str = ""
    points: int = 10
    assigned_to: Optional[str] = None  # Member ID or None for anyone
    status: str = CHORE_STATUS_PENDING
    recurrence: str = RECURRENCE_NONE
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    icon: str = "mdi:broom"
    claimed_by: Optional[str] = None
    completed_at: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_reset: Optional[str] = None

    # Recurring chore fields
    is_template: bool = False  # True if this is a recurring chore template
    template_id: Optional[str] = None  # Links instance back to template
    negative_points: int = 0  # Points deducted if overdue (only for time-based)
    max_instances: int = 1  # Max instances that can exist at once
    overdue_applied: bool = False  # Track if negative points already applied

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Chore:
        """Create from dictionary."""
        # Handle legacy chores without new fields
        data.setdefault("is_template", False)
        data.setdefault("template_id", None)
        data.setdefault("negative_points", 0)
        data.setdefault("max_instances", 1)
        data.setdefault("overdue_applied", False)
        return cls(**data)


@dataclass
class Reward:
    """Represents a reward that can be claimed with points."""

    id: str = field(default_factory=generate_id)
    name: str = ""
    description: str = ""
    points_cost: int = 50
    icon: str = "mdi:gift"
    image_url: Optional[str] = None
    available: bool = True
    quantity: int = -1  # -1 for unlimited
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Reward:
        """Create from dictionary."""
        return cls(**data)


@dataclass
class RewardClaim:
    """Represents a claimed reward."""

    id: str = field(default_factory=generate_id)
    reward_id: str = ""
    member_id: str = ""
    points_spent: int = 0
    status: str = "pending"  # pending, approved, fulfilled
    claimed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    fulfilled_at: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RewardClaim:
        """Create from dictionary."""
        return cls(**data)


@dataclass
class TodoItem:
    """Represents a todo item."""

    id: str = field(default_factory=generate_id)
    title: str = ""
    description: str = ""
    completed: bool = False
    assigned_to: Optional[str] = None  # Member ID
    due_date: Optional[str] = None
    priority: str = "normal"  # low, normal, high
    category: str = "general"
    created_by: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TodoItem:
        """Create from dictionary."""
        return cls(**data)


@dataclass
class CalendarEvent:
    """Represents a calendar event."""

    id: str = field(default_factory=generate_id)
    title: str = ""
    description: str = ""
    start_date: str = ""
    end_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: bool = True
    member_ids: list[str] = field(default_factory=list)  # Associated members
    color: Optional[str] = None
    recurrence: str = RECURRENCE_NONE
    location: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> CalendarEvent:
        """Create from dictionary."""
        return cls(**data)


@dataclass
class FamDoData:
    """Main data container for FamDo."""

    family_name: str = "My Family"
    members: list[FamilyMember] = field(default_factory=list)
    chores: list[Chore] = field(default_factory=list)
    rewards: list[Reward] = field(default_factory=list)
    reward_claims: list[RewardClaim] = field(default_factory=list)
    todos: list[TodoItem] = field(default_factory=list)
    events: list[CalendarEvent] = field(default_factory=list)
    settings: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "family_name": self.family_name,
            "members": [m.to_dict() for m in self.members],
            "chores": [c.to_dict() for c in self.chores],
            "rewards": [r.to_dict() for r in self.rewards],
            "reward_claims": [rc.to_dict() for rc in self.reward_claims],
            "todos": [t.to_dict() for t in self.todos],
            "events": [e.to_dict() for e in self.events],
            "settings": self.settings,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> FamDoData:
        """Create from dictionary."""
        return cls(
            family_name=data.get("family_name", "My Family"),
            members=[FamilyMember.from_dict(m) for m in data.get("members", [])],
            chores=[Chore.from_dict(c) for c in data.get("chores", [])],
            rewards=[Reward.from_dict(r) for r in data.get("rewards", [])],
            reward_claims=[RewardClaim.from_dict(rc) for rc in data.get("reward_claims", [])],
            todos=[TodoItem.from_dict(t) for t in data.get("todos", [])],
            events=[CalendarEvent.from_dict(e) for e in data.get("events", [])],
            settings=data.get("settings", {}),
        )

    def get_member_by_id(self, member_id: str) -> Optional[FamilyMember]:
        """Get a member by ID."""
        for member in self.members:
            if member.id == member_id:
                return member
        return None

    def get_chore_by_id(self, chore_id: str) -> Optional[Chore]:
        """Get a chore by ID."""
        for chore in self.chores:
            if chore.id == chore_id:
                return chore
        return None

    def get_reward_by_id(self, reward_id: str) -> Optional[Reward]:
        """Get a reward by ID."""
        for reward in self.rewards:
            if reward.id == reward_id:
                return reward
        return None

    def get_reward_claim_by_id(self, claim_id: str) -> Optional[RewardClaim]:
        """Get a reward claim by ID."""
        for claim in self.reward_claims:
            if claim.id == claim_id:
                return claim
        return None
