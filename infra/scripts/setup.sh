#!/usr/bin/env bash
set -euo pipefail

# Setup script for local development environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

info() { echo "[INFO] $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

check_dependency() {
  command -v "$1" &>/dev/null || error "$1 is required but not installed."
}

info "Checking dependencies..."
check_dependency node
check_dependency npm
check_dependency docker
check_dependency docker-compose

NODE_VERSION=$(node --version | sed 's/v//')
MAJOR=${NODE_VERSION%%.*}
if [ "$MAJOR" -lt 20 ]; then
  error "Node.js 20+ is required. Found: $NODE_VERSION"
fi

info "Installing npm dependencies..."
cd "$ROOT_DIR"
npm install

info "Copying environment file..."
if [ ! -f "$ROOT_DIR/.env" ]; then
  if [ -f "$ROOT_DIR/.env.example" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    info "Created .env from .env.example — please update with your values."
  else
    info "No .env.example found; skipping .env creation."
  fi
else
  info ".env already exists; skipping."
fi

info "Starting Docker services..."
cd "$ROOT_DIR/infra"
docker-compose up -d postgres redis minio

info "Waiting for services to be healthy..."
sleep 5

info "Building shared packages..."
cd "$ROOT_DIR"
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/shared-utils
npm run build --workspace=packages/rule-engine
npm run build --workspace=packages/ocr-sdk

info ""
info "✅ Setup complete!"
info "   Run 'npm run dev:api' to start the API server."
info "   Run 'npm run dev:web' to start the web app."
