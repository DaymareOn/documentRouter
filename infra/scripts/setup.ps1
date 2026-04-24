# Setup script for local development environment (Windows)
# Run as: powershell -ExecutionPolicy Bypass -File infra\scripts\setup.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir   = (Resolve-Path (Join-Path $ScriptDir '..\..')).Path

function Write-Info  { param([string]$Msg) Write-Host "[INFO] $Msg" }
function Write-Err   { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red; exit 1 }

function Check-Dependency {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Err "$Name is required but not installed. Please install it and re-run this script."
    }
}

Write-Info "Checking dependencies..."
Check-Dependency node
Check-Dependency npm
Check-Dependency docker

# docker-compose may be a Docker CLI plugin ("docker compose") or a standalone binary
$DockerComposeCmd = $null
if (Get-Command 'docker-compose' -ErrorAction SilentlyContinue) {
    $DockerComposeCmd = 'docker-compose'
} else {
    & docker compose version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $DockerComposeCmd = 'docker compose'
    } else {
        Write-Err "docker-compose (or 'docker compose' plugin) is required but not found."
    }
}

Write-Info "Using compose command: $DockerComposeCmd"

$NodeVersion = (node --version).TrimStart('v')
$Major = [int]($NodeVersion -split '\.')[0]
if ($Major -lt 20) {
    Write-Err "Node.js 20+ is required. Found: $NodeVersion"
}

Write-Info "Installing npm dependencies..."
Set-Location $RootDir
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed." }

Write-Info "Copying environment file..."
$EnvFile    = Join-Path $RootDir 'apps\api\.env'
$EnvExample = Join-Path $RootDir 'apps\api\.env.example'
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Info "Created apps\api\.env from .env.example — please update with your values."
    } else {
        Write-Info "No apps\api\.env.example found; skipping .env creation."
    }
} else {
    Write-Info "apps\api\.env already exists; skipping."
}

Write-Info "Starting Docker services..."
Set-Location (Join-Path $RootDir 'infra')
if ($DockerComposeCmd -eq 'docker-compose') {
    docker-compose up -d postgres redis minio
} else {
    docker compose up -d postgres redis minio
}
if ($LASTEXITCODE -ne 0) { Write-Err "Failed to start Docker services." }

Write-Info "Waiting for services to be healthy..."
Start-Sleep -Seconds 5

Write-Info "Building shared packages..."
Set-Location $RootDir
npm run build --workspace=packages/shared-types
if ($LASTEXITCODE -ne 0) { Write-Err "Build failed for shared-types." }
npm run build --workspace=packages/shared-utils
if ($LASTEXITCODE -ne 0) { Write-Err "Build failed for shared-utils." }
npm run build --workspace=packages/rule-engine
if ($LASTEXITCODE -ne 0) { Write-Err "Build failed for rule-engine." }
npm run build --workspace=packages/ocr-sdk
if ($LASTEXITCODE -ne 0) { Write-Err "Build failed for ocr-sdk." }

Write-Host ""
Write-Info "Setup complete!"
Write-Info "   Run 'npm run dev:api' to start the API server."
Write-Info "   Run 'npm run dev:web' to start the web app."
