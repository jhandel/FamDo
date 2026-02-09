"""Tests for FamDo data models."""
import pytest

from custom_components.famdo.models import (
    FamilyMember,
    Chore,
    Reward,
    RewardClaim,
    TodoItem,
    CalendarEvent,
    FamDoData,
    generate_id,
)
from custom_components.famdo.const import (
    CHORE_STATUS_PENDING,
    RECURRENCE_NONE,
    RECURRENCE_DAILY,
    ROLE_CHILD,
    ROLE_PARENT,
)


class TestFamilyMember:
    def test_create_default(self):
        m = FamilyMember()
        assert len(m.id) == 8
        assert m.name == ""
        assert m.role == ROLE_CHILD
        assert m.color == "#4ECDC4"
        assert m.avatar == "mdi:account"
        assert m.points == 0
        assert m.created_at  # non-empty
        assert m.ha_user_id is None

    def test_to_dict_round_trip(self):
        m = FamilyMember(id="abc", name="Alice", role=ROLE_PARENT, color="#FFF",
                         avatar="mdi:face", points=42, created_at="2024-01-01T00:00:00",
                         ha_user_id="ha-123")
        restored = FamilyMember.from_dict(m.to_dict())
        assert restored.to_dict() == m.to_dict()

    def test_from_dict_legacy(self):
        data = {"id": "old1", "name": "Bob", "role": "child", "color": "#000",
                "avatar": "mdi:account", "points": 5, "created_at": "2024-01-01T00:00:00"}
        m = FamilyMember.from_dict(data)
        assert m.ha_user_id is None

    def test_custom_values(self):
        m = FamilyMember(id="x1", name="Carol", role=ROLE_PARENT, color="#ABC",
                         avatar="mdi:face-woman", points=100,
                         created_at="2024-06-01T12:00:00", ha_user_id="user-1")
        assert m.id == "x1"
        assert m.name == "Carol"
        assert m.role == ROLE_PARENT
        assert m.color == "#ABC"
        assert m.avatar == "mdi:face-woman"
        assert m.points == 100
        assert m.created_at == "2024-06-01T12:00:00"
        assert m.ha_user_id == "user-1"


class TestChore:
    def test_create_default(self):
        c = Chore()
        assert len(c.id) == 8
        assert c.name == ""
        assert c.description == ""
        assert c.points == 10
        assert c.assigned_to is None
        assert c.status == CHORE_STATUS_PENDING
        assert c.recurrence == RECURRENCE_NONE
        assert c.due_date is None
        assert c.due_time is None
        assert c.icon == "mdi:broom"
        assert c.claimed_by is None
        assert c.completed_at is None
        assert c.approved_by is None
        assert c.last_reset is None
        assert c.is_template is False
        assert c.template_id is None
        assert c.negative_points == 0
        assert c.max_instances == 1
        assert c.overdue_applied is False

    def test_to_dict_round_trip(self):
        c = Chore(id="ch1", name="Sweep", description="Sweep floor", points=5,
                  assigned_to="m1", status="claimed", recurrence="daily",
                  due_date="2024-02-01", due_time="10:00", icon="mdi:broom",
                  claimed_by="m1", completed_at="2024-02-01T11:00:00",
                  approved_by="p1", created_at="2024-01-01T00:00:00",
                  last_reset="2024-01-31T00:00:00", is_template=False,
                  template_id="tmpl1", negative_points=3, max_instances=2,
                  overdue_applied=True)
        restored = Chore.from_dict(c.to_dict())
        assert restored.to_dict() == c.to_dict()

    def test_from_dict_legacy(self):
        data = {"id": "old", "name": "Mop", "description": "", "points": 10,
                "assigned_to": None, "status": "pending", "recurrence": "none",
                "due_date": None, "due_time": None, "icon": "mdi:broom",
                "claimed_by": None, "completed_at": None, "approved_by": None,
                "created_at": "2024-01-01T00:00:00", "last_reset": None}
        c = Chore.from_dict(data)
        assert c.is_template is False
        assert c.template_id is None
        assert c.negative_points == 0
        assert c.max_instances == 1
        assert c.overdue_applied is False

    def test_recurring_chore(self):
        c = Chore(id="tmpl", name="Trash", is_template=True,
                  recurrence=RECURRENCE_DAILY, negative_points=5,
                  max_instances=3, overdue_applied=False)
        assert c.is_template is True
        assert c.recurrence == RECURRENCE_DAILY
        assert c.negative_points == 5
        assert c.max_instances == 3


class TestReward:
    def test_create_default(self):
        r = Reward()
        assert len(r.id) == 8
        assert r.name == ""
        assert r.description == ""
        assert r.points_cost == 50
        assert r.icon == "mdi:gift"
        assert r.image_url is None
        assert r.available is True
        assert r.quantity == -1

    def test_to_dict_round_trip(self):
        r = Reward(id="r1", name="Toy", description="A toy", points_cost=100,
                   icon="mdi:toy", image_url="http://img", available=False,
                   quantity=5, created_at="2024-01-01T00:00:00")
        restored = Reward.from_dict(r.to_dict())
        assert restored.to_dict() == r.to_dict()

    def test_unlimited_quantity(self):
        r = Reward(quantity=-1)
        assert r.quantity == -1
        d = r.to_dict()
        assert d["quantity"] == -1


