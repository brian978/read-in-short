#!/bin/bash

if [ -f .env ]; then set -a; source .env; set +a; fi

# Ensure we're using Firefox configuration
echo "Setting Firefox configuration..."
chmod +x ./switch-browser.sh
./switch-browser.sh firefox

web-ext sign -s ./src -a ./dist --channel=unlisted --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET"