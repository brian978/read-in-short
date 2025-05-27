# ReadInShort - Browser Extension

A browser extension that summarizes articles using ChatGPT. Compatible with both Firefox and Chrome.

## Features

- Summarize any article with one click
- Works in both Firefox and Chrome browsers
- Uses OpenAI's API for high-quality summaries
- Customizable with your own API key

## Installation

### Firefox
1. Download the extension files
2. Firefox configuration is set as default, but you can ensure it with:
   - On Windows: Run `switch-browser.bat firefox` from the root directory
   - On Linux/Mac: Run `chmod +x switch-browser.sh && ./switch-browser.sh firefox` from the root directory
3. Open Firefox and navigate to `about:debugging`
4. Click "This Firefox" in the sidebar
5. Click "Load Temporary Add-on"
6. Select the src/manifest.json file from the extension directory

### Chrome
1. Download the extension files
2. Switch to Chrome configuration:
   - On Windows: Run `switch-browser.bat chrome` from the root directory
   - On Linux/Mac: Run `chmod +x switch-browser.sh && ./switch-browser.sh chrome` from the root directory
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top-right corner
5. Click "Load unpacked" and select the src directory

### Manual Configuration (Alternative)
If you prefer to manually configure the extension:
- For Firefox: Rename `src/manifest_firefox.json` to `src/manifest.json` (replace the existing file)
- For Chrome: Make sure you're using a manifest.json with `service_worker` instead of `scripts` in the src directory

## Usage

1. Set your OpenAI API key in the extension settings.
2. Navigate to an article you want to summarize.
3. Click the extension icon and then click "Summarize Article".
4. View the generated summary.

## Browser Compatibility

This extension is compatible with:
- Firefox 109.0 and later
- Chrome and Chromium-based browsers (Edge, Brave, etc.)

### Browser-Specific Manifest Files

Due to differences in how Firefox and Chrome handle background scripts in Manifest V3, this extension includes two manifest files in the src directory:

- `src/manifest.json` - Default manifest for Firefox (by default in this repository)
- `src/manifest_firefox.json` - Backup of the Firefox manifest
- `src/manifest_chrome.json` - Created when switching to Chrome configuration

The key difference is that Chrome requires background scripts to be defined using `service_worker`, while Firefox requires `scripts`. Use the provided switch-browser scripts in the root directory to easily switch between configurations.

## Development

### Switching Browser Configurations

The extension includes scripts in the root directory to easily switch between Firefox and Chrome configurations:

- `switch-browser.sh` (Linux/Mac) - Bash script to switch configurations
- `switch-browser.bat` (Windows) - Batch file to switch configurations

Usage (from the root directory):
```
# Switch to Firefox configuration
./switch-browser.sh firefox  # Linux/Mac
switch-browser.bat firefox   # Windows

# Switch to Chrome configuration
./switch-browser.sh chrome   # Linux/Mac
switch-browser.bat chrome    # Windows

# Toggle between configurations
./switch-browser.sh          # Linux/Mac
switch-browser.bat           # Windows
```

### Deployment

The extension uses GitHub Actions for automated deployment to both Firefox and Chrome stores:

1. Firefox Add-ons: Uses `web-ext sign` to sign and submit the extension to Mozilla Add-ons
2. Chrome Web Store: Uses the Chrome Web Store API to upload and publish the extension

The GitHub workflow is triggered when a new tag is pushed with the format `v*.*.*` (e.g., `v1.0.0`).

Required secrets for deployment:
- `AMO_JWT_ISSUER` - Mozilla Add-ons API key
- `AMO_JWT_SECRET` - Mozilla Add-ons API secret
- `CHROME_CLIENT_ID` - Chrome Web Store OAuth client ID
- `CHROME_CLIENT_SECRET` - Chrome Web Store OAuth client secret
- `CHROME_REFRESH_TOKEN` - Chrome Web Store OAuth refresh token
- `CHROME_EXTENSION_ID` - Chrome Web Store extension ID
- `EXT_TOKEN` - GitHub token for creating releases
