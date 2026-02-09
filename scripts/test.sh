#!/usr/bin/env bash
# Run FamDo tests
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Install test dependencies if needed
pip install -q pytest pytest-asyncio aiohttp 2>/dev/null || pip3 install -q pytest pytest-asyncio aiohttp 2>/dev/null

# Run tests
# Usage: ./scripts/test.sh [pytest args]
# Examples:
#   ./scripts/test.sh                    # Run all tests
#   ./scripts/test.sh -v                 # Verbose output
#   ./scripts/test.sh tests/test_models.py  # Run specific test file
#   ./scripts/test.sh -k "test_add"      # Run tests matching pattern

python -m pytest tests/ "$@"
