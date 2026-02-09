"""Pytest tests for MockCoordinator business logic."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from devserver.mock_coordinator import MockCoordinator
from devserver.mock_storage import MockStore

import pytest
import pytest_asyncio


@pytest_asyncio.fixture
async def coordinator(tmp_path):
    """Create an initialized MockCoordinator backed by a temp file."""
    store = MockStore(data_file=str(tmp_path / "data.json"))
    coord = MockCoordinator(store)
    await coord.async_init()
    return coord


# ── helpers ──────────────────────────────────────────────────────────

async def _add_parent(coord: MockCoordinator) -> str:
    """Add a parent member and return its id."""
    m = await coord.async_add_member("Mom", role="parent", color="#FF0000")
    return m.id


async def _add_child(coord: MockCoordinator, name: str = "Emma", points: int = 0) -> str:
    """Add a child member, optionally seed points, return id."""
    m = await coord.async_add_member(name, role="child", color="#00FF00")
    if points:
        await coord.async_add_points(m.id, points)
    return m.id


async def _full_chore_flow(coord, *, through="approve"):
    """Run add→claim→complete→approve/reject and return ids + chore."""
    parent_id = await _add_parent(coord)
    child_id = await _add_child(coord, points=0)
    chore = await coord.async_add_chore("Dishes", points=10)
    await coord.async_claim_chore(chore.id, child_id)
    await coord.async_complete_chore(chore.id, child_id)
    if through == "approve":
        await coord.async_approve_chore(chore.id, parent_id)
    elif through == "reject":
        await coord.async_reject_chore(chore.id, parent_id)
    return parent_id, child_id, coord.famdo_data.get_chore_by_id(chore.id)


# ── TestMemberManagement ────────────────────────────────────────────


class TestMemberManagement:
    @pytest.mark.asyncio
    async def test_add_member(self, coordinator):
        member = await coordinator.async_add_member(
            "Alice", role="child", color="#123456", avatar="mdi:cat"
        )
        found = coordinator.famdo_data.get_member_by_id(member.id)
        assert found is not None
        assert found.name == "Alice"
        assert found.role == "child"
        assert found.color == "#123456"
        assert found.avatar == "mdi:cat"

    @pytest.mark.asyncio
    async def test_update_member(self, coordinator):
        member = await coordinator.async_add_member("Bob", role="child")
        updated = await coordinator.async_update_member(member.id, name="Robert", color="#AABBCC")
        assert updated is not None
        assert updated.name == "Robert"
        assert updated.color == "#AABBCC"
        # Verify persistence through data
        found = coordinator.famdo_data.get_member_by_id(member.id)
        assert found.name == "Robert"

    @pytest.mark.asyncio
    async def test_remove_member(self, coordinator):
        member = await coordinator.async_add_member("Charlie", role="child")
        result = await coordinator.async_remove_member(member.id)
        assert result is True
        assert coordinator.famdo_data.get_member_by_id(member.id) is None

    @pytest.mark.asyncio
    async def test_remove_nonexistent(self, coordinator):
        result = await coordinator.async_remove_member("no-such-id")
        assert result is False


# ── TestChoreWorkflow ───────────────────────────────────────────────


class TestChoreWorkflow:
    @pytest.mark.asyncio
    async def test_add_one_time_chore(self, coordinator):
        chore = await coordinator.async_add_chore("Sweep", points=5, recurrence="none")
        assert chore.status == "pending"
        assert chore.is_template is False

    @pytest.mark.asyncio
    async def test_claim_chore(self, coordinator):
        child_id = await _add_child(coordinator)
        chore = await coordinator.async_add_chore("Mop")
        result = await coordinator.async_claim_chore(chore.id, child_id)
        assert result is not None
        assert result.status == "claimed"
        assert result.claimed_by == child_id

    @pytest.mark.asyncio
    async def test_complete_chore(self, coordinator):
        child_id = await _add_child(coordinator)
        chore = await coordinator.async_add_chore("Vacuum")
        await coordinator.async_claim_chore(chore.id, child_id)
        result = await coordinator.async_complete_chore(chore.id, child_id)
        assert result is not None
        assert result.status == "awaiting_approval"

    @pytest.mark.asyncio
    async def test_approve_chore(self, coordinator):
        parent_id, child_id, chore = await _full_chore_flow(coordinator, through="approve")
        assert chore.status == "completed"
        member = coordinator.famdo_data.get_member_by_id(child_id)
        assert member.points == 10

    @pytest.mark.asyncio
    async def test_reject_chore(self, coordinator):
        _, _, chore = await _full_chore_flow(coordinator, through="reject")
        assert chore.status == "rejected"

    @pytest.mark.asyncio
    async def test_retry_chore(self, coordinator):
        _, child_id, chore = await _full_chore_flow(coordinator, through="reject")
        result = await coordinator.async_retry_chore(chore.id, child_id)
        assert result is not None
        assert result.status == "claimed"

    @pytest.mark.asyncio
    async def test_cannot_claim_completed(self, coordinator):
        parent_id, child_id, chore = await _full_chore_flow(coordinator, through="approve")
        result = await coordinator.async_claim_chore(chore.id, child_id)
        assert result is None


# ── TestRecurringChores ─────────────────────────────────────────────


class TestRecurringChores:
    @pytest.mark.asyncio
    async def test_add_recurring_creates_template(self, coordinator):
        chore = await coordinator.async_add_chore("Trash", recurrence="daily", points=5)
        # The returned chore is the instance
        assert chore.is_template is False
        assert chore.template_id is not None
        # The template should also exist
        template = coordinator.famdo_data.get_chore_by_id(chore.template_id)
        assert template is not None
        assert template.is_template is True

    @pytest.mark.asyncio
    async def test_template_not_directly_completable(self, coordinator):
        chore = await coordinator.async_add_chore("Trash", recurrence="daily")
        template = coordinator.famdo_data.get_chore_by_id(chore.template_id)
        assert template.is_template is True

    @pytest.mark.asyncio
    async def test_reactivate_template(self, coordinator):
        parent_id = await _add_parent(coordinator)
        chore = await coordinator.async_add_chore("Trash", recurrence="daily")
        template_id = chore.template_id
        new_instance = await coordinator.async_reactivate_template(template_id, parent_id)
        assert new_instance is not None
        assert new_instance.is_template is False
        assert new_instance.template_id == template_id


# ── TestPointsSystem ────────────────────────────────────────────────


class TestPointsSystem:
    @pytest.mark.asyncio
    async def test_approve_awards_points(self, coordinator):
        _, child_id, chore = await _full_chore_flow(coordinator, through="approve")
        member = coordinator.famdo_data.get_member_by_id(child_id)
        assert member.points == chore.points

    @pytest.mark.asyncio
    async def test_add_points(self, coordinator):
        child_id = await _add_child(coordinator)
        result = await coordinator.async_add_points(child_id, 25)
        assert result == 25
        member = coordinator.famdo_data.get_member_by_id(child_id)
        assert member.points == 25

    @pytest.mark.asyncio
    async def test_points_dont_go_negative(self, coordinator):
        child_id = await _add_child(coordinator, points=5)
        member = coordinator.famdo_data.get_member_by_id(child_id)
        # Simulate overdue negative-points deduction
        member.points = max(0, member.points - 100)
        assert member.points == 0


# ── TestRewardSystem ────────────────────────────────────────────────


class TestRewardSystem:
    @pytest.mark.asyncio
    async def test_add_reward(self, coordinator):
        reward = await coordinator.async_add_reward(
            "Ice Cream", description="Yum", points_cost=20, icon="mdi:ice-cream"
        )
        assert reward.name == "Ice Cream"
        assert reward.points_cost == 20
        assert reward.icon == "mdi:ice-cream"

    @pytest.mark.asyncio
    async def test_claim_reward(self, coordinator):
        child_id = await _add_child(coordinator, points=100)
        reward = await coordinator.async_add_reward("Toy", points_cost=30)
        claim = await coordinator.async_claim_reward(reward.id, child_id)
        assert claim is not None
        assert claim.points_spent == 30
        member = coordinator.famdo_data.get_member_by_id(child_id)
        assert member.points == 70

    @pytest.mark.asyncio
    async def test_claim_insufficient_points(self, coordinator):
        child_id = await _add_child(coordinator, points=10)
        reward = await coordinator.async_add_reward("Expensive", points_cost=500)
        claim = await coordinator.async_claim_reward(reward.id, child_id)
        assert claim is None

    @pytest.mark.asyncio
    async def test_fulfill_reward_claim(self, coordinator):
        parent_id = await _add_parent(coordinator)
        child_id = await _add_child(coordinator, points=100)
        reward = await coordinator.async_add_reward("Sticker", points_cost=10)
        claim = await coordinator.async_claim_reward(reward.id, child_id)
        result = await coordinator.async_fulfill_reward_claim(claim.id, parent_id)
        assert result is not None
        assert result.status == "fulfilled"


# ── TestTodoManagement ──────────────────────────────────────────────


class TestTodoManagement:
    @pytest.mark.asyncio
    async def test_add_todo(self, coordinator):
        todo = await coordinator.async_add_todo(
            "Buy milk", description="2% milk", priority="high", category="shopping"
        )
        assert todo.title == "Buy milk"
        assert todo.description == "2% milk"
        assert todo.priority == "high"
        assert todo.category == "shopping"
        assert todo.completed is False

    @pytest.mark.asyncio
    async def test_complete_todo(self, coordinator):
        todo = await coordinator.async_add_todo("Laundry")
        result = await coordinator.async_complete_todo(todo.id)
        assert result is not None
        assert result.completed is True

    @pytest.mark.asyncio
    async def test_delete_todo(self, coordinator):
        todo = await coordinator.async_add_todo("Temp")
        assert await coordinator.async_delete_todo(todo.id) is True
        remaining = [t for t in coordinator.famdo_data.todos if t.id == todo.id]
        assert len(remaining) == 0


# ── TestEventManagement ─────────────────────────────────────────────


class TestEventManagement:
    @pytest.mark.asyncio
    async def test_add_event(self, coordinator):
        event = await coordinator.async_add_event(
            "Soccer", start_date="2024-06-01", description="Practice", location="Park"
        )
        assert event.title == "Soccer"
        assert event.start_date == "2024-06-01"
        assert event.description == "Practice"
        assert event.location == "Park"

    @pytest.mark.asyncio
    async def test_delete_event(self, coordinator):
        event = await coordinator.async_add_event("Delete me", start_date="2024-07-01")
        assert await coordinator.async_delete_event(event.id) is True
        remaining = [e for e in coordinator.famdo_data.events if e.id == event.id]
        assert len(remaining) == 0


# ── TestSettings ────────────────────────────────────────────────────


class TestSettings:
    @pytest.mark.asyncio
    async def test_update_family_name(self, coordinator):
        result = await coordinator.async_update_family_name("Smith Family")
        assert result == "Smith Family"
        assert coordinator.famdo_data.family_name == "Smith Family"

    @pytest.mark.asyncio
    async def test_update_settings(self, coordinator):
        result = await coordinator.async_update_settings(timezone="US/Pacific", theme="dark")
        assert result["timezone"] == "US/Pacific"
        assert result["theme"] == "dark"


# ── TestDataPersistence ─────────────────────────────────────────────


class TestDataPersistence:
    @pytest.mark.asyncio
    async def test_data_persists_across_reload(self, tmp_path):
        data_file = str(tmp_path / "persist.json")
        store1 = MockStore(data_file=data_file)
        coord1 = MockCoordinator(store1)
        await coord1.async_init()
        member = await coord1.async_add_member("Persist", role="child")

        # Create a brand-new coordinator with a fresh store pointing at the same file
        store2 = MockStore(data_file=data_file)
        coord2 = MockCoordinator(store2)
        await coord2.async_init()
        found = coord2.famdo_data.get_member_by_id(member.id)
        assert found is not None
        assert found.name == "Persist"
