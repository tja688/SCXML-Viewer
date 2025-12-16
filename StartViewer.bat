@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo [SCXML Viewer] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [SCXML Viewer] npm install failed.
    exit /b 1
  )
)

echo [SCXML Viewer] Starting (this will open your browser)...
call npm run start

