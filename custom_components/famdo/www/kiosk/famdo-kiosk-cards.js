/**
 * FamDo Kiosk Cards
 * Custom Lovelace cards for end-user interactions
 * Designed for kiosk/tablet displays
 */

// Shared styles for all kiosk cards - Skylight CalMax Inspired Design System
const KIOSK_STYLES = `
  :host {
    /* Legacy colors - keeping for backwards compatibility */
    --famdo-primary: #4ECDC4;
    --famdo-secondary: #FF6B6B;
    --famdo-success: #96CEB4;
    --famdo-warning: #FFEAA7;
    --famdo-danger: #FF6B6B;
    --famdo-info: #45B7D1;
    --famdo-bg: var(--card-background-color, #1a1a2e);
    --famdo-text: var(--primary-text-color, #ffffff);
    --famdo-text-secondary: var(--secondary-text-color, #a0a0a0);
    --famdo-border-radius: 12px;
    --famdo-spacing: 16px;
    --famdo-touch-target: 48px;

    /* Skylight-Inspired Color Palette */
    /* Backgrounds */
    --kiosk-bg-cream: #FFF8F0;
    --kiosk-bg-warm: #FDF6EE;
    --kiosk-bg-card: rgba(255, 255, 255, 0.95);

    /* Accents */
    --kiosk-peach: #FFECD9;
    --kiosk-coral: #FF8A80;
    --kiosk-coral-dark: #E57373;

    /* Blues */
    --kiosk-blue-soft: #64B5F6;
    --kiosk-blue-deep: #42A5F5;

    /* Greens */
    --kiosk-green-soft: #81C784;
    --kiosk-green-check: #66BB6A;

    /* Stars */
    --kiosk-star-gold: #FFD54F;
    --kiosk-star-glow: #FFECB3;

    /* Text */
    --kiosk-text-dark: #4A4A4A;
    --kiosk-text-muted: #9E9E9E;

    /* Corner Radius & Shadows */
    --kiosk-radius-sm: 12px;
    --kiosk-radius-md: 20px;
    --kiosk-radius-lg: 28px;
    --kiosk-shadow-soft: 0 4px 20px rgba(0,0,0,0.08);
    --kiosk-shadow-elevated: 0 8px 32px rgba(0,0,0,0.12);

    /* Typography */
    --kiosk-font-family: 'Nunito', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Star Burst Animation */
  @keyframes starBurst {
    0% {
      transform: scale(0) rotate(0deg);
      opacity: 1;
    }
    50% {
      transform: scale(1.5) rotate(180deg);
      opacity: 1;
    }
    100% {
      transform: scale(2) rotate(360deg);
      opacity: 0;
    }
  }

  /* Check Mark Drawing Animation */
  @keyframes drawCheck {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }

  /* Points Counter Animation */
  @keyframes countUp {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  /* Float Up Animation for points earned */
  @keyframes floatUp {
    0% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateY(-60px) scale(1.2);
      opacity: 0;
    }
  }

  /* Pulse Glow Animation */
  @keyframes pulseGlow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 213, 79, 0.4);
    }
    50% {
      box-shadow: 0 0 20px 10px rgba(255, 213, 79, 0.2);
    }
  }

  /* Confetti Fall Animation */
  @keyframes confettiFall {
    0% {
      transform: translateY(-100%) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }

  /* Bounce Animation */
  @keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  /* Shimmer Animation */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Celebration Star Animation */
  @keyframes celebrationStar {
    0% {
      transform: translate(0, 0) scale(0) rotate(0deg);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      transform: translate(var(--star-x, 50px), var(--star-y, -100px)) scale(1) rotate(360deg);
      opacity: 0;
    }
  }

  .famdo-card {
    padding: var(--famdo-spacing);
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
  }

  .famdo-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--famdo-spacing);
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .famdo-card-title {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--famdo-text);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .famdo-card-title ha-icon {
    color: var(--famdo-primary);
  }

  .famdo-empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--famdo-text-secondary);
  }

  .famdo-empty ha-icon {
    --mdc-icon-size: 48px;
    opacity: 0.5;
    margin-bottom: 8px;
  }

  .famdo-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 24px;
    border: none;
    border-radius: var(--famdo-border-radius);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    min-height: var(--famdo-touch-target);
    transition: all 0.2s ease;
    touch-action: manipulation;
  }

  .famdo-btn:active {
    transform: scale(0.98);
  }

  .famdo-btn-primary {
    background: var(--famdo-primary);
    color: #000;
  }

  .famdo-btn-success {
    background: var(--famdo-success);
    color: #000;
  }

  .famdo-btn-danger {
    background: var(--famdo-danger);
    color: #fff;
  }

  .famdo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .famdo-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .famdo-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--famdo-bg);
    color: var(--famdo-text);
    padding: 12px 24px;
    border-radius: var(--famdo-border-radius);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;

// ==================== Celebration Overlay Component ====================

class FamDoCelebration extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['type'];
  }

  connectedCallback() {
    this._render();
  }

  // Trigger star burst animation at a specific position
  triggerStarBurst(x, y, points = 0) {
    const container = this.shadowRoot.querySelector('.celebration-container');
    if (!container) return;

    // Create 7 stars
    for (let i = 0; i < 7; i++) {
      const star = document.createElement('div');
      star.className = 'celebration-star';
      star.innerHTML = '⭐';

      // Random angle for each star
      const angle = (i / 7) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
      const distance = 60 + Math.random() * 40;
      const xOffset = Math.cos(angle) * distance;
      const yOffset = Math.sin(angle) * distance;

      star.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        --star-x: ${xOffset}px;
        --star-y: ${yOffset}px;
        animation-delay: ${i * 0.05}s;
      `;

      container.appendChild(star);

      // Remove after animation
      setTimeout(() => star.remove(), 1000);
    }

    // Show points float-up if points provided
    if (points > 0) {
      const pointsEl = document.createElement('div');
      pointsEl.className = 'points-float';
      pointsEl.innerHTML = `+${points} ⭐`;
      pointsEl.style.cssText = `
        left: ${x}px;
        top: ${y}px;
      `;
      container.appendChild(pointsEl);
      setTimeout(() => pointsEl.remove(), 1200);
    }
  }

  // Trigger confetti animation (for milestone achievements)
  triggerConfetti() {
    const container = this.shadowRoot.querySelector('.celebration-container');
    if (!container) return;

    const colors = ['#FF6B6B', '#4ECDC4', '#FFD54F', '#64B5F6', '#81C784', '#FF8A80'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${2 + Math.random() * 2}s;
      `;
      container.appendChild(confetti);

      setTimeout(() => confetti.remove(), 4000);
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
        }

        .celebration-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .celebration-star {
          position: absolute;
          font-size: 24px;
          animation: celebrationStar 0.8s ease-out forwards;
          pointer-events: none;
        }

        .points-float {
          position: absolute;
          font-size: 1.5rem;
          font-weight: bold;
          color: #FFD54F;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          animation: floatUp 1.2s ease-out forwards;
          pointer-events: none;
          white-space: nowrap;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          animation: confettiFall 3s ease-in-out forwards;
        }

        @keyframes celebrationStar {
          0% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--star-x, 50px), var(--star-y, -100px)) scale(1) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) scale(1.2);
            opacity: 0;
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      </style>
      <div class="celebration-container"></div>
    `;
  }
}

// ==================== Member Badge Component ====================

