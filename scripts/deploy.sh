#!/bin/bash
# FamDo Local Deployment Script
# Deploys to Home Assistant at homeassistant.local

set -e

# Configuration
HA_HOST="${HA_HOST:-homeassistant.local}"
HA_USER="${HA_USER:-root}"
HA_CONFIG_PATH="${HA_CONFIG_PATH:-/config}"
SSH_PORT="${SSH_PORT:-22}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}Deploying FamDo to ${HA_HOST}...${NC}"

# Check SSH connectivity
if ! ssh -q -o ConnectTimeout=5 -p "$SSH_PORT" "${HA_USER}@${HA_HOST}" exit 2>/dev/null; then
    echo -e "${RED}Error: Cannot connect to ${HA_HOST}${NC}"
    echo "Make sure:"
    echo "  1. The SSH add-on is installed and running"
    echo "  2. Your SSH key is configured in the add-on"
    echo "  3. homeassistant.local resolves correctly"
    exit 1
fi

# Create target directory if it doesn't exist
ssh -p "$SSH_PORT" "${HA_USER}@${HA_HOST}" "mkdir -p ${HA_CONFIG_PATH}/custom_components/famdo"

# Remove old files first (to handle deleted files)
echo -e "${GREEN}Cleaning old files...${NC}"
ssh -p "$SSH_PORT" "${HA_USER}@${HA_HOST}" "rm -rf ${HA_CONFIG_PATH}/custom_components/famdo/*"

# Copy using tar over ssh (faster than scp for many files, handles structure well)
echo -e "${GREEN}Syncing custom_components/famdo...${NC}"
tar -C "${PROJECT_ROOT}/custom_components/famdo" -cf - . | \
    ssh -p "$SSH_PORT" "${HA_USER}@${HA_HOST}" "tar -C ${HA_CONFIG_PATH}/custom_components/famdo -xf -"

echo -e "${GREEN}Deploy complete!${NC}"

# Ask about restart
if [ "$1" == "--restart" ] || [ "$1" == "-r" ]; then
    RESTART="y"
elif [ "$1" == "--no-restart" ] || [ "$1" == "-n" ]; then
    RESTART="n"
else
    echo ""
    read -p "Restart Home Assistant? (y/n) " -n 1 -r RESTART
    echo ""
fi

if [[ $RESTART =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restarting Home Assistant...${NC}"
    ssh -p "$SSH_PORT" "${HA_USER}@${HA_HOST}" "ha core restart"
    echo -e "${GREEN}Restart initiated. HA will be back in ~1-2 minutes.${NC}"
else
    echo -e "${YELLOW}Note: You may need to restart HA or reload the integration for changes to take effect.${NC}"
    echo "  - Full restart: Settings → System → Restart"
    echo "  - Quick reload (frontend only): Browser hard refresh (Cmd+Shift+R)"
fi
