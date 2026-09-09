# CongDongNgonNgu Frontend

This repository is the independent web foundation for CongDongNgonNgu. Phase
02 adds a typed auth boundary and responsive Vietnamese login, registration,
verification, recovery, reset, and OAuth callback experiences on top of the
existing shell. Profile, community, Firebase, PWA, and production deployment
work remain outside this phase.

## Local commands

```text
npm ci
npm run typecheck
npm test
npm run build
```

The local API base defaults to /api/v1 and is configurable through
VITE_API_BASE_URL. Vite proxies that path to the independent local backend at
http://localhost:3000; no production API URL is committed. Explicit absolute
API origins are validated against the independent-product host denylist.

The auth client bootstraps through refresh, keeps the short-lived access token
in memory, sends credentials for HttpOnly refresh cookies, and mirrors the
readable CSRF cookie on mutations. Auth routes are /login, /register,
/verify-email, /forgot-password, /reset-password, and /auth/callback. Provider
buttons render from backend capabilities and disabled providers do not fake
completion.

## CI and deployment boundary

CI runs on pull requests and pushes to `main` and checks install, lint, types, unit tests, build, and dependency audit. Phase 00 configures no deployment workflow; production deployment remains a separate approved task.

## Implementation references

The shell follows the official React, Vite, and React Router documentation:

- https://react.dev/learn
- https://vite.dev/guide/
- https://reactrouter.com/home