class FamDoMemberBadge extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._member = null;
    this._selected = false;
    this._size = 'medium'; // small, medium, large
  }

  static get observedAttributes() {
    return ['selected', 'size'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'selected') {
      this._selected = newValue !== null;
    } else if (name === 'size') {
      this._size = newValue || 'medium';
    }
    if (this._member) {
      this._render();
    }
  }

  set member(value) {
    this._member = value;
    this._render();
  }

  get member() {
    return this._member;
  }

  set selected(value) {
    this._selected = value;
    if (value) {
      this.setAttribute('selected', '');
    } else {
      this.removeAttribute('selected');
    }
    this._render();
  }

  get selected() {
    return this._selected;
  }

  _render() {
    if (!this._member) {
      this.shadowRoot.innerHTML = '';
      return;
    }

    const sizes = {
      small: { avatar: 48, icon: 24, fontSize: '0.85rem', starSize: '0.75rem' },
      medium: { avatar: 80, icon: 36, fontSize: '1rem', starSize: '0.9rem' },
      large: { avatar: 100, icon: 48, fontSize: '1.2rem', starSize: '1rem' }
    };

    const s = sizes[this._size] || sizes.medium;
    const m = this._member;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .member-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: var(--kiosk-radius-md, 20px);
          transition: all 0.3s ease;
          background: transparent;
        }

        .member-badge:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .member-badge.selected {
          background: rgba(255, 213, 79, 0.15);
        }

        .avatar-container {
          position: relative;
        }

        .avatar {
          width: ${s.avatar}px;
          height: ${s.avatar}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 4px solid ${m.color || '#4ECDC4'};
          background: ${m.color || '#4ECDC4'}20;
          transition: all 0.3s ease;
        }

        .member-badge.selected .avatar {
          border-width: 5px;
          box-shadow: 0 0 20px ${m.color || '#4ECDC4'}60,
                      0 0 40px ${m.color || '#4ECDC4'}30;
          transform: scale(1.08);
          animation: pulseGlow 2s ease-in-out infinite;
        }

        .avatar ha-icon {
          --mdc-icon-size: ${s.icon}px;
          color: ${m.color || '#4ECDC4'};
        }

        .member-name {
          font-size: ${s.fontSize};
          font-weight: 600;
          color: var(--kiosk-text-dark, #4A4A4A);
          text-align: center;
          max-width: ${s.avatar + 20}px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :host-context([dark-mode]) .member-name,
        :host-context(.dark) .member-name {
          color: var(--famdo-text, #ffffff);
        }

        .star-count {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: ${s.starSize};
          font-weight: 700;
          color: var(--kiosk-star-gold, #FFD54F);
          background: rgba(255, 213, 79, 0.15);
          padding: 4px 10px;
          border-radius: 12px;
        }

        .star-count .star-icon {
          font-size: 1em;
        }

        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px ${m.color || '#4ECDC4'}60,
                        0 0 40px ${m.color || '#4ECDC4'}30;
          }
          50% {
            box-shadow: 0 0 30px ${m.color || '#4ECDC4'}80,
                        0 0 60px ${m.color || '#4ECDC4'}40;
          }
        }
      </style>
      <div class="member-badge ${this._selected ? 'selected' : ''}">
        <div class="avatar-container">
          <div class="avatar">
            <ha-icon icon="${m.avatar || 'mdi:account'}"></ha-icon>
          </div>
        </div>
        <div class="member-name">${m.name}</div>
        <div class="star-count">
          <span class="star-icon">⭐</span>
          <span>${m.points || 0}</span>
        </div>
      </div>
    `;
  }
}

// ==================== Star Meter Component ====================

class FamDoStarMeter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentPoints = 0;
    this._targetPoints = 100;
    this._targetReward = null;
  }

  set data({ currentPoints, targetPoints, targetReward }) {
    this._currentPoints = currentPoints || 0;
    this._targetPoints = targetPoints || 100;
    this._targetReward = targetReward;
    this._render();
  }

  _render() {
    const progress = Math.min(this._currentPoints / this._targetPoints, 1);
    const percentage = Math.round(progress * 100);
    const isAlmostThere = percentage >= 80 && percentage < 100;
    const isComplete = percentage >= 100;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .star-meter {
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--kiosk-radius-md, 20px);
          padding: 20px;
        }

        .meter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .meter-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--famdo-text, #ffffff);
        }

        .meter-target {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: var(--famdo-text-secondary, #a0a0a0);
        }

        .meter-target-icon {
          font-size: 1.2rem;
        }

        .meter-bar-container {
          position: relative;
          height: 24px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .meter-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFD54F, #FFECB3, #FFD54F);
          background-size: 200% 100%;
          border-radius: 12px;
          transition: width 0.8s ease-out;
          position: relative;
          width: ${percentage}%;
        }

        .meter-bar-fill.animating {
          animation: shimmer 2s infinite linear;
        }

        .meter-bar-fill.almost-there {
          animation: shimmer 1.5s infinite linear, pulseGlow 1s infinite;
        }

        .meter-stars {
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

        .meter-star {
          font-size: 14px;
          opacity: 0.3;
          transition: all 0.3s ease;
        }

        .meter-star.filled {
          opacity: 1;
          transform: scale(1.2);
        }

        .meter-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .meter-points {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--kiosk-star-gold, #FFD54F);
        }

        .meter-points-label {
          font-size: 0.8rem;
          color: var(--famdo-text-secondary, #a0a0a0);
        }

        .meter-remaining {
          text-align: right;
        }

        .meter-remaining-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--famdo-text, #ffffff);
        }

        .meter-remaining-label {
          font-size: 0.8rem;
          color: var(--famdo-text-secondary, #a0a0a0);
        }

        .almost-there-badge {
          background: linear-gradient(135deg, #FF8A80, #FF6B6B);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          animation: bounce 1s infinite;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 213, 79, 0.5); }
          50% { box-shadow: 0 0 20px rgba(255, 213, 79, 0.8); }
        }

        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      </style>
      <div class="star-meter">
        <div class="meter-header">
          <span class="meter-title">Next Reward</span>
          ${this._targetReward ? `
            <span class="meter-target">
              <span class="meter-target-icon">🎁</span>
              ${this._targetReward.name}
            </span>
          ` : ''}
        </div>

        <div class="meter-bar-container">
          <div class="meter-bar-fill ${isAlmostThere ? 'almost-there' : 'animating'}">
          </div>
          <div class="meter-stars">
            ${[1, 2, 3, 4, 5].map(i => `
              <span class="meter-star ${percentage >= (i * 20) ? 'filled' : ''}">⭐</span>
            `).join('')}
          </div>
        </div>

        <div class="meter-stats">
          <div>
            <div class="meter-points">${this._currentPoints} / ${this._targetPoints}</div>
            <div class="meter-points-label">points</div>
          </div>
          <div class="meter-remaining">
            ${isAlmostThere ? `
              <div class="almost-there-badge">Almost there!</div>
            ` : isComplete ? `
              <div class="meter-remaining-value" style="color: var(--kiosk-green-check, #66BB6A);">Ready to claim!</div>
            ` : `
              <div class="meter-remaining-value">${this._targetPoints - this._currentPoints} more</div>
              <div class="meter-remaining-label">to go</div>
            `}
          </div>
        </div>
      </div>
    `;
  }
}

// ==================== Base Card Class ====================

class FamDoBaseCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._data = null;
    this._selectedMemberId = null;
    this._celebrationEl = null;
  }

  // Get or create the global celebration overlay
  _getCelebration() {
    if (!this._celebrationEl) {
      this._celebrationEl = document.querySelector('famdo-celebration');
      if (!this._celebrationEl) {
        this._celebrationEl = document.createElement('famdo-celebration');
        document.body.appendChild(this._celebrationEl);
      }
    }
    return this._celebrationEl;
  }

  // Trigger star burst at element position
  _triggerStarBurst(element, points = 0) {
    const celebration = this._getCelebration();
    if (element) {
      const rect = element.getBoundingClientRect();
      celebration.triggerStarBurst(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        points
      );
    }
  }

  // Trigger confetti for milestones
  _triggerConfetti() {
    const celebration = this._getCelebration();
    celebration.triggerConfetti();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._data) {
      this._loadData();
    }
  }

  setConfig(config) {
    this._config = config;
  }

  async _loadData() {
    if (!this._hass) return;

    try {
      this._data = await this._hass.callWS({ type: 'famdo/get_data' });

      // Try to restore selected member from localStorage
      const savedMemberId = localStorage.getItem('famdo_kiosk_member');
      if (savedMemberId && this._data.members.find(m => m.id === savedMemberId)) {
        this._selectedMemberId = savedMemberId;
      }

      this._render();
      this._subscribeToUpdates();
    } catch (e) {
      console.error('FamDo: Failed to load data', e);
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
      console.error('FamDo: Failed to subscribe', e);
    }
  }

  async _sendCommand(type, data = {}) {
    if (!this._hass) return null;
    try {
      return await this._hass.callWS({ type, ...data });
    } catch (e) {
      console.error('FamDo command failed:', e);
      this._showToast('Action failed', 'error');
      return null;
    }
  }

  _showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'famdo-toast';
    toast.textContent = message;
    toast.style.borderLeft = `4px solid var(--famdo-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'})`;
    this.shadowRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  _getMember(memberId) {
    return this._data?.members?.find(m => m.id === memberId);
  }

  _getSelectedMember() {
    return this._getMember(this._selectedMemberId);
  }

  // Get the current Home Assistant user's ID
  _getHassUserId() {
    return this._hass?.user?.id || null;
  }

  // Get the current Home Assistant user's name
  _getHassUserName() {
    return this._hass?.user?.name || null;
  }

  // Find a FamDo member linked to the current HA user
  _getCurrentUserMember() {
    const haUserId = this._getHassUserId();
    const haUserName = this._getHassUserName();

    if (!this._data?.members) return null;

    // First try to find by linked HA user ID
    if (haUserId) {
      const linkedMember = this._data.members.find(m => m.ha_user_id === haUserId);
      if (linkedMember) return linkedMember;
    }

    // Fall back to matching by name (case-insensitive)
    if (haUserName) {
      const nameMatch = this._data.members.find(
        m => m.name.toLowerCase() === haUserName.toLowerCase()
      );
      if (nameMatch) return nameMatch;
    }

    return null;
  }

  // Get the approver ID - current HA user member or first parent
  _getApproverId() {
    // Try to get the current HA user's member
    const currentUserMember = this._getCurrentUserMember();
    if (currentUserMember && currentUserMember.role === 'parent') {
      return currentUserMember.id;
    }

    // Fall back to first parent in the data
    const firstParent = (this._data?.members || []).find(m => m.role === 'parent');
    if (firstParent) {
      return firstParent.id;
    }

    // Last resort: use the HA user ID directly (will need backend support)
    const haUserId = this._getHassUserId();
    if (haUserId) {
      return `ha_user:${haUserId}`;
    }

    return null;
  }

  _render() {
    // Override in subclasses
  }

  getCardSize() {
    return 3;
  }
}

// ==================== Member Selector Card ====================

