# FamDo Project State - January 14, 2026

## Project Overview
FamDo is a HACS-compatible Home Assistant custom integration for family task management. It provides:
- Chore tracking with points system
- Reward claiming
- Todo lists
- Family calendar/events
- Parent approval workflow

## Current Version
**v1.4.5** (released today)

## Key Files Structure
```
custom_components/famdo/
├── __init__.py          # Integration setup
├── const.py             # Constants and version
├── manifest.json        # HACS manifest
├── coordinator.py       # DataUpdateCoordinator - main business logic
├── models.py            # Data models (Chore, FamilyMember, Reward, etc.)
├── websocket_api.py     # WebSocket endpoints for frontend
├── config_flow.py       # Setup flow
├── services.yaml        # Service definitions
└── www/
    ├── app.js           # Main admin app
    └── kiosk/
        └── famdo-kiosk-cards.js  # Lovelace cards for end users
```

## Kiosk Cards Available
1. `famdo-member-selector` - Select which family member is using the kiosk
2. `famdo-chores-card` - View and interact with chores
3. `famdo-points-card` - Points leaderboard
4. `famdo-rewards-card` - View and claim rewards
5. `famdo-today-card` - Today's schedule with action buttons
6. `famdo-activity-log` - Parent admin view (NEW in v1.4.5)

## Recent Development History (v1.4.x)

### v1.4.0
- Created kiosk dashboard cards for end-user interactions

### v1.4.1
- Today card shows: Overdue, Due Today, Events, Available Anytime sections
- Added highlighting and badges for due items

### v1.4.2
- Added `famdo/retry_chore` websocket endpoint
- Added retry button for rejected chores in kiosk and main app

### v1.4.3
- Chores assigned to user show "Mark Done" directly (no claim step needed)
- "Claim" only appears for unassigned chores
- Auto-claims behind the scenes when marking done

### v1.4.4
- Fixed retry button CSS for rejected status in kiosk cards
- Always_on chores auto-assign new instances to same person who completed previous

### v1.4.5 (Current)
- Today card filters by unassigned OR assigned to selected user
- Today card has claim/complete/retry action buttons
- New `famdo-activity-log` card for parent admin view

## Key Code Patterns

### Chore Status Flow
```
pending → claimed → awaiting_approval → completed
                                      → rejected → (retry) → claimed
```

### Recurrence Types
- `none` - One-time chore
- `always_on` - Re-created immediately after approval (assigned to same person)
- `daily`, `weekly`, `monthly` - Scheduled recurrence

### Template/Instance Pattern
- Templates (`is_template=True`) define recurring chores
- Instances are created from templates with `template_id` reference
- `max_instances` controls how many active instances can exist

### WebSocket Commands
Key endpoints in `websocket_api.py`:
- `famdo/get_data` - Get all data
- `famdo/claim_chore`, `famdo/complete_chore`
- `famdo/approve_chore`, `famdo/reject_chore`
- `famdo/retry_chore`
- Various add/update/delete endpoints for members, chores, rewards, todos, events

## Architecture Notes

### Frontend (Kiosk Cards)
- Uses Shadow DOM for style isolation
- `FamDoBaseCard` provides common functionality
- Member selection stored in localStorage and broadcast via custom events
- WebSocket connection via Home Assistant's `this._hass.connection.sendMessagePromise()`

### Backend (Coordinator)
- `FamDoCoordinator` extends `DataUpdateCoordinator`
- Data persisted via Home Assistant's Store API
- Events fired on state changes (chore completed, points updated, etc.)

## Testing Notes
- User is actively testing on a kiosk dashboard
- Resources loaded from `/hacsfiles/famdo/kiosk/famdo-kiosk-cards.js`
- Or manually from `/local/famdo/famdo-kiosk-cards.js`

## Key Files to Read When Resuming
1. `custom_components/famdo/coordinator.py` - Core business logic
2. `custom_components/famdo/www/kiosk/famdo-kiosk-cards.js` - Kiosk UI cards
3. `custom_components/famdo/www/app.js` - Admin app
4. `custom_components/famdo/websocket_api.py` - API endpoints

## Potential Future Work
- Notifications for parents when chores await approval
- Streaks and achievements system
- Time-based bonuses
- Mobile-optimized views
