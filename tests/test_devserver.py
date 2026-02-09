"""Integration tests for the FamDo dev server WebSocket protocol."""
from __future__ import annotations

import asyncio
import json
import os
import socket
import sys
import tempfile
from typing import Any

import aiohttp
import pytest
import pytest_asyncio

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


_cmd_id_counter = 0


def _next_id() -> int:
    global _cmd_id_counter
    _cmd_id_counter += 1
    return _cmd_id_counter


async def ws_connect(port: int) -> aiohttp.ClientWebSocketResponse:
    """Connect, authenticate, and return a ready WebSocket."""
    session = aiohttp.ClientSession()
    ws = await session.ws_connect(f"ws://localhost:{port}/api/websocket")
    # auth_required
    msg = await asyncio.wait_for(ws.receive_json(), timeout=5)
    assert msg["type"] == "auth_required"
    # send auth
    await ws.send_json({"type": "auth", "access_token": "dev-token"})
    # auth_ok
    msg = await asyncio.wait_for(ws.receive_json(), timeout=5)
    assert msg["type"] == "auth_ok"
    # stash session so we can close it later
    ws._client_session = session  # type: ignore[attr-defined]
    return ws


async def ws_close(ws: aiohttp.ClientWebSocketResponse) -> None:
    """Close a WebSocket and its underlying session."""
    await ws.close()
    session: aiohttp.ClientSession = ws._client_session  # type: ignore[attr-defined]
    await session.close()


