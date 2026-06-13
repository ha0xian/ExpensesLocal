# Envelope Expense CSV

A React + Vite frontend powered by a Python FastAPI backend. The backend owns the normalized CSV expense data, business logic, validation, calculations, startup automation, and persistence. The frontend is an API client focused on presentation and user interaction.

## Architecture

```
backend/data/expense-data.csv   ← server-owned app state (auto-created on first run)
backend/app/                    ← FastAPI package (models, routes, services, CSV storage, calculations, automation)
src/                            ← React 19 + Vite frontend (API client)
```

All business logic runs server-side. The frontend calls `/api` endpoints (proxied by Vite in dev) and receives state + derived summaries in every response.

## Run Locally

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

A production deployment would need the FastAPI backend to serve the built `dist/` folder or have a reverse proxy handle both.

### Convenience Scripts

```bash
npm run dev:frontend   # Vite only
npm run dev:backend    # Start FastAPI with auto-reload
```

## CSV Workflow

- The backend stores app state in `backend/data/expense-data.csv` (created automatically on first request).
- Use **Import CSV** to replace server state from a local CSV file.
- Use **Export CSV** to download the current server state.
- Changes from any CRUD operation are saved to the server CSV automatically.
- Automatic transaction rules generate due rows when state is loaded (startup automation).

The CSV uses a `record_type` column so transactions, accounts, categories, subcategories, monthly setup, automatic transactions, and app metadata can live in one file.

## Startup Automation

On each state load, the backend updates `lastAccessedAt`/`lastAutomationRunAt` metadata, advances the selected month when the calendar month changes, and generates due automatic transactions. This is tracked in the server CSV automatically.

## Backend Tests

```bash
cd backend
python -m pytest
```

## Features

- Dashboard KPIs for income, expenses, net cashflow, available to assign, category spend, envelope snapshots, and warnings.
- Transaction add/edit/delete with category-filtered subcategories.
- Optional automatic recurring rules from the transaction form, with preset or custom recurrence options.
- Month-specific envelope funding, starting balances, and rollover tracking.
- Available To Assign calculated as selected-month income minus selected-month envelope funding.
- Category, subcategory, and account management.
- Generic bank CSV import with column mapping, preview, and transaction creation.
- Non-blocking status warnings for over-assigned months, overdrawn envelopes, invalid transactions, and missing references.
