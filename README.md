# PersonaMirror

> A resume shows what you've done. PersonaMirror shows who you are.

A Progressive Persona Dashboard that extracts values, archetypes, and speaking patterns from a short AI interview — growing richer as more input is added.

**MVP target: March 25, 2026**

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router v7, TypeScript, Tailwind CSS, Vite |
| Backend | FastAPI, SQLAlchemy, PostgreSQL 16 |
| AI Worker | Python, LangGraph, Claude API (`claude-haiku-4-5`) |
| Monorepo | Nx, pnpm (Node 24.11.0), uv (Python 3.11.15) |
| Infra | Docker Compose, Redis 7.4 |

---

## Quick Start

### 1. Install system tools (fresh Ubuntu 24)

**nvm + Node 24.11.0**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
source ~/.bashrc
nvm install 24.11.0 && nvm use 24.11.0
```

**uv (Python manager)**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
uv python install 3.11.15
```

**Docker**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker   # apply group without logout
```

### 2. Clone & bootstrap

```bash
git clone <repo-url> && cd 260309_persona-mirror
node scripts/setup-dev.mjs   # installs pnpm, Node deps, Python envs, generates .env files
```

> After the first bootstrap, use `pnpm setup` instead (pnpm is now installed).
> Re-run it any time you pull changes that add new dependencies.

### 3. Add API keys

Edit `apps/backend/.env` and fill in:

```
ANTHROPIC_API_KEY=...   # console.anthropic.com
RESEND_API_KEY=...      # resend.com (optional — for email OTP)
```

`apps/ai-worker` uses the same `ANTHROPIC_API_KEY` (already wired via Docker Compose).

### 4. Run

```bash
pnpm dev           # local dev (DB + Redis via Docker, services via Nx)
pnpm docker        # build & run all services as Docker containers
pnpm infra:down    # stop DB and Redis
```

---


## What's Working (Level 1 MVP)

- Email signup with OTP verification + 4-digit PIN login + PIN reset
- Admin account seed + admin user list view
- AI chat interview — Claude asks 5 adaptive questions
- Capture job API (create / read / delete)
- **ai-worker LangGraph pipeline**: polls pending jobs → Claude → writes persona JSON
- **Level 1 Persona Card**: archetype · top 3 values · one-liner (appears on job completion)
- **Public persona page** `/persona/:id` — shareable URL
- **Demo page** `/persona/demo` — rendered with Hupository data, no backend needed

---

## Not Yet Done

- `POST /persona/:id/ask` Q&A panel
- Voice and image capture

---

## Structure

```
apps/
├── frontend/     # React SPA (auth, admin, capture, persona)
├── backend/      # FastAPI (auth, admin, capture, persona)
└── ai-worker/    # LangGraph polling loop → Claude → persona JSON
infrastructure/
└── terraform/
```

---

## API

Base: `http://localhost:8000` · Docs: `http://localhost:8000/docs`

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | email + 4-digit PIN |
| POST | `/auth/verify` | OTP confirmation |
| POST | `/auth/login` | |
| POST | `/auth/logout` | |
| GET | `/auth/me` | |
| POST | `/auth/reset-pin/request` | sends OTP |
| POST | `/auth/reset-pin/confirm` | sets new PIN |
| GET | `/admin/users` | admin only |
| POST | `/capture/interview/chat` | AI chat, returns `{ message, is_complete }` |
| POST | `/capture/jobs` | create job |
| GET | `/capture/jobs` | list jobs |
| GET | `/capture/jobs/{id}` | includes `result` when done |
| DELETE | `/capture/jobs/{id}` | |
| GET | `/persona/{id}` | public, no auth |
| GET | `/health` | |

---

## Quality

```bash
pnpm test:backend
pnpm lint
pnpm format
uvx pre-commit run --all-files
```

---

## Git Policy

- `main` — stable, PR merge only
- `feat/*` — feature branches
- One PR = one branch; merge before starting the next
