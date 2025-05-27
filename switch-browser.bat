@echo off
REM Script to switch between Firefox and Chrome configurations

REM Check if manifest.json exists
if not exist manifest.json (
  echo Error: manifest.json not found.
  exit /b 1
)

REM Check if manifest_firefox.json exists
if not exist manifest_firefox.json (
  echo Error: manifest_firefox.json not found.
  exit /b 1
)

REM Check current configuration
findstr /C:"service_worker" manifest.json >nul
if %ERRORLEVEL% == 0 (
  set CURRENT_CONFIG=chrome
) else (
  set CURRENT_CONFIG=firefox
)

REM Process command line argument
if "%1" == "firefox" (
  call :switch_to_firefox
) else if "%1" == "chrome" (
  call :switch_to_chrome
) else (
  REM Toggle between configurations
  if "%CURRENT_CONFIG%" == "chrome" (
    call :switch_to_firefox
  ) else (
    call :switch_to_chrome
  )
)

REM Display current configuration
findstr /C:"service_worker" manifest.json >nul
if %ERRORLEVEL% == 0 (
  echo Current configuration: ReadInShort for Chrome
) else (
  echo Current configuration: ReadInShort for Firefox
)

exit /b 0

:switch_to_firefox
echo Switching to Firefox configuration...

REM Check if already in Firefox configuration
if "%CURRENT_CONFIG%" == "firefox" (
  echo Already in Firefox configuration.
  exit /b 0
)

REM Backup Chrome manifest if needed
if not exist manifest_chrome.json (
  echo Backing up Chrome manifest...
  copy manifest.json manifest_chrome.json >nul
)

REM Replace manifest with Firefox version
copy manifest_firefox.json manifest.json >nul
echo Switched to Firefox configuration.
exit /b 0

:switch_to_chrome
echo Switching to Chrome configuration...

REM Check if already in Chrome configuration
if "%CURRENT_CONFIG%" == "chrome" (
  echo Already in Chrome configuration.
  exit /b 0
)

REM Backup Firefox manifest if needed
fc manifest.json manifest_firefox.json >nul
if %ERRORLEVEL% NEQ 0 (
  echo Backing up Firefox manifest...
  copy manifest.json manifest_firefox.json >nul
)

REM Replace manifest with Chrome version
if exist manifest_chrome.json (
  copy manifest_chrome.json manifest.json >nul
) else (
  REM Create a default Chrome manifest if one doesn't exist
  echo Creating default Chrome manifest...
  powershell -Command "(Get-Content manifest.json) -replace '\"scripts\": \[\"browser-polyfill.js\", \"background.js\"\]', '\"service_worker\": \"background-wrapper.js\"' | Set-Content manifest.json"
)

echo Switched to Chrome configuration.
exit /b 0