class FamDoMemberSelector extends FamDoBaseCard {
  static get properties() {
    return { _selectedMemberId: { type: String } };
  }

  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Who\'s using FamDo?',
      show_points: true,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    const members = this._data.members || [];

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .member-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
        }

        .member-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 16px;
          background: rgba(255,255,255,0.05);
          border: 3px solid transparent;
          border-radius: var(--famdo-border-radius);
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 120px;
        }

        .member-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        .member-btn.selected {
          border-color: var(--famdo-primary);
          background: rgba(78, 205, 196, 0.15);
        }

        .member-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .member-avatar ha-icon {
          --mdc-icon-size: 32px;
          color: #fff;
        }

        .member-name {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--famdo-text);
        }

        .member-points {
          font-size: 0.9rem;
          color: var(--famdo-text-secondary);
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:account-group"></ha-icon>
              ${this._config.title}
            </h2>
          </div>
          ${members.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:account-plus"></ha-icon>
              <p>No family members yet</p>
            </div>
          ` : `
            <div class="member-grid">
              ${members.map(m => `
                <button class="member-btn ${this._selectedMemberId === m.id ? 'selected' : ''}" data-id="${m.id}">
                  <div class="member-avatar" style="background: ${m.color}">
                    <ha-icon icon="${m.avatar}"></ha-icon>
                  </div>
                  <span class="member-name">${m.name}</span>
                  ${this._config.show_points ? `<span class="member-points">${m.points} pts</span>` : ''}
                </button>
              `).join('')}
            </div>
          `}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll('.member-btn').forEach(btn => {
      btn.addEventListener('click', () => this._selectMember(btn.dataset.id));
    });
  }

  _selectMember(memberId) {
    this._selectedMemberId = memberId;
    localStorage.setItem('famdo_kiosk_member', memberId);

    // Dispatch event for other cards to pick up
    window.dispatchEvent(new CustomEvent('famdo-member-selected', {
      detail: { memberId }
    }));

    this._render();
    const member = this._getMember(memberId);
    if (member) {
      this._showToast(`Welcome, ${member.name}!`, 'success');
    }
  }

  getCardSize() {
    return 2;
  }
}

// ==================== Chores Card ====================

class FamDoChoresCard extends FamDoBaseCard {
  constructor() {
    super();
    window.addEventListener('famdo-member-selected', (e) => {
      this._selectedMemberId = e.detail.memberId;
      this._render();
    });
  }

  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'My Chores',
      show_all: false, // If false, only show chores for selected member
      max_items: 10,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    // Restore member from localStorage if not set
    if (!this._selectedMemberId) {
      this._selectedMemberId = localStorage.getItem('famdo_kiosk_member');
    }

    let chores = (this._data.chores || [])
      .filter(c => !c.is_template) // Hide templates
      .filter(c => c.status !== 'completed'); // Hide completed

    // Filter by member if not showing all
    if (!this._config.show_all && this._selectedMemberId) {
      chores = chores.filter(c =>
        !c.assigned_to || c.assigned_to === this._selectedMemberId ||
        c.claimed_by === this._selectedMemberId
      );
    }

    chores = chores.slice(0, this._config.max_items);
    const selectedMember = this._getSelectedMember();

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .chore-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
          transition: all 0.2s ease;
        }

        .chore-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .chore-icon ha-icon {
          --mdc-icon-size: 24px;
          color: #fff;
        }

        .chore-info {
          flex: 1;
          min-width: 0;
        }

        .chore-name {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--famdo-text);
          margin-bottom: 4px;
        }

        .chore-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
          color: var(--famdo-text-secondary);
        }

        .chore-points {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--famdo-warning);
        }

        .chore-status {
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .chore-status.pending { background: rgba(69, 183, 209, 0.2); color: var(--famdo-info); }
        .chore-status.claimed { background: rgba(255, 234, 167, 0.2); color: #D4A017; }
        .chore-status.awaiting_approval { background: rgba(221, 160, 221, 0.2); color: #DDA0DD; }
        .chore-status.overdue { background: rgba(255, 107, 107, 0.2); color: var(--famdo-danger); }
        .chore-status.rejected { background: rgba(255, 107, 107, 0.2); color: var(--famdo-danger); }

        .chore-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .no-member-warning {
          background: rgba(255, 234, 167, 0.2);
          border: 1px solid rgba(255, 234, 167, 0.3);
          border-radius: var(--famdo-border-radius);
          padding: 16px;
          text-align: center;
          color: var(--famdo-warning);
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:broom"></ha-icon>
              ${this._config.title}
            </h2>
            ${selectedMember ? `<span style="color: var(--famdo-text-secondary)">${selectedMember.name}</span>` : ''}
          </div>
          ${!this._selectedMemberId ? `
            <div class="no-member-warning">
              <ha-icon icon="mdi:account-question"></ha-icon>
              <p>Please select a family member first</p>
            </div>
          ` : chores.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:check-circle"></ha-icon>
              <p>No chores right now!</p>
            </div>
          ` : `
            <div class="famdo-list">
              ${chores.map(c => this._renderChore(c)).join('')}
            </div>
          `}
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _renderChore(chore) {
    const assignedMember = this._getMember(chore.assigned_to);
    const isMine = chore.claimed_by === this._selectedMemberId;
    const isAssignedToMe = chore.assigned_to === this._selectedMemberId;
    const isUnassigned = !chore.assigned_to;
    const isPendingOrOverdue = chore.status === 'pending' || chore.status === 'overdue';

    // Can claim only unassigned chores
    const canClaim = isPendingOrOverdue && isUnassigned;
    // Can complete if: assigned to me (pending/overdue), or already claimed by me
    const canComplete = (isPendingOrOverdue && isAssignedToMe) || (chore.status === 'claimed' && isMine);
    const canRetry = chore.status === 'rejected' && isMine;

    let actionBtn = '';
    if (canComplete) {
      // For assigned chores, "Done" will auto-claim first if needed
      actionBtn = `<button class="famdo-btn famdo-btn-success" data-action="complete" data-id="${chore.id}">
        <ha-icon icon="mdi:check"></ha-icon> Done
      </button>`;
    } else if (canClaim) {
      actionBtn = `<button class="famdo-btn famdo-btn-primary" data-action="claim" data-id="${chore.id}">
        <ha-icon icon="mdi:hand-back-right"></ha-icon> Claim
      </button>`;
    } else if (canRetry) {
      actionBtn = `<button class="famdo-btn famdo-btn-primary" data-action="retry" data-id="${chore.id}">
        <ha-icon icon="mdi:refresh"></ha-icon> Retry
      </button>`;
    } else if (chore.status === 'awaiting_approval') {
      actionBtn = `<span style="color: var(--famdo-text-secondary); font-size: 0.9rem;">Waiting for approval</span>`;
    }

    return `
      <div class="chore-item">
        <div class="chore-icon" style="background: ${assignedMember?.color || '#4ECDC4'}">
          <ha-icon icon="${chore.icon}"></ha-icon>
        </div>
        <div class="chore-info">
          <div class="chore-name">${chore.name}</div>
          <div class="chore-meta">
            <span class="chore-points">
              <ha-icon icon="mdi:star"></ha-icon>
              ${chore.points}
            </span>
            <span class="chore-status ${chore.status}">${this._formatStatus(chore.status)}</span>
            ${chore.due_date ? `<span><ha-icon icon="mdi:clock-outline"></ha-icon> ${this._formatDate(chore.due_date)}</span>` : ''}
          </div>
        </div>
        <div class="chore-actions">
          ${actionBtn}
        </div>
      </div>
    `;
  }

  _formatStatus(status) {
    const labels = {
      'pending': 'Available',
      'claimed': 'In Progress',
      'awaiting_approval': 'Pending',
      'overdue': 'Overdue',
      'rejected': 'Rejected'
    };
    return labels[status] || status;
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.dataset.action;
        const choreId = btn.dataset.id;

        if (action === 'claim') {
          await this._claimChore(choreId);
        } else if (action === 'complete') {
          await this._completeChore(choreId, btn);
        } else if (action === 'retry') {
          await this._retryChore(choreId);
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
      this._showToast('Chore claimed!', 'success');
    }
  }

  async _completeChore(choreId, buttonElement = null) {
    if (!this._selectedMemberId) return;

    // Find the chore to check if we need to claim first
    const chore = this._data?.chores?.find(c => c.id === choreId);

    // If chore is pending/overdue and assigned to me but not claimed, claim it first
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
      // Trigger star burst celebration animation
      if (buttonElement && chore) {
        this._triggerStarBurst(buttonElement, chore.points);
      }
      this._showToast('Submitted for approval!', 'success');
    }
  }

  async _retryChore(choreId) {
    if (!this._selectedMemberId) return;

    const result = await this._sendCommand('famdo/retry_chore', {
      chore_id: choreId,
      member_id: this._selectedMemberId
    });

    if (result) {
      this._showToast('Chore ready to retry!', 'success');
    }
  }

  getCardSize() {
    return 4;
  }
}

// ==================== Points/Leaderboard Card ====================