async def send_command(
    ws: aiohttp.ClientWebSocketResponse,
    msg_type: str,
    data: dict[str, Any] | None = None,
) -> Any:
    """Send a command, wait for the matching result, and return it."""
    msg_id = _next_id()
    payload: dict[str, Any] = {"id": msg_id, "type": msg_type}
    if data:
        payload.update(data)
    await ws.send_json(payload)

    while True:
        resp = await asyncio.wait_for(ws.receive_json(), timeout=5)
        if resp.get("id") == msg_id:
            if resp.get("type") == "result":
                if resp.get("success"):
                    return resp.get("result")
                raise RuntimeError(resp.get("error", {}).get("message", "unknown error"))
            # might be event for a subscribe; keep reading
            continue


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def dev_server():
    """Start the dev server on a random port, yield the port, then tear down."""
    port = _free_port()
    data_file = os.path.join(tempfile.mkdtemp(), "famdo_test_data.json")
    # Don't create the file — MockStore seeds fresh data when file is absent

    proc = await asyncio.create_subprocess_exec(
        sys.executable, "devserver/server.py",
        "--port", str(port),
        "--data-file", data_file,
        cwd=os.path.join(os.path.dirname(__file__), ".."),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    # Wait until the server is accepting connections
    for _ in range(40):  # up to ~4 s
        await asyncio.sleep(0.1)
        try:
            async with aiohttp.ClientSession() as s:
                async with s.ws_connect(
                    f"ws://localhost:{port}/api/websocket", timeout=1
                ) as ws:
                    msg = await asyncio.wait_for(ws.receive_json(), timeout=2)
                    if msg.get("type") == "auth_required":
                        break
        except (OSError, aiohttp.ClientError, asyncio.TimeoutError):
            continue
    else:
        try:
            proc.kill()
            await proc.wait()
        except ProcessLookupError:
            pass
        out = await proc.stdout.read() if proc.stdout else b""
        err = await proc.stderr.read() if proc.stderr else b""
        raise RuntimeError(
            f"Dev server did not start in time.\nstdout: {out.decode()}\nstderr: {err.decode()}"
        )

    yield port

    try:
        proc.kill()
        await proc.wait()
    except ProcessLookupError:
        pass
    try:
        os.unlink(data_file)
    except FileNotFoundError:
        pass


# ---------------------------------------------------------------------------
# Tests — Auth flow
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
class TestAuthFlow:
    async def test_auth_required_on_connect(self, dev_server: int):
        session = aiohttp.ClientSession()
        try:
            ws = await session.ws_connect(f"ws://localhost:{dev_server}/api/websocket")
            msg = await asyncio.wait_for(ws.receive_json(), timeout=5)
            assert msg["type"] == "auth_required"
            assert "ha_version" in msg
            await ws.close()
        finally:
            await session.close()

    async def test_auth_ok_after_token(self, dev_server: int):
        session = aiohttp.ClientSession()
        try:
            ws = await session.ws_connect(f"ws://localhost:{dev_server}/api/websocket")
            await asyncio.wait_for(ws.receive_json(), timeout=5)  # auth_required
            await ws.send_json({"type": "auth", "access_token": "anything"})
            msg = await asyncio.wait_for(ws.receive_json(), timeout=5)
            assert msg["type"] == "auth_ok"
            await ws.close()
        finally:
            await session.close()

    async def test_current_user(self, dev_server: int):
        ws = await ws_connect(dev_server)
        try:
            result = await send_command(ws, "auth/current_user")
            assert result["name"] == "Developer"
            assert result["is_admin"] is True
        finally:
            await ws_close(ws)


# ---------------------------------------------------------------------------
# Tests — Data retrieval
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
class TestDataRetrieval:
    async def test_get_data_returns_seeded(self, dev_server: int):
        ws = await ws_connect(dev_server)
        try:
            result = await send_command(ws, "famdo/get_data")
            assert "members" in result
            assert isinstance(result["members"], list)
            assert len(result["members"]) > 0
        finally:
            await ws_close(ws)


# ---------------------------------------------------------------------------
# Tests — Member CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
class TestMemberCRUD:
    async def test_add_member(self, dev_server: int):
        ws = await ws_connect(dev_server)
        try:
            member = await send_command(ws, "famdo/add_member", {"name": "NewKid", "role": "child"})
            assert member["name"] == "NewKid"
            assert member["role"] == "child"
            member_id = member["id"]

            data = await send_command(ws, "famdo/get_data")
            ids = [m["id"] for m in data["members"]]
            assert member_id in ids
        finally:
            await ws_close(ws)

    async def test_update_member(self, dev_server: int):
        ws = await ws_connect(dev_server)
        try:
            member = await send_command(ws, "famdo/add_member", {"name": "OldName", "role": "child"})
            updated = await send_command(
                ws, "famdo/update_member",
                {"member_id": member["id"], "name": "NewName"},
            )
            assert updated["name"] == "NewName"
        finally:
            await ws_close(ws)

    async def test_remove_member(self, dev_server: int):
        ws = await ws_connect(dev_server)
        try:
            member = await send_command(ws, "famdo/add_member", {"name": "Temp", "role": "child"})
            result = await send_command(ws, "famdo/remove_member", {"member_id": member["id"]})
            assert result["success"] is True

            data = await send_command(ws, "famdo/get_data")
            ids = [m["id"] for m in data["members"]]
            assert member["id"] not in ids
        finally:
            await ws_close(ws)


# ---------------------------------------------------------------------------
# Tests — Chore workflow
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
class TestChoreWorkflow:
    async def test_add_and_claim_chore(self, dev_server: int):
        ws = await ws_connect(dev_server)
        try:
            # Get a member to assign to
            data = await send_command(ws, "famdo/get_data")
            member_id = data["members"][0]["id"]

            chore = await send_command(
                ws, "famdo/add_chore",
                {"name": "Test Chore", "points": 10, "assigned_to": member_id},
            )
            assert chore["name"] == "Test Chore"
            assert chore["status"] == "pending"

            claimed = await send_command(
                ws, "famdo/claim_chore",
                {"chore_id": chore["id"], "member_id": member_id},
            )
            assert claimed["status"] == "claimed"
        finally:
            await ws_close(ws)

    async def test_full_chore_flow(self, dev_server: int):
        ws = await ws_connect(dev_server)
        try:
            data = await send_command(ws, "famdo/get_data")
            # Find a parent for approval
            parents = [m for m in data["members"] if m["role"] == "parent"]
            children = [m for m in data["members"] if m["role"] == "child"]
            assert parents, "Seed data must contain at least one parent"
            assert children, "Seed data must contain at least one child"
            parent_id = parents[0]["id"]
            child_id = children[0]["id"]

            # Add
            chore = await send_command(
                ws, "famdo/add_chore",
                {"name": "Full Flow", "points": 20, "assigned_to": child_id},
            )
            assert chore["status"] == "pending"

            # Claim
            chore = await send_command(
                ws, "famdo/claim_chore",
                {"chore_id": chore["id"], "member_id": child_id},
            )
            assert chore["status"] == "claimed"

            # Complete
            chore = await send_command(
                ws, "famdo/complete_chore",
                {"chore_id": chore["id"], "member_id": child_id},
            )
            assert chore["status"] == "awaiting_approval"

            # Approve
            chore = await send_command(
                ws, "famdo/approve_chore",
                {"chore_id": chore["id"], "approver_id": parent_id},
            )
            assert chore["status"] == "completed"
        finally:
            await ws_close(ws)


# ---------------------------------------------------------------------------
# Tests — Subscription
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.integration
class TestSubscription:
    async def test_subscribe_receives_updates(self, dev_server: int):
        ws1 = await ws_connect(dev_server)
        ws2 = await ws_connect(dev_server)
        try:
            # ws1 subscribes
            sub_id = _next_id()
            await ws1.send_json({"id": sub_id, "type": "famdo/subscribe"})
            # initial result for subscribe
            initial = await asyncio.wait_for(ws1.receive_json(), timeout=5)
            assert initial["id"] == sub_id
            assert initial["type"] == "result"
            assert initial["success"] is True

            # ws2 triggers a change
            await send_command(ws2, "famdo/add_member", {"name": "Subscriber Test", "role": "child"})

            # ws1 should receive an event push
            event = await asyncio.wait_for(ws1.receive_json(), timeout=5)
            assert event["id"] == sub_id
            assert event["type"] == "event"
            assert "data" in event["event"]
            names = [m["name"] for m in event["event"]["data"]["members"]]
            assert "Subscriber Test" in names
        finally:
            await ws_close(ws1)
            await ws_close(ws2)
