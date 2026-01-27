#!/bin/bash
# Quick deploy for frontend-only changes (no restart needed)
# Just sync and hard-refresh your browser

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"${SCRIPT_DIR}/deploy.sh" --no-restart

echo ""
echo "Frontend changes deployed! Hard-refresh your browser (Cmd+Shift+R)"
