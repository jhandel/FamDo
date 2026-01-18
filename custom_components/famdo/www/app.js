/**
 * FamDo Admin Console
 * Home Assistant integration management interface
 */

class FamDoAdminApp {
    constructor() {
        this.data = null;
        this.currentTab = 'dashboard';
        this.currentSubTab = {};
        this.connection = null;
        this.subscriptionId = null;
        this.messageId = 1;
        this.haCalendars = [];
        this.selectedChores = new Set();
        this.selectedClaims = new Set();

        this.init();
    }

    async init() {
        try {
            await this.connectToHA();
            this.setupEventListeners();
            await this.loadData();
            this.render();
        } catch (error) {
            console.error('Failed to initialize FamDo Admin:', error);
            this.showToast('Failed to connect to Home Assistant', 'error');
        }
    }

    // ==================== Home Assistant Connection ====================

    async connectToHA() {
        return new Promise((resolve, reject) => {
            const hassUrl = window.location.origin;

            if (window.hassConnection) {
                this.connection = window.hassConnection;
                resolve();
                return;
            }

            const wsUrl = `${hassUrl.replace('http', 'ws')}/api/websocket`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleMessage(message, resolve, reject);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket closed');
                setTimeout(() => this.connectToHA(), 5000);
            };
        });
    }

    handleMessage(message, resolve, reject) {
        switch (message.type) {
            case 'auth_required':
                this.authenticate();
                break;
            case 'auth_ok':
                console.log('Authentication successful');
                this.subscribeToUpdates();
                resolve();
                break;
            case 'auth_invalid':
                console.error('Authentication failed');
                reject(new Error('Authentication failed'));
                break;
            case 'result':
                if (message.id === this.subscriptionId && message.success) {
                    this.data = message.result;
                    this.render();
                }
                break;
            case 'event':
                if (message.id === this.subscriptionId && message.event?.data) {
                    this.data = message.event.data;
                    this.render();
                }
                break;
        }
    }

    authenticate() {
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('auth');

        if (!token) {
            token = localStorage.getItem('hassTokens');
            if (token) {
                try {
                    const tokens = JSON.parse(token);
                    token = tokens.access_token;
                } catch (e) {
                    token = null;
                }
            }
        }

        if (!token) {
            token = window.__tokenCache?.access_token;
        }

        if (!token && window.parent !== window) {
            try {
                const hassAuth = window.parent.document.querySelector('home-assistant')?.hass;
                if (hassAuth?.auth?.accessToken) {
                    token = hassAuth.auth.accessToken;
                }
            } catch (e) {
                console.log('Could not access parent auth');
            }
        }

        if (token) {
            this.ws.send(JSON.stringify({
                type: 'auth',
                access_token: token
            }));
        } else {
            console.error('No authentication token available');
            this.showToast('Authentication required. Please access via Home Assistant.', 'error');
        }
    }

    subscribeToUpdates() {
        this.subscriptionId = this.generateId();
        this.ws.send(JSON.stringify({
            id: this.subscriptionId,
            type: 'famdo/subscribe'
        }));
    }

    async sendCommand(type, data = {}) {
        return new Promise((resolve, reject) => {
            const id = this.generateId();
            const handler = (event) => {
                const message = JSON.parse(event.data);
                if (message.id === id) {
                    this.ws.removeEventListener('message', handler);
                    if (message.success) {
                        resolve(message.result);
                    } else {
                        reject(new Error(message.error?.message || 'Command failed'));
                    }
                }
            };
            this.ws.addEventListener('message', handler);
            this.ws.send(JSON.stringify({ id, type, ...data }));
        });
    }

    generateId() {
        return this.messageId++;
    }

    async loadData() {
        try {
            this.data = await this.sendCommand('famdo/get_data');
            await this.loadHACalendars();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.data = {
                family_name: 'My Family',
                members: [],
                chores: [],
                rewards: [],
                reward_claims: [],
                settings: {}
            };
        }
    }

    async loadHACalendars() {
        try {
            const result = await this.sendCommand('famdo/get_ha_calendars');
            this.haCalendars = result.calendars || [];
        } catch (error) {
            console.error('Failed to load HA calendars:', error);
            this.haCalendars = [];
        }
    }

    // ==================== Main Render ====================

    render() {
        if (!this.data) return;

        // Update family name
        document.getElementById('family-name').textContent = this.data.family_name || 'My Family';

        // Update nav badges
        this.updateNavBadges();

        // Render current tab content
        this.renderCurrentTab();

        // Update settings form if on settings tab
        if (this.currentTab === 'settings') {
            this.populateSettingsForm();
        }
    }

    updateNavBadges() {
        const pendingApprovals = this.data.chores.filter(c => c.status === 'awaiting_approval' && !c.is_template).length;
        const pendingRewards = (this.data.reward_claims || []).filter(c => c.status === 'pending').length;

        document.getElementById('members-count').textContent = this.data.members.length;

        const choresBadge = document.getElementById('chores-pending');
        choresBadge.textContent = pendingApprovals;
        choresBadge.classList.toggle('pending', pendingApprovals > 0);

        const rewardsBadge = document.getElementById('rewards-pending');
        rewardsBadge.textContent = pendingRewards;
        rewardsBadge.classList.toggle('pending', pendingRewards > 0);
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'members':
                this.renderMembersTable();
                break;
            case 'chores':
                this.renderChoresTab();
                break;
            case 'rewards':
                this.renderRewardsTab();
                break;
            case 'settings':
                this.renderCalendarSources();
                break;
        }
    }

    // ==================== Navigation ====================

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Mobile menu toggle
        document.getElementById('menu-toggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Close mobile sidebar when clicking overlay
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menu-toggle');
            if (sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                e.target !== menuToggle &&
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });

        // Modal close
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        // Drawer close
        document.getElementById('drawer-close')?.addEventListener('click', () => this.closeDrawer());
        document.getElementById('drawer-overlay')?.addEventListener('click', () => this.closeDrawer());

        // Sub-tabs for chores
        document.getElementById('chores-subtabs')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.sub-tab');
            if (btn) {
                this.switchSubTab('chores', btn.dataset.subtab);
            }
        });

        // Sub-tabs for rewards
        document.getElementById('rewards-subtabs')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.sub-tab');
            if (btn) {
                this.switchSubTab('rewards', btn.dataset.subtab);
            }
        });

        // Chore status filter
        document.getElementById('chore-status-filter')?.addEventListener('change', () => {
            this.renderActiveChoresTable();
        });

        // Activity filter
        document.getElementById('activity-filter')?.addEventListener('change', () => {
            this.renderActivityFeed();
        });

        // Chore select all
        document.getElementById('chore-select-all')?.addEventListener('change', (e) => {
            this.toggleAllChoreSelection(e.target.checked);
        });

        // Claim select all
        document.getElementById('claim-select-all')?.addEventListener('change', (e) => {
            this.toggleAllClaimSelection(e.target.checked);
        });

        // Bulk approve
        document.getElementById('bulk-approve-btn')?.addEventListener('click', () => {
            this.bulkApproveChores();
        });

        // Bulk fulfill
        document.getElementById('bulk-fulfill-btn')?.addEventListener('click', () => {
            this.bulkFulfillClaims();
        });

        // Approve all on dashboard
        document.getElementById('approve-all-btn')?.addEventListener('click', () => {
            this.approveAllPending();
        });

        // Members table click
        document.getElementById('members-tbody')?.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            const memberId = row.dataset.memberId;
            if (memberId) {
                this.showMemberDrawer(memberId);
            }
        });

        // Chores table actions
        document.getElementById('chores-tbody')?.addEventListener('click', (e) => {
            this.handleChoreTableAction(e);
        });

        // Templates table actions
        document.getElementById('templates-tbody')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) {
                const choreId = btn.closest('tr').dataset.choreId;
                const action = btn.dataset.action;
                if (action === 'edit') {
                    this.showEditChoreModal(choreId);
                } else if (action === 'delete') {
                    this.deleteChore(choreId);
                }
            }
        });

        // Rewards table actions
        document.getElementById('rewards-tbody')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) {
                const rewardId = btn.closest('tr').dataset.rewardId;
                const action = btn.dataset.action;
                if (action === 'edit') {
                    this.showEditRewardModal(rewardId);
                } else if (action === 'delete') {
                    this.deleteReward(rewardId);
                }
            }
        });

        // Claims table actions
        document.getElementById('claims-tbody')?.addEventListener('click', (e) => {
            this.handleClaimTableAction(e);
        });

        // Settings form
        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Time format toggle
        document.querySelectorAll('.time-format-toggle input').forEach(input => {
            input.addEventListener('change', () => {
                document.querySelectorAll('.toggle-option').forEach(opt => opt.classList.remove('active'));
                input.closest('.toggle-option').classList.add('active');
            });
        });

        // History member filter
        document.getElementById('history-member-filter')?.addEventListener('change', () => {
            this.renderRewardHistory();
        });

        // Completed date filters
        document.getElementById('completed-date-from')?.addEventListener('change', () => {
            this.renderCompletedChoresTable();
        });
        document.getElementById('completed-date-to')?.addEventListener('change', () => {
            this.renderCompletedChoresTable();
        });
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-tab`);
        });

        // Update page header
        this.updatePageHeader(tab);

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');

        // Render tab content
        this.renderCurrentTab();
    }

    switchSubTab(mainTab, subTab) {
        this.currentSubTab[mainTab] = subTab;

        const container = document.getElementById(`${mainTab}-subtabs`);
        container.querySelectorAll('.sub-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subTab);
        });

        // Show/hide sub-content
        const tabContainer = document.getElementById(`${mainTab}-tab`);
        tabContainer.querySelectorAll('.sub-content').forEach(content => {
            content.classList.toggle('active', content.id === `${mainTab}-${subTab}`);
        });

        // Render sub-content
        if (mainTab === 'chores') {
            if (subTab === 'active') this.renderActiveChoresTable();
            else if (subTab === 'completed') this.renderCompletedChoresTable();
            else if (subTab === 'templates') this.renderTemplatesTable();
        } else if (mainTab === 'rewards') {
            if (subTab === 'catalog') this.renderRewardsCatalog();
            else if (subTab === 'pending') this.renderPendingClaims();
            else if (subTab === 'history') this.renderRewardHistory();
        }
    }

    updatePageHeader(tab) {
        const headers = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of your family\'s activities', actions: '' },
            members: {
                title: 'Members',
                subtitle: `${this.data?.members.length || 0} family members`,
                actions: `<button class="btn btn-primary" onclick="app.showAddMemberModal()">
                    <span class="mdi mdi-plus"></span> Add Member
                </button>`
            },
            chores: {
                title: 'Chores',
                subtitle: 'Manage tasks and assignments',
                actions: `<button class="btn btn-primary" onclick="app.showAddChoreModal()">
                    <span class="mdi mdi-plus"></span> Add Chore
                </button>`
            },
            rewards: {
                title: 'Rewards',
                subtitle: 'Manage rewards and claims',
                actions: `<button class="btn btn-primary" onclick="app.showAddRewardModal()">
                    <span class="mdi mdi-plus"></span> Add Reward
                </button>`
            },
            settings: { title: 'Settings', subtitle: 'Configure your FamDo integration', actions: '' }
        };

        const config = headers[tab] || headers.dashboard;
        document.getElementById('page-title').textContent = config.title;
        document.getElementById('page-subtitle').textContent = config.subtitle;
        document.getElementById('page-actions').innerHTML = config.actions;
        document.getElementById('mobile-title').textContent = config.title;
    }

    // ==================== Dashboard ====================

    renderDashboard() {
        this.renderStatsRow();
        this.renderPendingApprovals();
        this.renderPendingRewardsDashboard();
        this.renderActivityFeed();
    }

    renderStatsRow() {
        const totalMembers = this.data.members.length;
        const totalPoints = this.data.members.reduce((sum, m) => sum + (m.points || 0), 0);
        const pendingApprovals = this.data.chores.filter(c => c.status === 'awaiting_approval' && !c.is_template).length;
        const pendingRewards = (this.data.reward_claims || []).filter(c => c.status === 'pending').length;

        const container = document.getElementById('stats-row');
        container.innerHTML = `
            <div class="stats-card" onclick="app.switchTab('members')">
                <div class="stats-card-icon" style="background: var(--primary)">
                    <span class="mdi mdi-account-group"></span>
                </div>
                <div class="stats-card-content">
                    <div class="stats-card-value">${totalMembers}</div>
                    <div class="stats-card-label">Total Members</div>
                </div>
            </div>
            <div class="stats-card" onclick="app.switchTab('members')">
                <div class="stats-card-icon" style="background: var(--info)">
                    <span class="mdi mdi-star"></span>
                </div>
                <div class="stats-card-content">
                    <div class="stats-card-value">${totalPoints}</div>
                    <div class="stats-card-label">Total Points</div>
                </div>
            </div>
            <div class="stats-card" onclick="app.switchTab('chores')">
                <div class="stats-card-icon" style="background: ${pendingApprovals > 0 ? 'var(--warning)' : 'var(--success)'}">
                    <span class="mdi mdi-clock-check-outline"></span>
                </div>
                <div class="stats-card-content">
                    <div class="stats-card-value">${pendingApprovals}</div>
                    <div class="stats-card-label">Pending Approvals</div>
                </div>
            </div>
            <div class="stats-card" onclick="app.switchTab('rewards'); app.switchSubTab('rewards', 'pending')">
                <div class="stats-card-icon" style="background: ${pendingRewards > 0 ? 'var(--secondary)' : 'var(--success)'}">
                    <span class="mdi mdi-gift-outline"></span>
                </div>
                <div class="stats-card-content">
                    <div class="stats-card-value">${pendingRewards}</div>
                    <div class="stats-card-label">Pending Rewards</div>
                </div>
            </div>
        `;
    }

    renderPendingApprovals() {
        const container = document.getElementById('pending-approvals');
        const pending = this.data.chores.filter(c => c.status === 'awaiting_approval' && !c.is_template);

        // Show/hide approve all button
        const approveAllBtn = document.getElementById('approve-all-btn');
        if (approveAllBtn) {
            approveAllBtn.style.display = pending.length > 1 ? 'block' : 'none';
        }

        if (pending.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No pending approvals</p></div>`;
            return;
        }

        container.innerHTML = `<div class="pending-list">
            ${pending.map(chore => {
                const member = this.data.members.find(m => m.id === chore.claimed_by);
                return `
                    <div class="pending-item">
                        <div class="chore-icon-sm" style="background: ${member?.color || 'var(--primary)'}">
                            <span class="mdi ${chore.icon}"></span>
                        </div>
                        <div class="pending-info">
                            <div class="pending-title">${chore.name}</div>
                            <div class="pending-meta">${member?.name || 'Unknown'} - ${chore.points} pts</div>
                        </div>
                        <div class="pending-actions">
                            <button class="btn btn-sm btn-success" onclick="app.approveChore('${chore.id}')">
                                <span class="mdi mdi-check"></span>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.rejectChore('${chore.id}')">
                                <span class="mdi mdi-close"></span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>`;
    }

    renderPendingRewardsDashboard() {
        const container = document.getElementById('pending-rewards');
        const pending = (this.data.reward_claims || []).filter(c => c.status === 'pending');

        if (pending.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No pending reward claims</p></div>`;
            return;
        }

        container.innerHTML = `<div class="pending-list">
            ${pending.map(claim => {
                const member = this.data.members.find(m => m.id === claim.member_id);
                const reward = this.data.rewards.find(r => r.id === claim.reward_id);
                return `
                    <div class="pending-item">
                        <div class="reward-icon-sm">
                            <span class="mdi ${reward?.icon || 'mdi-gift'}"></span>
                        </div>
                        <div class="pending-info">
                            <div class="pending-title">${reward?.name || 'Unknown'}</div>
                            <div class="pending-meta">${member?.name || 'Unknown'} - ${claim.points_spent} pts</div>
                        </div>
                        <div class="pending-actions">
                            <button class="btn btn-sm btn-success" onclick="app.fulfillClaim('${claim.id}')">
                                <span class="mdi mdi-check"></span> Fulfill
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>`;
    }

    renderActivityFeed() {
        const container = document.getElementById('activity-feed');
        const filter = document.getElementById('activity-filter')?.value || 'all';
        const activities = this.buildActivityFeed(filter);

        if (activities.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No recent activity</p></div>`;
            return;
        }

        container.innerHTML = `<div class="activity-list">
            ${activities.slice(0, 20).map(activity => {
                const member = this.data.members.find(m => m.id === activity.memberId);
                const isPositive = activity.points >= 0;
                return `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.type.includes('chore') ? 'chore' : 'reward'}">
                            <span class="mdi ${activity.type.includes('chore') ? 'mdi-broom' : 'mdi-gift'}"></span>
                        </div>
                        <div class="activity-content">
                            <div class="activity-text">
                                <strong>${member?.name || 'Unknown'}</strong> ${activity.action} ${activity.description}
                            </div>
                            <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
                        </div>
                        ${activity.points !== 0 ? `
                            <div class="activity-points ${isPositive ? 'positive' : 'negative'}">
                                ${isPositive ? '+' : ''}${activity.points} pts
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>`;
    }

    buildActivityFeed(filter = 'all') {
        const activities = [];

        // From completed chores
        if (filter === 'all' || filter === 'chore_completed') {
            this.data.chores.filter(c => c.status === 'completed' && c.completed_at && !c.is_template).forEach(c => {
                activities.push({
                    type: 'chore_completed',
                    timestamp: c.completed_at,
                    memberId: c.claimed_by,
                    description: c.name,
                    action: 'completed',
                    points: c.points
                });
            });
        }

        // From reward claims
        if (filter === 'all' || filter === 'reward') {
            (this.data.reward_claims || []).forEach(c => {
                const reward = this.data.rewards.find(r => r.id === c.reward_id);
                if (c.status === 'fulfilled') {
                    activities.push({
                        type: 'reward_fulfilled',
                        timestamp: c.fulfilled_at || c.claimed_at,
                        memberId: c.member_id,
                        description: reward?.name || 'Unknown',
                        action: 'received',
                        points: -(c.points_spent || 0)
                    });
                } else {
                    activities.push({
                        type: 'reward_claimed',
                        timestamp: c.claimed_at,
                        memberId: c.member_id,
                        description: reward?.name || 'Unknown',
                        action: 'claimed',
                        points: 0
                    });
                }
            });
        }

        return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // ==================== Members Tab ====================

    renderMembersTable() {
        const tbody = document.getElementById('members-tbody');

        if (this.data.members.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No members yet. Add your first family member!</td></tr>`;
            return;
        }

        tbody.innerHTML = this.data.members.map(member => {
            const completedCount = this.data.chores.filter(c => c.claimed_by === member.id && c.status === 'completed').length;
            return `
                <tr data-member-id="${member.id}" style="cursor: pointer;">
                    <td>
                        <div class="member-cell">
                            <div class="member-avatar-sm" style="background: ${member.color}">
                                <span class="mdi ${member.avatar}"></span>
                            </div>
                            <span>${member.name}</span>
                        </div>
                    </td>
                    <td><span class="status-badge ${member.role}">${member.role}</span></td>
                    <td class="text-right"><strong>${member.points}</strong></td>
                    <td class="text-right">${completedCount}</td>
                    <td class="text-right">
                        <div class="row-actions">
                            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.showEditMemberModal('${member.id}')">
                                <span class="mdi mdi-pencil"></span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showMemberDrawer(memberId) {
        const member = this.data.members.find(m => m.id === memberId);
        if (!member) return;

        const transactions = this.getMemberTransactions(memberId);

        document.getElementById('drawer-title').textContent = 'Member Details';
        document.getElementById('drawer-body').innerHTML = `
            <div class="drawer-member-header">
                <div class="drawer-avatar" style="background: ${member.color}">
                    <span class="mdi ${member.avatar}"></span>
                </div>
                <div class="drawer-member-info">
                    <h3>${member.name}</h3>
                    <p>${member.role} - ${member.points} points</p>
                </div>
            </div>

            <div class="point-adjustment">
                <h4>Adjust Points</h4>
                <div class="point-controls">
                    <button class="point-btn minus" onclick="app.decrementPointAdjustment()">-</button>
                    <input type="number" class="form-input point-input" id="point-adjustment-value" value="10" min="1">
                    <button class="point-btn plus" onclick="app.incrementPointAdjustment()">+</button>
                    <button class="btn btn-primary point-submit" onclick="app.applyPointAdjustment('${member.id}')">
                        Apply
                    </button>
                </div>
            </div>

            <div class="transaction-history">
                <h4>Recent Transactions</h4>
                ${transactions.length === 0 ? '<p class="empty-state">No transactions yet</p>' : `
                    <div class="transaction-list">
                        ${transactions.slice(0, 15).map(t => {
                            const isPositive = t.points > 0;
                            return `
                                <div class="transaction-item">
                                    <div class="transaction-icon ${isPositive ? 'positive' : 'negative'}">
                                        <span class="mdi ${isPositive ? 'mdi-plus' : 'mdi-minus'}"></span>
                                    </div>
                                    <div class="transaction-details">
                                        <div class="transaction-desc">${t.description}</div>
                                        <div class="transaction-date">${this.formatRelativeTime(t.timestamp)}</div>
                                    </div>
                                    <div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">
                                        ${isPositive ? '+' : ''}${t.points}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        `;

        document.getElementById('drawer-footer').innerHTML = `
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="app.showEditMemberModal('${member.id}'); app.closeDrawer();">
                    <span class="mdi mdi-pencil"></span> Edit Member
                </button>
                <button class="btn btn-danger" onclick="app.deleteMember('${member.id}')">
                    <span class="mdi mdi-delete"></span> Delete
                </button>
            </div>
        `;

        this.openDrawer();
    }

    getMemberTransactions(memberId) {
        const transactions = [];

        // From completed chores
        this.data.chores.filter(c => c.claimed_by === memberId && c.status === 'completed').forEach(c => {
            transactions.push({
                type: 'chore',
                timestamp: c.completed_at,
                description: `Completed: ${c.name}`,
                points: c.points
            });
        });

        // From reward claims
        (this.data.reward_claims || []).filter(c => c.member_id === memberId).forEach(c => {
            const reward = this.data.rewards.find(r => r.id === c.reward_id);
            transactions.push({
                type: 'reward',
                timestamp: c.claimed_at,
                description: `Claimed: ${reward?.name || 'Unknown'}`,
                points: -(c.points_spent || 0)
            });
        });

        return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    incrementPointAdjustment() {
        const input = document.getElementById('point-adjustment-value');
        input.value = parseInt(input.value || 0) + 5;
    }

    decrementPointAdjustment() {
        const input = document.getElementById('point-adjustment-value');
        const newVal = parseInt(input.value || 0) - 5;
        input.value = Math.max(1, newVal);
    }

    async applyPointAdjustment(memberId) {
        const input = document.getElementById('point-adjustment-value');
        const amount = parseInt(input.value) || 0;
        if (amount === 0) return;

        const member = this.data.members.find(m => m.id === memberId);
        if (!member) return;

        const newPoints = member.points + amount;

        try {
            await this.sendCommand('famdo/update_member', {
                member_id: memberId,
                points: newPoints
            });
            this.showToast(`${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} points`, 'success');
            this.closeDrawer();
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    // ==================== Chores Tab ====================

    renderChoresTab() {
        const subTab = this.currentSubTab.chores || 'active';
        this.switchSubTab('chores', subTab);
    }

    renderActiveChoresTable() {
        const tbody = document.getElementById('chores-tbody');
        const filter = document.getElementById('chore-status-filter')?.value || 'all';

        let chores = this.data.chores.filter(c => !c.is_template && c.status !== 'completed');

        if (filter !== 'all') {
            chores = chores.filter(c => c.status === filter);
        }

        // Clear selection
        this.selectedChores.clear();
        document.getElementById('chore-select-all').checked = false;
        this.updateBulkApproveButton();

        if (chores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No active chores</td></tr>`;
            return;
        }

        tbody.innerHTML = chores.map(chore => {
            const assignedMember = this.data.members.find(m => m.id === chore.assigned_to);
            const claimedMember = this.data.members.find(m => m.id === chore.claimed_by);
            const canSelect = chore.status === 'awaiting_approval';

            return `
                <tr data-chore-id="${chore.id}">
                    <td class="checkbox-col">
                        <input type="checkbox" ${canSelect ? '' : 'disabled'}
                               onchange="app.toggleChoreSelection('${chore.id}', this.checked)">
                    </td>
                    <td>
                        <div class="chore-cell">
                            <div class="chore-icon-sm" style="background: ${assignedMember?.color || 'var(--primary)'}">
                                <span class="mdi ${chore.icon}"></span>
                            </div>
                            <span>
                                ${chore.name}
                                ${chore.template_id || chore.recurrence !== 'none' ? '<span class="mdi mdi-refresh recurring-badge"></span>' : ''}
                            </span>
                        </div>
                    </td>
                    <td><span class="status-badge ${chore.status}">${this.formatStatus(chore.status)}</span></td>
                    <td>${claimedMember?.name || assignedMember?.name || '-'}</td>
                    <td class="text-right">${chore.points}</td>
                    <td>${chore.due_date ? this.formatDate(chore.due_date) : '-'}</td>
                    <td class="text-right">
                        <div class="row-actions">
                            ${chore.status === 'awaiting_approval' ? `
                                <button class="btn btn-sm btn-success" data-action="approve" title="Approve">
                                    <span class="mdi mdi-check"></span>
                                </button>
                                <button class="btn btn-sm btn-danger" data-action="reject" title="Reject">
                                    <span class="mdi mdi-close"></span>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-secondary" data-action="edit" title="Edit">
                                <span class="mdi mdi-pencil"></span>
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="delete" title="Delete">
                                <span class="mdi mdi-delete"></span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderCompletedChoresTable() {
        const tbody = document.getElementById('completed-tbody');
        const dateFrom = document.getElementById('completed-date-from')?.value;
        const dateTo = document.getElementById('completed-date-to')?.value;

        let completed = this.data.chores.filter(c => c.status === 'completed' && !c.is_template);

        if (dateFrom) {
            completed = completed.filter(c => c.completed_at >= dateFrom);
        }
        if (dateTo) {
            completed = completed.filter(c => c.completed_at <= dateTo + 'T23:59:59');
        }

        completed.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

        if (completed.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No completed chores</td></tr>`;
            return;
        }

        tbody.innerHTML = completed.slice(0, 50).map(chore => {
            const completedBy = this.data.members.find(m => m.id === chore.claimed_by);
            const approvedBy = this.data.members.find(m => m.id === chore.approved_by);

            return `
                <tr>
                    <td>
                        <div class="chore-cell">
                            <div class="chore-icon-sm" style="background: ${completedBy?.color || 'var(--primary)'}">
                                <span class="mdi ${chore.icon}"></span>
                            </div>
                            <span>${chore.name}</span>
                        </div>
                    </td>
                    <td>${completedBy?.name || '-'}</td>
                    <td>${chore.completed_at ? this.formatDateTime(chore.completed_at) : '-'}</td>
                    <td class="text-right">${chore.points}</td>
                    <td>${approvedBy?.name || '-'}</td>
                </tr>
            `;
        }).join('');
    }

    renderTemplatesTable() {
        const tbody = document.getElementById('templates-tbody');
        const templates = this.data.chores.filter(c => c.is_template);

        if (templates.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No recurring chore templates</td></tr>`;
            return;
        }

        const recurrenceLabels = {
            'none': 'One time',
            'always_on': 'Always On',
            'daily': 'Daily',
            'weekly': 'Weekly',
            'monthly': 'Monthly'
        };

        tbody.innerHTML = templates.map(chore => {
            return `
                <tr data-chore-id="${chore.id}">
                    <td>
                        <div class="chore-cell">
                            <div class="chore-icon-sm" style="background: var(--primary)">
                                <span class="mdi ${chore.icon}"></span>
                            </div>
                            <span>${chore.name}</span>
                        </div>
                    </td>
                    <td>${recurrenceLabels[chore.recurrence] || chore.recurrence}</td>
                    <td class="text-right">${chore.points}</td>
                    <td class="text-right">${chore.negative_points || 0}</td>
                    <td class="text-right">${chore.max_instances || 3}</td>
                    <td class="text-right">
                        <div class="row-actions">
                            <button class="btn btn-sm btn-secondary" data-action="edit">
                                <span class="mdi mdi-pencil"></span>
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="delete">
                                <span class="mdi mdi-delete"></span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    handleChoreTableAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const choreId = btn.closest('tr').dataset.choreId;
        const action = btn.dataset.action;

        switch (action) {
            case 'approve':
                this.approveChore(choreId);
                break;
            case 'reject':
                this.rejectChore(choreId);
                break;
            case 'edit':
                this.showEditChoreModal(choreId);
                break;
            case 'delete':
                this.deleteChore(choreId);
                break;
        }
    }

    toggleChoreSelection(choreId, checked) {
        if (checked) {
            this.selectedChores.add(choreId);
        } else {
            this.selectedChores.delete(choreId);
        }
        this.updateBulkApproveButton();
    }

    toggleAllChoreSelection(checked) {
        const checkboxes = document.querySelectorAll('#chores-tbody input[type="checkbox"]:not(:disabled)');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const choreId = cb.closest('tr').dataset.choreId;
            if (checked) {
                this.selectedChores.add(choreId);
            } else {
                this.selectedChores.delete(choreId);
            }
        });
        this.updateBulkApproveButton();
    }

    updateBulkApproveButton() {
        const btn = document.getElementById('bulk-approve-btn');
        if (btn) {
            btn.style.display = this.selectedChores.size > 0 ? 'flex' : 'none';
        }
    }

    async bulkApproveChores() {
        const choreIds = Array.from(this.selectedChores);
        if (choreIds.length === 0) return;

        try {
            for (const choreId of choreIds) {
                await this.sendCommand('famdo/approve_chore', {
                    chore_id: choreId,
                    approver_id: null
                });
            }
            this.showToast(`Approved ${choreIds.length} chores`, 'success');
            this.selectedChores.clear();
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async approveAllPending() {
        const pending = this.data.chores.filter(c => c.status === 'awaiting_approval' && !c.is_template);
        if (pending.length === 0) return;

        try {
            for (const chore of pending) {
                await this.sendCommand('famdo/approve_chore', {
                    chore_id: chore.id,
                    approver_id: null
                });
            }
            this.showToast(`Approved ${pending.length} chores`, 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    // ==================== Rewards Tab ====================

    renderRewardsTab() {
        const subTab = this.currentSubTab.rewards || 'catalog';
        this.switchSubTab('rewards', subTab);
        this.populateHistoryMemberFilter();
    }

    renderRewardsCatalog() {
        const tbody = document.getElementById('rewards-tbody');

        if (this.data.rewards.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No rewards yet. Add your first reward!</td></tr>`;
            return;
        }

        tbody.innerHTML = this.data.rewards.map(reward => {
            const isAvailable = reward.quantity === -1 || reward.quantity > 0;
            return `
                <tr data-reward-id="${reward.id}">
                    <td>
                        <div class="reward-cell">
                            <div class="reward-icon-sm">
                                <span class="mdi ${reward.icon}"></span>
                            </div>
                            <span>${reward.name}</span>
                        </div>
                    </td>
                    <td class="text-right">${reward.points_cost}</td>
                    <td class="text-right">${reward.quantity === -1 ? 'Unlimited' : reward.quantity}</td>
                    <td><span class="status-badge ${isAvailable ? 'available' : 'rejected'}">${isAvailable ? 'Available' : 'Out of Stock'}</span></td>
                    <td class="text-right">
                        <div class="row-actions">
                            <button class="btn btn-sm btn-secondary" data-action="edit">
                                <span class="mdi mdi-pencil"></span>
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="delete">
                                <span class="mdi mdi-delete"></span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderPendingClaims() {
        const tbody = document.getElementById('claims-tbody');
        const pending = (this.data.reward_claims || []).filter(c => c.status === 'pending');

        // Clear selection
        this.selectedClaims.clear();
        document.getElementById('claim-select-all').checked = false;
        this.updateBulkFulfillButton();

        if (pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No pending claims</td></tr>`;
            return;
        }

        tbody.innerHTML = pending.map(claim => {
            const member = this.data.members.find(m => m.id === claim.member_id);
            const reward = this.data.rewards.find(r => r.id === claim.reward_id);
            return `
                <tr data-claim-id="${claim.id}">
                    <td class="checkbox-col">
                        <input type="checkbox" onchange="app.toggleClaimSelection('${claim.id}', this.checked)">
                    </td>
                    <td>
                        <div class="member-cell">
                            <div class="member-avatar-sm" style="background: ${member?.color || 'var(--primary)'}">
                                <span class="mdi ${member?.avatar || 'mdi-account'}"></span>
                            </div>
                            <span>${member?.name || 'Unknown'}</span>
                        </div>
                    </td>
                    <td>${reward?.name || 'Unknown'}</td>
                    <td class="text-right">${claim.points_spent}</td>
                    <td>${this.formatDateTime(claim.claimed_at)}</td>
                    <td class="text-right">
                        <div class="row-actions">
                            <button class="btn btn-sm btn-success" data-action="fulfill">
                                <span class="mdi mdi-check"></span> Fulfill
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderRewardHistory() {
        const tbody = document.getElementById('history-tbody');
        const filter = document.getElementById('history-member-filter')?.value || 'all';

        let claims = [...(this.data.reward_claims || [])];

        if (filter !== 'all') {
            claims = claims.filter(c => c.member_id === filter);
        }

        claims.sort((a, b) => new Date(b.claimed_at) - new Date(a.claimed_at));

        if (claims.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No reward history</td></tr>`;
            return;
        }

        tbody.innerHTML = claims.slice(0, 50).map(claim => {
            const member = this.data.members.find(m => m.id === claim.member_id);
            const reward = this.data.rewards.find(r => r.id === claim.reward_id);
            return `
                <tr>
                    <td>
                        <div class="member-cell">
                            <div class="member-avatar-sm" style="background: ${member?.color || 'var(--primary)'}">
                                <span class="mdi ${member?.avatar || 'mdi-account'}"></span>
                            </div>
                            <span>${member?.name || 'Unknown'}</span>
                        </div>
                    </td>
                    <td>${reward?.name || 'Unknown'}</td>
                    <td class="text-right">${claim.points_spent}</td>
                    <td><span class="status-badge ${claim.status}">${claim.status}</span></td>
                    <td>${this.formatDateTime(claim.claimed_at)}</td>
                </tr>
            `;
        }).join('');
    }

    populateHistoryMemberFilter() {
        const select = document.getElementById('history-member-filter');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = `<option value="all">All Members</option>` +
            this.data.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        select.value = currentValue || 'all';
    }

    handleClaimTableAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const claimId = btn.closest('tr').dataset.claimId;
        const action = btn.dataset.action;

        if (action === 'fulfill') {
            this.fulfillClaim(claimId);
        }
    }

    toggleClaimSelection(claimId, checked) {
        if (checked) {
            this.selectedClaims.add(claimId);
        } else {
            this.selectedClaims.delete(claimId);
        }
        this.updateBulkFulfillButton();
    }

    toggleAllClaimSelection(checked) {
        const checkboxes = document.querySelectorAll('#claims-tbody input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const claimId = cb.closest('tr').dataset.claimId;
            if (checked) {
                this.selectedClaims.add(claimId);
            } else {
                this.selectedClaims.delete(claimId);
            }
        });
        this.updateBulkFulfillButton();
    }

    updateBulkFulfillButton() {
        const btn = document.getElementById('bulk-fulfill-btn');
        if (btn) {
            btn.style.display = this.selectedClaims.size > 0 ? 'flex' : 'none';
        }
    }

    async bulkFulfillClaims() {
        const claimIds = Array.from(this.selectedClaims);
        if (claimIds.length === 0) return;

        try {
            for (const claimId of claimIds) {
                await this.sendCommand('famdo/fulfill_reward_claim', { claim_id: claimId });
            }
            this.showToast(`Fulfilled ${claimIds.length} reward claims`, 'success');
            this.selectedClaims.clear();
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    // ==================== Settings Tab ====================

    populateSettingsForm() {
        document.getElementById('setting-family-name').value = this.data.family_name || '';

        const timeFormat = this.data.settings?.time_format || '12h';
        document.querySelectorAll('.time-format-toggle input').forEach(input => {
            input.checked = input.value === timeFormat;
            input.closest('.toggle-option').classList.toggle('active', input.value === timeFormat);
        });

        this.renderCalendarSources();
    }

    renderCalendarSources() {
        const container = document.getElementById('calendar-sources');
        if (!container) return;

        const selectedCalendars = this.data.settings?.selected_calendars || [];
        const calendarColors = this.data.settings?.calendar_colors || {};
        const defaultColors = ['#9B59B6', '#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#1ABC9C', '#E91E63', '#00BCD4'];

        if (this.haCalendars.length === 0) {
            container.innerHTML = `<p class="empty-state">No calendar integrations found in Home Assistant.</p>`;
            return;
        }

        container.innerHTML = this.haCalendars.map((cal, index) => {
            const currentColor = calendarColors[cal.entity_id] || defaultColors[index % defaultColors.length];
            return `
                <div class="calendar-source-row">
                    <label class="calendar-source-option">
                        <input type="checkbox" name="selected_calendars" value="${cal.entity_id}"
                            ${selectedCalendars.includes(cal.entity_id) ? 'checked' : ''}>
                        <span class="mdi mdi-calendar"></span>
                        <span class="calendar-source-name">${cal.name}</span>
                    </label>
                    <input type="color" class="calendar-color-picker"
                        data-entity-id="${cal.entity_id}"
                        value="${currentColor}"
                        title="Choose color for ${cal.name}">
                </div>
            `;
        }).join('');
    }

    async saveSettings() {
        const formData = new FormData(document.getElementById('settings-form'));

        const selectedCalendars = [];
        document.querySelectorAll('input[name="selected_calendars"]:checked').forEach(cb => {
            selectedCalendars.push(cb.value);
        });

        const calendarColors = {};
        document.querySelectorAll('.calendar-color-picker').forEach(picker => {
            calendarColors[picker.dataset.entityId] = picker.value;
        });

        try {
            await this.sendCommand('famdo/update_settings', {
                family_name: formData.get('family_name'),
                time_format: formData.get('time_format'),
                selected_calendars: selectedCalendars,
                calendar_colors: calendarColors
            });
            this.showToast('Settings saved!', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    // ==================== Actions ====================

    async approveChore(choreId) {
        try {
            const chore = this.data.chores.find(c => c.id === choreId);
            await this.sendCommand('famdo/approve_chore', {
                chore_id: choreId,
                approver_id: null
            });
            this.showPointsAnimation(chore?.points || 0);
            this.showToast(`Approved! ${chore?.points || 0} points awarded`, 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async rejectChore(choreId) {
        try {
            await this.sendCommand('famdo/reject_chore', {
                chore_id: choreId,
                approver_id: null
            });
            this.showToast('Chore rejected', 'info');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async deleteChore(choreId) {
        if (!confirm('Are you sure you want to delete this chore?')) return;

        try {
            await this.sendCommand('famdo/delete_chore', { chore_id: choreId });
            this.showToast('Chore deleted', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async fulfillClaim(claimId) {
        try {
            await this.sendCommand('famdo/fulfill_reward_claim', { claim_id: claimId });
            this.showToast('Reward fulfilled!', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async deleteReward(rewardId) {
        if (!confirm('Are you sure you want to delete this reward?')) return;

        try {
            await this.sendCommand('famdo/delete_reward', { reward_id: rewardId });
            this.showToast('Reward deleted', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async deleteMember(memberId) {
        const member = this.data.members.find(m => m.id === memberId);
        if (!confirm(`Are you sure you want to delete ${member?.name || 'this member'}?`)) return;

        try {
            await this.sendCommand('famdo/remove_member', { member_id: memberId });
            this.closeDrawer();
            this.showToast('Member deleted', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    // ==================== Modals ====================

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    }

    openDrawer() {
        document.getElementById('side-drawer').classList.add('active');
        document.getElementById('drawer-overlay').classList.add('active');
    }

    closeDrawer() {
        document.getElementById('side-drawer').classList.remove('active');
        document.getElementById('drawer-overlay').classList.remove('active');
    }

    showAddMemberModal() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const icons = ['mdi-account', 'mdi-account-child', 'mdi-face-man', 'mdi-face-woman', 'mdi-dog', 'mdi-cat', 'mdi-robot', 'mdi-alien'];

        const content = `
            <form id="add-member-form">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-input" name="name" required placeholder="Enter name">
                </div>
                <div class="form-group">
                    <label class="form-label">Role</label>
                    <select class="form-select" name="role">
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker">
                        ${colors.map((c, i) => `
                            <div class="color-option ${i === 0 ? 'selected' : ''}"
                                 style="background: ${c}"
                                 data-color="${c}"></div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Avatar</label>
                    <div class="icon-picker">
                        ${icons.map((icon, i) => `
                            <div class="icon-option ${i === 0 ? 'selected' : ''}" data-icon="${icon}">
                                <span class="mdi ${icon}"></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Member</button>
                </div>
            </form>
        `;

        this.showModal('Add Family Member', content);
        this.setupColorPicker();
        this.setupIconPicker();

        document.getElementById('add-member-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const color = document.querySelector('.color-picker .color-option.selected')?.dataset.color || colors[0];
            const avatar = document.querySelector('.icon-picker .icon-option.selected')?.dataset.icon || icons[0];

            try {
                await this.sendCommand('famdo/add_member', {
                    name: formData.get('name'),
                    role: formData.get('role'),
                    color: color,
                    avatar: avatar
                });
                this.closeModal();
                this.showToast('Member added!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    showEditMemberModal(memberId) {
        const member = this.data.members.find(m => m.id === memberId);
        if (!member) return;

        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const icons = ['mdi-account', 'mdi-account-child', 'mdi-face-man', 'mdi-face-woman', 'mdi-dog', 'mdi-cat', 'mdi-robot', 'mdi-alien'];

        const content = `
            <form id="edit-member-form">
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input type="text" class="form-input" name="name" required value="${member.name}">
                </div>
                <div class="form-group">
                    <label class="form-label">Role</label>
                    <select class="form-select" name="role">
                        <option value="child" ${member.role === 'child' ? 'selected' : ''}>Child</option>
                        <option value="parent" ${member.role === 'parent' ? 'selected' : ''}>Parent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-picker">
                        ${colors.map(c => `
                            <div class="color-option ${c === member.color ? 'selected' : ''}"
                                 style="background: ${c}"
                                 data-color="${c}"></div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Avatar</label>
                    <div class="icon-picker">
                        ${icons.map(icon => `
                            <div class="icon-option ${icon === member.avatar ? 'selected' : ''}" data-icon="${icon}">
                                <span class="mdi ${icon}"></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        `;

        this.showModal('Edit Member', content);
        this.setupColorPicker();
        this.setupIconPicker();

        document.getElementById('edit-member-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const color = document.querySelector('.color-picker .color-option.selected')?.dataset.color || member.color;
            const avatar = document.querySelector('.icon-picker .icon-option.selected')?.dataset.icon || member.avatar;

            try {
                await this.sendCommand('famdo/update_member', {
                    member_id: memberId,
                    name: formData.get('name'),
                    role: formData.get('role'),
                    color: color,
                    avatar: avatar
                });
                this.closeModal();
                this.showToast('Member updated!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    showAddChoreModal() {
        const icons = ['mdi-broom', 'mdi-silverware-fork-knife', 'mdi-dog-side', 'mdi-bed', 'mdi-tshirt-crew', 'mdi-trash-can', 'mdi-vacuum', 'mdi-car-wash'];

        const content = `
            <form id="add-chore-form">
                <div class="form-group">
                    <label class="form-label">Chore Name</label>
                    <input type="text" class="form-input" name="name" required placeholder="e.g., Make bed">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" name="description" placeholder="Additional details..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Points</label>
                        <input type="number" class="form-input" name="points" value="10" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Recurrence</label>
                        <select class="form-select" name="recurrence" id="chore-recurrence">
                            <option value="none">One time</option>
                            <option value="always_on">Always On</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>
                <div class="form-group recurring-options" id="recurring-options" style="display: none;">
                    <div class="form-row">
                        <div class="form-group" id="negative-points-group" style="display: none;">
                            <label class="form-label">Overdue Penalty</label>
                            <input type="number" class="form-input" name="negative_points" value="0" min="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Max Queue</label>
                            <input type="number" class="form-input" name="max_instances" value="3" min="1" max="10">
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Assign To</label>
                    <select class="form-select" name="assigned_to">
                        <option value="">Anyone</option>
                        ${this.data.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row" id="due-date-row">
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" class="form-input" name="due_date">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Due Time</label>
                        <input type="time" class="form-input" name="due_time">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Icon</label>
                    <div class="icon-picker">
                        ${icons.map((icon, i) => `
                            <div class="icon-option ${i === 0 ? 'selected' : ''}" data-icon="${icon}">
                                <span class="mdi ${icon}"></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Chore</button>
                </div>
            </form>
        `;

        this.showModal('Add Chore', content);
        this.setupIconPicker();

        const recurrenceSelect = document.getElementById('chore-recurrence');
        const recurringOptions = document.getElementById('recurring-options');
        const negativePointsGroup = document.getElementById('negative-points-group');
        const dueDateRow = document.getElementById('due-date-row');

        const updateRecurrenceUI = () => {
            const value = recurrenceSelect.value;
            const isRecurring = value !== 'none';
            const isTimeBased = ['daily', 'weekly', 'monthly'].includes(value);
            const isAlwaysOn = value === 'always_on';

            recurringOptions.style.display = isRecurring ? 'block' : 'none';
            negativePointsGroup.style.display = isTimeBased ? 'block' : 'none';
            dueDateRow.style.display = isAlwaysOn ? 'none' : 'flex';
        };

        recurrenceSelect.addEventListener('change', updateRecurrenceUI);

        document.getElementById('add-chore-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const icon = document.querySelector('.icon-picker .icon-option.selected')?.dataset.icon || 'mdi-broom';
            const recurrence = formData.get('recurrence');
            const isRecurring = recurrence !== 'none';

            try {
                await this.sendCommand('famdo/add_chore', {
                    name: formData.get('name'),
                    description: formData.get('description') || '',
                    points: parseInt(formData.get('points')) || 10,
                    recurrence: recurrence,
                    assigned_to: formData.get('assigned_to') || null,
                    due_date: formData.get('due_date') || null,
                    due_time: formData.get('due_time') || null,
                    icon: icon,
                    negative_points: isRecurring ? parseInt(formData.get('negative_points')) || 0 : 0,
                    max_instances: isRecurring ? parseInt(formData.get('max_instances')) || 3 : 1
                });
                this.closeModal();
                this.showToast('Chore added!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    showEditChoreModal(choreId) {
        const chore = this.data.chores.find(c => c.id === choreId);
        if (!chore) return;

        const icons = ['mdi-broom', 'mdi-silverware-fork-knife', 'mdi-dog-side', 'mdi-bed', 'mdi-tshirt-crew', 'mdi-trash-can', 'mdi-vacuum', 'mdi-car-wash'];
        const isRecurring = chore.is_template || chore.recurrence !== 'none';

        const content = `
            <form id="edit-chore-form">
                <div class="form-group">
                    <label class="form-label">Chore Name</label>
                    <input type="text" class="form-input" name="name" required value="${chore.name}">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" name="description">${chore.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Points</label>
                        <input type="number" class="form-input" name="points" value="${chore.points}" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-select" name="status">
                            <option value="pending" ${chore.status === 'pending' ? 'selected' : ''}>Available</option>
                            <option value="claimed" ${chore.status === 'claimed' ? 'selected' : ''}>In Progress</option>
                            <option value="awaiting_approval" ${chore.status === 'awaiting_approval' ? 'selected' : ''}>Awaiting</option>
                            <option value="completed" ${chore.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="overdue" ${chore.status === 'overdue' ? 'selected' : ''}>Overdue</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Assign To</label>
                    <select class="form-select" name="assigned_to">
                        <option value="">Anyone</option>
                        ${this.data.members.map(m => `<option value="${m.id}" ${chore.assigned_to === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" class="form-input" name="due_date" value="${chore.due_date || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Due Time</label>
                        <input type="time" class="form-input" name="due_time" value="${chore.due_time || ''}">
                    </div>
                </div>
                ${isRecurring ? `
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Overdue Penalty</label>
                            <input type="number" class="form-input" name="negative_points" value="${chore.negative_points || 0}" min="0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Max Queue</label>
                            <input type="number" class="form-input" name="max_instances" value="${chore.max_instances || 3}" min="1" max="10">
                        </div>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label class="form-label">Icon</label>
                    <div class="icon-picker">
                        ${icons.map(icon => `
                            <div class="icon-option ${icon === chore.icon ? 'selected' : ''}" data-icon="${icon}">
                                <span class="mdi ${icon}"></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        `;

        this.showModal('Edit Chore', content);
        this.setupIconPicker();

        document.getElementById('edit-chore-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const icon = document.querySelector('.icon-picker .icon-option.selected')?.dataset.icon || chore.icon;

            const updateData = {
                chore_id: choreId,
                name: formData.get('name'),
                description: formData.get('description') || '',
                points: parseInt(formData.get('points')) || 10,
                status: formData.get('status'),
                assigned_to: formData.get('assigned_to') || null,
                due_date: formData.get('due_date') || null,
                due_time: formData.get('due_time') || null,
                icon: icon
            };

            if (isRecurring) {
                updateData.negative_points = parseInt(formData.get('negative_points')) || 0;
                updateData.max_instances = parseInt(formData.get('max_instances')) || 3;
            }

            try {
                await this.sendCommand('famdo/update_chore', updateData);
                this.closeModal();
                this.showToast('Chore updated!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    showAddRewardModal() {
        const icons = ['mdi-gift', 'mdi-gamepad-variant', 'mdi-ice-cream', 'mdi-movie', 'mdi-cash', 'mdi-star', 'mdi-trophy', 'mdi-crown'];

        const content = `
            <form id="add-reward-form">
                <div class="form-group">
                    <label class="form-label">Reward Name</label>
                    <input type="text" class="form-input" name="name" required placeholder="e.g., Extra screen time">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" name="description" placeholder="What does this reward include?"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Points Cost</label>
                        <input type="number" class="form-input" name="points_cost" value="50" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity (-1 = unlimited)</label>
                        <input type="number" class="form-input" name="quantity" value="-1" min="-1">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Icon</label>
                    <div class="icon-picker">
                        ${icons.map((icon, i) => `
                            <div class="icon-option ${i === 0 ? 'selected' : ''}" data-icon="${icon}">
                                <span class="mdi ${icon}"></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Add Reward</button>
                </div>
            </form>
        `;

        this.showModal('Add Reward', content);
        this.setupIconPicker();

        document.getElementById('add-reward-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const icon = document.querySelector('.icon-picker .icon-option.selected')?.dataset.icon || 'mdi-gift';

            try {
                await this.sendCommand('famdo/add_reward', {
                    name: formData.get('name'),
                    description: formData.get('description') || '',
                    points_cost: parseInt(formData.get('points_cost')) || 50,
                    quantity: parseInt(formData.get('quantity')) || -1,
                    icon: icon
                });
                this.closeModal();
                this.showToast('Reward added!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    showEditRewardModal(rewardId) {
        const reward = this.data.rewards.find(r => r.id === rewardId);
        if (!reward) return;

        const icons = ['mdi-gift', 'mdi-gamepad-variant', 'mdi-ice-cream', 'mdi-movie', 'mdi-cash', 'mdi-star', 'mdi-trophy', 'mdi-crown'];

        const content = `
            <form id="edit-reward-form">
                <div class="form-group">
                    <label class="form-label">Reward Name</label>
                    <input type="text" class="form-input" name="name" required value="${reward.name}">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-textarea" name="description">${reward.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Points Cost</label>
                        <input type="number" class="form-input" name="points_cost" value="${reward.points_cost}" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity (-1 = unlimited)</label>
                        <input type="number" class="form-input" name="quantity" value="${reward.quantity}" min="-1">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Icon</label>
                    <div class="icon-picker">
                        ${icons.map(icon => `
                            <div class="icon-option ${icon === reward.icon ? 'selected' : ''}" data-icon="${icon}">
                                <span class="mdi ${icon}"></span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        `;

        this.showModal('Edit Reward', content);
        this.setupIconPicker();

        document.getElementById('edit-reward-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const icon = document.querySelector('.icon-picker .icon-option.selected')?.dataset.icon || reward.icon;

            try {
                await this.sendCommand('famdo/update_reward', {
                    reward_id: rewardId,
                    name: formData.get('name'),
                    description: formData.get('description') || '',
                    points_cost: parseInt(formData.get('points_cost')) || 50,
                    quantity: parseInt(formData.get('quantity')) || -1,
                    icon: icon
                });
                this.closeModal();
                this.showToast('Reward updated!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    // ==================== Utilities ====================

    setupColorPicker() {
        document.querySelector('.color-picker')?.addEventListener('click', (e) => {
            const option = e.target.closest('.color-option');
            if (!option) return;
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    }

    setupIconPicker() {
        document.querySelector('.icon-picker')?.addEventListener('click', (e) => {
            const option = e.target.closest('.icon-option');
            if (!option) return;
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    }

    formatStatus(status) {
        const labels = {
            'pending': 'Available',
            'claimed': 'In Progress',
            'awaiting_approval': 'Awaiting',
            'completed': 'Completed',
            'overdue': 'Overdue',
            'rejected': 'Rejected'
        };
        return labels[status] || status;
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatDateTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return this.formatDate(dateStr);
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="mdi mdi-${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'information'}"></span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showPointsAnimation(points) {
        const elem = document.createElement('div');
        elem.className = 'points-earned';
        elem.textContent = `+${points}`;
        elem.style.left = '50%';
        elem.style.top = '50%';
        elem.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(elem);

        setTimeout(() => elem.remove(), 1500);
    }
}

// Initialize the app
const app = new FamDoAdminApp();
