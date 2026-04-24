# vibeCodedDocumentRouter

An intelligent document routing system that automatically redirects scans, emails, and files to appropriate recipients using OCR and configurable rule-based automation.

## Features

- **Document Ingestion** — Upload documents via web UI, mobile app, email (IMAP), or API
- **OCR Processing** — On-device Tesseract or cloud providers (Google Vision / AWS Textract)
- **Rule Engine** — IF/THEN routing rules based on OCR text, metadata, sender, amount, and more
- **Multi-Tenancy** — Full tenant isolation with RBAC/ABAC authorization
- **End-to-End Encryption** — TweetNaCl.js (client) + libsodium (server) for sensitive documents
- **Two-Factor Auth** — TOTP (time-based one-time password) via `otpauth`
- **Audit Logging** — Comprehensive audit trail for all document operations
- **i18n** — English and French out of the box (i18next)
- **Multi-Device** — Responsive web app + React Native mobile app

## Architecture

```
vibeCodedDocumentRouter/
├── apps/
│   ├── api/          # Backend (Express + TypeScript + PostgreSQL)
│   ├── web/          # Web frontend (React + TypeScript + Vite)
│   └── mobile/       # Mobile app (React Native + Expo)
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   ├── shared-utils/ # Crypto, validation, logging
│   ├── ocr-sdk/      # Multi-provider OCR abstraction
│   └── rule-engine/  # Rule evaluation engine
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── kubernetes/
│   └── scripts/
├── e2e/              # Playwright end-to-end tests
└── docs/
    └── architecture.md
```

See [docs/architecture.md](docs/architecture.md) for a detailed system design diagram.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Zustand, react-router-dom, i18next |
| Mobile | React Native 0.74, Expo ~53, React Navigation v6 |
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, Bull |
| Storage | MinIO (local) / AWS S3 (cloud) |
| OCR | Tesseract.js, Google Vision, AWS Textract |
| Auth | JWT (access + refresh tokens), TOTP 2FA |
| Encryption | TweetNaCl.js, libsodium |
| Testing | Jest, Vitest, Playwright |
| Infrastructure | Docker Compose, Kubernetes, GitHub Actions |

## Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (for local infrastructure)

## Getting Started

### Windows — one-click start (easiest)

