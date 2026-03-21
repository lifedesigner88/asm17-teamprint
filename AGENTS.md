# AGENTS.md

## Purpose
This repository is a project for understanding and learning the full structure of `PersonaMirror` by actually implementing it.
The agent aims not just for fast implementation, but for implementation that makes the structure and intent understandable.

## Source of Truth
- Always read `README.md` first at the start of any task to check the current state and priorities.
- If there is a conflict in structure, execution method, or runtime policy, align with `README.md`.
- When a major structural change occurs, update `README.md` alongside the code.

## Working Principles
- Implement in small units.
- For complex tasks, follow the order: design → implement → verify.
- Explanations are based on actual files and code, not abstract concepts.
- If temporary workaround code is left in, include the condition for removing it.
- Branch names are kept short and domain-focused: `feat/ai`, `feat/auth`, `study/prompt-exp`.
- Independent work starts a new branch from the latest `origin/main`.
- Work that depends on a not-yet-merged previous task starts a new branch from that previous branch.
- Do not reuse a branch that already has an open PR for the next task; create a new child branch from it if needed.

## Architecture Rules
### Monorepo
The root structure is maintained as follows:
- `apps/frontend`: UI, camera/mic control
- `apps/backend`: FastAPI API, orchestration, DB access
- `apps/ai-worker`: heavy inference worker
- `libs/shared-interfaces`: frontend-backend contracts
- `libs/ai-models`: model loading/inference wrappers
- `libs/ui-components`: reusable UI components
- `infrastructure/terraform`: IaC

### Frontend
- Use React Router `loader` / `action` pattern as the default.
- Shared UI lives under `apps/frontend/src/common/components`.
- shadcn/ui-based shared components go in `apps/frontend/src/common/components/ui/*`; the external entry point is unified at `apps/frontend/src/common/components/index.ts`.
- When creating a new page or section, first check if it can be composed from shared UI in `apps/frontend/src/common/components`; only add new feature components if that is insufficient.
- If the same pattern repeats more than once, do not copy-paste it inline — lift it to feature `components/` or `common/components`.
- Feature code lives under `apps/frontend/src/features/<domain>`.
- Feature `index.ts` is only responsible for the entry point.
- Actual `.tsx` files go in role-revealing folders: `components/`, `pages/`, `layout/`, `utils/`.
- Do not create unnecessary nested structures.

### Backend
- Common infrastructure/config code lives under `apps/backend/app/common`.
- Feature code lives under `apps/backend/app/features/<domain>`.
- Each feature is split into `router.py`, `service.py`, `schemas.py`, `models.py` as needed.
- Root `apps/backend/main.py` is only the uvicorn entry point.
- Actual app assembly is done in `apps/backend/app/main.py`.
- Frontend and backend share the same domain names (`auth`, `admin`, `capture`) wherever possible.

## Security and Data Rules
- Prefer `httpOnly` cookies over `localStorage` for browser token storage.
- Auth secrets are enforced via environment variables with no code fallback.
- Input normalization (strip/validate) before storage is the default.
- Personal data (voice, images, interview text) is handled conservatively.
- Long AI tasks are separated from web requests and handled asynchronously by default.

## Runtime and Execution Rules
- Node is pinned to the patch version defined in `.nvmrc`.
  - Current value: `24.11.0`
- Python is pinned to the patch version defined in `.python-version`.
  - Current value: `3.11.15`
- Node package manager: `pnpm`.
- Python package/virtual environment management: `uv`.
- Local, Dockerfile, and Docker Compose maintain the same patch-level runtime wherever possible.

### Official Commands
Only the following commands are used:
- `pnpm setup`
- `pnpm dev`
- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm docker`
- `pnpm docker:logs`
- `pnpm docker:down`

### Script Organization
- Root `package.json` scripts are kept in this order: `setup → dev → infra → docker → quality → raw tool`.
- Use prefix and order for grouping in `package.json` instead of comments.
- Prefer a single entry command like `pnpm setup` for initial install/sync.
- Prefer Node/Python scripts over bash-only tricks for Windows/macOS/Linux compatibility.
- Ensure Docker and local dev environments do not share the same cache/virtual environment directories.

## Environment Variable Rules
- Docker Compose demo defaults are kept in the root `compose.env`.
- Per-app local env files (`apps/frontend/.env`, `apps/backend/.env`) are not committed to Git.
- Only per-app example files (`apps/frontend/.env.example`, `apps/backend/.env.example`) are tracked.
- `pnpm setup`, `pnpm dev`, and `pnpm docker` auto-generate `.env` from `.env.example` when needed.
- Do not mix the roles of different execution paths:
  - Local dev / local docker test: app `.env`
  - Compose demo: `compose.env`

## Quality Rules
- Backend test: `pnpm test:backend`
- Frontend lint: `pnpm lint:frontend`
- Python lint: `uvx ruff check`
- Python format: `uvx ruff format`
- Common format: `pnpm format`
- pre-commit is maintained based on `.pre-commit-config.yaml`.

## Documentation Rules
- When a feature is added, update the following:
  - `README.md` if needed
  - Related docs if the execution method changes
  - Request/response examples if the API changes
  - `docs/changelog/YYYY-MM-DD.md`
- The authoritative changelog rules are in `docs/changelog/README.md`.
- Changelog is managed in two stages:
  - While working: accumulate one-line notes in the date file
  - Just before the final commit: summarize based on the commit scope
- The changelog index and rules document is `docs/changelog/README.md`.
- After committing, do not leave interim notes — keep only the final summary that matches the commit history.
- The authoritative backend API reference at runtime is FastAPI OpenAPI (`/docs`, `/openapi.json`).
- Manual backend API endpoint documentation is not maintained by default.
- Backend test plans are managed in `apps/backend/docs/api/testing.md`, not in the README.
- Even without an explicit request, briefly note the reason for major structural changes.

## Response Style
The agent briefly explains the following by default:
- What was changed
- Why it was changed that way
- Which file to look at
- 1–2 points worth checking next

## Safety and Git Rules
- Do not run destructive commands (`reset --hard`, mass deletion, etc.) without user instruction.
- Do not arbitrarily revert existing changes.
- Before the final commit, share a summary of changes and get user approval before committing.
- Once the user approves a commit, commit to the current branch and push to remote (`origin`) under the same branch name.
- PRs are managed with the principle: one PR = one branch.
- If a stacked branch is needed, branch off from the previous work branch; rebase to `main` only when necessary.
- Before creating a new PR or pushing additional commits to an existing branch, verify the current branch is not already a merged PR branch.
- Do not add new commits to an already-merged PR branch. If needed, create a new branch from the correct base and cherry-pick only the necessary commits.
- Before opening a new PR, confirm that already-merged branches are identified as cleanup targets.
- Unless a stacked child is still using the parent branch as its base, deleting merged branches from both local and remote is the default policy.

## Default Start-of-Task Checklist
1. Check current stage and priorities in `README.md`
2. Explore relevant directories/code
3. Plan changes
4. Implement
5. Verify with tests/execution
6. Share results and next steps
