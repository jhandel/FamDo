# FamDo Dev Server

A standalone development server that mimics Home Assistant's WebSocket protocol, allowing you to develop and test the FamDo frontend without running a full Home Assistant instance.

## Quick Start

```bash
# Install dependencies
pip install -r devserver/requirements.txt

# Start the dev server
python devserver/server.py

# Open in browser
open http://localhost:8123/famdo/index.html
```

## Features

- **Serves the FamDo admin console frontend** — static files from `custom_components/famdo/www/`
- **Full WebSocket API compatibility** — all 35+ commands supported
- **JSON file persistence** — data survives restarts
- **Auto-seeds with sample family data** on first run
- **No Home Assistant required**

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port PORT` | Server port | `8123` |
| `--data-file PATH` | Data file path | `devserver/data.json` |

## How It Works

The dev server mocks Home Assistant's WebSocket authentication protocol and routes all `famdo/*` commands to a standalone coordinator that uses the same business logic as the real integration. When a WebSocket client connects, the server sends the `auth_required` message, accepts any auth token, and then processes incoming commands just like HA would.

## Frontend Development Workflow

1. Edit files in `custom_components/famdo/www/`
2. Refresh the browser to see changes (no build step needed)
3. Data persists in `devserver/data.json` — delete the file to reset to sample data

## Limitations

- **No real HA authentication** — accepts any token
- **HA calendar integration** — returns empty results
- **Kiosk cards (Lovelace)** — not supported (admin console only)
