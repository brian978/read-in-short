#!/bin/bash

# Script to switch between Firefox and Chrome configurations

# Check if manifest.json exists
if [ ! -f src/manifest.json ]; then
  echo "Error: src/manifest.json not found."
  exit 1
fi

# Check if manifest_firefox.json exists
if [ ! -f src/manifest_firefox.json ]; then
  echo "Error: src/manifest_firefox.json not found."
  exit 1
fi

# Function to check if a file contains a string
contains_string() {
  grep -q "$2" "$1"
  return $?
}

# Function to switch to Firefox configuration
switch_to_firefox() {
  echo "Switching to Firefox configuration..."

  # Check if we're already in Firefox configuration
  if ! contains_string src/manifest.json "service_worker"; then
    echo "Already in Firefox configuration."
    return 0
  fi

  # Backup Chrome manifest if needed
  if [ ! -f src/manifest_chrome.json ]; then
    echo "Backing up Chrome manifest..."
    cp src/manifest.json src/manifest_chrome.json
  fi

  # Replace manifest with Firefox version
  cp src/manifest_firefox.json src/manifest.json
  echo "Switched to Firefox configuration."
}

# Function to switch to Chrome configuration
switch_to_chrome() {
  echo "Switching to Chrome configuration..."

  # Check if we're already in Chrome configuration
  if contains_string src/manifest.json "service_worker"; then
    echo "Already in Chrome configuration."
    return 0
  fi

  # Backup Firefox manifest if needed
  if [ ! -f src/manifest_firefox.json ] || [ "$(diff src/manifest.json src/manifest_firefox.json)" != "" ]; then
    echo "Backing up Firefox manifest..."
    cp src/manifest.json src/manifest_firefox.json
  fi

  # Replace manifest with Chrome version
  if [ -f src/manifest_chrome.json ]; then
    cp src/manifest_chrome.json src/manifest.json
  else
    # Create a default Chrome manifest if one doesn't exist
    echo "Creating default Chrome manifest..."
    sed 's/"scripts": \["browser-polyfill.js", "background.js"\]/"service_worker": "background-wrapper.js"/' src/manifest.json > src/manifest.json.tmp
    mv src/manifest.json.tmp src/manifest.json
  fi

  echo "Switched to Chrome configuration."
}

# Main script logic
if [ "$1" = "firefox" ]; then
  switch_to_firefox
elif [ "$1" = "chrome" ]; then
  switch_to_chrome
else
  # Default behavior: toggle between configurations
  if contains_string src/manifest.json "service_worker"; then
    switch_to_firefox
  else
    switch_to_chrome
  fi
fi

echo "Current configuration: $(grep -o '"name": "[^"]*"' src/manifest.json | cut -d'"' -f4) for $(if contains_string src/manifest.json "service_worker"; then echo "Chrome"; else echo "Firefox"; fi)"
