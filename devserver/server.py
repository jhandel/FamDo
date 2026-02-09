"""FamDo Dev Server — aiohttp-based HA WebSocket protocol mock."""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

from aiohttp import web

# ---------------------------------------------------------------------------
# Bootstrap: ensure repo root is importable
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO_ROOT))

# mock_coordinator uses ``from .mock_storage import …`` (relative import).
# Make the devserver directory a package so those imports resolve when we
# run this file directly (``python devserver/server.py``).
import importlib
_devserver_pkg = importlib.import_module("devserver")
if not hasattr(_devserver_pkg, "__path__"):
    # Already a namespace package via sys.path — just ensure sub-modules load.
    pass

from devserver.mock_storage import MockStore  # noqa: E402
from devserver.mock_coordinator import MockCoordinator  # noqa: E402
from devserver.seed_data import create_seed_data  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
_LOGGER = logging.getLogger("famdo.devserver")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_ha_user_to_parent(coordinator: MockCoordinator, raw_id: str) -> str:
    """If *raw_id* starts with ``ha_user:``, resolve to first parent member."""
    if not raw_id.startswith("ha_user:"):
        return raw_id
    for member in coordinator.famdo_data.members:
        if member.role == "parent":
            return member.id
    return raw_id


def _success(msg_id: int, result: Any) -> str:
    return json.dumps({"id": msg_id, "type": "result", "success": True, "result": result})


def _error(msg_id: int, code: str, message: str) -> str:
    return json.dumps({
        "id": msg_id,
        "type": "result",
        "success": False,
        "error": {"code": code, "message": message},
    })


def _event_msg(msg_id: int, data: dict) -> str:
    return json.dumps({"id": msg_id, "type": "event", "event": {"data": data}})


# ---------------------------------------------------------------------------
# WebSocket handler
# ---------------------------------------------------------------------------

async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
    coordinator: MockCoordinator = request.app["coordinator"]
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    # Track subscriptions for this connection
    subscriptions: dict[int, Any] = {}

    # 1. Auth required
    await ws.send_str(json.dumps({"type": "auth_required", "ha_version": "2024.1.0", "famdo_dev": True}))

    try:
        async for raw in ws:
            if raw.type != web.WSMsgType.TEXT:
                continue
            try:
                msg = json.loads(raw.data)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            # ── Auth ──────────────────────────────────────────────
            if msg_type == "auth":
                await ws.send_str(json.dumps({"type": "auth_ok", "ha_version": "2024.1.0"}))
                continue

            msg_id = msg.get("id")
            if msg_id is None:
                continue

            try:
                result = await _dispatch(coordinator, msg_type, msg, ws, subscriptions, msg_id)
                if result is not None:
                    await ws.send_str(_success(msg_id, result))
            except Exception as exc:
                _LOGGER.exception("Error handling %s", msg_type)
                await ws.send_str(_error(msg_id, "error", str(exc)))
    finally:
        # Clean up subscriptions
        for unsub in subscriptions.values():
            if callable(unsub):
                unsub()
        _LOGGER.info("WebSocket client disconnected")

    return ws


