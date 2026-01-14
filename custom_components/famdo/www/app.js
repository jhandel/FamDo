/**
 * FamDo - Family Dashboard Application
 * Touch-optimized Home Assistant integration
 */

class FamDoApp {
    constructor() {
        this.data = null;
        this.selectedMember = null;
        this.currentTab = 'chores';
        this.currentMonth = new Date();
        this.connection = null;
        this.subscriptionId = null;

        this.init();
    }

    async init() {
        try {
            await this.connectToHA();
            this.setupEventListeners();
            await this.loadData();
            this.render();
        } catch (error) {
            console.error('Failed to initialize FamDo:', error);
            this.showToast('Failed to connect to Home Assistant', 'error');
        }
    }

    // ==================== Home Assistant Connection ====================

    async connectToHA() {
        return new Promise((resolve, reject) => {
            // Get auth token from HA
            const hassUrl = window.location.origin;

            // Try to get existing connection
            if (window.hassConnection) {
                this.connection = window.hassConnection;
                resolve();
                return;
            }

            // Create WebSocket connection
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
                // Attempt reconnect after delay
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
        // Try to get token from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('auth');

        if (!token) {
            // Try to get from localStorage (set by HA)
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
            // Use long-lived access token if available in HA frontend
            token = window.__tokenCache?.access_token;
        }

        // For iframe in HA, we can use the built-in auth
        if (!token && window.parent !== window) {
            // We're in an iframe, try to get auth from parent
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
        return Math.floor(Math.random() * 1000000);
    }

    async loadData() {
        try {
            this.data = await this.sendCommand('famdo/get_data');
        } catch (error) {
            console.error('Failed to load data:', error);
            // Initialize with empty data
            this.data = {
                family_name: 'My Family',
                members: [],
                chores: [],
                rewards: [],
                todos: [],
                events: []
            };
        }
    }

    // ==================== Rendering ====================

    render() {
        if (!this.data) return;

        document.getElementById('family-name').textContent = this.data.family_name || 'FamDo';
        this.renderMembers();
        this.renderChores();
        this.renderRewards();
        this.renderTodos();
        this.renderCalendar();

        // Update parent/child specific visibility
        const isParent = this.selectedMember?.role === 'parent';
        document.body.classList.toggle('is-parent', isParent);
    }

    renderMembers() {
        const container = document.getElementById('member-selector');
        let html = '';

        this.data.members.forEach(member => {
            const isSelected = this.selectedMember?.id === member.id;
            html += `
                <div class="member-card ${isSelected ? 'selected' : ''}" data-member-id="${member.id}">
                    <div class="member-avatar" style="background: ${member.color}">
                        <span class="mdi ${member.avatar}"></span>
                    </div>
                    <span class="member-name">${member.name}</span>
                    <span class="member-points">${member.points} pts</span>
                </div>
            `;
        });

        // Add member button
        html += `
            <div class="member-card add-member-card" id="add-member-card">
                <span class="mdi mdi-plus"></span>
                <span class="member-name">Add</span>
            </div>
        `;

        container.innerHTML = html;

        // Auto-select first member if none selected
        if (!this.selectedMember && this.data.members.length > 0) {
            this.selectedMember = this.data.members[0];
            this.render();
        }
    }

    renderChores() {
        const container = document.getElementById('chores-list');
        const filter = document.querySelector('.chore-filters .filter-btn.active')?.dataset.filter || 'all';

        let chores = [...this.data.chores];

        // Apply filter
        if (filter !== 'all') {
            chores = chores.filter(c => c.status === filter);
        }

        // Filter by assignment if not a parent
        if (this.selectedMember?.role !== 'parent') {
            chores = chores.filter(c =>
                !c.assigned_to || c.assigned_to === this.selectedMember?.id
            );
        }

        if (chores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="mdi mdi-broom"></span>
                    <h3>No chores</h3>
                    <p>All caught up! Add some chores to get started.</p>
                </div>
            `;
            return;
        }

        let html = '';
        chores.forEach(chore => {
            const assignedMember = this.data.members.find(m => m.id === chore.assigned_to);
            const claimedMember = this.data.members.find(m => m.id === chore.claimed_by);

            html += `
                <div class="chore-card" data-chore-id="${chore.id}">
                    <div class="chore-header">
                        <div class="chore-icon" style="background: ${assignedMember?.color || '#4ECDC4'}">
                            <span class="mdi ${chore.icon}"></span>
                        </div>
                        <div class="chore-info">
                            <div class="chore-name">${chore.name}</div>
                            ${chore.description ? `<div class="chore-description">${chore.description}</div>` : ''}
                        </div>
                    </div>
                    <div class="chore-meta">
                        <div class="chore-points">
                            <span class="mdi mdi-star"></span>
                            ${chore.points} pts
                        </div>
                        <span class="chore-status ${chore.status}">${this.formatStatus(chore.status)}</span>
                    </div>
                    ${chore.due_date ? `
                        <div class="chore-due">
                            <span class="mdi mdi-clock-outline"></span>
                            Due: ${this.formatDate(chore.due_date)}${chore.due_time ? ` at ${chore.due_time}` : ''}
                        </div>
                    ` : ''}
                    ${assignedMember ? `
                        <div class="assigned-member">
                            <span class="member-dot" style="background: ${assignedMember.color}"></span>
                            ${assignedMember.name}
                        </div>
                    ` : ''}
                    ${this.renderChoreActions(chore, claimedMember)}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderChoreActions(chore, claimedMember) {
        const isParent = this.selectedMember?.role === 'parent';
        const isMine = chore.claimed_by === this.selectedMember?.id;
        const canClaim = !chore.assigned_to || chore.assigned_to === this.selectedMember?.id;

        let actions = '';

        switch (chore.status) {
            case 'pending':
            case 'overdue':
                if (canClaim) {
                    actions = `
                        <div class="chore-actions">
                            <button class="chore-action-btn primary" data-action="claim">
                                <span class="mdi mdi-hand-back-right"></span> Claim
                            </button>
                        </div>
                    `;
                }
                break;

            case 'claimed':
                if (isMine) {
                    actions = `
                        <div class="chore-actions">
                            <button class="chore-action-btn success" data-action="complete">
                                <span class="mdi mdi-check"></span> Mark Done
                            </button>
                        </div>
                    `;
                } else if (claimedMember) {
                    actions = `<div class="assigned-member">In progress: ${claimedMember.name}</div>`;
                }
                break;

            case 'awaiting_approval':
                if (isParent) {
                    actions = `
                        <div class="chore-actions">
                            <button class="chore-action-btn success" data-action="approve">
                                <span class="mdi mdi-check"></span> Approve
                            </button>
                            <button class="chore-action-btn danger" data-action="reject">
                                <span class="mdi mdi-close"></span> Reject
                            </button>
                        </div>
                    `;
                } else {
                    actions = `<div class="assigned-member">Waiting for approval...</div>`;
                }
                break;

            case 'completed':
                actions = `
                    <div class="assigned-member">
                        <span class="mdi mdi-check-circle" style="color: var(--success)"></span>
                        Completed${claimedMember ? ` by ${claimedMember.name}` : ''}
                    </div>
                `;
                break;

            case 'rejected':
                if (isMine) {
                    actions = `
                        <div class="chore-actions">
                            <button class="chore-action-btn primary" data-action="claim">
                                <span class="mdi mdi-refresh"></span> Try Again
                            </button>
                        </div>
                    `;
                }
                break;
        }

        return actions;
    }

    renderRewards() {
        const container = document.getElementById('rewards-list');

        if (this.data.rewards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="mdi mdi-gift"></span>
                    <h3>No rewards</h3>
                    <p>Add some rewards to motivate the family!</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.rewards.forEach(reward => {
            const canAfford = this.selectedMember && this.selectedMember.points >= reward.points_cost;

            html += `
                <div class="reward-card" data-reward-id="${reward.id}">
                    <div class="reward-icon">
                        <span class="mdi ${reward.icon}"></span>
                    </div>
                    <div class="reward-name">${reward.name}</div>
                    ${reward.description ? `<div class="reward-description">${reward.description}</div>` : ''}
                    <div class="reward-cost">
                        <span class="mdi mdi-star"></span>
                        ${reward.points_cost}
                    </div>
                    <button class="reward-claim-btn" data-action="claim" ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'Claim Reward' : `Need ${reward.points_cost - (this.selectedMember?.points || 0)} more`}
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderTodos() {
        const container = document.getElementById('todos-list');
        const filter = document.querySelector('.todo-filters .filter-btn.active')?.dataset.filter || 'active';

        let todos = [...this.data.todos];

        // Apply filter
        switch (filter) {
            case 'active':
                todos = todos.filter(t => !t.completed);
                break;
            case 'completed':
                todos = todos.filter(t => t.completed);
                break;
        }

        // Filter by assignment
        if (this.selectedMember) {
            todos = todos.filter(t =>
                !t.assigned_to || t.assigned_to === this.selectedMember.id
            );
        }

        if (todos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="mdi mdi-format-list-checks"></span>
                    <h3>No todos</h3>
                    <p>Add items to your family's todo list.</p>
                </div>
            `;
            return;
        }

        let html = '';
        todos.forEach(todo => {
            const assignedMember = this.data.members.find(m => m.id === todo.assigned_to);

            html += `
                <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
                    <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-action="toggle">
                        ${todo.completed ? '<span class="mdi mdi-check"></span>' : ''}
                    </div>
                    <div class="todo-content">
                        <div class="todo-title">${todo.title}</div>
                        <div class="todo-meta">
                            ${todo.due_date ? `<span><span class="mdi mdi-calendar"></span> ${this.formatDate(todo.due_date)}</span>` : ''}
                            ${assignedMember ? `<span><span class="mdi mdi-account"></span> ${assignedMember.name}</span>` : ''}
                            <span class="todo-priority ${todo.priority}">${todo.priority}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthLabel = document.getElementById('current-month');

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        monthLabel.textContent = new Date(year, month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });

        // Get first day of month and total days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        // Get events for this month
        const monthEvents = this.data.events.filter(e => {
            const eventDate = new Date(e.start_date);
            return eventDate.getMonth() === month && eventDate.getFullYear() === year;
        });

        // Get chores with due dates this month
        const monthChores = this.data.chores.filter(c => {
            if (!c.due_date) return false;
            const choreDate = new Date(c.due_date);
            return choreDate.getMonth() === month && choreDate.getFullYear() === year;
        });

        let html = '';

        // Day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Previous month days
        const prevMonth = new Date(year, month, 0);
        for (let i = startDay - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }

        // Current month days
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const dayEvents = monthEvents.filter(e => e.start_date === dateStr);
            const dayChores = monthChores.filter(c => c.due_date === dateStr);

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <span class="calendar-day-number">${day}</span>
                    <div class="calendar-day-events">
                        ${dayEvents.map(e => {
                            const member = this.data.members.find(m => e.member_ids?.includes(m.id));
                            return `<div class="calendar-event-dot" style="background: ${e.color || member?.color || '#4ECDC4'}"></div>`;
                        }).join('')}
                        ${dayChores.map(c => {
                            const member = this.data.members.find(m => m.id === c.assigned_to);
                            return `<div class="calendar-event-dot" style="background: ${member?.color || '#FF6B6B'}"></div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Next month days
        const remainingDays = 42 - (startDay + totalDays);
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }

        grid.innerHTML = html;

        // Render upcoming events list
        this.renderUpcomingEvents();
    }

    renderUpcomingEvents() {
        const container = document.getElementById('events-list');
        const today = new Date().toISOString().split('T')[0];

        const upcoming = this.data.events
            .filter(e => e.start_date >= today)
            .sort((a, b) => a.start_date.localeCompare(b.start_date))
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No upcoming events</p></div>`;
            return;
        }

        let html = '';
        upcoming.forEach(event => {
            html += `
                <div class="event-item" data-event-id="${event.id}" style="border-color: ${event.color || '#4ECDC4'}">
                    <div class="event-time">
                        ${this.formatDate(event.start_date)}
                        ${event.start_time ? `<br>${event.start_time}` : ''}
                    </div>
                    <div class="event-details">
                        <div class="event-title">${event.title}</div>
                        ${event.location ? `<div class="event-location"><span class="mdi mdi-map-marker"></span> ${event.location}</div>` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ==================== Event Listeners ====================

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Member selection
        document.getElementById('member-selector').addEventListener('click', (e) => {
            const memberCard = e.target.closest('.member-card');
            if (!memberCard) return;

            if (memberCard.id === 'add-member-card') {
                this.showAddMemberModal();
            } else {
                const memberId = memberCard.dataset.memberId;
                this.selectedMember = this.data.members.find(m => m.id === memberId);
                this.render();
            }
        });

        // Chore filters
        document.querySelector('.chore-filters')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;
            document.querySelectorAll('.chore-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.renderChores();
        });

        // Todo filters
        document.querySelector('.todo-filters')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;
            document.querySelectorAll('.todo-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.renderTodos();
        });

        // Chore actions
        document.getElementById('chores-list').addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            const choreCard = e.target.closest('.chore-card');
            if (!choreCard) return;

            const choreId = choreCard.dataset.choreId;

            if (actionBtn) {
                const action = actionBtn.dataset.action;
                this.handleChoreAction(choreId, action);
            } else {
                // Show chore details modal
                this.showChoreDetailsModal(choreId);
            }
        });

        // Reward actions
        document.getElementById('rewards-list').addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            const rewardCard = e.target.closest('.reward-card');
            if (!rewardCard) return;

            const rewardId = rewardCard.dataset.rewardId;

            if (actionBtn && actionBtn.dataset.action === 'claim') {
                this.claimReward(rewardId);
            } else if (!actionBtn) {
                this.showRewardDetailsModal(rewardId);
            }
        });

        // Todo actions
        document.getElementById('todos-list').addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (!todoItem) return;

            const todoId = todoItem.dataset.todoId;
            const checkbox = e.target.closest('.todo-checkbox');

            if (checkbox) {
                this.toggleTodo(todoId);
            } else {
                this.showTodoDetailsModal(todoId);
            }
        });

        // Add buttons
        document.getElementById('add-chore-btn').addEventListener('click', () => this.showAddChoreModal());
        document.getElementById('add-reward-btn').addEventListener('click', () => this.showAddRewardModal());
        document.getElementById('add-todo-btn').addEventListener('click', () => this.showAddTodoModal());
        document.getElementById('add-event-btn').addEventListener('click', () => this.showAddEventModal());

        // Calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });

        // Calendar day click
        document.getElementById('calendar-grid').addEventListener('click', (e) => {
            const dayCell = e.target.closest('.calendar-day:not(.other-month)');
            if (dayCell && dayCell.dataset.date) {
                this.showDayEventsModal(dayCell.dataset.date);
            }
        });

        // Modal close
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettingsModal());
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-tab`);
        });
    }

    // ==================== Actions ====================

    async handleChoreAction(choreId, action) {
        if (!this.selectedMember) {
            this.showToast('Please select a family member first', 'error');
            return;
        }

        try {
            switch (action) {
                case 'claim':
                    await this.sendCommand('famdo/claim_chore', {
                        chore_id: choreId,
                        member_id: this.selectedMember.id
                    });
                    this.showToast('Chore claimed!', 'success');
                    break;

                case 'complete':
                    await this.sendCommand('famdo/complete_chore', {
                        chore_id: choreId,
                        member_id: this.selectedMember.id
                    });
                    this.showToast('Chore submitted for approval!', 'success');
                    break;

                case 'approve':
                    const chore = this.data.chores.find(c => c.id === choreId);
                    await this.sendCommand('famdo/approve_chore', {
                        chore_id: choreId,
                        approver_id: this.selectedMember.id
                    });
                    this.showPointsAnimation(chore?.points || 0);
                    this.showToast(`Chore approved! ${chore?.points || 0} points awarded!`, 'success');
                    break;

                case 'reject':
                    await this.sendCommand('famdo/reject_chore', {
                        chore_id: choreId,
                        approver_id: this.selectedMember.id
                    });
                    this.showToast('Chore rejected', 'info');
                    break;
            }
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async claimReward(rewardId) {
        if (!this.selectedMember) {
            this.showToast('Please select a family member first', 'error');
            return;
        }

        const reward = this.data.rewards.find(r => r.id === rewardId);
        if (!reward) return;

        if (this.selectedMember.points < reward.points_cost) {
            this.showToast('Not enough points!', 'error');
            return;
        }

        try {
            await this.sendCommand('famdo/claim_reward', {
                reward_id: rewardId,
                member_id: this.selectedMember.id
            });
            this.showToast(`Reward claimed: ${reward.name}!`, 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async toggleTodo(todoId) {
        const todo = this.data.todos.find(t => t.id === todoId);
        if (!todo) return;

        try {
            if (todo.completed) {
                await this.sendCommand('famdo/update_todo', {
                    todo_id: todoId,
                    completed: false
                });
            } else {
                await this.sendCommand('famdo/complete_todo', {
                    todo_id: todoId
                });
            }
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
                    <button type="button" class="form-btn secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="form-btn">Add Member</button>
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

    showAddChoreModal() {
        const icons = ['mdi-broom', 'mdi-silverware-fork-knife', 'mdi-dog-side', 'mdi-bed', 'mdi-tshirt-crew', 'mdi-trash-can', 'mdi-vacuum', 'mdi-car-wash'];

        const content = `
            <form id="add-chore-form">
                <div class="form-group">
                    <label class="form-label">Chore Name</label>
                    <input type="text" class="form-input" name="name" required placeholder="e.g., Make bed">
                </div>
                <div class="form-group">
                    <label class="form-label">Description (optional)</label>
                    <textarea class="form-textarea" name="description" placeholder="Additional details..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Points</label>
                        <input type="number" class="form-input" name="points" value="10" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Recurrence</label>
                        <select class="form-select" name="recurrence">
                            <option value="none">One time</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Assign To (optional)</label>
                    <select class="form-select" name="assigned_to">
                        <option value="">Anyone</option>
                        ${this.data.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Due Date (optional)</label>
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
                    <button type="button" class="form-btn secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="form-btn">Add Chore</button>
                </div>
            </form>
        `;

        this.showModal('Add Chore', content);
        this.setupIconPicker();

        document.getElementById('add-chore-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const icon = document.querySelector('.icon-picker .icon-option.selected')?.dataset.icon || 'mdi-broom';

            try {
                await this.sendCommand('famdo/add_chore', {
                    name: formData.get('name'),
                    description: formData.get('description') || '',
                    points: parseInt(formData.get('points')) || 10,
                    recurrence: formData.get('recurrence'),
                    assigned_to: formData.get('assigned_to') || null,
                    due_date: formData.get('due_date') || null,
                    due_time: formData.get('due_time') || null,
                    icon: icon
                });
                this.closeModal();
                this.showToast('Chore added!', 'success');
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
                    <label class="form-label">Description (optional)</label>
                    <textarea class="form-textarea" name="description" placeholder="What does this reward include?"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Points Cost</label>
                        <input type="number" class="form-input" name="points_cost" value="50" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-input" name="quantity" value="-1" min="-1" placeholder="-1 for unlimited">
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
                    <button type="button" class="form-btn secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="form-btn">Add Reward</button>
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

    showAddTodoModal() {
        const content = `
            <form id="add-todo-form">
                <div class="form-group">
                    <label class="form-label">Title</label>
                    <input type="text" class="form-input" name="title" required placeholder="What needs to be done?">
                </div>
                <div class="form-group">
                    <label class="form-label">Description (optional)</label>
                    <textarea class="form-textarea" name="description" placeholder="Additional details..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select class="form-select" name="priority">
                            <option value="low">Low</option>
                            <option value="normal" selected>Normal</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" class="form-input" name="due_date">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Assign To (optional)</label>
                    <select class="form-select" name="assigned_to">
                        <option value="">Unassigned</option>
                        ${this.data.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="form-btn secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="form-btn">Add Todo</button>
                </div>
            </form>
        `;

        this.showModal('Add Todo', content);

        document.getElementById('add-todo-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                await this.sendCommand('famdo/add_todo', {
                    title: formData.get('title'),
                    description: formData.get('description') || '',
                    priority: formData.get('priority'),
                    due_date: formData.get('due_date') || null,
                    assigned_to: formData.get('assigned_to') || null,
                    created_by: this.selectedMember?.id || null
                });
                this.closeModal();
                this.showToast('Todo added!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    showAddEventModal(presetDate = null) {
        const content = `
            <form id="add-event-form">
                <div class="form-group">
                    <label class="form-label">Event Title</label>
                    <input type="text" class="form-input" name="title" required placeholder="e.g., Doctor's appointment">
                </div>
                <div class="form-group">
                    <label class="form-label">Description (optional)</label>
                    <textarea class="form-textarea" name="description" placeholder="Additional details..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Start Date</label>
                        <input type="date" class="form-input" name="start_date" required value="${presetDate || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Date (optional)</label>
                        <input type="date" class="form-input" name="end_date">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" name="all_day" checked> All day event
                    </label>
                </div>
                <div class="form-row time-row" style="display: none;">
                    <div class="form-group">
                        <label class="form-label">Start Time</label>
                        <input type="time" class="form-input" name="start_time">
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Time</label>
                        <input type="time" class="form-input" name="end_time">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Location (optional)</label>
                    <input type="text" class="form-input" name="location" placeholder="Where is this event?">
                </div>
                <div class="form-group">
                    <label class="form-label">Family Members</label>
                    <div class="member-checkboxes">
                        ${this.data.members.map(m => `
                            <label style="display: flex; align-items: center; gap: 8px; margin: 8px 0;">
                                <input type="checkbox" name="member_ids" value="${m.id}">
                                <span class="member-dot" style="width: 16px; height: 16px; border-radius: 50%; background: ${m.color}"></span>
                                ${m.name}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Recurrence</label>
                    <select class="form-select" name="recurrence">
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="form-btn secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="form-btn">Add Event</button>
                </div>
            </form>
        `;

        this.showModal('Add Event', content);

        // Toggle time inputs based on all-day checkbox
        const allDayCheckbox = document.querySelector('input[name="all_day"]');
        const timeRow = document.querySelector('.time-row');
        allDayCheckbox.addEventListener('change', () => {
            timeRow.style.display = allDayCheckbox.checked ? 'none' : 'flex';
        });

        document.getElementById('add-event-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const memberIds = formData.getAll('member_ids');

            try {
                await this.sendCommand('famdo/add_event', {
                    title: formData.get('title'),
                    description: formData.get('description') || '',
                    start_date: formData.get('start_date'),
                    end_date: formData.get('end_date') || null,
                    all_day: formData.has('all_day'),
                    start_time: formData.get('start_time') || null,
                    end_time: formData.get('end_time') || null,
                    location: formData.get('location') || '',
                    member_ids: memberIds,
                    recurrence: formData.get('recurrence')
                });
                this.closeModal();
                this.showToast('Event added!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    showChoreDetailsModal(choreId) {
        const chore = this.data.chores.find(c => c.id === choreId);
        if (!chore) return;

        const assignedMember = this.data.members.find(m => m.id === chore.assigned_to);
        const isParent = this.selectedMember?.role === 'parent';

        const content = `
            <div class="chore-details">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div class="chore-icon" style="background: ${assignedMember?.color || '#4ECDC4'}">
                        <span class="mdi ${chore.icon}"></span>
                    </div>
                    <div>
                        <h3>${chore.name}</h3>
                        <span class="chore-status ${chore.status}">${this.formatStatus(chore.status)}</span>
                    </div>
                </div>
                ${chore.description ? `<p style="margin-bottom: 16px;">${chore.description}</p>` : ''}
                <div style="display: flex; gap: 24px; margin-bottom: 16px;">
                    <div>
                        <strong>Points:</strong> ${chore.points}
                    </div>
                    <div>
                        <strong>Recurrence:</strong> ${chore.recurrence || 'None'}
                    </div>
                </div>
                ${chore.due_date ? `
                    <div style="margin-bottom: 16px;">
                        <strong>Due:</strong> ${this.formatDate(chore.due_date)}${chore.due_time ? ` at ${chore.due_time}` : ''}
                    </div>
                ` : ''}
                ${assignedMember ? `
                    <div style="margin-bottom: 16px;">
                        <strong>Assigned to:</strong> ${assignedMember.name}
                    </div>
                ` : ''}
                ${isParent ? `
                    <div class="form-actions">
                        <button type="button" class="form-btn danger" onclick="app.deleteChore('${choreId}')">Delete Chore</button>
                    </div>
                ` : ''}
            </div>
        `;

        this.showModal('Chore Details', content);
    }

    showRewardDetailsModal(rewardId) {
        const reward = this.data.rewards.find(r => r.id === rewardId);
        if (!reward) return;

        const isParent = this.selectedMember?.role === 'parent';

        const content = `
            <div class="reward-details" style="text-align: center;">
                <div class="reward-icon" style="margin: 0 auto 16px;">
                    <span class="mdi ${reward.icon}"></span>
                </div>
                <h3>${reward.name}</h3>
                ${reward.description ? `<p style="margin: 16px 0; color: var(--text-secondary);">${reward.description}</p>` : ''}
                <div class="reward-cost" style="margin: 16px 0;">
                    <span class="mdi mdi-star"></span>
                    ${reward.points_cost} points
                </div>
                ${reward.quantity >= 0 ? `<p>Available: ${reward.quantity}</p>` : ''}
                ${isParent ? `
                    <div class="form-actions">
                        <button type="button" class="form-btn danger" onclick="app.deleteReward('${rewardId}')">Delete Reward</button>
                    </div>
                ` : ''}
            </div>
        `;

        this.showModal('Reward Details', content);
    }

    showTodoDetailsModal(todoId) {
        const todo = this.data.todos.find(t => t.id === todoId);
        if (!todo) return;

        const assignedMember = this.data.members.find(m => m.id === todo.assigned_to);

        const content = `
            <div class="todo-details">
                <h3>${todo.title}</h3>
                <span class="todo-priority ${todo.priority}">${todo.priority}</span>
                ${todo.description ? `<p style="margin: 16px 0;">${todo.description}</p>` : ''}
                ${todo.due_date ? `
                    <div style="margin-bottom: 16px;">
                        <strong>Due:</strong> ${this.formatDate(todo.due_date)}
                    </div>
                ` : ''}
                ${assignedMember ? `
                    <div style="margin-bottom: 16px;">
                        <strong>Assigned to:</strong> ${assignedMember.name}
                    </div>
                ` : ''}
                <div class="form-actions">
                    <button type="button" class="form-btn danger" onclick="app.deleteTodo('${todoId}')">Delete</button>
                </div>
            </div>
        `;

        this.showModal('Todo Details', content);
    }

    showDayEventsModal(dateStr) {
        const dayEvents = this.data.events.filter(e => e.start_date === dateStr);
        const dayChores = this.data.chores.filter(c => c.due_date === dateStr);

        const content = `
            <div class="day-events">
                <h3 style="margin-bottom: 16px;">${this.formatDate(dateStr)}</h3>
                ${dayEvents.length > 0 ? `
                    <h4 style="margin-bottom: 8px;">Events</h4>
                    ${dayEvents.map(e => `
                        <div class="event-item" style="border-color: ${e.color || '#4ECDC4'}">
                            <div class="event-details">
                                <div class="event-title">${e.title}</div>
                                ${e.location ? `<div class="event-location"><span class="mdi mdi-map-marker"></span> ${e.location}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                ` : ''}
                ${dayChores.length > 0 ? `
                    <h4 style="margin: 16px 0 8px;">Chores Due</h4>
                    ${dayChores.map(c => {
                        const member = this.data.members.find(m => m.id === c.assigned_to);
                        return `
                            <div class="event-item" style="border-color: ${member?.color || '#FF6B6B'}">
                                <div class="event-details">
                                    <div class="event-title">${c.name}</div>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                        ${c.points} pts ${member ? `- ${member.name}` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                ` : ''}
                ${dayEvents.length === 0 && dayChores.length === 0 ? `
                    <p style="color: var(--text-secondary);">No events or chores for this day.</p>
                ` : ''}
                <div class="form-actions">
                    <button type="button" class="form-btn" onclick="app.showAddEventModal('${dateStr}')">Add Event</button>
                </div>
            </div>
        `;

        this.showModal('Day Details', content);
    }

    showSettingsModal() {
        const content = `
            <form id="settings-form">
                <div class="form-group">
                    <label class="form-label">Family Name</label>
                    <input type="text" class="form-input" name="family_name" value="${this.data.family_name || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="form-btn secondary" onclick="app.closeModal()">Cancel</button>
                    <button type="submit" class="form-btn">Save</button>
                </div>
            </form>
        `;

        this.showModal('Settings', content);

        document.getElementById('settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                await this.sendCommand('famdo/update_settings', {
                    family_name: formData.get('family_name')
                });
                this.closeModal();
                this.showToast('Settings saved!', 'success');
            } catch (error) {
                this.showToast(`Failed: ${error.message}`, 'error');
            }
        });
    }

    // ==================== Delete Actions ====================

    async deleteChore(choreId) {
        if (!confirm('Are you sure you want to delete this chore?')) return;

        try {
            await this.sendCommand('famdo/delete_chore', { chore_id: choreId });
            this.closeModal();
            this.showToast('Chore deleted', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async deleteReward(rewardId) {
        if (!confirm('Are you sure you want to delete this reward?')) return;

        try {
            await this.sendCommand('famdo/delete_reward', { reward_id: rewardId });
            this.closeModal();
            this.showToast('Reward deleted', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
    }

    async deleteTodo(todoId) {
        if (!confirm('Are you sure you want to delete this todo?')) return;

        try {
            await this.sendCommand('famdo/delete_todo', { todo_id: todoId });
            this.closeModal();
            this.showToast('Todo deleted', 'success');
        } catch (error) {
            this.showToast(`Failed: ${error.message}`, 'error');
        }
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
            'awaiting_approval': 'Awaiting Approval',
            'completed': 'Completed',
            'overdue': 'Overdue',
            'rejected': 'Rejected'
        };
        return labels[status] || status;
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
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
const app = new FamDoApp();
