#!/usr/bin/env bash
# Start the FamDo dev server for local development
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Install dependencies if needed
pip install -q aiohttp 2>/dev/null || pip3 install -q aiohttp 2>/dev/null || true

# Default port
PORT=8123

# Check if --port was passed; if not, auto-detect a free port
if ! echo "$@" | grep -q "\-\-port"; then
    if lsof -i :"$PORT" >/dev/null 2>&1; then
        PORT=8124
        if lsof -i :"$PORT" >/dev/null 2>&1; then
            PORT=8125
        fi
        echo "⚠️  Port 8123 in use (Home Assistant?), using port $PORT instead"
        set -- --port "$PORT" "$@"
    fi
fi

echo "Starting FamDo Dev Server..."
python devserver/server.py "$@"
