# Envelope Expense Tracker

A React + Vite frontend powered by a Python FastAPI backend. The backend owns expense data, business logic, validation, calculations, startup automation, and persistence. The frontend is an API client focused on presentation and user interaction.

## Architecture

```
DATABASE_URL                    <- Neon/PostgreSQL users and app state
backend/data/expense-data.csv   <- local CSV fallback when DATABASE_URL is not set
backend/app/                    <- FastAPI package (models, routes, services, storage, calculations, automation)
src/                            <- React 19 + Vite frontend (API client)
```

All business logic runs server-side. The frontend calls `/api` endpoints (proxied by Vite in dev) and receives state + derived summaries in every response.

## Run Locally

## Accounts and authentication

Production accounts are managed by the FastAPI backend and stored in Neon PostgreSQL. Configure these variables on Render:

```text
DATABASE_URL=postgresql://your-neon-connection-string
AUTH_SECRET=a-random-secret-containing-at-least-32-characters
```

The backend creates a `users` table for email/password accounts and a `user_app_state` table for isolated expense data. Passwords are hashed with Argon2. Signed sessions are stored in secure HTTP-only cookies, so no authentication secrets or provider keys are required by the frontend.

For trusted local CSV development only, set `AUTH_DISABLED=true` and `COOKIE_SECURE=false` on the backend. Authentication-enabled deployments require PostgreSQL so different users can never share the CSV fallback.

The previous `app_state` table is left untouched. To migrate legacy data, export it before deployment, sign in as the intended owner, and import the CSV through that account; this prevents accidental assignment to the wrong user.

### Prerequisites

- Node.js (for the frontend)
- Python 3.10+ (for the backend)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt   # Windows
# source .venv/bin/python -m pip install -r requirements.txt  # macOS / Linux
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend serves on http://127.0.0.1:8000. Health check: http://127.0.0.1:8000/api/health

### Neon / PostgreSQL

Set the Neon `DATABASE_URL` before starting the backend to store accounts and app state in PostgreSQL instead of `backend/data/expense-data.csv`:

```bash
cd backend
$env:DATABASE_URL="postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require"  # Windows PowerShell
# export DATABASE_URL="postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require"  # macOS / Linux
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

On first startup with `DATABASE_URL`, the backend creates an `app_state` table and stores the complete app state as a single `jsonb` document. If a local CSV already exists, it is used to seed the database once; otherwise the default starter state is created.

### Frontend

```bash
npm install
npm run dev
```

Vite proxies `/api` to the backend, so open http://localhost:5173 after both servers are running.

### Production Build

```bash
npm run build
npm run preview
```

Run the focused frontend presentation tests with:

```bash
npm run test:frontend
```

A production deployment would need the FastAPI backend to serve the built `dist/` folder or have a reverse proxy handle both.

### Convenience Scripts

```bash
npm run dev:frontend   # Vite only
npm run dev:backend    # Start FastAPI with auto-reload
```

## Storage And CSV Workflow

- With `DATABASE_URL` set, the backend stores app state in PostgreSQL.
- Without `DATABASE_URL`, the backend stores app state in `backend/data/expense-data.csv` (created automatically on first request).
- Use **Restore backup** to replace the complete server state from an Envelope CSV backup. The app asks for confirmation before replacing data.
- Use **Bank Import** to map and append transactions from a bank CSV. Its preview must succeed before rows can be added.
- Use **Export CSV** to download the current server state.
- Changes from any CRUD operation are saved to the selected backend automatically.
- Automatic transaction rules generate due rows when state is loaded (startup automation).

The import/export CSV uses a `record_type` column so transactions, accounts, categories, subcategories, monthly setup, automatic transactions, and app metadata can live in one file.

## Startup Automation

On each state load, the backend updates `lastAccessedAt`/`lastAutomationRunAt` metadata, advances the selected month when the calendar month changes, and generates due automatic transactions. This is tracked in the selected backend automatically.

## Backend Tests

```bash
cd backend
python -m pytest
```

## Features

- Dashboard KPIs for income, expenses, net cashflow, available to assign, category spend, envelope snapshots, and warnings.
- Transaction add/edit/delete in a shared editor. Edits are validated and saved atomically, while the ledger can be searched and filtered by category, account, and selected/all months.
- Optional automatic recurring rules from the transaction form, with preset or custom recurrence options.
- Month-specific envelope funding, starting balances, and rollover tracking.
- Available To Assign calculated as selected-month income minus selected-month envelope funding.
- Category, subcategory, and account management.
- Generic bank CSV import with column mapping, preview, and transaction creation.
- Non-blocking status warnings for over-assigned months, overdrawn envelopes, invalid transactions, and missing references.

Category budgets and monthly envelope setup use explicit batch saves. If a request fails, the unsaved draft remains available for correction or retry; changes are not reported as saved until the backend confirms them.
