# vibeCodedDocumentRouter — Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌───────────────┐          ┌────────────────────────────────┐  │
│  │  Web App      │          │  Mobile App (React Native)     │  │
│  │ React + Vite  │          │  Expo / bare workflow          │  │
│  └───────┬───────┘          └──────────────┬─────────────────┘  │
└──────────┼──────────────────────────────────┼────────────────────┘
           │ REST / WebSocket                 │
┌──────────▼──────────────────────────────────▼────────────────────┐
│                       API Layer (apps/api)                        │
│  Express + TypeScript                                             │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ Auth     │ │Documents │ │   Rules    │ │  Audit / Tenants │  │
│  │ /auth/*  │ │ /docs/*  │ │  /rules/*  │ │  /admin/*        │  │
│  └──────────┘ └──────────┘ └────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
           │                      │
┌──────────▼──────────┐   ┌───────▼───────────────────────────────┐
│  packages/           │   │  Infrastructure                        │
│  ├── shared-types    │   │  ├── PostgreSQL (data)                 │
│  ├── shared-utils    │   │  ├── Redis (queues + sessions)         │
│  ├── ocr-sdk         │   │  ├── MinIO / S3 (document storage)     │
│  └── rule-engine     │   │  └── Tesseract / Cloud OCR             │
└─────────────────────┘   └───────────────────────────────────────┘
```

## Package Responsibilities

| Package | Purpose |
|---|---|
| `@vibe-router/shared-types` | TypeScript interfaces shared across all apps and packages |
| `@vibe-router/shared-utils` | Crypto, JWT, logging (Winston), Zod validation schemas |
| `@vibe-router/ocr-sdk` | Multi-provider OCR abstraction (Tesseract, Google Vision, AWS Textract) |
| `@vibe-router/rule-engine` | Pure rule evaluation engine — no I/O, fully testable |

## Document Lifecycle

1. **Ingest** — Document arrives via upload, email, scanner, or API.
2. **Store** — Raw file uploaded to S3/MinIO; metadata written to PostgreSQL.
3. **OCR** — `ocr-sdk` extracts text and structured metadata from the file.
4. **Route** — `rule-engine` evaluates active rules against the document context.
5. **Act** — Matched rule actions execute (email, webhook, S3 push, tagging, archiving).
6. **Audit** — Every action is persisted to the audit log.

## Rule Engine

Rules are composed of **conditions** (field + operator + value) and **actions**.
- Conditions support: `contains`, `not_contains`, `equals`, `not_equals`, `starts_with`, `ends_with`, `regex`, `gt`, `lt`, `gte`, `lte`
- Fields: `ocr_text`, `filename`, `sender`, `recipient`, `amount`, `date`, `mime_type`, `tags`, `source`
- Logic: `AND` (all conditions must match) or `OR` (any condition must match)
- Rules are prioritised (lower number = higher priority)

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens (15 min) + refresh tokens (7 days)
- Optional TOTP 2FA per user
- End-to-end encryption option using NaCl box (X25519 + XSalsa20-Poly1305)
- Multi-tenant isolation at the database level (`tenantId` on every row)
- Full audit trail of all user and system actions

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for access token signing |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing |
| `S3_ENDPOINT` | S3-compatible endpoint URL |
| `S3_BUCKET` | Default S3 bucket name |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
| `LOG_LEVEL` | Winston log level (`info`, `debug`, `warn`, `error`) |
| `GOOGLE_VISION_CREDENTIALS` | Path to Google service account JSON (enables Google Vision OCR) |
| `AWS_REGION` | AWS region (enables Textract OCR) |
