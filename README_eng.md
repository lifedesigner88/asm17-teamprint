# Park Sejong PR for ASM17

> The root URL now opens directly into `Park Sejong PR`.
>
> It started from a simple real-world problem: before meeting in person, applicants should be able to share interview schedule, GitHub, and self-introduction Notion links, then understand the people who interviewed together with them faster.
>
> Inside, the dashboard, verification, and ASM17 team-building operations flow still remain active, and a new `Team-fit Explorer` now acts as the next durable product surface.

For the Korean README, see [README.md](README.md).

## Why I Built This

SW Maestro 17 team building is a real, time-bounded problem.

Before people meet in person, there is usually very little structured context to help them decide who they should talk to. Most people only know a name, a short intro, or a GitHub link passed around in chat.

This project started from one practical idea:

> Before meeting people in person, it would be useful if applicants could share interview schedule, GitHub, and intro links and understand the people who interviewed together with them.

This repo is my attempt to turn that idea into a small, usable product.

As of March 25, 2026, the main entry has been reordered:

- `/` is the `Park Sejong PR` page itself
- `Park Sejong PR`, `AI Sejong`, YouTube, and shipped surfaces act as the first proof assets
- the Seoul dashboard, verification, and ops flow now sit one step behind that first impression
- the new `Team-fit Explorer` is the next product layer for choosing better long-term teammates

## What Users Can Do Now

- Sign up and log in
- Open `/` and land directly on the `Park Sejong PR` page
- Preview the `Team-fit Explorer` UI before logging in
- Save a lightweight matching profile in the `Team-fit Explorer` after logging in
- See recommendations for people who are similar, complementary, or far-but-interesting after 17th-cohort approval
- Complete email verification and 17th-cohort verification
- Enter interview date, start time, and related interview information
- Add a GitHub profile link
- Add a Notion self-introduction link
- View people who interviewed in the same slot
- Use the service before team building to understand possible teammates faster
- Open the Park Sejong PR / introduction page as one part of the overall product flow
- Use the login-only `AI Sejong` multi-turn chat

## Current Core Flow

1. A user enters `/` and lands on the `Park Sejong PR` page itself.
2. The user scans the PR page, YouTube, and `AI Sejong` as proof surfaces first.
3. If interested, the user can preview the `Team-fit Explorer` UI before signing up and logging in.
4. After logging in, the user can save a lightweight team-fit profile: interests, problems, domains, role, stack, working style, and pace.
5. Once email verification and 17th-cohort approval are complete, the system recommends people who feel similar, complementary, or unexpectedly promising.
7. The user enters interview date, start time, and slot-related information when needed.
8. The user adds profile links such as GitHub and a self-introduction Notion page.
9. The system places the user into an interview slot.
10. The user browses other people from the same slot before team building.

## Key Features

- Email signup, login, and PIN reset flow
- `Team-fit Explorer` with guest preview, profile save after login, and recommendations unlocked after 17th-cohort approval
- Recommendation cards for similar, complementary, and unexpected matches that unlock after 17th-cohort approval
- Email verification and 17th-cohort verification-based access control
- Interview schedule input for SW Maestro 17 applicants
- GitHub profile link input
- Notion self-introduction link input
- Dashboard and slot-based browsing for people who interviewed together
- Park Sejong PR page for the builder of the project
- Login-only `AI Sejong` multi-turn chat page
- Admin approval flow for managing access to member detail views
- Bilingual UI support for Korean and English

## How AI Sejong Works

`AI Sejong` is not just a one-shot chat box. It is currently designed as a `login-based multi-turn chat` for team-building use.

- Only logged-in users can use it.
- Questions and answers are stored in the DB.
- A recent slice of the conversation is sent back into the model to preserve multi-turn context.
- Responses are grounded in Sejong's persona data, creator PR data, and selected core Hupository documents.
- Logging is kept to discourage careless use and to make common question patterns reviewable later.

