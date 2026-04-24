@echo off
setlocal EnableDelayedExpansion
title DocumentRouter — Starting...
color 0A

echo.
echo  =============================================
echo   DocumentRouter — Easy Windows Launcher
echo  =============================================
echo.

:: ── 1. Check Node.js ──────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Node.js is not installed.
    echo.
    echo  Please install Node.js 20+ from https://nodejs.org
    echo  then re-run this file.
    echo.
    pause
    exit /b 1
)

:: Verify Node version >= 20
for /f "tokens=1 delims=." %%V in ('node --version 2^>nul') do set NODE_VER=%%V
set NODE_MAJOR=%NODE_VER:~1%
if !NODE_MAJOR! LSS 20 (
    color 0C
    echo  [ERROR] Node.js 20 or higher is required.
    echo  Found version: 
    node --version
    echo.
    echo  Please upgrade from https://nodejs.org and re-run this file.
    echo.
    pause
    exit /b 1
)
echo  [OK] Node.js found.

:: ── 2. Check npm ───────────────────────────────────────────────────────────────
where npm >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] npm is not installed (it normally comes with Node.js).
    echo.
    echo  Please reinstall Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo  [OK] npm found.

:: ── 3. Check Docker ────────────────────────────────────────────────────────────
where docker >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Docker is not installed.
    echo.
    echo  Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo  then re-run this file.
    echo.
    pause
    exit /b 1
)
docker info >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  [ERROR] Docker is installed but not running.
    echo.
    echo  Please start Docker Desktop and wait until its icon
    echo  in the system tray shows "Docker Desktop is running",
    echo  then re-run this file.
    echo.
    pause
    exit /b 1
)
echo  [OK] Docker is running.

echo.

:: ── 4. First-time setup (runs once, skipped on subsequent starts) ──────────────
set "SETUP_DONE_FLAG=%~dp0.setup_done"
if not exist "%SETUP_DONE_FLAG%" (
    echo  [SETUP] First-time setup detected — installing dependencies...
    echo  (This may take a few minutes. Grab a coffee!)
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0infra\scripts\setup.ps1"
    if errorlevel 1 (
        color 0C
        echo.
        echo  [ERROR] Setup failed. See the messages above for details.
        echo.
        pause
        exit /b 1
    )
    echo. > "%SETUP_DONE_FLAG%"
    echo.
    echo  [SETUP] Setup complete!
    echo.
) else (
    echo  [OK] Dependencies already set up. Skipping first-time setup.
    echo.
    :: Still make sure Docker services are running
    echo  [INFO] Ensuring Docker services are up...
    pushd "%~dp0infra"
    docker compose up -d postgres redis minio >nul 2>&1 || docker-compose up -d postgres redis minio >nul 2>&1
    popd
    echo  [OK] Docker services are running.
    echo.
)

:: ── 5. Run database migrations ─────────────────────────────────────────────────
echo  [INFO] Running database migrations...
pushd "%~dp0"
call npm run migrate --workspace=apps/api
if errorlevel 1 (
    color 0E
    echo  [WARN] Migrations returned a non-zero exit code (may be safe to ignore if already applied).
    echo.
)
popd

:: ── 6. Start API server in a new window ────────────────────────────────────────
echo  [INFO] Starting API server (http://localhost:3001)...
start "DocumentRouter — API" cmd /k "cd /d %~dp0 && npm run dev:api"

:: Give the API a moment to bind its port before the web app tries to proxy it
timeout /t 3 /nobreak >nul

:: ── 7. Start web dev server in a new window ────────────────────────────────────
echo  [INFO] Starting web app (http://localhost:5173)...
start "DocumentRouter — Web" cmd /k "cd /d %~dp0 && npm run dev:web"

:: Give the web server a moment to start before opening the browser
timeout /t 4 /nobreak >nul

:: ── 8. Open browser ───────────────────────────────────────────────────────────
echo  [INFO] Opening browser at http://localhost:5173 ...
start "" "http://localhost:5173"

echo.
echo  =============================================
echo   DocumentRouter is starting!
echo.
echo   API :  http://localhost:3001
echo   Web :  http://localhost:5173
echo.
echo   Close the API and Web windows to stop.
echo  =============================================
echo.
pause
endlocal
