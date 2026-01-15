"""Constants for FamDo integration."""
from typing import Final

DOMAIN: Final = "famdo"
VERSION: Final = "1.4.5"

# Configuration keys
CONF_FAMILY_NAME: Final = "family_name"

# Storage
STORAGE_KEY: Final = "famdo_data"
STORAGE_VERSION: Final = 1

# Events
EVENT_CHORE_COMPLETED: Final = "famdo_chore_completed"
EVENT_REWARD_CLAIMED: Final = "famdo_reward_claimed"
EVENT_POINTS_UPDATED: Final = "famdo_points_updated"

# Services
SERVICE_ADD_MEMBER: Final = "add_member"
SERVICE_REMOVE_MEMBER: Final = "remove_member"
SERVICE_ADD_CHORE: Final = "add_chore"
SERVICE_COMPLETE_CHORE: Final = "complete_chore"
SERVICE_APPROVE_CHORE: Final = "approve_chore"
SERVICE_REJECT_CHORE: Final = "reject_chore"
SERVICE_ADD_REWARD: Final = "add_reward"
SERVICE_CLAIM_REWARD: Final = "claim_reward"
SERVICE_ADD_TODO: Final = "add_todo"
SERVICE_COMPLETE_TODO: Final = "complete_todo"
SERVICE_ADD_EVENT: Final = "add_event"

# Member roles
ROLE_PARENT: Final = "parent"
ROLE_CHILD: Final = "child"

# Chore status
CHORE_STATUS_PENDING: Final = "pending"
CHORE_STATUS_CLAIMED: Final = "claimed"
CHORE_STATUS_AWAITING_APPROVAL: Final = "awaiting_approval"
CHORE_STATUS_COMPLETED: Final = "completed"
CHORE_STATUS_REJECTED: Final = "rejected"
CHORE_STATUS_OVERDUE: Final = "overdue"

# Recurrence patterns
RECURRENCE_NONE: Final = "none"
RECURRENCE_ALWAYS_ON: Final = "always_on"  # Re-created immediately after approval
RECURRENCE_DAILY: Final = "daily"
RECURRENCE_WEEKLY: Final = "weekly"
RECURRENCE_MONTHLY: Final = "monthly"

# Default max instances for recurring chores
DEFAULT_MAX_INSTANCES: Final = 3

# Default colors for family members
DEFAULT_COLORS: Final = [
    "#FF6B6B",  # Red
    "#4ECDC4",  # Teal
    "#45B7D1",  # Blue
    "#96CEB4",  # Green
    "#FFEAA7",  # Yellow
    "#DDA0DD",  # Plum
    "#98D8C8",  # Mint
    "#F7DC6F",  # Gold
]

# Default avatars
DEFAULT_AVATARS: Final = [
    "mdi:account",
    "mdi:account-child",
    "mdi:face-man",
    "mdi:face-woman",
    "mdi:dog",
    "mdi:cat",
    "mdi:robot",
    "mdi:alien",
]
