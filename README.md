# PersonaMirror

`A multimodal AI digital persona generation service that captures not just your appearance, but your values and speaking style`

## What This Repository Is
PersonaMirror is a learning monorepo that incrementally implements a service for generating a user's digital persona from text, voice, and image inputs.

This repository has two goals:
- Build a project with a real service structure, step by step.
- Document both the code and the reasoning behind architectural decisions, so the choices are understandable.

## Current Status
Features that are currently working:
- Sign up / Login / Logout
- Session authentication based on `httpOnly` cookies
- Admin account seed and admin-only user list view
- Capture UI draft for interview / voice / image input
- Capture job create / read API
- Basic backend smoke test suite
- All three execution paths verified:
  - Local dev: `pnpm dev`
  - Dockerfile test: `pnpm docker`
  - Docker Compose demo: `docker compose up`

Core features not yet implemented:
- LangChain-based persona extraction
- Whisper-based voice analysis
- Stable Diffusion / ControlNet-based image generation
- Async job processing between ai-worker and backend

## Tech Stack
- Monorepo: Nx
- Frontend: React Router 7, TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Worker: Python, uv
- Package manager:
  - Node: pnpm
  - Python: uv
- Infra / local runtime:
  - Docker Compose
  - Terraform

## Runtime Policy
For reproducibility, local and Docker runtime versions are pinned to the patch level:
- Node: `24.11.0`
- Python: `3.11.15`
- Postgres: `16.13-alpine`
- Redis: `7.4.7-alpine`

Related files:
- [.nvmrc](.nvmrc)
- [.python-version](.python-version)
- [apps/frontend/Dockerfile](apps/frontend/Dockerfile)
- [apps/backend/Dockerfile](apps/backend/Dockerfile)
- [docker-compose.yml](docker-compose.yml)

## Quick Start
Prerequisites:
- `nvm`
- `corepack`
- `uv`
- `docker`
- `docker compose`

Initial setup:
```bash
nvm install 24.11.0
nvm use 24.11.0
corepack enable
uv python install 3.11.15
pnpm setup
```

What `pnpm setup` does:
- Auto-generates `apps/frontend/.env` from `apps/frontend/.env.example`
- Auto-generates `apps/backend/.env` from `apps/backend/.env.example`
- Installs Node dependencies
- Syncs backend / ai-worker Python environments

## Run Modes
### 1. Local Development
The most commonly used execution path.

```bash
pnpm dev
```

Behavior:
- Runs `db` and `redis` via Docker Compose
- Nx runs `backend` and `frontend` as local dev servers
- Backend waits for port `5432` before starting
- Frontend waits for port `8000` before starting

Shutdown:
- Stop app processes: `Ctrl+C`
- Stop remaining `db` and `redis`:
```bash
pnpm infra:down
```

### 2. Dockerfile Test
Used to verify that the app Dockerfiles actually build and run correctly.

```bash
pnpm docker
```

Behavior:
- Runs `db` and `redis` via Docker Compose
- Nx builds frontend / backend Docker images with BuildKit
- Build logs are streamed to the Nx console
- After build, frontend / backend containers run in detached mode

View logs:
```bash
pnpm docker:logs
```

Shutdown:
```bash
pnpm docker:down
```

### 3. Docker Compose Demo
The simplest path for external users to try the demo.

```bash
docker compose up
```

Shutdown:
```bash
docker compose down
```

Note:
- `pnpm infra:down` only stops `db` and `redis`.
- `docker compose down` stops all services started by compose (frontend, backend, ai-worker, db, redis).

## Environment Variables
### Policy
- Actual local app env files are not committed to Git.
- Only example files are tracked.
- Docker Compose demo defaults are kept in the trackable [compose.env](compose.env).

### Files
- Frontend example: [apps/frontend/.env.example](apps/frontend/.env.example)
- Backend example: [apps/backend/.env.example](apps/backend/.env.example)
- Compose demo env: [compose.env](compose.env)

### Effective Use
- Local dev / local docker test:
  - `apps/frontend/.env`
  - `apps/backend/.env`
- Compose demo:
  - `compose.env`

### Important Keys
- Frontend:
  - `VITE_API_BASE_URL`
- Backend:
  - `DATABASE_URL`
  - `JWT_SECRET_KEY`
  - `BACKEND_CORS_ORIGINS`
  - `AUTH_COOKIE_*`
  - `ADMIN_SEED_*`
