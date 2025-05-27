#!/bin/bash

# Ensure we're using Firefox configuration
echo "Setting Firefox configuration..."
chmod +x ./switch-browser.sh
./switch-browser.sh firefox

web-ext build -s ./src -a ./dist