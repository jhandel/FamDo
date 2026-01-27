/**
 * FamDo Kiosk Dashboard
 * Skylight CalMax-inspired unified full-screen dashboard
 * Designed for wall-mounted tablet displays
 */

// Import shared styles from kiosk cards
const DASHBOARD_STYLES = `
  :host {
    /* Skylight-Inspired Color Palette */
    --kiosk-bg-cream: #FFF8F0;
    --kiosk-bg-warm: #FDF6EE;
    --kiosk-bg-card: rgba(255, 255, 255, 0.95);

    --kiosk-peach: #FFECD9;
    --kiosk-coral: #FF8A80;
    --kiosk-coral-dark: #E57373;

    --kiosk-blue-soft: #64B5F6;
    --kiosk-blue-deep: #42A5F5;

    --kiosk-green-soft: #81C784;
    --kiosk-green-check: #66BB6A;

    --kiosk-star-gold: #FFD54F;
    --kiosk-star-glow: #FFECB3;

    --kiosk-text-dark: #4A4A4A;
    --kiosk-text-muted: #9E9E9E;

    --kiosk-radius-sm: 12px;
    --kiosk-radius-md: 20px;
    --kiosk-radius-lg: 28px;
    --kiosk-shadow-soft: 0 4px 20px rgba(0,0,0,0.08);
    --kiosk-shadow-elevated: 0 8px 32px rgba(0,0,0,0.12);

    --kiosk-font-family: 'Nunito', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  /* Star Burst Animation */
  @keyframes starBurst {
    0% { transform: scale(0) rotate(0deg); opacity: 1; }
    50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
    100% { transform: scale(2) rotate(360deg); opacity: 0; }
  }

  @keyframes drawCheck {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }

  @keyframes floatUp {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-60px) scale(1.2); opacity: 0; }
  }

  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 213, 79, 0.4); }
    50% { box-shadow: 0 0 20px 10px rgba(255, 213, 79, 0.2); }
  }

  @keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes celebrationStar {
    0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translate(var(--star-x, 50px), var(--star-y, -100px)) scale(1) rotate(360deg); opacity: 0; }
  }
`;

class FamDoKioskDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._data = null;
    this._selectedMemberId = null;
    this._currentTime = new Date();
    this._timeInterval = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._data) {
      this._loadData();
    }
  }

  setConfig(config) {
    this._config = {
      title: 'Family Dashboard',
      show_weather: false,
      weather_entity: 'weather.home',
      celebration_intensity: 'normal',
      default_member: null,
      ...config
    };
  }

  connectedCallback() {
    // Update time every minute
    this._timeInterval = setInterval(() => {
      this._currentTime = new Date();
      this._updateTime();
    }, 60000);
  }

  disconnectedCallback() {
    if (this._timeInterval) {
      clearInterval(this._timeInterval);
    }
  }

  async _loadData() {
    if (!this._hass) return;

    try {
      this._data = await this._hass.callWS({ type: 'famdo/get_data' });

      // Try to restore selected member
      const savedMemberId = localStorage.getItem('famdo_kiosk_member');
      if (savedMemberId && this._data.members.find(m => m.id === savedMemberId)) {
        this._selectedMemberId = savedMemberId;
      } else if (this._config.default_member) {
        this._selectedMemberId = this._config.default_member;
      } else if (this._data.members.length > 0) {
        // Default to first child
        const firstChild = this._data.members.find(m => m.role === 'child');
        this._selectedMemberId = firstChild?.id || this._data.members[0].id;
      }

      this._render();
      this._subscribeToUpdates();
    } catch (e) {
      console.error('FamDo Dashboard: Failed to load data', e);
    }
  }

  async _subscribeToUpdates() {
    if (!this._hass) return;

    try {
      this._hass.connection.subscribeMessage(
        (msg) => {
          if (msg.data) {
            this._data = msg.data;
            this._render();
          }
        },
        { type: 'famdo/subscribe' }
      );
    } catch (e) {
      console.error('FamDo Dashboard: Failed to subscribe', e);
    }
  }

  async _sendCommand(type, data = {}) {
    if (!this._hass) return null;
    try {
      return await this._hass.callWS({ type, ...data });
    } catch (e) {
      console.error('FamDo command failed:', e);
      return null;
    }
  }

  _getMember(memberId) {
    return this._data?.members?.find(m => m.id === memberId);
  }

  _getSelectedMember() {
    return this._getMember(this._selectedMemberId);
  }

  _updateTime() {
    const timeEl = this.shadowRoot.querySelector('.header-time');
    if (timeEl) {
      timeEl.textContent = this._currentTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  _getWeekDays() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        name: dayNames[i],
        date: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        isToday: d.toISOString().split('T')[0] === today.toISOString().split('T')[0]
      });
    }
    return days;
  }

  _getTodayChores(memberId) {
    const today = new Date().toISOString().split('T')[0];
    return (this._data?.chores || [])
      .filter(c => !c.is_template && c.status !== 'completed')
      .filter(c => !c.due_date || c.due_date === today || c.due_date < today)
      .filter(c => !c.assigned_to || c.assigned_to === memberId || c.claimed_by === memberId);
  }

  _getChoresForDay(memberId, dateStr) {
    return (this._data?.chores || [])
      .filter(c => !c.is_template)
      .filter(c => c.due_date === dateStr)
      .filter(c => c.assigned_to === memberId || c.claimed_by === memberId);
  }

  _getRewardProgress(memberId) {
    const member = this._getMember(memberId);
    if (!member) return null;

    const rewards = (this._data?.rewards || [])
      .filter(r => r.available && r.points_cost > member.points)
      .sort((a, b) => a.points_cost - b.points_cost);

    const nearestReward = rewards[0];
    if (!nearestReward) return null;

    return {
      currentPoints: member.points,
      targetPoints: nearestReward.points_cost,
      targetReward: nearestReward,
      progress: member.points / nearestReward.points_cost
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = `
        <style>${DASHBOARD_STYLES}
          .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-size: 1.5rem;
            color: var(--kiosk-text-muted);
          }
        </style>
        <div class="loading">Loading FamDo Dashboard...</div>
      `;
      return;
    }

    const members = this._data.members || [];
    const selectedMember = this._getSelectedMember();
    const todayChores = selectedMember ? this._getTodayChores(selectedMember.id) : [];
    const rewardProgress = selectedMember ? this._getRewardProgress(selectedMember.id) : null;
    const weekDays = this._getWeekDays();
    const today = new Date();

    this.shadowRoot.innerHTML = `
      <style>${DASHBOARD_STYLES}
        .dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--kiosk-bg-cream), var(--kiosk-bg-warm));
          font-family: var(--kiosk-font-family);
          color: var(--kiosk-text-dark);
          padding: 20px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 20px;
        }

        /* Header */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: white;
          border-radius: var(--kiosk-radius-lg);
          box-shadow: var(--kiosk-shadow-soft);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-logo {
          font-size: 1.8rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--kiosk-coral), var(--kiosk-blue-soft));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-date {
          font-size: 1.1rem;
          color: var(--kiosk-text-muted);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .header-time {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--kiosk-text-dark);
        }

        .header-weather {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1rem;
          color: var(--kiosk-text-muted);
        }

        /* Main Content */
        .dashboard-content {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          overflow: hidden;
        }

        /* Left Sidebar - Members */
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .members-section {
          background: white;
          border-radius: var(--kiosk-radius-lg);
          padding: 20px;
          box-shadow: var(--kiosk-shadow-soft);
        }

        .section-title {
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--kiosk-text-muted);
          margin-bottom: 16px;
        }

        .members-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .member-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--kiosk-bg-warm);
          border-radius: var(--kiosk-radius-md);
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .member-card:hover {
          background: var(--kiosk-peach);
          transform: translateX(4px);
        }

        .member-card.selected {
          border-color: var(--kiosk-coral);
          background: linear-gradient(135deg, rgba(255, 138, 128, 0.1), rgba(255, 236, 217, 0.3));
          box-shadow: 0 4px 15px rgba(255, 138, 128, 0.2);
        }

        .member-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          transition: all 0.3s ease;
        }

        .member-card.selected .member-avatar {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
        }

        .member-avatar ha-icon {
          --mdc-icon-size: 24px;
          color: white;
        }

        .member-info {
          flex: 1;
        }

        .member-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--kiosk-text-dark);
        }

        .member-stars {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9rem;
          color: var(--kiosk-star-gold);
          font-weight: 600;
        }

        /* Main Panels */
        .main-panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto 1fr;
          gap: 20px;
          overflow: hidden;
        }

        .panel {
          background: white;
          border-radius: var(--kiosk-radius-lg);
          padding: 20px;
          box-shadow: var(--kiosk-shadow-soft);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--kiosk-text-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .panel-title-icon {
          font-size: 1.2rem;
        }

        /* Weekly Grid Panel */
        .weekly-panel {
          grid-column: span 2;
        }

        .week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .week-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          border-radius: var(--kiosk-radius-md);
          background: var(--kiosk-bg-warm);
          transition: all 0.3s ease;
        }

        .week-day.today {
          background: linear-gradient(135deg, rgba(100, 181, 246, 0.2), rgba(66, 165, 245, 0.3));
          box-shadow: 0 0 0 2px var(--kiosk-blue-soft);
        }

        .week-day-name {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--kiosk-text-muted);
          margin-bottom: 4px;
        }

        .week-day-num {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--kiosk-text-dark);
          margin-bottom: 8px;
        }

        .week-day.today .week-day-num {
          color: var(--kiosk-blue-deep);
        }

        .week-day-status {
          display: flex;
          gap: 3px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-dot.completed { background: var(--kiosk-green-check); }
        .status-dot.pending { background: var(--kiosk-star-gold); }
        .status-dot.todo { background: var(--kiosk-text-muted); opacity: 0.3; }

        /* Today's Chores Panel */
        .chores-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .chore-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--kiosk-bg-warm);
          border-radius: var(--kiosk-radius-md);
          transition: all 0.2s ease;
          min-height: 64px;
        }

        .chore-item:hover {
          background: var(--kiosk-peach);
        }

        .chore-checkbox {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid var(--kiosk-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .chore-checkbox:hover {
          border-color: var(--kiosk-green-check);
          background: rgba(102, 187, 106, 0.1);
        }

        .chore-checkbox.can-complete {
          border-color: var(--kiosk-green-soft);
        }

        .chore-checkbox.awaiting {
          border-color: var(--kiosk-star-gold);
          background: rgba(255, 213, 79, 0.2);
        }

        .chore-checkbox.awaiting::after {
          content: '⏳';
          font-size: 0.9rem;
        }

        .chore-info {
          flex: 1;
        }

        .chore-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--kiosk-text-dark);
        }

        .chore-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .chore-points {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--kiosk-star-gold);
        }

        .chore-status-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .chore-status-badge.overdue {
          background: rgba(255, 107, 107, 0.15);
          color: var(--kiosk-coral-dark);
        }

        .chore-status-badge.today {
          background: rgba(255, 213, 79, 0.15);
          color: #D4A017;
        }

        .chore-action-btn {
          padding: 10px 20px;
          border: none;
          border-radius: var(--kiosk-radius-sm);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 44px;
        }

        .chore-action-btn.done {
          background: linear-gradient(135deg, var(--kiosk-green-soft), var(--kiosk-green-check));
          color: white;
        }

        .chore-action-btn.done:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(102, 187, 106, 0.4);
        }

        .chore-action-btn.claim {
          background: linear-gradient(135deg, var(--kiosk-blue-soft), var(--kiosk-blue-deep));
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--kiosk-text-muted);
        }

        .empty-state-icon {
          font-size: 3rem;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        /* Reward Progress Panel */
        .reward-meter {
          padding: 20px;
          background: linear-gradient(135deg, rgba(255, 213, 79, 0.1), rgba(255, 236, 179, 0.2));
          border-radius: var(--kiosk-radius-md);
        }

        .reward-target {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .reward-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--kiosk-coral), var(--kiosk-blue-soft));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .reward-target-info {
          flex: 1;
        }

        .reward-target-name {
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--kiosk-text-dark);
        }

        .reward-target-label {
          font-size: 0.85rem;
          color: var(--kiosk-text-muted);
        }

        .reward-bar-container {
          height: 24px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 12px;
          position: relative;
        }

        .reward-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--kiosk-star-gold), var(--kiosk-star-glow), var(--kiosk-star-gold));
          background-size: 200% 100%;
          border-radius: 12px;
          transition: width 0.8s ease-out;
          animation: shimmer 3s infinite linear;
        }

        .reward-bar-stars {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 8px;
        }

        .reward-bar-star {
          font-size: 12px;
          opacity: 0.3;
        }

        .reward-bar-star.filled {
          opacity: 1;
        }

        .reward-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .reward-points {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--kiosk-star-gold);
        }

        .reward-remaining {
          font-size: 0.9rem;
          color: var(--kiosk-text-muted);
        }

        .almost-there {
          background: linear-gradient(135deg, var(--kiosk-coral), var(--kiosk-coral-dark));
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          animation: bounce 1.5s infinite;
        }

        /* Rewards Grid */
        .rewards-panel .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .points-badge {
          background: linear-gradient(135deg, var(--kiosk-star-gold), var(--kiosk-star-glow));
          color: var(--kiosk-text-dark);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(255, 213, 79, 0.4);
        }

        .rewards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
          padding: 8px 0;
          max-height: 400px;
          overflow-y: auto;
        }

        .reward-card {
          background: white;
          border-radius: var(--kiosk-radius-md);
          padding: 16px;
          text-align: center;
          box-shadow: var(--kiosk-shadow-soft);
          transition: all 0.3s ease;
          position: relative;
          border: 2px solid transparent;
        }

        .reward-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--kiosk-shadow-elevated);
        }

        .reward-card.affordable {
          border-color: var(--kiosk-green-check);
          background: linear-gradient(135deg, rgba(102, 187, 106, 0.1), rgba(129, 199, 132, 0.05));
        }

        .reward-card.almost-there {
          border-color: var(--kiosk-coral);
          animation: pulseGlow 2s infinite;
        }

        .almost-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: linear-gradient(135deg, var(--kiosk-coral), var(--kiosk-coral-dark));
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 10px;
          animation: bounce 1.5s infinite;
        }

        .can-afford-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--kiosk-green-check);
          color: white;
          font-size: 0.9rem;
          font-weight: 700;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reward-card-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--kiosk-peach), var(--kiosk-coral));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reward-card-icon ha-icon {
          --mdc-icon-size: 28px;
          color: white;
        }

        .reward-card-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--kiosk-text-dark);
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .reward-card-cost {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--kiosk-star-gold);
          margin-bottom: 10px;
        }

        .reward-card-cost .star {
          font-size: 1rem;
        }

        .reward-card-progress {
          margin-top: 8px;
        }

        .reward-progress-bar {
          height: 6px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .reward-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--kiosk-blue-soft), var(--kiosk-blue-deep));
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .reward-progress-text {
          font-size: 0.75rem;
          color: var(--kiosk-text-muted);
        }

        .reward-claim-btn {
          background: linear-gradient(135deg, var(--kiosk-green-soft), var(--kiosk-green-check));
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .reward-claim-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(102, 187, 106, 0.4);
        }

        .reward-claim-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--kiosk-text-dark);
          color: white;
          padding: 12px 24px;
          border-radius: var(--kiosk-radius-md);
          box-shadow: var(--kiosk-shadow-elevated);
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }

          .sidebar {
            flex-direction: row;
            overflow-x: auto;
          }

          .members-section {
            min-width: 280px;
          }

          .main-panels {
            grid-template-columns: 1fr;
          }

          .weekly-panel {
            grid-column: span 1;
          }
        }

        @media (max-width: 768px) {
          .dashboard {
            padding: 12px;
          }

          .week-grid {
            gap: 4px;
          }

          .week-day {
            padding: 8px 4px;
          }
        }
      </style>

      <div class="dashboard">
        <!-- Header -->
        <header class="dashboard-header">
          <div class="header-left">
            <div class="header-logo">FamDo</div>
            <div class="header-date">
              ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div class="header-right">
            ${this._config.show_weather ? this._renderWeather() : ''}
            <div class="header-time">
              ${this._currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </header>

        <!-- Main Content -->
        <div class="dashboard-content">
          <!-- Left Sidebar - Members -->
          <aside class="sidebar">
            <div class="members-section">
              <div class="section-title">Family Members</div>
              <div class="members-list">
                ${members.map(m => this._renderMemberCard(m)).join('')}
              </div>
            </div>
          </aside>

          <!-- Main Panels -->
          <div class="main-panels">
            <!-- Weekly Overview -->
            <div class="panel weekly-panel">
              <div class="panel-header">
                <div class="panel-title">
                  <span class="panel-title-icon">📅</span>
                  This Week
                </div>
              </div>
              <div class="week-grid">
                ${weekDays.map(day => this._renderWeekDay(day)).join('')}
              </div>
            </div>

            <!-- Today's Chores -->
            <div class="panel">
              <div class="panel-header">
                <div class="panel-title">
                  <span class="panel-title-icon">✨</span>
                  Today's Chores
                </div>
                ${selectedMember ? `<span style="color: var(--kiosk-text-muted)">${selectedMember.name}</span>` : ''}
              </div>
              <div class="chores-list">
                ${todayChores.length === 0 ? `
                  <div class="empty-state">
                    <div class="empty-state-icon">🎉</div>
                    <p>All done for today!</p>
                  </div>
                ` : todayChores.map(c => this._renderChoreItem(c)).join('')}
              </div>
            </div>

            <!-- Available Rewards -->
            <div class="panel rewards-panel">
              <div class="panel-header">
                <div class="panel-title">
                  <span class="panel-title-icon">🎁</span>
                  Available Rewards
                </div>
                ${selectedMember ? `<span class="points-badge">⭐ ${selectedMember.points}</span>` : ''}
              </div>
              ${this._renderAllRewards(selectedMember)}
            </div>
          </div>
        </div>
      </div>
    `;

    this._attachEventListeners();
  }

  _renderMemberCard(member) {
    const isSelected = member.id === this._selectedMemberId;
    return `
      <div class="member-card ${isSelected ? 'selected' : ''}" data-member-id="${member.id}">
        <div class="member-avatar" style="background: ${member.color}">
          <ha-icon icon="${member.avatar}"></ha-icon>
        </div>
        <div class="member-info">
          <div class="member-name">${member.name}</div>
          <div class="member-stars">⭐ ${member.points}</div>
        </div>
      </div>
    `;
  }

  _renderWeekDay(day) {
    const chores = this._selectedMemberId ? this._getChoresForDay(this._selectedMemberId, day.date) : [];
    const completed = chores.filter(c => c.status === 'completed').length;
    const pending = chores.filter(c => c.status === 'awaiting_approval').length;
    const todo = chores.length - completed - pending;

    return `
      <div class="week-day ${day.isToday ? 'today' : ''}">
        <span class="week-day-name">${day.name}</span>
        <span class="week-day-num">${day.dayNum}</span>
        <div class="week-day-status">
          ${Array(completed).fill('<span class="status-dot completed"></span>').join('')}
          ${Array(pending).fill('<span class="status-dot pending"></span>').join('')}
          ${Array(todo).fill('<span class="status-dot todo"></span>').join('')}
          ${chores.length === 0 ? '<span style="font-size: 0.8rem; color: var(--kiosk-text-muted);">—</span>' : ''}
        </div>
      </div>
    `;
  }

  _renderChoreItem(chore) {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = chore.due_date && chore.due_date < today;
    const isDueToday = chore.due_date === today;
    const isAssignedToMe = chore.assigned_to === this._selectedMemberId;
    const isMine = chore.claimed_by === this._selectedMemberId;
    const isUnassigned = !chore.assigned_to;
    const isPendingOrOverdue = chore.status === 'pending' || chore.status === 'overdue';
    const isAwaiting = chore.status === 'awaiting_approval';

    const canClaim = isPendingOrOverdue && isUnassigned;
    const canComplete = (isPendingOrOverdue && isAssignedToMe) || (chore.status === 'claimed' && isMine);

    let actionBtn = '';
    if (canComplete) {
      actionBtn = `<button class="chore-action-btn done" data-action="complete" data-id="${chore.id}">✓ Done</button>`;
    } else if (canClaim) {
      actionBtn = `<button class="chore-action-btn claim" data-action="claim" data-id="${chore.id}">Claim</button>`;
    }

    return `
      <div class="chore-item" data-chore-id="${chore.id}">
        <div class="chore-checkbox ${canComplete ? 'can-complete' : ''} ${isAwaiting ? 'awaiting' : ''}"></div>
        <div class="chore-info">
          <div class="chore-name">${chore.name}</div>
          <div class="chore-meta">
            <span class="chore-points">⭐ ${chore.points}</span>
            ${isOverdue ? '<span class="chore-status-badge overdue">Overdue</span>' : ''}
            ${isDueToday && !isOverdue ? '<span class="chore-status-badge today">Due Today</span>' : ''}
            ${isAwaiting ? '<span class="chore-status-badge" style="background: rgba(255, 213, 79, 0.15); color: #D4A017;">Awaiting Approval</span>' : ''}
          </div>
        </div>
        ${actionBtn}
      </div>
    `;
  }

  _renderRewardProgress(progress) {
    const percentage = Math.round(progress.progress * 100);
    const isAlmostThere = percentage >= 80 && percentage < 100;
    const remaining = progress.targetPoints - progress.currentPoints;

    return `
      <div class="reward-meter">
        <div class="reward-target">
          <div class="reward-icon">🎁</div>
          <div class="reward-target-info">
            <div class="reward-target-name">${progress.targetReward.name}</div>
            <div class="reward-target-label">Next reward</div>
          </div>
        </div>

        <div class="reward-bar-container">
          <div class="reward-bar-fill" style="width: ${percentage}%"></div>
          <div class="reward-bar-stars">
            ${[1, 2, 3, 4, 5].map(i => `
              <span class="reward-bar-star ${percentage >= (i * 20) ? 'filled' : ''}">⭐</span>
            `).join('')}
          </div>
        </div>

        <div class="reward-stats">
          <span class="reward-points">${progress.currentPoints} / ${progress.targetPoints}</span>
          ${isAlmostThere ? `
            <span class="almost-there">Almost there!</span>
          ` : `
            <span class="reward-remaining">${remaining} more ⭐ to go</span>
          `}
        </div>
      </div>
    `;
  }

  _renderAllRewards(selectedMember) {
    const rewards = (this._data?.rewards || []).filter(r => r.available);
    const currentPoints = selectedMember?.points || 0;

    if (rewards.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">🎁</div>
          <p>No rewards available yet</p>
        </div>
      `;
    }

    // Sort rewards by cost (cheapest first)
    rewards.sort((a, b) => a.points_cost - b.points_cost);

    return `
      <div class="rewards-grid">
        ${rewards.map(reward => this._renderRewardCard(reward, currentPoints)).join('')}
      </div>
    `;
  }

  _renderRewardCard(reward, currentPoints) {
    const canAfford = currentPoints >= reward.points_cost;
    const progress = Math.min(currentPoints / reward.points_cost, 1);
    const percentage = Math.round(progress * 100);
    const needed = reward.points_cost - currentPoints;
    const isAlmostThere = percentage >= 80 && percentage < 100;

    return `
      <div class="reward-card ${canAfford ? 'affordable' : ''} ${isAlmostThere ? 'almost-there' : ''}"
           data-action="claim-reward" data-reward-id="${reward.id}" ${!canAfford || !this._selectedMemberId ? '' : ''}>
        ${isAlmostThere ? '<div class="almost-badge">Almost!</div>' : ''}
        ${canAfford ? '<div class="can-afford-badge">✓</div>' : ''}
        <div class="reward-card-icon">
          <ha-icon icon="${reward.icon || 'mdi:gift'}"></ha-icon>
        </div>
        <div class="reward-card-name">${reward.name}</div>
        <div class="reward-card-cost">
          <span class="star">⭐</span> ${reward.points_cost}
        </div>
        ${!canAfford ? `
          <div class="reward-card-progress">
            <div class="reward-progress-bar">
              <div class="reward-progress-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="reward-progress-text">${needed} more</div>
          </div>
        ` : `
          <button class="reward-claim-btn" data-action="claim-reward" data-reward-id="${reward.id}"
                  ${!this._selectedMemberId ? 'disabled' : ''}>
            Claim!
          </button>
        `}
      </div>
    `;
  }

  _renderWeather() {
    // Basic weather rendering - would need actual weather entity data
    return `
      <div class="header-weather">
        <span>☀️</span>
        <span>72°F</span>
      </div>
    `;
  }

  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.shadowRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  _attachEventListeners() {
    // Member selection
    this.shadowRoot.querySelectorAll('.member-card').forEach(card => {
      card.addEventListener('click', () => {
        this._selectedMemberId = card.dataset.memberId;
        localStorage.setItem('famdo_kiosk_member', this._selectedMemberId);
        window.dispatchEvent(new CustomEvent('famdo-member-selected', {
          detail: { memberId: this._selectedMemberId }
        }));
        this._render();
      });
    });

    // Chore actions
    this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const choreId = btn.dataset.id;
        const rewardId = btn.dataset.rewardId;

        if (action === 'claim') {
          await this._claimChore(choreId);
        } else if (action === 'complete') {
          await this._completeChore(choreId, btn);
        } else if (action === 'claim-reward') {
          await this._claimReward(rewardId, btn);
        }
      });
    });
  }

  async _claimChore(choreId) {
    if (!this._selectedMemberId) return;

    const result = await this._sendCommand('famdo/claim_chore', {
      chore_id: choreId,
      member_id: this._selectedMemberId
    });

    if (result) {
      this._showToast('Chore claimed!');
    }
  }

  async _completeChore(choreId, buttonElement) {
    if (!this._selectedMemberId) return;

    const chore = this._data?.chores?.find(c => c.id === choreId);

    // Claim first if needed
    if (chore && (chore.status === 'pending' || chore.status === 'overdue') && !chore.claimed_by) {
      await this._sendCommand('famdo/claim_chore', {
        chore_id: choreId,
        member_id: this._selectedMemberId
      });
    }

    const result = await this._sendCommand('famdo/complete_chore', {
      chore_id: choreId,
      member_id: this._selectedMemberId
    });

    if (result) {
      // Trigger celebration
      this._triggerStarBurst(buttonElement, chore?.points || 0);
      this._showToast('🌟 Great job! Submitted for approval');
    }
  }

  async _claimReward(rewardId, buttonElement) {
    if (!this._selectedMemberId) return;

    const reward = this._data?.rewards?.find(r => r.id === rewardId);
    const member = this._data?.members?.find(m => m.id === this._selectedMemberId);

    if (!reward || !member) return;

    // Check if member has enough points
    if (member.points < reward.points_cost) {
      this._showToast('Not enough points for this reward');
      return;
    }

    const result = await this._sendCommand('famdo/claim_reward', {
      reward_id: rewardId,
      member_id: this._selectedMemberId
    });

    if (result) {
      // Trigger celebration for reward claim
      this._triggerRewardCelebration(buttonElement, reward);
      this._showToast(`🎁 ${reward.name} claimed!`);
    }
  }

  _triggerRewardCelebration(element, reward) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create gift burst
    const emojis = ['🎁', '🎉', '🎊', '✨', '🌟'];
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: 28px;
        z-index: 10000;
        pointer-events: none;
        animation: celebrationStar 1s ease-out forwards;
        --star-x: ${Math.cos((i / 8) * 2 * Math.PI) * 100}px;
        --star-y: ${Math.sin((i / 8) * 2 * Math.PI) * 100}px;
        animation-delay: ${i * 0.05}s;
      `;
      particle.textContent = emojis[i % emojis.length];
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 1200);
    }

    // Show reward name
    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
      position: fixed;
      left: ${centerX}px;
      top: ${centerY - 40}px;
      transform: translateX(-50%);
      font-size: 1.2rem;
      font-weight: bold;
      color: #4CAF50;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      z-index: 10000;
      pointer-events: none;
      animation: floatUp 1.2s ease-out forwards;
    `;
    nameEl.textContent = `🎁 ${reward.name}`;
    document.body.appendChild(nameEl);
    setTimeout(() => nameEl.remove(), 1500);
  }

  _triggerStarBurst(element, points) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create star burst
    for (let i = 0; i < 7; i++) {
      const star = document.createElement('div');
      star.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: 24px;
        z-index: 10000;
        pointer-events: none;
        animation: celebrationStar 0.8s ease-out forwards;
        --star-x: ${Math.cos((i / 7) * 2 * Math.PI) * 80}px;
        --star-y: ${Math.sin((i / 7) * 2 * Math.PI) * 80}px;
        animation-delay: ${i * 0.05}s;
      `;
      star.textContent = '⭐';
      document.body.appendChild(star);
      setTimeout(() => star.remove(), 1000);
    }

    // Show points
    if (points > 0) {
      const pointsEl = document.createElement('div');
      pointsEl.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: 1.5rem;
        font-weight: bold;
        color: #FFD54F;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        z-index: 10000;
        pointer-events: none;
        animation: floatUp 1.2s ease-out forwards;
        transform: translateX(-50%);
      `;
      pointsEl.textContent = `+${points} ⭐`;
      document.body.appendChild(pointsEl);
      setTimeout(() => pointsEl.remove(), 1200);
    }
  }

  getCardSize() {
    return 8;
  }
}

// Register custom element
customElements.define('famdo-kiosk-dashboard', FamDoKioskDashboard);

// Register with HACS/Lovelace
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'famdo-kiosk-dashboard',
  name: 'FamDo Kiosk Dashboard',
  description: 'Full-screen family dashboard for wall-mounted tablets',
  preview: true
});

console.info('%c FAMDO-KIOSK-DASHBOARD %c Loaded ',
  'background: linear-gradient(135deg, #FF8A80, #64B5F6); color: #fff; font-weight: bold;',
  'background: #FFF8F0; color: #4A4A4A;'
);