async def _dispatch(
    coordinator: MockCoordinator,
    msg_type: str,
    msg: dict,
    ws: web.WebSocketResponse,
    subscriptions: dict,
    msg_id: int,
) -> Any:
    """Route a command to the coordinator and return the result payload.

    Returns ``None`` when the handler already sent its own response (e.g. subscribe).
    """

    # ── Data retrieval ────────────────────────────────────────────
    if msg_type == "famdo/get_data":
        return coordinator.famdo_data.to_dict()

    if msg_type == "famdo/subscribe":
        # Send initial data as result
        await ws.send_str(_success(msg_id, coordinator.famdo_data.to_dict()))

        # Register listener for push updates
        def _push_update() -> None:
            if not ws.closed:
                asyncio.ensure_future(
                    ws.send_str(_event_msg(msg_id, coordinator.famdo_data.to_dict()))
                )

        unsub = coordinator.async_add_listener(_push_update)
        subscriptions[msg_id] = unsub
        return None  # already sent

    if msg_type == "auth/current_user":
        return {"id": "dev-user-1", "name": "Developer", "is_owner": True, "is_admin": True}

    # ── Member management ─────────────────────────────────────────
    if msg_type == "famdo/add_member":
        member = await coordinator.async_add_member(
            name=msg["name"],
            role=msg.get("role", "child"),
            color=msg.get("color", "#4ECDC4"),
            avatar=msg.get("avatar", "mdi:account"),
        )
        return member.to_dict()

    if msg_type == "famdo/update_member":
        member_id = msg["member_id"]
        fields = {k: msg[k] for k in ("name", "role", "color", "avatar", "points", "ha_user_id") if k in msg}
        member = await coordinator.async_update_member(member_id, **fields)
        if member:
            return member.to_dict()
        raise ValueError("Member not found")

    if msg_type == "famdo/remove_member":
        success = await coordinator.async_remove_member(msg["member_id"])
        return {"success": success}

    # ── Chore management ──────────────────────────────────────────
    if msg_type == "famdo/add_chore":
        chore = await coordinator.async_add_chore(
            name=msg["name"],
            description=msg.get("description", ""),
            points=msg.get("points", 10),
            assigned_to=msg.get("assigned_to"),
            recurrence=msg.get("recurrence", "none"),
            due_date=msg.get("due_date"),
            due_time=msg.get("due_time"),
            icon=msg.get("icon", "mdi:broom"),
            negative_points=msg.get("negative_points", 0),
            max_instances=msg.get("max_instances", 3),
        )
        return chore.to_dict()

    if msg_type == "famdo/update_chore":
        chore_id = msg["chore_id"]
        skip = {"type", "id", "chore_id"}
        fields = {k: v for k, v in msg.items() if k not in skip}
        chore = await coordinator.async_update_chore(chore_id, **fields)
        if chore:
            return chore.to_dict()
        raise ValueError("Chore not found")

    if msg_type == "famdo/claim_chore":
        chore = await coordinator.async_claim_chore(msg["chore_id"], msg["member_id"])
        if chore:
            return chore.to_dict()
        raise ValueError("Could not claim chore")

    if msg_type == "famdo/complete_chore":
        chore = await coordinator.async_complete_chore(msg["chore_id"], msg["member_id"])
        if chore:
            return chore.to_dict()
        raise ValueError("Could not complete chore")

    if msg_type == "famdo/approve_chore":
        approver_id = _resolve_ha_user_to_parent(coordinator, msg["approver_id"])
        chore = await coordinator.async_approve_chore(msg["chore_id"], approver_id)
        if chore:
            return chore.to_dict()
        raise ValueError("Could not approve chore")

    if msg_type == "famdo/reject_chore":
        approver_id = _resolve_ha_user_to_parent(coordinator, msg["approver_id"])
        chore = await coordinator.async_reject_chore(msg["chore_id"], approver_id)
        if chore:
            return chore.to_dict()
        raise ValueError("Could not reject chore")

    if msg_type == "famdo/retry_chore":
        chore = await coordinator.async_retry_chore(msg["chore_id"], msg["member_id"])
        if chore:
            return chore.to_dict()
        raise ValueError("Could not retry chore")

    if msg_type == "famdo/reactivate_template":
        approver_id = _resolve_ha_user_to_parent(coordinator, msg["approver_id"])
        chore = await coordinator.async_reactivate_template(msg["template_id"], approver_id)
        if chore:
            return chore.to_dict()
        raise ValueError("Could not reactivate template")

    if msg_type == "famdo/delete_chore":
        success = await coordinator.async_delete_chore(msg["chore_id"])
        return {"success": success}

    # ── Reward management ─────────────────────────────────────────
    if msg_type == "famdo/add_reward":
        reward = await coordinator.async_add_reward(
            name=msg["name"],
            description=msg.get("description", ""),
            points_cost=msg.get("points_cost", 50),
            icon=msg.get("icon", "mdi:gift"),
            image_url=msg.get("image_url"),
            quantity=msg.get("quantity", -1),
        )
        return reward.to_dict()

    if msg_type == "famdo/update_reward":
        reward_id = msg["reward_id"]
        skip = {"type", "id", "reward_id"}
        fields = {k: v for k, v in msg.items() if k not in skip}
        reward = await coordinator.async_update_reward(reward_id, **fields)
        if reward:
            return reward.to_dict()
        raise ValueError("Reward not found")

    if msg_type == "famdo/claim_reward":
        claim = await coordinator.async_claim_reward(msg["reward_id"], msg["member_id"])
        if claim:
            return claim.to_dict()
        raise ValueError("Could not claim reward")

    if msg_type == "famdo/fulfill_reward_claim":
        fulfiller_id = _resolve_ha_user_to_parent(coordinator, msg["fulfiller_id"])
        claim = await coordinator.async_fulfill_reward_claim(msg["claim_id"], fulfiller_id)
        if claim:
            return claim.to_dict()
        raise ValueError("Could not fulfill reward claim")

    if msg_type == "famdo/delete_reward":
        success = await coordinator.async_delete_reward(msg["reward_id"])
        return {"success": success}

    # ── Todo management ───────────────────────────────────────────
    if msg_type == "famdo/add_todo":
        todo = await coordinator.async_add_todo(
            title=msg["title"],
            description=msg.get("description", ""),
            assigned_to=msg.get("assigned_to"),
            due_date=msg.get("due_date"),
            priority=msg.get("priority", "normal"),
            category=msg.get("category", "general"),
            created_by=msg.get("created_by"),
        )
        return todo.to_dict()

    if msg_type == "famdo/update_todo":
        todo_id = msg["todo_id"]
        skip = {"type", "id", "todo_id"}
        fields = {k: v for k, v in msg.items() if k not in skip}
        todo = await coordinator.async_update_todo(todo_id, **fields)
        if todo:
            return todo.to_dict()
        raise ValueError("Todo not found")

    if msg_type == "famdo/complete_todo":
        todo = await coordinator.async_complete_todo(msg["todo_id"])
        if todo:
            return todo.to_dict()
        raise ValueError("Todo not found")

    if msg_type == "famdo/delete_todo":
        success = await coordinator.async_delete_todo(msg["todo_id"])
        return {"success": success}

    # ── Event management ──────────────────────────────────────────
    if msg_type == "famdo/add_event":
        event = await coordinator.async_add_event(
            title=msg["title"],
            start_date=msg["start_date"],
            description=msg.get("description", ""),
            end_date=msg.get("end_date"),
            start_time=msg.get("start_time"),
            end_time=msg.get("end_time"),
            all_day=msg.get("all_day", True),
            member_ids=msg.get("member_ids"),
            color=msg.get("color"),
            recurrence=msg.get("recurrence", "none"),
            location=msg.get("location", ""),
        )
        return event.to_dict()

    if msg_type == "famdo/update_event":
        event_id = msg["event_id"]
        skip = {"type", "id", "event_id"}
        fields = {k: v for k, v in msg.items() if k not in skip}
        event = await coordinator.async_update_event(event_id, **fields)
        if event:
            return event.to_dict()
        raise ValueError("Event not found")

    if msg_type == "famdo/delete_event":
        success = await coordinator.async_delete_event(msg["event_id"])
        return {"success": success}

    # ── Settings ──────────────────────────────────────────────────
    if msg_type == "famdo/update_settings":
        settings = dict(msg)
        for key in ("type", "id"):
            settings.pop(key, None)
        if "family_name" in settings:
            await coordinator.async_update_family_name(settings.pop("family_name"))
        if settings:
            await coordinator.async_update_settings(**settings)
        return {"success": True}

    # ── HA calendar stubs ─────────────────────────────────────────
    if msg_type == "famdo/get_ha_calendars":
        return {"calendars": []}

    if msg_type == "famdo/get_ha_calendar_events":
        return {"events": []}

    # ── Data management (bulk) ────────────────────────────────────
    if msg_type == "famdo/update_reward_claim":
        claim_id = msg["claim_id"]
        skip = {"type", "id", "claim_id"}
        fields = {k: v for k, v in msg.items() if k not in skip}
        claim = await coordinator.async_update_reward_claim(claim_id, **fields)
        if claim:
            return claim.to_dict()
        raise ValueError("Reward claim not found")

    if msg_type == "famdo/delete_reward_claim":
        success = await coordinator.async_delete_reward_claim(msg["claim_id"])
        return {"success": success}

    if msg_type == "famdo/delete_all_chores":
        count = await coordinator.async_delete_all_chores(
            keep_templates=msg.get("keep_templates", False),
        )
        return {"success": True, "count": count}

    if msg_type == "famdo/delete_all_rewards":
        count = await coordinator.async_delete_all_rewards()
        return {"success": True, "count": count}

    if msg_type == "famdo/delete_all_reward_claims":
        count = await coordinator.async_delete_all_reward_claims()
        return {"success": True, "count": count}

    if msg_type == "famdo/delete_all_todos":
        count = await coordinator.async_delete_all_todos()
        return {"success": True, "count": count}

    if msg_type == "famdo/delete_all_events":
        count = await coordinator.async_delete_all_events()
        return {"success": True, "count": count}

    if msg_type == "famdo/delete_all_members":
        count = await coordinator.async_delete_all_members()
        return {"success": True, "count": count}

    if msg_type == "famdo/clear_all_data":
        counts = await coordinator.async_clear_all_data(
            keep_members=msg.get("keep_members", False),
        )
        return {"success": True, "counts": counts}

    raise ValueError(f"Unknown command: {msg_type}")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