1. Install the prerequisites if you haven't already:
   - [Node.js 20+](https://nodejs.org) (includes npm)
   - [Docker Desktop](https://www.docker.com/products/docker-desktop) (start it before continuing)
2. Clone or download this repository.
3. **Double-click `start.bat`** in the root of the repository.

That's it. The launcher will:
- Check that all prerequisites are installed and Docker is running.
- Run first-time setup automatically (installs dependencies, starts Docker services, builds packages) — subsequent launches skip this step.
- Start the API server and the web app in separate windows.
- Open your browser at **http://localhost:5173** automatically.

> **Tip:** Close the two terminal windows that open to stop the servers.

---

### Quick setup (command line)

**macOS / Linux**

```bash
git clone https://github.com/DaymareOn/vibeCodedDocumentRouter.git
cd vibeCodedDocumentRouter
bash infra/scripts/setup.sh
```

**Windows** (PowerShell — run as Administrator if Docker requires elevated privileges)

```powershell
git clone https://github.com/DaymareOn/vibeCodedDocumentRouter.git
cd vibeCodedDocumentRouter
powershell -ExecutionPolicy Bypass -File infra\scripts\setup.ps1
```

Both scripts check all prerequisites, install npm dependencies, copy the example environment file, start the Docker services (PostgreSQL, Redis, MinIO), and build the shared packages automatically.

---

### Manual setup

#### 1. Clone and install dependencies

```bash
git clone https://github.com/DaymareOn/vibeCodedDocumentRouter.git
cd vibeCodedDocumentRouter
npm install
```

#### 2. Start local infrastructure

```bash
cd infra
docker-compose up -d
```

This starts PostgreSQL, Redis, and MinIO.

#### 3. Configure environment

Copy and edit the API environment file:

```bash
# macOS / Linux
cp apps/api/.env.example apps/api/.env
```

```powershell
# Windows PowerShell
Copy-Item apps\api\.env.example apps\api\.env
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis URL |
| `JWT_SECRET` | *(required)* | Secret for access tokens |
| `REFRESH_TOKEN_SECRET` | *(required)* | Secret for refresh tokens |
| `S3_ENDPOINT` | `http://localhost:9000` | MinIO / S3 endpoint |
| `S3_BUCKET` | `documents` | Default bucket name |
| `S3_ACCESS_KEY` | `minioadmin` | Storage access key |
| `S3_SECRET_KEY` | `minioadmin` | Storage secret key |

#### 4. Run database migrations

```bash
npm run migrate --workspace=apps/api
```

#### 5. Start development servers

```bash
# API (http://localhost:3001)
npm run dev:api

# Web app (http://localhost:5173)
npm run dev:web
```

#### 6. Mobile app

```bash
cd apps/mobile
npx expo start
```

## Building

```bash
# Build all packages and apps
npm run build

# Build individual workspace
npm run build --workspace=packages/shared-types
npm run build --workspace=apps/api
npm run build --workspace=apps/web
```

## Testing

```bash
# Run all unit/integration tests
npm test

# Run API tests only
npm test --workspace=apps/api

# Run web tests only
npm test --workspace=apps/web

# Run E2E tests (requires running web dev server)
npm run test:e2e
```

## Linting

```bash
npm run lint
```

## Docker

### Development

```bash
docker-compose -f infra/docker-compose.yml up
```

### Production

```bash
docker-compose -f infra/docker-compose.prod.yml up -d
```

## Kubernetes

Kubernetes manifests are in `infra/kubernetes/`. Apply them with:

```bash
kubectl apply -f infra/kubernetes/
```

## API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a new user and tenant |
| POST | `/api/auth/login` | — | Log in and receive JWT tokens |
| POST | `/api/auth/refresh` | — | Refresh access token |
| POST | `/api/auth/logout` | ✓ | Invalidate refresh token |
| GET | `/api/auth/me` | ✓ | Get current user profile |
| POST | `/api/auth/totp/setup` | ✓ | Generate TOTP secret |
| POST | `/api/auth/totp/verify` | ✓ | Enable TOTP 2FA |
| GET | `/api/documents` | ✓ | List documents (paginated) |
| POST | `/api/documents` | ✓ | Create document (get presigned URL) |
| POST | `/api/documents/upload` | ✓ | Upload document (multipart) |
| GET | `/api/documents/:id` | ✓ | Get document details |
| DELETE | `/api/documents/:id` | ✓ | Soft-delete document |
| POST | `/api/documents/:id/process` | ✓ | Trigger OCR processing |
| GET | `/api/documents/:id/download` | ✓ | Get download URL |
| GET | `/api/rules` | ✓ | List routing rules |
| POST | `/api/rules` | ✓ | Create routing rule |
| GET | `/api/rules/:id` | ✓ | Get rule details |
| PUT | `/api/rules/:id` | ✓ | Update rule |
| DELETE | `/api/rules/:id` | ✓ | Delete rule |
| POST | `/api/rules/:id/test` | ✓ | Test rule against a document |
| GET | `/api/health` | — | Health check |

## Rule Engine

Rules use an IF/THEN structure:

```json
{
  "name": "Route invoices to accounting",
  "logic": "AND",
  "conditions": [
    { "field": "ocr_text", "operator": "contains", "value": "invoice" },
    { "field": "amount", "operator": "gt", "value": "0" }
  ],
  "actions": [
    { "type": "email", "config": { "to": "accounting@company.com" } },
    { "type": "tag", "config": { "tag": "invoice" } }
  ]
}
```

**Supported condition fields:** `ocr_text`, `filename`, `sender`, `recipient`, `amount`, `date`, `mime_type`, `tags`, `source`

**Supported operators:** `contains`, `not_contains`, `equals`, `not_equals`, `starts_with`, `ends_with`, `regex`, `gt`, `lt`, `gte`, `lte`

**Supported action types:** `email`, `s3_push`, `webhook`, `tag`, `archive`, `notify`

## License

MIT — see [LICENSE](LICENSE).