class TestRewardClaim:
    def test_create_default(self):
        rc = RewardClaim()
        assert len(rc.id) == 8
        assert rc.reward_id == ""
        assert rc.member_id == ""
        assert rc.points_spent == 0
        assert rc.status == "pending"
        assert rc.claimed_at  # non-empty
        assert rc.fulfilled_at is None

    def test_to_dict_round_trip(self):
        rc = RewardClaim(id="rc1", reward_id="r1", member_id="m1",
                         points_spent=25, status="approved",
                         claimed_at="2024-01-01T00:00:00",
                         fulfilled_at="2024-01-02T00:00:00")
        restored = RewardClaim.from_dict(rc.to_dict())
        assert restored.to_dict() == rc.to_dict()


class TestTodoItem:
    def test_create_default(self):
        t = TodoItem()
        assert len(t.id) == 8
        assert t.title == ""
        assert t.description == ""
        assert t.completed is False
        assert t.assigned_to is None
        assert t.due_date is None
        assert t.priority == "normal"
        assert t.category == "general"
        assert t.created_by is None
        assert t.completed_at is None

    def test_to_dict_round_trip(self):
        t = TodoItem(id="t1", title="Groceries", description="Buy milk",
                     completed=True, assigned_to="m1", due_date="2024-03-01",
                     priority="high", category="shopping", created_by="p1",
                     created_at="2024-01-01T00:00:00",
                     completed_at="2024-02-28T00:00:00")
        restored = TodoItem.from_dict(t.to_dict())
        assert restored.to_dict() == t.to_dict()

    def test_with_all_fields(self):
        t = TodoItem(id="t2", title="Fix sink", description="Kitchen sink",
                     completed=False, assigned_to="p1", due_date="2024-04-01",
                     priority="low", category="maintenance", created_by="p2",
                     created_at="2024-03-01T00:00:00", completed_at=None)
        assert t.title == "Fix sink"
        assert t.priority == "low"
        assert t.category == "maintenance"


class TestCalendarEvent:
    def test_create_default(self):
        e = CalendarEvent()
        assert len(e.id) == 8
        assert e.title == ""
        assert e.description == ""
        assert e.start_date == ""
        assert e.end_date is None
        assert e.start_time is None
        assert e.end_time is None
        assert e.all_day is True
        assert e.member_ids == []
        assert e.color is None
        assert e.recurrence == RECURRENCE_NONE
        assert e.location == ""

    def test_to_dict_round_trip(self):
        e = CalendarEvent(id="ev1", title="Game", description="Soccer",
                          start_date="2024-05-01", end_date="2024-05-01",
                          start_time="10:00", end_time="12:00", all_day=False,
                          member_ids=["m1", "m2"], color="#F00",
                          recurrence="weekly", location="Field",
                          created_at="2024-01-01T00:00:00")
        restored = CalendarEvent.from_dict(e.to_dict())
        assert restored.to_dict() == e.to_dict()

    def test_with_member_ids(self):
        ids = ["a", "b", "c"]
        e = CalendarEvent(member_ids=ids)
        assert e.member_ids == ["a", "b", "c"]
        d = e.to_dict()
        assert d["member_ids"] == ["a", "b", "c"]
        restored = CalendarEvent.from_dict(d)
        assert restored.member_ids == ["a", "b", "c"]


class TestFamDoData:
    def test_empty_data(self):
        d = FamDoData()
        assert d.family_name == "My Family"
        assert d.members == []
        assert d.chores == []
        assert d.rewards == []
        assert d.reward_claims == []
        assert d.todos == []
        assert d.events == []
        assert d.settings == {}

    def test_to_dict_round_trip(self, sample_data):
        d = sample_data.to_dict()
        restored = FamDoData.from_dict(d)
        assert restored.to_dict() == d

    def test_from_dict_empty(self):
        d = FamDoData.from_dict({})
        assert d.family_name == "My Family"
        assert d.members == []
        assert d.chores == []
        assert d.rewards == []
        assert d.reward_claims == []
        assert d.todos == []
        assert d.events == []
        assert d.settings == {}

    def test_get_member_by_id(self, sample_data):
        member = sample_data.get_member_by_id("child1")
        assert member is not None
        assert member.name == "Emma"
        assert sample_data.get_member_by_id("nonexistent") is None

    def test_get_chore_by_id(self, sample_data):
        chore = sample_data.get_chore_by_id("chore1")
        assert chore is not None
        assert chore.name == "Clean Room"
        assert sample_data.get_chore_by_id("nonexistent") is None

    def test_get_reward_by_id(self, sample_data):
        reward = sample_data.get_reward_by_id("reward1")
        assert reward is not None
        assert reward.name == "Extra Screen Time"
        assert sample_data.get_reward_by_id("nonexistent") is None


class TestGenerateId:
    def test_generates_string(self):
        result = generate_id()
        assert isinstance(result, str)
        assert len(result) == 8

    def test_unique(self):
        assert generate_id() != generate_id()
