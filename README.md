# FamDo - Family Dashboard for Home Assistant

A HACS-compatible Home Assistant integration that provides a touch-optimized family management dashboard. Inspired by [Cozyla](https://www.cozyla.com/), FamDo helps families manage chores, rewards, todos, and calendars all from within Home Assistant.

![FamDo Dashboard](docs/images/dashboard.png)

## Features

### Family Members
- Create profiles for each family member (parents and children)
- Assign custom colors and avatars
- Track individual points and achievements
- Role-based permissions (parents can approve chores)

### Chore Management
- Create and assign chores with point values
- Support for recurring chores (daily, weekly, monthly)
- Due dates and times with overdue tracking
- Workflow: Available → Claimed → Awaiting Approval → Completed
- Parents can approve or reject completed chores

### Rewards System
- Create rewards that kids can claim with their points
- Gamification to motivate task completion
- Track reward claims and redemptions
- Optional quantity limits on rewards

### Todo List
- Family-wide todo management
- Priority levels (low, normal, high)
- Due dates and assignments
- Category organization

### Family Calendar
- View events and chore due dates on calendar
- Color-coded by family member
- Event creation with recurrence support
- Location tracking for events

### Touch-Optimized UI
- Designed for touchscreen displays
- Large touch targets (44px minimum)
- Dark and light theme support
- Responsive design for tablets and phones
- Smooth animations and transitions

## Installation

### HACS Installation (Recommended)

1. Ensure [HACS](https://hacs.xyz/) is installed in your Home Assistant
2. Go to **HACS** → **Integrations**
3. Click the three dots menu (⋮) → **Custom repositories**
4. Add: `https://github.com/jhandel/FamDo` and select category **Integration**
5. Click **Add**
6. Search for "FamDo" and click **Download**
7. **Restart Home Assistant**
8. Go to **Settings** → **Devices & Services** → **Add Integration** → **FamDo**

### Manual Installation

1. Download the latest release from GitHub
2. Copy the `custom_components/famdo` folder to your Home Assistant `config/custom_components/` directory
3. Restart Home Assistant
4. Go to Settings → Devices & Services → Add Integration → FamDo

> **Note:** The frontend is bundled within the integration - no separate www folder copy needed!

## Configuration

After installation, FamDo will automatically:
- Add a sidebar panel "FamDo" for the main dashboard
- Create sensor entities for tracking family data
- Integrate with Home Assistant's calendar

### Accessing the Dashboard

1. Click on "FamDo" in the Home Assistant sidebar
2. Or navigate directly to `/famdo/index.html`

## Usage

### Getting Started

1. **Add Family Members**: Click the "+" button in the member bar to add parents and children
2. **Create Chores**: Switch to the Chores tab and add tasks with point values
3. **Add Rewards**: Parents can add rewards that kids can earn with points
4. **Track Progress**: Kids claim and complete chores, parents approve them

### Chore Workflow

1. **Available**: Chore is waiting to be claimed
2. **Claimed**: Someone is working on it
3. **Awaiting Approval**: Task completed, waiting for parent approval
4. **Completed**: Approved and points awarded
5. **Rejected**: Parent rejected, needs to be redone

### Services

FamDo exposes several services for automation:

```yaml
# Add a family member
service: famdo.add_member
data:
  name: "Emma"
  role: "child"
  color: "#FF6B6B"
  avatar: "mdi:account-child"

# Add a chore
service: famdo.add_chore
data:
  name: "Make bed"
  points: 10
  recurrence: "daily"

# Complete a chore
service: famdo.complete_chore
data:
  chore_id: "abc123"
  member_id: "xyz789"

# Add a reward
service: famdo.add_reward
data:
  name: "Extra screen time"
  points_cost: 50

# Claim a reward
service: famdo.claim_reward
data:
  reward_id: "reward123"
  member_id: "xyz789"
```

### Sensors

FamDo creates the following sensors:

- `sensor.famdo_family_overview` - General family information
- `sensor.famdo_pending_chores` - Count of available chores
- `sensor.famdo_awaiting_approval` - Chores waiting for approval
- `sensor.famdo_total_points` - Total family points
- `sensor.famdo_active_todos` - Active todo count
- `sensor.famdo_upcoming_events` - Upcoming calendar events
- `sensor.famdo_[member_name]_points` - Individual member points

### Calendar Integration

FamDo creates two calendar entities:
- `calendar.famdo_family_calendar` - Family events
- `calendar.famdo_chores_calendar` - Chores with due dates

## Events

FamDo fires the following events for automations:

- `famdo_chore_completed` - When a chore is approved
- `famdo_reward_claimed` - When a reward is claimed
- `famdo_points_updated` - When points change

### Example Automation

```yaml
automation:
  - alias: "Announce Chore Completion"
    trigger:
      - platform: event
        event_type: famdo_chore_completed
    action:
      - service: notify.mobile_app
        data:
          title: "Chore Completed!"
          message: "{{ trigger.event.data.points }} points awarded!"
```

## Customization

### Themes

FamDo automatically adapts to your system's light/dark mode preference. The UI uses CSS custom properties that can be customized.

### Touch Target Size

All interactive elements meet the recommended 44px minimum touch target for accessibility and usability on touchscreens.

## Data Storage

All data is stored locally in Home Assistant's storage system:
- No cloud dependencies
- Privacy-focused design
- Data persists across restarts
- Automatic backups with Home Assistant

## Requirements

- Home Assistant 2024.1.0 or newer
- HACS (for easy installation)
- Modern web browser with JavaScript enabled

## Support

- [Report Issues](https://github.com/jhandel/FamDo/issues)
- [Feature Requests](https://github.com/jhandel/FamDo/issues)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [Cozyla](https://www.cozyla.com/) calendar systems
- Built for the Home Assistant community
- Uses [Material Design Icons](https://materialdesignicons.com/)

---

Made with love for families everywhere
