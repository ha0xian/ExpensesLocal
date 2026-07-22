# Plan: Account Authentication

## Goal

Add Supabase-backed user accounts and require authentication before accessing expense data, with each authenticated user receiving an isolated app state.

## Context

The React 19/Vite client calls a FastAPI `/api` backend. The backend currently stores one complete state document in either a single PostgreSQL `app_state` row (`id = "default"`) or a local CSV file. No endpoint or UI currently authenticates a caller. PostgreSQL is already Supabase-compatible, making Supabase Auth the smallest production-ready addition.

## Assumptions

- Production supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `DATABASE_URL`.
- Supabase email/password authentication is enabled.
- Existing production state may be assigned to a configured migration user; otherwise new users start from defaults.
- Local CSV mode remains a trusted single-user development mode when `AUTH_DISABLED=true`.

## Open Questions

- Which production user, if any, should receive the existing shared state? This is handled through an explicit migration setting rather than guessed.

## Files To Modify

- `package.json`: add the Supabase browser client.
- `backend/requirements.txt`: add JWT verification dependencies.
- `backend/app/config.py`: expose authentication configuration.
- `backend/app/main.py`: configure CORS for authorization requests.
- `backend/app/routes.py`: require an authenticated user on protected routes.
- `backend/app/state_service.py`: pass the authenticated user through persistence operations.
- `backend/app/storage.py`: select user-scoped PostgreSQL state and preserve local development behavior.
- `backend/app/postgres_storage.py`: key app state by user ID and support safe legacy migration.
- `backend/tests/conftest.py`: set explicit test auth behavior.
- `backend/tests/test_api.py`: test protected endpoint behavior and user scoping integration points.
- `backend/tests/test_postgres_storage.py`: test user-keyed SQL behavior.
- `src/App.jsx`: gate the expense application behind an authenticated session and expose sign-out.
- `src/components/TopBar.jsx`: display account identity and sign-out action.
- `src/lib/api-client.js`: attach access tokens and handle unauthorized responses.
- `src/styles.css`: style authentication screens.
- `README.md`: document Supabase configuration, migration, and local development.

## Files To Add

- `backend/app/auth.py`: validate Supabase bearer tokens and return a typed current user.
- `backend/tests/test_auth.py`: focused token/configuration authentication tests.
- `src/lib/supabase.js`: initialize the Supabase client from Vite environment variables.
- `src/components/AuthGate.jsx`: session bootstrap plus sign-in, sign-up, reset, and sign-out UI.
- `.env.example`: document required frontend environment variables.

## Do Not Touch

- Do not change expense calculation behavior or API response shapes.
- Do not refactor views or business services unrelated to user context.
- Do not expose the Supabase service-role key to the browser.
- Do not silently assign legacy shared data to an arbitrary user.
- Do not add database schemas beyond the app-state ownership change.

## Function Signatures And Interfaces

- `get_current_user(authorization: str | None) -> AuthenticatedUser`: verifies a bearer JWT and returns `id` and optional `email`; raises HTTP 401 on failure.
- Protected FastAPI handlers accept `user: AuthenticatedUser = Depends(get_current_user)` and pass `user.id` to state-service functions.
- `load_state_from_database(database_url: str, user_id: str) -> dict | None` and `save_state_to_database(state: dict, database_url: str, user_id: str) -> None` isolate rows by user.
- `setAccessToken(token: str | null) -> void` updates the client token used by all API calls.
- Missing, expired, malformed, or unverifiable credentials return HTTP 401 without touching persisted state.

## Implementation Steps

1. Add environment-driven backend auth configuration and Supabase JWT validation.
2. Require authentication on all data endpoints while leaving `/api/health` public.
3. Thread user IDs through state services and PostgreSQL persistence.
4. Migrate the `app_state` table to user-keyed rows without implicitly exposing legacy data.
5. Add the Supabase browser client, session gate, account forms, and sign-out control.
6. Attach the active access token to API requests and surface expired-session behavior.
7. Add focused backend tests and run backend plus frontend build verification.
8. Document environment setup and legacy-state migration.

## Acceptance Criteria

- [ ] Unauthenticated callers cannot read or mutate expense data in production auth mode.
- [ ] Users can sign up, sign in, reset a password, persist a session, and sign out.
- [ ] Every authenticated API request carries and validates a Supabase access token.
- [ ] Two user IDs read and write different PostgreSQL state rows.
- [ ] Existing local CSV development and backend tests work only through an explicit auth-disabled setting.
- [ ] Health checks remain public.
- [ ] Legacy shared state is not exposed without explicit migration configuration.

## Testing Requirements

- Modify `backend/tests/test_api.py` with integration tests proving `/api/health` is public and `/api/state` rejects missing credentials when auth is enabled.
- Add `backend/tests/test_auth.py` unit tests for disabled development auth, missing bearer tokens, and verified-token user extraction.
- Modify `backend/tests/test_postgres_storage.py` with unit tests proving user IDs participate in reads and upserts.
- Run `python -m pytest` from `backend`; all tests must pass.
- Run `npm run build`; the production frontend build must succeed.
- Browser end-to-end testing against a real Supabase tenant is out of scope because credentials are external.

## Edge Cases

- Missing environment configuration, malformed authorization headers, expired tokens, Supabase key rotation, email confirmation requirements, reset-email redirects, session expiry, legacy database rows, and local CSV mode.

## Risks

- Supabase JWT signing configuration can vary by project; JWKS verification must follow the project issuer and audience claims.
- Converting a shared-state primary key requires a careful idempotent migration.
- Existing production data needs an operator-selected owner.

## Out Of Scope

- Social login, MFA, organization/team sharing, roles, paid plans, account deletion, and a normalized per-transaction database schema.

## Done Definition

- [ ] Authentication and per-user isolation are implemented.
- [ ] Essential tests and frontend build pass.
- [ ] Configuration and migration steps are documented.
- [ ] No unrelated files or behavior are changed.