It is not a finished AI product yet. The point right now is to learn what people actually ask in a real team-building setting, and what kind of context makes those conversations more useful.

## Future Direction

The current scope is intentionally narrow.

Right now, the goal is to move from personal PR toward a durable people-discovery tool. It is still intentionally smaller than a full community platform.

That means the current product already includes:

- lightweight team-fit profile intake
- structured-signal plus vector-based recommendations
- card-first teammate discovery

The next direction I want to explore is:

- better trio / shortlist support
- richer participant profile surfaces beyond the current creator page
- better grounding, retrieval, conversation UX, and question-pattern analysis for `AI Sejong`

These are roadmap ideas, not finished features.

## What I’d Like To Improve With Teammates

This project already works, but there is still a lot of room to sharpen it.

- How much data the AI should use, and how to ground it more reliably
- How to turn common question patterns into product improvements
- What kind of recommendation, filtering, and conversation UX actually helps team building

I would especially like to work with people who want to make the AI layer more useful, more grounded, and more productively connected to the team-building flow.

## Tech Stack

| Layer     | Tech                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| Frontend  | React 19, React Router v7, TypeScript, Tailwind CSS, Vite                      |
| Backend   | FastAPI, SQLAlchemy, Supabase Postgres, pgvector, OpenAI embeddings             |
| AI Worker | Python, LangGraph, Claude API (`claude-haiku-4-5`) kept for future experiments |
| Tooling   | Nx, pnpm, uv                                                                   |
| Infra     | Docker Compose                                                                 |

Main directories:

- `apps/frontend` — Park Sejong PR, AI Sejong, Team-fit Explorer, dashboard, and verification flow
- `apps/backend` — auth, verification, team-fit recommendations, dashboard, admin, and persona APIs
- `apps/ai-worker` — legacy / experimental worker for later AI features
- `infrastructure/terraform` — infrastructure-related workspace

## Local Development / How To Run

### Prerequisites

- Node `24.11.0`
- Python `3.11.15`
- `pnpm`
- `uv`
- Docker optional

### First-time setup

```bash
git clone <repo-url>
cd 260309_persona-mirror
node scripts/setup-dev.mjs
```

After the first bootstrap, use:

```bash
pnpm setup
```

### Environment

`apps/frontend/.env` and `apps/backend/.env` are generated from `.env.example` when needed.

For backend and AI worker development, fill in:

```text
DATABASE_URL=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...  # optional in local fallback mode, recommended for real embeddings
RESEND_API_KEY=...   # optional
```

If you use the AI worker, keep the same `DATABASE_URL` in both `apps/backend/.env` and `apps/ai-worker/.env`.

### Run locally

```bash
pnpm dev
```

Main local URLs:

- Frontend: `http://localhost:3000`
- Main app entry / Park Sejong PR page: `http://localhost:3000/`
- Legacy Park Sejong PR link: `http://localhost:3000/persona/sejong` -> `http://localhost:3000/`
- AI Sejong page: `http://localhost:3000/ai/sejong`
- Team-fit Explorer: `http://localhost:3000/team-fit`
- Backend API docs: `http://localhost:8000/docs`

### Run with Docker

```bash
pnpm docker
pnpm docker:logs
pnpm docker:down
```

### Quality checks

```bash
pnpm test:backend
pnpm lint
pnpm format
```

## Demo / Screenshots

There are no polished screenshots checked into the repository yet.

For now, the easiest way to explore the product is through these routes:

- `http://localhost:3000/` — Park Sejong PR root page and default shared link
- `http://localhost:3000/persona/sejong` — legacy Park Sejong PR link that now resolves to `/`
- `http://localhost:3000/ai/sejong` — AI Sejong chat page inside the product
- `http://localhost:3000/team-fit` — Team-fit Explorer and recommendations
- `http://localhost:3000/seoul/dashboard` — main community and interview-context flow
- `http://localhost:8000/docs` — backend API documentation
