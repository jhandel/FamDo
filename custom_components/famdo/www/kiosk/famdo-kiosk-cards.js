/**
 * FamDo Kiosk Cards
 * Custom Lovelace cards for end-user interactions
 * Designed for kiosk/tablet displays
 */

// Shared styles for all kiosk cards
const KIOSK_STYLES = `
  :host {
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

// ==================== Base Card Class ====================

class FamDoBaseCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._data = null;
    this._selectedMemberId = null;
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
    const canClaim = chore.status === 'pending' || chore.status === 'overdue';
    const canComplete = chore.status === 'claimed' && isMine;
    const canRetry = chore.status === 'rejected' && isMine;

    let actionBtn = '';
    if (canClaim) {
      actionBtn = `<button class="famdo-btn famdo-btn-primary" data-action="claim" data-id="${chore.id}">
        <ha-icon icon="mdi:hand-back-right"></ha-icon> Claim
      </button>`;
    } else if (canComplete) {
      actionBtn = `<button class="famdo-btn famdo-btn-success" data-action="complete" data-id="${chore.id}">
        <ha-icon icon="mdi:check"></ha-icon> Done
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
      'overdue': 'Overdue'
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
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const choreId = btn.dataset.id;

        if (action === 'claim') {
          await this._claimChore(choreId);
        } else if (action === 'complete') {
          await this._completeChore(choreId);
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

  async _completeChore(choreId) {
    if (!this._selectedMemberId) return;

    const result = await this._sendCommand('famdo/complete_chore', {
      chore_id: choreId,
      member_id: this._selectedMemberId
    });

    if (result) {
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
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
          transition: all 0.2s ease;
        }

        .leaderboard-item.highlighted {
          background: rgba(78, 205, 196, 0.15);
          border: 2px solid var(--famdo-primary);
        }

        .leaderboard-rank {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .leaderboard-rank.gold { background: #FFD700; color: #000; }
        .leaderboard-rank.silver { background: #C0C0C0; color: #000; }
        .leaderboard-rank.bronze { background: #CD7F32; color: #000; }
        .leaderboard-rank.other { background: rgba(255,255,255,0.1); color: var(--famdo-text-secondary); }

        .leaderboard-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .leaderboard-avatar ha-icon {
          --mdc-icon-size: 24px;
          color: #fff;
        }

        .leaderboard-info {
          flex: 1;
        }

        .leaderboard-name {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--famdo-text);
        }

        .leaderboard-role {
          font-size: 0.85rem;
          color: var(--famdo-text-secondary);
        }

        .leaderboard-points {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--famdo-warning);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .leaderboard-points ha-icon {
          --mdc-icon-size: 20px;
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

  _renderMember(member, index) {
    const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
    const isSelected = member.id === this._selectedMemberId;

    return `
      <div class="leaderboard-item ${isSelected ? 'highlighted' : ''}">
        <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
        <div class="leaderboard-avatar" style="background: ${member.color}">
          <ha-icon icon="${member.avatar}"></ha-icon>
        </div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${member.name}</div>
          <div class="leaderboard-role">${member.role === 'parent' ? 'Parent' : 'Child'}</div>
        </div>
        <div class="leaderboard-points">
          <ha-icon icon="mdi:star"></ha-icon>
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
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .reward-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px;
          background: rgba(255,255,255,0.05);
          border-radius: var(--famdo-border-radius);
          text-align: center;
          transition: all 0.2s ease;
        }

        .reward-card:hover {
          background: rgba(255,255,255,0.08);
        }

        .reward-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--famdo-primary), var(--famdo-info));
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .reward-icon ha-icon {
          --mdc-icon-size: 32px;
          color: #fff;
        }

        .reward-name {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--famdo-text);
          margin-bottom: 8px;
        }

        .reward-cost {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--famdo-warning);
          margin-bottom: 12px;
        }

        .reward-cost ha-icon {
          --mdc-icon-size: 18px;
        }

        .reward-btn {
          width: 100%;
        }

        .reward-btn.affordable {
          background: var(--famdo-success);
        }

        .reward-btn.unaffordable {
          background: rgba(255,255,255,0.1);
          color: var(--famdo-text-secondary);
        }

        .points-display {
          text-align: center;
          padding: 16px;
          background: rgba(255, 234, 167, 0.1);
          border-radius: var(--famdo-border-radius);
          margin-bottom: 16px;
        }

        .points-display-value {
          font-size: 2rem;
          font-weight: bold;
          color: var(--famdo-warning);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .points-display-label {
          color: var(--famdo-text-secondary);
          font-size: 0.9rem;
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
                <ha-icon icon="mdi:star"></ha-icon>
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
    const needed = reward.points_cost - currentPoints;

    return `
      <div class="reward-card">
        <div class="reward-icon">
          <ha-icon icon="${reward.icon}"></ha-icon>
        </div>
        <div class="reward-name">${reward.name}</div>
        <div class="reward-cost">
          <ha-icon icon="mdi:star"></ha-icon>
          ${reward.points_cost}
        </div>
        <button class="famdo-btn reward-btn ${canAfford ? 'affordable' : 'unaffordable'}"
                data-action="claim" data-id="${reward.id}" ${!canAfford || !this._selectedMemberId ? 'disabled' : ''}>
          ${canAfford ? 'Claim Reward' : `Need ${needed} more`}
        </button>
      </div>
    `;
  }

  _attachEventListeners() {
    this.shadowRoot.querySelectorAll('[data-action="claim"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rewardId = btn.dataset.id;
        await this._claimReward(rewardId);
      });
    });
  }

  async _claimReward(rewardId) {
    if (!this._selectedMemberId) return;

    const reward = this._data.rewards.find(r => r.id === rewardId);

    const result = await this._sendCommand('famdo/claim_reward', {
      reward_id: rewardId,
      member_id: this._selectedMemberId
    });

    if (result) {
      this._showToast(`Claimed: ${reward?.name}!`, 'success');
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
    let allChores = [];
    if (this._config.show_chores) {
      allChores = (this._data.chores || [])
        .filter(c => !c.is_template && c.status !== 'completed')
        .filter(c => !c.due_date || c.due_date === todayStr || c.due_date < todayStr);
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
  }

  _renderChore(chore, urgencyClass) {
    const member = this._getMember(chore.assigned_to);
    const badgeClass = urgencyClass === 'overdue' ? 'overdue' : urgencyClass === 'due-today' ? 'today' : '';
    const badgeText = urgencyClass === 'overdue' ? 'Overdue' : urgencyClass === 'due-today' ? 'Today' : '';

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
          <div class="today-item-meta">${chore.points} pts${chore.due_time ? ` - Due ${chore.due_time}` : ''}</div>
        </div>
      </div>
    `;
  }

  getCardSize() {
    return 4;
  }
}

// ==================== Register Custom Elements ====================

customElements.define('famdo-member-selector', FamDoMemberSelector);
customElements.define('famdo-chores-card', FamDoChoresCard);
customElements.define('famdo-points-card', FamDoPointsCard);
customElements.define('famdo-rewards-card', FamDoRewardsCard);
customElements.define('famdo-today-card', FamDoTodayCard);

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
  }
);

console.info('%c FAMDO-KIOSK-CARDS %c Loaded ',
  'background: #4ECDC4; color: #000; font-weight: bold;',
  'background: #1a1a2e; color: #fff;'
);