- Compose / db:
  - `POSTGRES_DB`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`

## What Is Implemented Today
### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Admin
- `GET /admin/users`
- Frontend menu is only shown for admin sessions

### Capture
- `POST /capture/jobs`
- `GET /capture/jobs`
- `GET /capture/jobs/{job_id}`
- `DELETE /capture/jobs/{job_id}`
- The frontend provides a step-based capture UI; drafts are managed in browser memory and submitted to the backend job API at the review step
- After submission, the `My submissions` screen supports card-style list view, detail view, and deletion

### Health
- `GET /health`

## API Docs
- Backend test plan: [apps/backend/docs/api/testing.md](apps/backend/docs/api/testing.md)
- Backend live docs when running:
  - Swagger UI: `http://localhost:8000/docs`
  - OpenAPI JSON: `http://localhost:8000/openapi.json`
- Principles:
  - FastAPI OpenAPI is the authoritative source at runtime.
  - Manual backend API endpoint documentation is not maintained.
  - The README only keeps a scope overview and entry links.
  - Manual docs are only written for concept/strategy explanations, like test plans.

## Monorepo Structure
```text
/persona-mirror
├── apps/
│   ├── frontend/
│   ├── backend/
│   │   └── docs/api/
│   └── ai-worker/
├── libs/
│   ├── shared-interfaces/
│   ├── ai-models/
│   └── ui-components/
├── infrastructure/
│   └── terraform/
├── docs/
│   └── changelog/
├── scripts/
├── docker-compose.yml
└── nx.json
```

### Frontend Structure
Principles:
- Shared UI lives in `src/common/components`
- Feature code lives in `src/features/<domain>`
- React Router `loader` / `action` is the default pattern
- New pages are first built by composing shared UI from `src/common/components`; feature-specific components are only added when a repeating pattern is confirmed

Current main domains:
- `auth`
- `admin`
- `capture`

### Backend Structure
Principles:
- Common code lives in `app/common`
- Feature code lives in `app/features/<domain>`
- Features are split into `router.py`, `service.py`, `schemas.py`, `models.py` as needed

Current main domains:
- `auth`
- `admin`
- `capture`

## Roadmap
### Phase 0. Foundation Setup
- [x] Nx workspace initialization
- [x] Common runtime / lint / format / pre-commit setup
- [x] Local / docker / compose execution paths
- [x] Frontend / backend base structure

### Phase 1. MVP Core Flow
- [x] Basic authentication
- [x] Admin user list screen
- [x] Capture UI draft
- [x] Capture job API
- [x] Capture review -> backend job API connection
- [ ] File upload handling
- [ ] AI analysis / generation pipeline connection

### Phase 2+
- [ ] Quality improvements
- [ ] Async job separation
- [ ] Infrastructure automation
- [ ] Operational observability

## Next Recommended Work
- Add backend auth / capture smoke tests
- Add Postgres-based backend integration tests
- Add frontend route state branch tests
- Draft async job interface between ai-worker and backend
- Add real file upload handling (audio / image)

## Quality Commands
```bash
pnpm test:backend
pnpm lint
pnpm format
uvx pre-commit install
uvx pre-commit run --all-files
```

## Changelog
- Index: [docs/changelog/README.md](docs/changelog/README.md)
- Daily records: `docs/changelog/YYYY-MM-DD.md`

Recording style:
- While working: accumulate one-line notes
- Before committing: summarize based on the commit scope

## Git Workflow
Branch strategy:
- `main`: stable branch
- `feat/*`: feature branches
- `study/*`: experimental branches

Branch examples:
- `feat/ai`
- `feat/auth`
- `feat/capture`
- `study/prompt-exp`

Commit principles:
- Keep commits small
- Review change summary before the final commit
- Push the current branch to remote after approval

Branch start principles:
- Independent work starts a new branch from the latest `origin/main`.
- Dependent work that continues from a not-yet-merged branch starts from that branch.
- One PR = one branch is maintained, but the base is not always fixed to `main`.
- Do not reuse a branch that already has an open PR; create a new child branch from it if needed.

PR operation principles:
- Merge the previous PR before starting the next branch whenever possible.
- If the next task can't wait, use a stacked branch approach.
- A stacked branch PR may target the parent branch, then be rebased to `main` after the parent merges.
- Before pushing a new PR or additional commits, verify the current branch is not already a merged PR branch.
- Do not push new commits to a merged PR branch. Instead, create a new branch from the correct base and cherry-pick only the needed commits.
- Clean up merged branches before opening a new PR.
- Clean up both local and remote branches; delay only when a stacked child still depends on the parent branch.

## Why This Repo Is Useful For Learners
This repository is not just a tutorial — it also demonstrates:
- Feature-based folder structure design
- Separation of local / docker / compose execution paths
- Environment variable policy
- Real implementations of auth, admin, and capture flows
- A structure that can be extended to ai-worker and model pipelines
