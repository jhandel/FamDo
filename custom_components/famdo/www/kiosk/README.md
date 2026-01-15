# FamDo Kiosk Cards

Custom Lovelace cards for end-user interactions with FamDo. Perfect for tablets and kiosks.

## Installation

1. Add the resource to your Lovelace configuration:

```yaml
resources:
  - url: /local/famdo/kiosk/famdo-kiosk-cards.js
    type: module
```

Or via UI: **Settings → Dashboards → Resources → Add Resource**

2. Create a new dashboard for the kiosk view.

## Available Cards

### Member Selector (`famdo-member-selector`)
Allows family members to select their profile before interacting with chores/rewards.

```yaml
type: custom:famdo-member-selector
title: "Who's using FamDo?"  # optional
show_points: true            # optional, default: true
```

### Chores Card (`famdo-chores-card`)
Shows available chores that can be claimed and completed.

```yaml
type: custom:famdo-chores-card
title: "My Chores"    # optional
show_all: false       # optional, show all chores or just for selected member
max_items: 10         # optional, limit number of chores shown
```

### Points Leaderboard (`famdo-points-card`)
Displays family members ranked by points.

```yaml
type: custom:famdo-points-card
title: "Points Leaderboard"  # optional
show_all: true               # optional
```

### Rewards Card (`famdo-rewards-card`)
Shows available rewards and allows claiming them.

```yaml
type: custom:famdo-rewards-card
title: "Rewards"    # optional
max_items: 8        # optional
```

### Today Card (`famdo-today-card`)
Shows today's chores and events in a calendar view.

```yaml
type: custom:famdo-today-card
title: "Today"        # optional
show_chores: true     # optional
show_events: true     # optional
```

## Example Dashboard Configuration

```yaml
views:
  - title: FamDo Kiosk
    icon: mdi:home
    path: kiosk
    panel: false
    cards:
      - type: custom:famdo-member-selector

      - type: horizontal-stack
        cards:
          - type: custom:famdo-chores-card
          - type: custom:famdo-rewards-card

      - type: horizontal-stack
        cards:
          - type: custom:famdo-points-card
          - type: custom:famdo-today-card
```

## Kiosk Mode Tips

For a proper kiosk experience, consider using:

1. **Kiosk Mode** browser extension or Home Assistant add-on
2. Create a dedicated HA user with limited permissions
3. Use the dashboard `panel: true` mode for fullscreen cards
4. Enable `kiosk=true` query parameter in URL

Example URL: `http://your-ha-instance:8123/kiosk?kiosk=true`

## Notes

- The selected member is stored in `localStorage`, so it persists across page reloads
- Cards automatically sync with real-time data updates
- No admin features (add/edit/delete) are exposed in these cards