async def init_app(data_file: str) -> web.Application:
    """Create and return the aiohttp application."""
    store = MockStore(data_file=data_file)
    coordinator = MockCoordinator(store)

    # Load existing data or seed
    await coordinator.async_init()
    if not coordinator.famdo_data.members:
        _LOGGER.info("No existing data found — seeding sample data")
        store._data = create_seed_data()
        await store.async_save()
        # Reload so coordinator sees it
        coordinator._data = store.data

    app = web.Application()
    app["coordinator"] = coordinator

    # Static files — serve custom_components/famdo/www/ at /famdo/
    www_dir = _REPO_ROOT / "custom_components" / "famdo" / "www"

    # Explicit index routes (add_static with show_index=False won't serve index.html)
    async def _admin_index(_req: web.Request) -> web.FileResponse:
        return web.FileResponse(www_dir / "index.html")

    async def _kiosk_index(_req: web.Request) -> web.FileResponse:
        return web.FileResponse(www_dir / "kiosk" / "index.html")

    app.router.add_get("/famdo/", _admin_index)
    app.router.add_get("/famdo/kiosk/", _kiosk_index)
    app.router.add_static("/famdo/", path=str(www_dir), show_index=False)

    # WebSocket
    app.router.add_get("/api/websocket", websocket_handler)

    return app


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="FamDo Dev Server")
    parser.add_argument("--port", type=int, default=8123, help="Port to listen on (default: 8123). Try 8124 if 8123 is in use.")
    parser.add_argument(
        "--data-file",
        type=str,
        default="devserver/data.json",
        help="Path to JSON data file (default: devserver/data.json)",
    )
    args = parser.parse_args()

    async def _run() -> None:
        app = await init_app(args.data_file)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", args.port)
        await site.start()

        print()
        print("=" * 50)
        print("  FamDo Dev Server running!")
        print(f"  Admin:     http://localhost:{args.port}/famdo/")
        print(f"  Kiosk:     http://localhost:{args.port}/famdo/kiosk/")
        print(f"  WebSocket: ws://localhost:{args.port}/api/websocket")
        print("  Press Ctrl+C to stop")
        print("=" * 50)
        print()

        # Run forever until interrupted
        try:
            await asyncio.Event().wait()
        finally:
            await runner.cleanup()

    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        print("\nShutting down…")
    except OSError as exc:
        if exc.errno == 48 or "address already in use" in str(exc).lower():
            print(f"\n❌ Port {args.port} is already in use.")
            print(f"   Try a different port: python devserver/server.py --port {args.port + 1}")
            sys.exit(1)
        raise


if __name__ == "__main__":
    main()
