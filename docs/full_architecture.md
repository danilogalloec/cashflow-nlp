# CashFlow System — Full Architecture

## Overview

Multi-tenant personal finance platform with natural language input.  
Isolation guarantee: every query is scoped to `user_id`; cross-tenant data leakage is structurally impossible at the ORM layer.

---

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.111 + Uvicorn |
| ORM | SQLAlchemy 2.x (async) |
| DB | PostgreSQL 16 |
| Auth | JWT (HS256) + Argon2id hashing |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Cache / Rate-limit | Redis 7 |
| NLP Input | OpenAI / local model via LangChain |

---

## Directory Layout

```
tesis/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── auth.py              # Auth logic (register / login / token)
│   │   ├── dependencies.py      # get_current_user, DB session
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings
│   │   │   └── security.py      # Argon2 + JWT utilities
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── account.py
│   │   │   ├── transaction.py
│   │   │   └── report.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── accounts.py
│   │       ├── transactions.py
│   │       ├── income.py
│   │       └── reports.py
│   ├── alembic/                 # DB migrations
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (landing)/           # Public landing page
│   │   └── (dashboard)/         # Private app (auth-gated)
│   └── ...
└── docs/
```

---

## Auth Flow

```
┌─────────┐     POST /auth/register      ┌──────────────┐
│  Client │ ─────────────────────────────▶│  FastAPI     │
│         │  {name, email, password}      │              │
│         │                               │  1. Validate │
│         │                               │  2. Argon2id │
│         │                               │     hash pw  │
│         │                               │  3. INSERT   │
│         │◀─────────────────────────────│     user     │
│         │  201 {access_token,           │  4. Issue JWT│
│         │       refresh_token}          └──────────────┘
│         │
│         │     POST /auth/login          ┌──────────────┐
│         │ ─────────────────────────────▶│  FastAPI     │
│         │  {email, password}            │              │
│         │                               │  1. Fetch    │
│         │                               │     user     │
│         │                               │  2. Verify   │
│         │                               │     Argon2id │
│         │                               │  3. Issue JWT│
│         │◀─────────────────────────────│     + rfrsh  │
│         │  200 {access_token,           └──────────────┘
│         │       refresh_token}
│         │
│         │  GET /accounts                ┌──────────────┐
│         │  Authorization: Bearer <JWT> ─▶│  FastAPI     │
│         │                               │  1. Decode   │
│         │                               │     JWT      │
│         │                               │  2. Load user│
│         │                               │  3. Query    │
│         │◀─────────────────────────────│  WHERE       │
│         │  200 [accounts]               │  user_id=me  │
└─────────┘                               └──────────────┘
```

---

## Multi-Tenancy Model

**Row-level isolation** — every tenant-owned table carries a non-nullable `user_id FK` to `users.id`.  
SQLAlchemy `get_current_user` dependency is injected into every protected endpoint; the ORM layer appends `.filter(Model.user_id == current_user.id)` automatically via a base query helper.

There is no admin override bypass in the data layer — even superusers query through the same ORM.

---

## Security Controls

| Threat | Control |
|---|---|
| Password brute force | Argon2id (m=65536, t=3, p=4) + account lockout after 5 failures (Redis counter, 15-min window) |
| JWT theft | Short-lived access tokens (15 min) + refresh tokens (7 days, stored hashed in DB) |
| SQL Injection | SQLAlchemy ORM parameterised queries — raw SQL forbidden |
| CSRF | SameSite=Strict cookies for refresh token; access token in memory only |
| XSS | CSP headers; tokens never written to localStorage |
| Enumeration | Register / login return identical error messages |
| IDOR | All queries scoped to `current_user.id`; UUIDs as PKs (non-guessable) |
| Rate Limiting | SlowAPI middleware — 5 req/min on auth endpoints |
| Secrets | `.env` via `pydantic-settings`; never committed to VCS |
| Transport | TLS 1.3 enforced at reverse proxy (Nginx/Caddy) |
| Dependency CVEs | `pip-audit` in CI pipeline |

---

## Data Flow — Natural Language Input

```
User utterance → /transactions/parse (POST)
  → LangChain chain extracts: {amount, category, account, direction, date}
  → Pydantic schema validates extracted fields
  → ORM inserts Transaction row (user_id scoped)
  → Account.balance updated via DB transaction (atomic)
  → WebSocket push to dashboard
```

---

## API Endpoints Summary

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /accounts
POST   /accounts
PATCH  /accounts/{id}
DELETE /accounts/{id}

GET    /transactions
POST   /transactions
POST   /transactions/parse      ← NLP input
PATCH  /transactions/{id}
DELETE /transactions/{id}

GET    /income-sources
POST   /income-sources
PATCH  /income-sources/{id}

GET    /categories
POST   /categories

GET    /reports/summary
GET    /reports/trends
GET    /reports/distribution
```
