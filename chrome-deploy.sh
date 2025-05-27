#!/bin/bash

# Script to package and deploy the extension to Chrome Web Store

# Environment variables required:
# CHROME_CLIENT_ID - OAuth client ID
# CHROME_CLIENT_SECRET - OAuth client secret
# CHROME_REFRESH_TOKEN - OAuth refresh token
# CHROME_EXTENSION_ID - Chrome Web Store extension ID

# Ensure we're using Chrome configuration
echo "Setting Chrome configuration..."
chmod +x ./switch-browser.sh
./switch-browser.sh chrome

# Create dist directory if it doesn't exist
mkdir -p dist

# Package the extension
echo "Packaging extension for Chrome Web Store..."
web-ext build \
  --source-dir ./ \
  --artifacts-dir ./dist \
  --overwrite-dest

# Rename the zip file
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
ZIP_FILE=$(find ./dist -name "*.zip" | head -n 1)
NEW_NAME="./dist/readinshort-chrome-v${VERSION}.zip"
mv "$ZIP_FILE" "$NEW_NAME"

echo "Packaged extension as $NEW_NAME"

# Get access token using refresh token
echo "Getting access token..."
ACCESS_TOKEN=$(curl -s -X POST \
  -d "client_id=${CHROME_CLIENT_ID}&client_secret=${CHROME_CLIENT_SECRET}&refresh_token=${CHROME_REFRESH_TOKEN}&grant_type=refresh_token" \
  "https://oauth2.googleapis.com/token" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Error: Failed to get access token."
  exit 1
fi

# Upload to Chrome Web Store
echo "Uploading to Chrome Web Store..."
UPLOAD_RESPONSE=$(curl -s -X PUT \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-api-version: 2" \
  -T "$NEW_NAME" \
  "https://www.googleapis.com/upload/chromewebstore/v1.1/items/${CHROME_EXTENSION_ID}")

echo "Upload response: $UPLOAD_RESPONSE"

# Publish to Chrome Web Store
echo "Publishing to Chrome Web Store..."
PUBLISH_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "x-goog-api-version: 2" \
  -H "Content-Length: 0" \
  "https://www.googleapis.com/chromewebstore/v1.1/items/${CHROME_EXTENSION_ID}/publish")

echo "Publish response: $PUBLISH_RESPONSE"

echo "Chrome Web Store deployment completed!"