class FamDoPointsCard extends FamDoBaseCard {
  constructor() {
    super();
    window.addEventListener('famdo-member-selected', (e) => {
      this._selectedMemberId = e.detail.memberId;
      this._render();
    });
  }

  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Points Leaderboard',
      show_all: true,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    const members = [...(this._data.members || [])].sort((a, b) => b.points - a.points);

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .leaderboard {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--kiosk-radius-md, 20px);
          transition: all 0.3s ease;
          position: relative;
          min-height: 72px;
        }

        .leaderboard-item:hover {
          background: rgba(255,255,255,0.08);
          transform: translateX(4px);
        }

        .leaderboard-item.highlighted {
          background: rgba(78, 205, 196, 0.15);
          border: 2px solid var(--famdo-primary);
          box-shadow: 0 4px 20px rgba(78, 205, 196, 0.2);
        }

        .leaderboard-item.leader {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 213, 79, 0.15));
          border: 2px solid rgba(255, 215, 0, 0.3);
        }

        .leaderboard-rank {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1rem;
          flex-shrink: 0;
          position: relative;
        }

        .leaderboard-rank.gold {
          background: linear-gradient(135deg, #FFD700, #FFA000);
          color: #000;
          box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
        }
        .leaderboard-rank.silver {
          background: linear-gradient(135deg, #E8E8E8, #B8B8B8);
          color: #000;
        }
        .leaderboard-rank.bronze {
          background: linear-gradient(135deg, #CD7F32, #A0522D);
          color: #fff;
        }
        .leaderboard-rank.other {
          background: rgba(255,255,255,0.1);
          color: var(--famdo-text-secondary);
        }

        .crown-icon {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 20px;
          animation: bounce 2s ease-in-out infinite;
        }

        .leaderboard-avatar-container {
          position: relative;
          flex-shrink: 0;
        }

        .leaderboard-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .leaderboard-item.leader .leaderboard-avatar {
          border-color: rgba(255, 215, 0, 0.5);
          box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
        }

        .leaderboard-avatar ha-icon {
          --mdc-icon-size: 26px;
          color: #fff;
        }

        .leaderboard-info {
          flex: 1;
        }

        .leaderboard-name {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--famdo-text);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .leaderboard-role {
          font-size: 0.85rem;
          color: var(--famdo-text-secondary);
          margin-top: 2px;
        }

        .achievement-badges {
          display: flex;
          gap: 4px;
          margin-top: 4px;
        }

        .achievement-badge {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 8px;
          font-weight: 600;
        }

        .achievement-badge.milestone-100 {
          background: rgba(129, 199, 132, 0.2);
          color: var(--kiosk-green-soft, #81C784);
        }

        .achievement-badge.milestone-500 {
          background: rgba(100, 181, 246, 0.2);
          color: var(--kiosk-blue-soft, #64B5F6);
        }

        .achievement-badge.milestone-1000 {
          background: rgba(255, 213, 79, 0.2);
          color: var(--kiosk-star-gold, #FFD54F);
        }

        .leaderboard-points {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--kiosk-star-gold, #FFD54F);
          display: flex;
          align-items: center;
          gap: 6px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .leaderboard-points .star {
          font-size: 1.2rem;
        }

        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-3px); }
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:trophy"></ha-icon>
              ${this._config.title}
            </h2>
          </div>
          ${members.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:account-group"></ha-icon>
              <p>No family members yet</p>
            </div>
          ` : `
            <div class="leaderboard">
              ${members.map((m, i) => this._renderMember(m, i)).join('')}
            </div>
          `}
        </div>
      </ha-card>
    `;
  }

  _getAchievementBadges(points) {
    const badges = [];
    if (points >= 1000) {
      badges.push({ class: 'milestone-1000', label: '1K+ ⭐' });
    } else if (points >= 500) {
      badges.push({ class: 'milestone-500', label: '500+ ⭐' });
    } else if (points >= 100) {
      badges.push({ class: 'milestone-100', label: '100+ ⭐' });
    }
    return badges;
  }

  _renderMember(member, index) {
    const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
    const isSelected = member.id === this._selectedMemberId;
    const isLeader = index === 0;
    const badges = this._getAchievementBadges(member.points);

    return `
      <div class="leaderboard-item ${isSelected ? 'highlighted' : ''} ${isLeader ? 'leader' : ''}">
        <div class="leaderboard-rank ${rankClass}">
          ${isLeader ? '<span class="crown-icon">👑</span>' : ''}
          ${index + 1}
        </div>
        <div class="leaderboard-avatar-container">
          <div class="leaderboard-avatar" style="background: ${member.color}">
            <ha-icon icon="${member.avatar}"></ha-icon>
          </div>
        </div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${member.name}</div>
          <div class="leaderboard-role">${member.role === 'parent' ? 'Parent' : 'Child'}</div>
          ${badges.length > 0 ? `
            <div class="achievement-badges">
              ${badges.map(b => `<span class="achievement-badge ${b.class}">${b.label}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="leaderboard-points">
          <span class="star">⭐</span>
          ${member.points}
        </div>
      </div>
    `;
  }

  getCardSize() {
    return 3;
  }
}

// ==================== Rewards Card ====================

class FamDoRewardsCard extends FamDoBaseCard {
  constructor() {
    super();
    window.addEventListener('famdo-member-selected', (e) => {
      this._selectedMemberId = e.detail.memberId;
      this._render();
    });
  }

  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Rewards',
      max_items: 8,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    if (!this._selectedMemberId) {
      this._selectedMemberId = localStorage.getItem('famdo_kiosk_member');
    }

    const rewards = (this._data.rewards || [])
      .filter(r => r.available)
      .slice(0, this._config.max_items);

    const selectedMember = this._getSelectedMember();
    const currentPoints = selectedMember?.points || 0;

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .rewards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .reward-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px 20px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--kiosk-radius-md, 20px);
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .reward-card:hover {
          background: rgba(255,255,255,0.1);
          transform: translateY(-4px);
          box-shadow: var(--kiosk-shadow-elevated, 0 8px 32px rgba(0,0,0,0.12));
        }

        .reward-card.affordable {
          border: 2px solid rgba(102, 187, 106, 0.3);
        }

        .reward-card.almost-there {
          border: 2px solid rgba(255, 138, 128, 0.3);
          animation: pulseGlow 2s infinite;
        }

        .almost-there-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: linear-gradient(135deg, #FF8A80, #FF6B6B);
          color: white;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 600;
          animation: bounce 1.5s infinite;
        }

        .progress-ring-container {
          position: relative;
          width: 80px;
          height: 80px;
          margin-bottom: 12px;
        }

        .progress-ring {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .progress-ring-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.1);
          stroke-width: 6;
        }

        .progress-ring-fill {
          fill: none;
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.8s ease-out;
        }

        .progress-ring-fill.affordable {
          stroke: var(--kiosk-green-check, #66BB6A);
        }

        .progress-ring-fill.close {
          stroke: var(--kiosk-coral, #FF8A80);
        }

        .progress-ring-fill.far {
          stroke: var(--kiosk-blue-soft, #64B5F6);
        }

        .reward-icon-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--famdo-primary), var(--famdo-info));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reward-icon-inner ha-icon {
          --mdc-icon-size: 24px;
          color: #fff;
        }

        .reward-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--famdo-text);
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .reward-cost {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--kiosk-star-gold, #FFD54F);
          margin-bottom: 12px;
        }

        .reward-progress-text {
          font-size: 0.8rem;
          color: var(--famdo-text-secondary);
          margin-bottom: 8px;
        }

        .reward-btn {
          width: 100%;
          font-size: 0.95rem;
          padding: 10px 16px;
        }

        .reward-btn.affordable {
          background: linear-gradient(135deg, var(--kiosk-green-soft, #81C784), var(--kiosk-green-check, #66BB6A));
          color: white;
          font-weight: 600;
        }

        .reward-btn.affordable:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 15px rgba(102, 187, 106, 0.4);
        }

        .reward-btn.unaffordable {
          background: rgba(255,255,255,0.08);
          color: var(--famdo-text-secondary);
        }

        .points-display {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, rgba(255, 213, 79, 0.1), rgba(255, 236, 179, 0.15));
          border-radius: var(--kiosk-radius-md, 20px);
          margin-bottom: 20px;
          border: 1px solid rgba(255, 213, 79, 0.2);
        }

        .points-display-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--kiosk-star-gold, #FFD54F);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .points-display-value .star {
          font-size: 1.8rem;
        }

        .points-display-label {
          color: var(--famdo-text-secondary);
          font-size: 0.9rem;
          margin-top: 4px;
        }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 138, 128, 0.4); }
          50% { box-shadow: 0 0 15px 5px rgba(255, 138, 128, 0.2); }
        }

        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:gift"></ha-icon>
              ${this._config.title}
            </h2>
          </div>
          ${selectedMember ? `
            <div class="points-display">
              <div class="points-display-value">
                <span class="star">⭐</span>
                ${currentPoints}
              </div>
              <div class="points-display-label">${selectedMember.name}'s Points</div>
            </div>
          ` : ''}
          ${rewards.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:gift-off"></ha-icon>
              <p>No rewards available</p>
            </div>
          ` : `
            <div class="rewards-grid">
              ${rewards.map(r => this._renderReward(r, currentPoints)).join('')}
            </div>
          `}
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _renderReward(reward, currentPoints) {
    const canAfford = currentPoints >= reward.points_cost;
    const progress = Math.min(currentPoints / reward.points_cost, 1);
    const percentage = Math.round(progress * 100);
    const needed = reward.points_cost - currentPoints;
    const isAlmostThere = percentage >= 80 && percentage < 100;

    // SVG progress ring calculations
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress * circumference);

    const progressClass = canAfford ? 'affordable' : (percentage >= 60 ? 'close' : 'far');

    return `
      <div class="reward-card ${canAfford ? 'affordable' : ''} ${isAlmostThere ? 'almost-there' : ''}">
        ${isAlmostThere ? '<div class="almost-there-badge">Almost there!</div>' : ''}
        <div class="progress-ring-container">
          <svg class="progress-ring" viewBox="0 0 80 80">
            <circle class="progress-ring-bg" cx="40" cy="40" r="${radius}"/>
            <circle class="progress-ring-fill ${progressClass}"
                    cx="40" cy="40" r="${radius}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"/>
          </svg>
          <div class="reward-icon-inner">
            <ha-icon icon="${reward.icon}"></ha-icon>
          </div>
        </div>
        <div class="reward-name">${reward.name}</div>
        <div class="reward-cost">
          ⭐ ${reward.points_cost}
        </div>
        ${!canAfford ? `
          <div class="reward-progress-text">${percentage}% there</div>
        ` : ''}
        <button class="famdo-btn reward-btn ${canAfford ? 'affordable' : 'unaffordable'}"
                data-action="claim" data-id="${reward.id}" ${!canAfford || !this._selectedMemberId ? 'disabled' : ''}>
          ${canAfford ? '🎁 Claim!' : `Need ${needed} more ⭐`}
        </button>
      </div>
    `;
  }

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('[data-action="claim"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rewardId = btn.dataset.id;
        await this._claimReward(rewardId, btn);
      });
    });
  }

  async _claimReward(rewardId, buttonElement = null) {
    if (!this._selectedMemberId) return;

    const reward = this._data.rewards.find(r => r.id === rewardId);

    const result = await this._sendCommand('famdo/claim_reward', {
      reward_id: rewardId,
      member_id: this._selectedMemberId
    });

    if (result) {
      // Trigger confetti celebration for rewards
      this._triggerConfetti();
      if (buttonElement) {
        this._triggerStarBurst(buttonElement, 0);
      }
      this._showToast(`🎉 Claimed: ${reward?.name}!`, 'success');
    }
  }

  getCardSize() {
    return 4;
  }
}

// ==================== Today's Schedule Card ====================

class FamDoTodayCard extends FamDoBaseCard {
  constructor() {
    super();
    window.addEventListener('famdo-member-selected', (e) => {
      this._selectedMemberId = e.detail.memberId;
      this._render();
    });
  }

  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Today',
      show_chores: true,
      show_events: true,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get chores: due today OR no due date, not completed
    // Filter by: unassigned OR assigned to selected user
    let allChores = [];
    if (this._config.show_chores) {
      allChores = (this._data.chores || [])
        .filter(c => !c.is_template && c.status !== 'completed')
        .filter(c => !c.due_date || c.due_date === todayStr || c.due_date < todayStr)
        .filter(c => !c.assigned_to || c.assigned_to === this._selectedMemberId);
    }

    // Separate into due today (highlighted) and no due date (anytime)
    const dueToday = allChores.filter(c => c.due_date === todayStr);
    const overdue = allChores.filter(c => c.due_date && c.due_date < todayStr);
    const anytime = allChores.filter(c => !c.due_date);

    // Get today's events
    let todayEvents = [];
    if (this._config.show_events) {
      todayEvents = (this._data.events || [])
        .filter(e => e.start_date === todayStr);
    }

    const hasContent = allChores.length > 0 || todayEvents.length > 0;

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .today-date {
          text-align: center;
          margin-bottom: 16px;
        }

        .today-date-day {
          font-size: 3rem;
          font-weight: bold;
          color: var(--famdo-primary);
          line-height: 1;
        }

        .today-date-month {
          font-size: 1.2rem;
          color: var(--famdo-text-secondary);
        }

        .today-section {
          margin-bottom: 16px;
        }

        .today-section-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--famdo-text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .today-section-title.urgent {
          color: var(--famdo-danger);
        }

        .today-section-title.highlight {
          color: var(--famdo-warning);
        }

        .today-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
          margin-bottom: 8px;
          border-left: 4px solid var(--famdo-primary);
        }

        .today-item.chore {
          border-left-color: var(--famdo-text-secondary);
        }

        .today-item.chore.due-today {
          border-left-color: var(--famdo-warning);
          background: rgba(255, 234, 167, 0.1);
          box-shadow: 0 0 0 1px rgba(255, 234, 167, 0.3);
        }

        .today-item.chore.overdue {
          border-left-color: var(--famdo-danger);
          background: rgba(255, 107, 107, 0.15);
          box-shadow: 0 0 0 1px rgba(255, 107, 107, 0.3);
        }

        .today-item.event {
          border-left-color: var(--famdo-info);
        }

        .today-item-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .today-item-icon ha-icon {
          --mdc-icon-size: 20px;
          color: #fff;
        }

        .today-item-info {
          flex: 1;
        }

        .today-item-title {
          font-weight: 500;
          color: var(--famdo-text);
        }

        .today-item.due-today .today-item-title,
        .today-item.overdue .today-item-title {
          font-weight: 600;
        }

        .today-item-meta {
          font-size: 0.85rem;
          color: var(--famdo-text-secondary);
        }

        .due-badge {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
          margin-left: 8px;
        }

        .due-badge.today {
          background: var(--famdo-warning);
          color: #000;
        }

        .due-badge.overdue {
          background: var(--famdo-danger);
          color: #fff;
        }

        .today-item-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .today-item-actions .famdo-btn {
          padding: 8px 12px;
          font-size: 0.85rem;
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="today-date">
            <div class="today-date-day">${today.getDate()}</div>
            <div class="today-date-month">${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long' })}</div>
          </div>

          ${!hasContent ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:calendar-check"></ha-icon>
              <p>Nothing scheduled for today!</p>
            </div>
          ` : ''}

          ${overdue.length > 0 ? `
            <div class="today-section">
              <div class="today-section-title urgent">
                <ha-icon icon="mdi:alert-circle"></ha-icon>
                Overdue
              </div>
              ${overdue.map(c => this._renderChore(c, 'overdue')).join('')}
            </div>
          ` : ''}

          ${dueToday.length > 0 ? `
            <div class="today-section">
              <div class="today-section-title highlight">
                <ha-icon icon="mdi:clock-alert"></ha-icon>
                Due Today
              </div>
              ${dueToday.map(c => this._renderChore(c, 'due-today')).join('')}
            </div>
          ` : ''}

          ${todayEvents.length > 0 ? `
            <div class="today-section">
              <div class="today-section-title">
                <ha-icon icon="mdi:calendar"></ha-icon>
                Events
              </div>
              ${todayEvents.map(e => `
                <div class="today-item event">
                  <div class="today-item-icon" style="background: ${e.color || '#45B7D1'}">
                    <ha-icon icon="mdi:calendar-star"></ha-icon>
                  </div>
                  <div class="today-item-info">
                    <div class="today-item-title">${e.title}</div>
                    <div class="today-item-meta">${e.start_time || 'All day'}${e.location ? ` - ${e.location}` : ''}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${anytime.length > 0 ? `
            <div class="today-section">
              <div class="today-section-title">
                <ha-icon icon="mdi:broom"></ha-icon>
                Available Anytime
              </div>
              ${anytime.map(c => this._renderChore(c, '')).join('')}
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _renderChore(chore, urgencyClass) {
    const member = this._getMember(chore.assigned_to);
    const badgeClass = urgencyClass === 'overdue' ? 'overdue' : urgencyClass === 'due-today' ? 'today' : '';
    const badgeText = urgencyClass === 'overdue' ? 'Overdue' : urgencyClass === 'due-today' ? 'Today' : '';

    // Action button logic (same as chores card)
    const isMine = chore.claimed_by === this._selectedMemberId;
    const isAssignedToMe = chore.assigned_to === this._selectedMemberId;
    const isUnassigned = !chore.assigned_to;
    const isPendingOrOverdue = chore.status === 'pending' || chore.status === 'overdue';

    const canClaim = isPendingOrOverdue && isUnassigned;
    const canComplete = (isPendingOrOverdue && isAssignedToMe) || (chore.status === 'claimed' && isMine);
    const canRetry = chore.status === 'rejected' && isMine;

    let actionBtn = '';
    if (canComplete) {
      actionBtn = `<button class="famdo-btn famdo-btn-success" data-action="complete" data-id="${chore.id}">
        <ha-icon icon="mdi:check"></ha-icon> Done
      </button>`;
    } else if (canClaim) {
      actionBtn = `<button class="famdo-btn famdo-btn-primary" data-action="claim" data-id="${chore.id}">
        <ha-icon icon="mdi:hand-back-right"></ha-icon> Claim
      </button>`;
    } else if (canRetry) {
      actionBtn = `<button class="famdo-btn famdo-btn-primary" data-action="retry" data-id="${chore.id}">
        <ha-icon icon="mdi:refresh"></ha-icon> Retry
      </button>`;
    } else if (chore.status === 'awaiting_approval') {
      actionBtn = `<span style="color: var(--famdo-text-secondary); font-size: 0.85rem;">Awaiting approval</span>`;
    }

    return `
      <div class="today-item chore ${urgencyClass}">
        <div class="today-item-icon" style="background: ${member?.color || '#4ECDC4'}">
          <ha-icon icon="${chore.icon}"></ha-icon>
        </div>
        <div class="today-item-info">
          <div class="today-item-title">
            ${chore.name}
            ${badgeText ? `<span class="due-badge ${badgeClass}">${badgeText}</span>` : ''}
          </div>
          <div class="today-item-meta">${chore.points} ⭐${chore.due_time ? ` • Due ${chore.due_time}` : ''}</div>
        </div>
        <div class="today-item-actions">
          ${actionBtn}
        </div>
      </div>
    `;
  }

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = btn.dataset.action;
        const choreId = btn.dataset.id;

        if (action === 'claim') {
          await this._claimChore(choreId);
        } else if (action === 'complete') {
          await this._completeChore(choreId, btn);
        } else if (action === 'retry') {
          await this._retryChore(choreId);
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
      this._showToast('Chore claimed!', 'success');
    }
  }

  async _completeChore(choreId, buttonElement = null) {
    if (!this._selectedMemberId) return;

    const chore = this._data?.chores?.find(c => c.id === choreId);

    // If chore is pending/overdue and not claimed, claim it first
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
      // Trigger star burst celebration
      if (buttonElement && chore) {
        this._triggerStarBurst(buttonElement, chore.points);
      }
      this._showToast('Nice work! Chore submitted for approval.', 'success');
    }
  }

  async _retryChore(choreId) {
    if (!this._selectedMemberId) return;

    const result = await this._sendCommand('famdo/retry_chore', {
      chore_id: choreId,
      member_id: this._selectedMemberId
    });

    if (result) {
      this._showToast('Chore ready to retry!', 'success');
    }
  }

  getCardSize() {
    return 4;
  }
}

// ==================== Activity Log Card (Parent Admin View) ====================

class FamDoActivityLogCard extends FamDoBaseCard {
  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Activity Log',
      days: 7,  // Show last 7 days by default
      show_approvals: true,
      show_rewards: true,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    const now = new Date();
    const daysAgo = new Date(now.getTime() - (this._config.days * 24 * 60 * 60 * 1000));

    // Get completed chores from the last N days
    const completedChores = (this._data.chores || [])
      .filter(c => !c.is_template && c.status === 'completed')
      .filter(c => {
        if (!c.completed_at) return false;
        const completedDate = new Date(c.completed_at);
        return completedDate >= daysAgo;
      })
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

    // Get chores awaiting approval
    const awaitingApproval = (this._data.chores || [])
      .filter(c => !c.is_template && c.status === 'awaiting_approval')
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));

    // Get rejected chores
    const rejected = (this._data.chores || [])
      .filter(c => !c.is_template && c.status === 'rejected')
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));

    // Get recent reward claims
    const recentClaims = this._config.show_rewards ? (this._data.reward_claims || [])
      .filter(c => {
        const claimDate = new Date(c.claimed_at);
        return claimDate >= daysAgo;
      })
      .sort((a, b) => new Date(b.claimed_at) - new Date(a.claimed_at))
      .slice(0, 10) : [];

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .log-section {
          margin-bottom: 20px;
        }

        .log-section-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--famdo-text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .log-section-title.pending {
          color: var(--famdo-warning);
        }

        .log-section-title.rejected {
          color: var(--famdo-danger);
        }

        .log-section-title .count {
          background: var(--famdo-primary);
          color: #fff;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
        }

        .log-section-title.pending .count {
          background: var(--famdo-warning);
          color: #000;
        }

        .log-section-title.rejected .count {
          background: var(--famdo-danger);
        }

        .log-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
          margin-bottom: 8px;
        }

        .log-item.approval {
          border-left: 4px solid var(--famdo-warning);
          background: rgba(255, 234, 167, 0.1);
        }

        .log-item.rejected {
          border-left: 4px solid var(--famdo-danger);
          background: rgba(255, 107, 107, 0.1);
        }

        .log-item.completed {
          border-left: 4px solid var(--famdo-success);
        }

        .log-item.reward {
          border-left: 4px solid var(--famdo-info);
        }

        .log-item-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .log-item-avatar ha-icon {
          --mdc-icon-size: 24px;
          color: #fff;
        }

        .log-item-info {
          flex: 1;
          min-width: 0;
        }

        .log-item-title {
          font-weight: 500;
          color: var(--famdo-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .log-item-meta {
          font-size: 0.85rem;
          color: var(--famdo-text-secondary);
        }

        .log-item-points {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--famdo-warning);
          font-weight: 500;
        }

        .log-item-actions {
          display: flex;
          gap: 8px;
        }

        .log-item-actions .famdo-btn {
          padding: 6px 12px;
          font-size: 0.85rem;
        }

        .log-time {
          font-size: 0.75rem;
          color: var(--famdo-text-secondary);
          text-align: right;
          min-width: 60px;
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:clipboard-list"></ha-icon>
              ${this._config.title}
            </h2>
          </div>

          ${awaitingApproval.length > 0 ? `
            <div class="log-section">
              <div class="log-section-title pending">
                <ha-icon icon="mdi:clock-alert"></ha-icon>
                Awaiting Approval
                <span class="count">${awaitingApproval.length}</span>
              </div>
              ${awaitingApproval.map(c => this._renderApprovalItem(c)).join('')}
            </div>
          ` : ''}

          ${rejected.length > 0 ? `
            <div class="log-section">
              <div class="log-section-title rejected">
                <ha-icon icon="mdi:close-circle"></ha-icon>
                Rejected
                <span class="count">${rejected.length}</span>
              </div>
              ${rejected.map(c => this._renderRejectedItem(c)).join('')}
            </div>
          ` : ''}

          ${completedChores.length > 0 ? `
            <div class="log-section">
              <div class="log-section-title">
                <ha-icon icon="mdi:check-circle"></ha-icon>
                Recently Completed
                <span class="count">${completedChores.length}</span>
              </div>
              ${completedChores.slice(0, 20).map(c => this._renderCompletedItem(c)).join('')}
            </div>
          ` : ''}

          ${recentClaims.length > 0 ? `
            <div class="log-section">
              <div class="log-section-title">
                <ha-icon icon="mdi:gift"></ha-icon>
                Recent Rewards
              </div>
              ${recentClaims.map(c => this._renderRewardClaim(c)).join('')}
            </div>
          ` : ''}

          ${awaitingApproval.length === 0 && rejected.length === 0 && completedChores.length === 0 && recentClaims.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:check-all"></ha-icon>
              <p>No activity in the last ${this._config.days} days</p>
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _renderApprovalItem(chore) {
    const member = this._getMember(chore.claimed_by);
    const timeAgo = this._formatTimeAgo(chore.completed_at);

    return `
      <div class="log-item approval">
        <div class="log-item-avatar" style="background: ${member?.color || '#4ECDC4'}">
          <ha-icon icon="${member?.avatar || 'mdi:account'}"></ha-icon>
        </div>
        <div class="log-item-info">
          <div class="log-item-title">${chore.name}</div>
          <div class="log-item-meta">${member?.name || 'Unknown'}</div>
        </div>
        <div class="log-item-points">
          <ha-icon icon="mdi:star"></ha-icon>
          ${chore.points}
        </div>
        <div class="log-item-actions">
          <button class="famdo-btn famdo-btn-success" data-action="approve" data-id="${chore.id}">
            <ha-icon icon="mdi:check"></ha-icon>
          </button>
          <button class="famdo-btn famdo-btn-danger" data-action="reject" data-id="${chore.id}">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="log-time">${timeAgo}</div>
      </div>
    `;
  }

  _renderRejectedItem(chore) {
    const member = this._getMember(chore.claimed_by);
    const timeAgo = this._formatTimeAgo(chore.completed_at);

    return `
      <div class="log-item rejected">
        <div class="log-item-avatar" style="background: ${member?.color || '#4ECDC4'}">
          <ha-icon icon="${member?.avatar || 'mdi:account'}"></ha-icon>
        </div>
        <div class="log-item-info">
          <div class="log-item-title">${chore.name}</div>
          <div class="log-item-meta">${member?.name || 'Unknown'} - Rejected</div>
        </div>
        <div class="log-item-points">
          <ha-icon icon="mdi:star"></ha-icon>
          ${chore.points}
        </div>
        <div class="log-time">${timeAgo}</div>
      </div>
    `;
  }

  _renderCompletedItem(chore) {
    const member = this._getMember(chore.claimed_by);
    const approver = this._getMember(chore.approved_by);
    const timeAgo = this._formatTimeAgo(chore.completed_at);

    return `
      <div class="log-item completed">
        <div class="log-item-avatar" style="background: ${member?.color || '#4ECDC4'}">
          <ha-icon icon="${member?.avatar || 'mdi:account'}"></ha-icon>
        </div>
        <div class="log-item-info">
          <div class="log-item-title">${chore.name}</div>
          <div class="log-item-meta">${member?.name || 'Unknown'}${approver ? ` • Approved by ${approver.name}` : ''}</div>
        </div>
        <div class="log-item-points">
          <ha-icon icon="mdi:star"></ha-icon>
          +${chore.points}
        </div>
        <div class="log-time">${timeAgo}</div>
      </div>
    `;
  }

  _renderRewardClaim(claim) {
    const member = this._getMember(claim.member_id);
    const reward = (this._data.rewards || []).find(r => r.id === claim.reward_id);
    const timeAgo = this._formatTimeAgo(claim.claimed_at);

    return `
      <div class="log-item reward">
        <div class="log-item-avatar" style="background: ${member?.color || '#4ECDC4'}">
          <ha-icon icon="${member?.avatar || 'mdi:account'}"></ha-icon>
        </div>
        <div class="log-item-info">
          <div class="log-item-title">${reward?.name || 'Unknown Reward'}</div>
          <div class="log-item-meta">${member?.name || 'Unknown'}</div>
        </div>
        <div class="log-item-points" style="color: var(--famdo-danger);">
          <ha-icon icon="mdi:star"></ha-icon>
          -${claim.points_spent}
        </div>
        <div class="log-time">${timeAgo}</div>
      </div>
    `;
  }

  _formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const choreId = btn.dataset.id;

        if (action === 'approve') {
          await this._approveChore(choreId);
        } else if (action === 'reject') {
          await this._rejectChore(choreId);
        }
      });
    });
  }

  async _approveChore(choreId) {
    const approverId = this._getParentId();

    if (!approverId) {
      this._showToast('No parent account linked. Please link your HA user to a parent member.', 'error');
      return;
    }

    const result = await this._sendCommand('famdo/approve_chore', {
      chore_id: choreId,
      approver_id: approverId
    });

    if (result) {
      this._showToast('Chore approved!', 'success');
    }
  }

  async _rejectChore(choreId) {
    const approverId = this._getParentId();

    if (!approverId) {
      this._showToast('No parent account linked. Please link your HA user to a parent member.', 'error');
      return;
    }

    const result = await this._sendCommand('famdo/reject_chore', {
      chore_id: choreId,
      approver_id: approverId
    });

    if (result) {
      this._showToast('Chore rejected', 'info');
    }
  }

  _getParentId() {
    // Use the base class method that handles HA user identity
    return this._getApproverId();
  }

  getCardSize() {
    return 4;
  }
}

// ==================== Member Account Card (Transaction History) ====================

class FamDoMemberAccountCard extends FamDoBaseCard {
  constructor() {
    super();
    window.addEventListener('famdo-member-selected', (e) => {
      this._selectedMemberId = e.detail.memberId;
      this._render();
    });
  }

  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Account History',
      max_items: 20,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    if (!this._selectedMemberId) {
      this._selectedMemberId = localStorage.getItem('famdo_kiosk_member');
    }

    const selectedMember = this._getSelectedMember();
    if (!selectedMember) {
      this.shadowRoot.innerHTML = `
        <style>${KIOSK_STYLES}</style>
        <ha-card>
          <div class="famdo-card">
            <div class="no-member-warning" style="background: rgba(255, 234, 167, 0.2); border: 1px solid rgba(255, 234, 167, 0.3); border-radius: var(--famdo-border-radius); padding: 16px; text-align: center; color: var(--famdo-warning);">
              <ha-icon icon="mdi:account-question"></ha-icon>
              <p>Please select a family member first</p>
            </div>
          </div>
        </ha-card>
      `;
      return;
    }

    // Build transaction history
    const transactions = this._buildTransactionHistory(this._selectedMemberId);

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .account-balance {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, rgba(78, 205, 196, 0.2), rgba(69, 183, 209, 0.2));
          border-radius: var(--famdo-border-radius);
          margin-bottom: 20px;
        }

        .account-balance-value {
          font-size: 3rem;
          font-weight: bold;
          color: var(--famdo-warning);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .account-balance-label {
          color: var(--famdo-text-secondary);
          font-size: 0.9rem;
          margin-top: 4px;
        }

        .account-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .account-stat {
          text-align: center;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
        }

        .account-stat-value {
          font-size: 1.5rem;
          font-weight: bold;
        }

        .account-stat-value.earned {
          color: var(--famdo-success);
        }

        .account-stat-value.spent {
          color: var(--famdo-danger);
        }

        .account-stat-label {
          font-size: 0.8rem;
          color: var(--famdo-text-secondary);
          margin-top: 2px;
        }

        .transaction-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
        }

        .transaction-item.credit {
          border-left: 4px solid var(--famdo-success);
        }

        .transaction-item.debit {
          border-left: 4px solid var(--famdo-danger);
        }

        .transaction-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .transaction-icon.credit {
          background: rgba(150, 206, 180, 0.3);
        }

        .transaction-icon.debit {
          background: rgba(255, 107, 107, 0.3);
        }

        .transaction-icon ha-icon {
          --mdc-icon-size: 20px;
        }

        .transaction-icon.credit ha-icon {
          color: var(--famdo-success);
        }

        .transaction-icon.debit ha-icon {
          color: var(--famdo-danger);
        }

        .transaction-info {
          flex: 1;
          min-width: 0;
        }

        .transaction-title {
          font-weight: 500;
          color: var(--famdo-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .transaction-meta {
          font-size: 0.8rem;
          color: var(--famdo-text-secondary);
        }

        .transaction-amount {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .transaction-amount.credit {
          color: var(--famdo-success);
        }

        .transaction-amount.debit {
          color: var(--famdo-danger);
        }

        .transaction-time {
          font-size: 0.75rem;
          color: var(--famdo-text-secondary);
          text-align: right;
          min-width: 50px;
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:account-cash"></ha-icon>
              ${this._config.title}
            </h2>
            <span style="color: var(--famdo-text-secondary)">${selectedMember.name}</span>
          </div>

          <div class="account-balance">
            <div class="account-balance-value">
              <ha-icon icon="mdi:star"></ha-icon>
              ${selectedMember.points}
            </div>
            <div class="account-balance-label">Current Balance</div>
          </div>

          <div class="account-stats">
            <div class="account-stat">
              <div class="account-stat-value earned">+${transactions.totalEarned}</div>
              <div class="account-stat-label">Total Earned</div>
            </div>
            <div class="account-stat">
              <div class="account-stat-value spent">-${transactions.totalSpent}</div>
              <div class="account-stat-label">Total Spent</div>
            </div>
          </div>

          ${transactions.items.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:history"></ha-icon>
              <p>No transaction history yet</p>
            </div>
          ` : `
            <div class="transaction-list">
              ${transactions.items.slice(0, this._config.max_items).map(t => this._renderTransaction(t)).join('')}
            </div>
          `}
        </div>
      </ha-card>
    `;
  }

  _buildTransactionHistory(memberId) {
    const items = [];
    let totalEarned = 0;
    let totalSpent = 0;

    // Add completed chores (points earned) - only ones completed by this member
    const completedChores = (this._data.chores || [])
      .filter(c => !c.is_template && c.status === 'completed' && c.claimed_by === memberId)
      .forEach(chore => {
        items.push({
          type: 'credit',
          icon: chore.icon,
          title: chore.name,
          description: 'Chore completed',
          amount: chore.points,
          timestamp: chore.completed_at
        });
        totalEarned += chore.points;
      });

    // Add reward claims (points spent)
    const rewardClaims = (this._data.reward_claims || [])
      .filter(c => c.member_id === memberId)
      .forEach(claim => {
        const reward = (this._data.rewards || []).find(r => r.id === claim.reward_id);
        items.push({
          type: 'debit',
          icon: reward?.icon || 'mdi:gift',
          title: reward?.name || 'Reward',
          description: claim.status === 'fulfilled' ? 'Received' : 'Pending delivery',
          amount: claim.points_spent,
          timestamp: claim.claimed_at,
          status: claim.status
        });
        totalSpent += claim.points_spent;
      });

    // Sort by timestamp (newest first)
    items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    return { items, totalEarned, totalSpent };
  }

  _renderTransaction(transaction) {
    const timeAgo = this._formatTimeAgo(transaction.timestamp);
    const amountPrefix = transaction.type === 'credit' ? '+' : '-';

    return `
      <div class="transaction-item ${transaction.type}">
        <div class="transaction-icon ${transaction.type}">
          <ha-icon icon="${transaction.icon}"></ha-icon>
        </div>
        <div class="transaction-info">
          <div class="transaction-title">${transaction.title}</div>
          <div class="transaction-meta">${transaction.description}</div>
        </div>
        <div class="transaction-amount ${transaction.type}">
          ${amountPrefix}${transaction.amount}
        </div>
        <div class="transaction-time">${timeAgo}</div>
      </div>
    `;
  }

  _formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getCardSize() {
    return 4;
  }
}

// ==================== Pending Rewards Card (Parent Admin View) ====================

class FamDoPendingRewardsCard extends FamDoBaseCard {
  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Pending Rewards',
      show_fulfilled: false,
      ...config
    };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    // Get pending reward claims
    const pendingClaims = (this._data.reward_claims || [])
      .filter(c => c.status === 'pending')
      .sort((a, b) => new Date(b.claimed_at) - new Date(a.claimed_at));

    // Get recently fulfilled claims (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fulfilledClaims = this._config.show_fulfilled ? (this._data.reward_claims || [])
      .filter(c => c.status === 'fulfilled' && c.fulfilled_at)
      .filter(c => new Date(c.fulfilled_at) >= weekAgo)
      .sort((a, b) => new Date(b.fulfilled_at) - new Date(a.fulfilled_at))
      .slice(0, 10) : [];

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .pending-section {
          margin-bottom: 20px;
        }

        .pending-section-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--famdo-text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pending-section-title .count {
          background: var(--famdo-warning);
          color: #000;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
        }

        .pending-section-title.fulfilled .count {
          background: var(--famdo-success);
          color: #000;
        }

        .reward-claim-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
          margin-bottom: 8px;
          border-left: 4px solid var(--famdo-warning);
        }

        .reward-claim-item.fulfilled {
          border-left-color: var(--famdo-success);
          opacity: 0.7;
        }

        .reward-claim-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .reward-claim-avatar ha-icon {
          --mdc-icon-size: 24px;
          color: #fff;
        }

        .reward-claim-info {
          flex: 1;
          min-width: 0;
        }

        .reward-claim-title {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--famdo-text);
        }

        .reward-claim-meta {
          font-size: 0.85rem;
          color: var(--famdo-text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .reward-claim-cost {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--famdo-warning);
          font-weight: 500;
        }

        .reward-claim-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .reward-claim-time {
          font-size: 0.75rem;
          color: var(--famdo-text-secondary);
          min-width: 60px;
          text-align: right;
        }

        .pending-alert {
          background: rgba(255, 234, 167, 0.15);
          border: 1px solid rgba(255, 234, 167, 0.3);
          border-radius: var(--famdo-border-radius);
          padding: 16px;
          text-align: center;
          margin-bottom: 16px;
        }

        .pending-alert-count {
          font-size: 2rem;
          font-weight: bold;
          color: var(--famdo-warning);
        }

        .pending-alert-text {
          color: var(--famdo-text-secondary);
          font-size: 0.9rem;
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:gift-outline"></ha-icon>
              ${this._config.title}
            </h2>
          </div>

          ${pendingClaims.length > 0 ? `
            <div class="pending-alert">
              <div class="pending-alert-count">${pendingClaims.length}</div>
              <div class="pending-alert-text">reward${pendingClaims.length !== 1 ? 's' : ''} waiting to be delivered</div>
            </div>
          ` : ''}

          ${pendingClaims.length === 0 && fulfilledClaims.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:gift-off"></ha-icon>
              <p>No pending rewards</p>
            </div>
          ` : ''}

          ${pendingClaims.length > 0 ? `
            <div class="pending-section">
              <div class="pending-section-title">
                <ha-icon icon="mdi:clock-outline"></ha-icon>
                Awaiting Delivery
                <span class="count">${pendingClaims.length}</span>
              </div>
              ${pendingClaims.map(c => this._renderPendingClaim(c)).join('')}
            </div>
          ` : ''}

          ${fulfilledClaims.length > 0 ? `
            <div class="pending-section">
              <div class="pending-section-title fulfilled">
                <ha-icon icon="mdi:check-circle"></ha-icon>
                Recently Delivered
                <span class="count">${fulfilledClaims.length}</span>
              </div>
              ${fulfilledClaims.map(c => this._renderFulfilledClaim(c)).join('')}
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _renderPendingClaim(claim) {
    const member = this._getMember(claim.member_id);
    const reward = (this._data.rewards || []).find(r => r.id === claim.reward_id);
    const timeAgo = this._formatTimeAgo(claim.claimed_at);

    return `
      <div class="reward-claim-item">
        <div class="reward-claim-avatar" style="background: ${member?.color || '#4ECDC4'}">
          <ha-icon icon="${member?.avatar || 'mdi:account'}"></ha-icon>
        </div>
        <div class="reward-claim-info">
          <div class="reward-claim-title">${reward?.name || 'Unknown Reward'}</div>
          <div class="reward-claim-meta">
            <span>${member?.name || 'Unknown'}</span>
            <span class="reward-claim-cost">
              <ha-icon icon="mdi:star"></ha-icon>
              ${claim.points_spent}
            </span>
          </div>
        </div>
        <div class="reward-claim-actions">
          <button class="famdo-btn famdo-btn-success" data-action="fulfill" data-id="${claim.id}">
            <ha-icon icon="mdi:check"></ha-icon>
            Delivered
          </button>
        </div>
        <div class="reward-claim-time">${timeAgo}</div>
      </div>
    `;
  }

  _renderFulfilledClaim(claim) {
    const member = this._getMember(claim.member_id);
    const reward = (this._data.rewards || []).find(r => r.id === claim.reward_id);
    const timeAgo = this._formatTimeAgo(claim.fulfilled_at);

    return `
      <div class="reward-claim-item fulfilled">
        <div class="reward-claim-avatar" style="background: ${member?.color || '#4ECDC4'}">
          <ha-icon icon="${member?.avatar || 'mdi:account'}"></ha-icon>
        </div>
        <div class="reward-claim-info">
          <div class="reward-claim-title">${reward?.name || 'Unknown Reward'}</div>
          <div class="reward-claim-meta">
            <span>${member?.name || 'Unknown'}</span>
            <span style="color: var(--famdo-success);">
              <ha-icon icon="mdi:check"></ha-icon>
              Delivered
            </span>
          </div>
        </div>
        <div class="reward-claim-time">${timeAgo}</div>
      </div>
    `;
  }

  _formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('[data-action="fulfill"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const claimId = btn.dataset.id;
        await this._fulfillClaim(claimId);
      });
    });
  }

  async _fulfillClaim(claimId) {
    const fulfillerId = this._getParentId();
    if (!fulfillerId) {
      this._showToast('No parent found to fulfill reward', 'error');
      return;
    }

    const result = await this._sendCommand('famdo/fulfill_reward_claim', {
      claim_id: claimId,
      fulfiller_id: fulfillerId
    });

    if (result) {
      this._showToast('Reward marked as delivered!', 'success');
    }
  }

  _getParentId() {
    // Use the base class method that handles HA user identity
    return this._getApproverId();
  }

  getCardSize() {
    return 3;
  }
}

// ==================== Weekly Grid Component ====================

class FamDoWeeklyGrid extends FamDoBaseCard {
  constructor() {
    super();
    this._currentWeekStart = this._getWeekStart(new Date());
    window.addEventListener('famdo-member-selected', (e) => {
      this._selectedMemberId = e.detail.memberId;
      this._render();
    });
  }

  setConfig(config) {
    super.setConfig(config);
    this._config = {
      title: 'Weekly Overview',
      show_all_members: true,
      ...config
    };
  }

  _getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
  }

  _getWeekDays(startDate) {
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push({
        name: dayNames[i],
        date: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        isToday: d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
      });
    }
    return days;
  }

  _getChoresForMemberAndDay(memberId, dateStr) {
    return (this._data.chores || [])
      .filter(c => !c.is_template)
      .filter(c => c.due_date === dateStr)
      .filter(c => c.assigned_to === memberId || c.claimed_by === memberId);
  }

  _getCompletionStats(memberId, dateStr) {
    const chores = this._getChoresForMemberAndDay(memberId, dateStr);
    const total = chores.length;
    const completed = chores.filter(c => c.status === 'completed').length;
    const pending = chores.filter(c => c.status === 'awaiting_approval').length;
    const inProgress = chores.filter(c => c.status === 'claimed').length;

    return { total, completed, pending, inProgress, chores };
  }

  _render() {
    if (!this._data) {
      this.shadowRoot.innerHTML = '<ha-card><div class="famdo-card">Loading...</div></ha-card>';
      return;
    }

    const weekDays = this._getWeekDays(this._currentWeekStart);
    const members = this._config.show_all_members
      ? this._data.members || []
      : (this._selectedMemberId ? [this._getSelectedMember()].filter(Boolean) : []);

    const monthYear = this._currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    this.shadowRoot.innerHTML = `
      <style>${KIOSK_STYLES}
        .weekly-grid-container {
          overflow-x: auto;
        }

        .week-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .week-nav {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .week-nav-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--famdo-text);
        }

        .week-nav-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .week-nav-btn ha-icon {
          --mdc-icon-size: 20px;
        }

        .week-current {
          font-size: 1rem;
          font-weight: 500;
          color: var(--famdo-text-secondary);
        }

        .weekly-grid {
          display: grid;
          grid-template-columns: 120px repeat(7, 1fr);
          gap: 4px;
          min-width: 700px;
        }

        .grid-header {
          background: rgba(255,255,255,0.1);
          padding: 12px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--famdo-text-secondary);
          border-radius: 8px 8px 0 0;
        }

        .grid-header.today {
          background: linear-gradient(135deg, rgba(78, 205, 196, 0.3), rgba(69, 183, 209, 0.3));
          color: var(--famdo-primary);
        }

        .grid-header .day-name {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .grid-header .day-num {
          display: block;
          font-size: 1.2rem;
          font-weight: 700;
          margin-top: 2px;
        }

        .grid-member {
          background: rgba(255,255,255,0.05);
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 8px 0 0 8px;
        }

        .member-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .member-avatar-small ha-icon {
          --mdc-icon-size: 18px;
          color: #fff;
        }

        .member-name-small {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--famdo-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .grid-cell {
          background: rgba(255,255,255,0.03);
          padding: 8px;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 0;
          position: relative;
        }

        .grid-cell:hover {
          background: rgba(255,255,255,0.08);
        }

        .grid-cell.today {
          background: rgba(78, 205, 196, 0.1);
          box-shadow: inset 0 0 0 2px rgba(78, 205, 196, 0.3);
        }

        .grid-cell.no-chores {
          opacity: 0.5;
        }

        .cell-stats {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .cell-checkmarks {
          display: flex;
          gap: 2px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 60px;
        }

        .checkmark {
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .checkmark.completed {
          color: var(--kiosk-green-check, #66BB6A);
        }

        .checkmark.pending {
          color: var(--kiosk-star-gold, #FFD54F);
        }

        .checkmark.in-progress {
          color: var(--kiosk-blue-soft, #64B5F6);
        }

        .checkmark.todo {
          color: var(--famdo-text-secondary);
          opacity: 0.4;
        }

        .cell-count {
          font-size: 0.7rem;
          color: var(--famdo-text-secondary);
        }

        .cell-empty {
          font-size: 0.8rem;
          color: var(--famdo-text-secondary);
          opacity: 0.5;
        }

        .cell-tooltip {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: var(--famdo-bg);
          padding: 8px 12px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          white-space: nowrap;
          z-index: 100;
          font-size: 0.8rem;
        }

        .grid-cell:hover .cell-tooltip {
          display: block;
        }

        .week-summary {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .summary-stat {
          text-align: center;
        }

        .summary-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .summary-stat-value.completed {
          color: var(--kiosk-green-check, #66BB6A);
        }

        .summary-stat-value.pending {
          color: var(--kiosk-star-gold, #FFD54F);
        }

        .summary-stat-value.total {
          color: var(--famdo-text);
        }

        .summary-stat-label {
          font-size: 0.75rem;
          color: var(--famdo-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      </style>
      <ha-card>
        <div class="famdo-card">
          <div class="famdo-card-header">
            <h2 class="famdo-card-title">
              <ha-icon icon="mdi:calendar-week"></ha-icon>
              ${this._config.title}
            </h2>
            <div class="week-nav">
              <button class="week-nav-btn" data-action="prev-week">
                <ha-icon icon="mdi:chevron-left"></ha-icon>
              </button>
              <span class="week-current">${monthYear}</span>
              <button class="week-nav-btn" data-action="next-week">
                <ha-icon icon="mdi:chevron-right"></ha-icon>
              </button>
            </div>
          </div>

          ${members.length === 0 ? `
            <div class="famdo-empty">
              <ha-icon icon="mdi:account-group"></ha-icon>
              <p>No members to display</p>
            </div>
          ` : `
            <div class="weekly-grid-container">
              <div class="weekly-grid">
                <!-- Header row -->
                <div class="grid-header"></div>
                ${weekDays.map(day => `
                  <div class="grid-header ${day.isToday ? 'today' : ''}">
                    <span class="day-name">${day.name}</span>
                    <span class="day-num">${day.dayNum}</span>
                  </div>
                `).join('')}

                <!-- Member rows -->
                ${members.map(member => `
                  <div class="grid-member">
                    <div class="member-avatar-small" style="background: ${member.color}">
                      <ha-icon icon="${member.avatar}"></ha-icon>
                    </div>
                    <span class="member-name-small">${member.name}</span>
                  </div>
                  ${weekDays.map(day => this._renderCell(member, day)).join('')}
                `).join('')}
              </div>
            </div>

            ${this._renderWeekSummary(members, weekDays)}
          `}
        </div>
      </ha-card>
    `;

    this._attachEventListeners();
  }

  _renderCell(member, day) {
    const stats = this._getCompletionStats(member.id, day.date);

    if (stats.total === 0) {
      return `
        <div class="grid-cell ${day.isToday ? 'today' : ''} no-chores">
          <span class="cell-empty">—</span>
        </div>
      `;
    }

    const checkmarks = stats.chores.map(chore => {
      if (chore.status === 'completed') return '<span class="checkmark completed">✓</span>';
      if (chore.status === 'awaiting_approval') return '<span class="checkmark pending">⏳</span>';
      if (chore.status === 'claimed') return '<span class="checkmark in-progress">●</span>';
      return '<span class="checkmark todo">○</span>';
    }).join('');

    return `
      <div class="grid-cell ${day.isToday ? 'today' : ''}" data-member="${member.id}" data-date="${day.date}">
        <div class="cell-stats">
          <div class="cell-checkmarks">${checkmarks}</div>
          <span class="cell-count">${stats.completed}/${stats.total}</span>
        </div>
        <div class="cell-tooltip">
          ${stats.completed} completed, ${stats.pending} pending, ${stats.total - stats.completed - stats.pending - stats.inProgress} remaining
        </div>
      </div>
    `;
  }

  _renderWeekSummary(members, weekDays) {
    let totalChores = 0;
    let completedChores = 0;
    let pendingChores = 0;

    members.forEach(member => {
      weekDays.forEach(day => {
        const stats = this._getCompletionStats(member.id, day.date);
        totalChores += stats.total;
        completedChores += stats.completed;
        pendingChores += stats.pending;
      });
    });

    if (totalChores === 0) return '';

    const completionRate = Math.round((completedChores / totalChores) * 100);

    return `
      <div class="week-summary">
        <div class="summary-stat">
          <div class="summary-stat-value completed">${completedChores}</div>
          <div class="summary-stat-label">Completed</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value pending">${pendingChores}</div>
          <div class="summary-stat-label">Pending</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value total">${totalChores}</div>
          <div class="summary-stat-label">Total</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value" style="color: ${completionRate >= 80 ? 'var(--kiosk-green-check)' : completionRate >= 50 ? 'var(--kiosk-star-gold)' : 'var(--famdo-text-secondary)'}">
            ${completionRate}%
          </div>
          <div class="summary-stat-label">This Week</div>
        </div>
      </div>
    `;
  }

  _attachEventListeners() {
    // Week navigation
    this.shadowRoot.querySelector('[data-action="prev-week"]')?.addEventListener('click', () => {
      this._currentWeekStart.setDate(this._currentWeekStart.getDate() - 7);
      this._render();
    });

    this.shadowRoot.querySelector('[data-action="next-week"]')?.addEventListener('click', () => {
      this._currentWeekStart.setDate(this._currentWeekStart.getDate() + 7);
      this._render();
    });

    // Cell clicks (could open detail view in future)
    this.shadowRoot.querySelectorAll('.grid-cell[data-member]').forEach(cell => {
      cell.addEventListener('click', () => {
        const memberId = cell.dataset.member;
        const date = cell.dataset.date;
        // Could dispatch an event or show modal with day details
        console.log(`Clicked cell for member ${memberId} on ${date}`);
      });
    });
  }

  getCardSize() {
    return 4;
  }
}

// ==================== Register Custom Elements ====================

// Base/Utility Components
customElements.define('famdo-celebration', FamDoCelebration);
customElements.define('famdo-member-badge', FamDoMemberBadge);
customElements.define('famdo-star-meter', FamDoStarMeter);

// Card Components
customElements.define('famdo-member-selector', FamDoMemberSelector);
customElements.define('famdo-member-account', FamDoMemberAccountCard);
customElements.define('famdo-pending-rewards', FamDoPendingRewardsCard);
customElements.define('famdo-chores-card', FamDoChoresCard);
customElements.define('famdo-points-card', FamDoPointsCard);
customElements.define('famdo-rewards-card', FamDoRewardsCard);
customElements.define('famdo-today-card', FamDoTodayCard);
customElements.define('famdo-activity-log', FamDoActivityLogCard);
customElements.define('famdo-weekly-grid', FamDoWeeklyGrid);

// Register with HACS/Lovelace
window.customCards = window.customCards || [];
window.customCards.push(
  {
    type: 'famdo-member-selector',
    name: 'FamDo Member Selector',
    description: 'Select which family member is using the kiosk',
    preview: true
  },
  {
    type: 'famdo-chores-card',
    name: 'FamDo Chores',
    description: 'View and interact with chores',
    preview: true
  },
  {
    type: 'famdo-points-card',
    name: 'FamDo Points Leaderboard',
    description: 'Show family points leaderboard',
    preview: true
  },
  {
    type: 'famdo-rewards-card',
    name: 'FamDo Rewards',
    description: 'View and claim rewards',
    preview: true
  },
  {
    type: 'famdo-today-card',
    name: 'FamDo Today',
    description: 'Show today\'s schedule',
    preview: true
  },
  {
    type: 'famdo-activity-log',
    name: 'FamDo Activity Log',
    description: 'Parent admin view for approvals and activity history',
    preview: true
  },
  {
    type: 'famdo-member-account',
    name: 'FamDo Member Account',
    description: 'View transaction history and points balance for a member',
    preview: true
  },
  {
    type: 'famdo-pending-rewards',
    name: 'FamDo Pending Rewards',
    description: 'Parent view to manage and fulfill pending reward claims',
    preview: true
  },
  {
    type: 'famdo-weekly-grid',
    name: 'FamDo Weekly Grid',
    description: 'Weekly calendar overview showing chore completion for all members',
    preview: true
  }
);

console.info('%c FAMDO-KIOSK-CARDS %c Loaded ',
  'background: #4ECDC4; color: #000; font-weight: bold;',
  'background: #1a1a2e; color: #fff;'
);

// Dynamically load the dashboard module
(function loadDashboard() {
  // Check if already loaded
  if (customElements.get('famdo-kiosk-dashboard')) {
    return;
  }

  // Try to detect the base path from existing scripts
  const scripts = document.querySelectorAll('script[src*="famdo-kiosk-cards"]');
  let basePath = '/famdo/kiosk'; // Default path

  if (scripts.length > 0) {
    const scriptSrc = scripts[0].src;
    basePath = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
  }

  const dashboardPath = basePath + '/famdo-kiosk-dashboard.js';

  const script = document.createElement('script');
  script.src = dashboardPath;
  script.onerror = () => {
    console.warn('FamDo: Could not load dashboard from', dashboardPath);
  };
  document.head.appendChild(script);
})();
