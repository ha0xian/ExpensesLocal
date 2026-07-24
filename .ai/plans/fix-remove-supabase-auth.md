# Plan: Remove Supabase Authentication

## Goal

Replace Supabase with application-owned authentication using the existing FastAPI backend and Neon PostgreSQL.

## Context

The deployed frontend was blocked because it expected Supabase variables, but the project uses Render and Neon. User state is already stored per user in `user_app_state`.

## Assumptions

- Render provides `DATABASE_URL` and a new `AUTH_SECRET`.
- Vercel continues proxying `/api` to Render.

## Open Questions

None.

## Files To Modify

- `backend/app/auth.py`: Neon users, password hashing, and signed sessions.
- `backend/app/main.py`: cookie authentication middleware.
- `backend/requirements.txt`: native-auth dependencies.
- `backend/tests/test_auth.py`: cookie authentication tests.
- `src/components/AuthGate.jsx`: backend registration and login.
- `src/lib/api-client.js`: cookie-based requests.
- `package.json` and lockfile: remove Supabase.
- `.env.example` and `README.md`: Render/Neon configuration.

## Files To Add

- `backend/app/auth_routes.py`: register, login, logout, and current-user endpoints.

## Do Not Touch

- Do not change expense calculations or API response shapes.
- Do not change the Neon app-state isolation model.
- Do not add another authentication provider.

## Function Signatures And Interfaces

- `POST /api/auth/register` accepts `{email, password}`.
- `POST /api/auth/login` accepts `{email, password}`.
- `POST /api/auth/logout` clears the session cookie.
- `GET /api/auth/me` returns `{user: {id, email}}`.
- Passwords use Argon2; sessions use an HTTP-only signed cookie.

## Implementation Steps

1. Add the Neon-backed users table and password functions.
2. Add signed cookie sessions and authentication routes.
3. Replace Supabase frontend calls with backend auth calls.
4. Remove Supabase dependencies and environment variables.
5. Update tests and deployment documentation.

## Acceptance Criteria

- [x] Supabase code and dependencies are removed.
- [x] Accounts are stored in Neon.
- [x] Protected API requests require a valid session cookie.
- [x] Users can register, sign in, persist a session, and sign out.

## Testing Requirements

- Run the complete backend test suite.
- Run the production frontend build.

## Edge Cases

- Duplicate email, invalid password, expired/tampered cookie, missing database, and missing/short secret.

## Risks

- Render must receive a strong `AUTH_SECRET`.
- Password-reset email is not included.

## Out Of Scope

- Email verification, password-reset email, social login, MFA, and account deletion.

## Done Definition

- [x] Tests and build pass.
- [ ] Changes are pushed to `main`.
