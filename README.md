# CongDongNgonNgu Frontend

This repository is the independent web foundation for CongDongNgonNgu. Phase
00 intentionally ships a neutral responsive shell, a versioned API client,
and a not-found boundary for all domain routes. Authentication, language
profiles, community workflows, Firebase, PWA behavior, and production
endpoints are deferred to their approved phases.

## Local commands

```text
npm ci
npm run typecheck
npm test
npm run build
```

The local API base defaults to `/api/v1` and is configurable through
`VITE_API_BASE_URL`. Vite proxies that path to the independent local backend
at `http://localhost:3000`; no production API URL is committed. Explicit absolute API origins are validated against the independent-product
host denylist; the same-origin default remains the safe local baseline.

## CI and deployment boundary

CI runs on pull requests and pushes to `main` and checks install, lint, types, unit tests, build, and dependency audit. Phase 00 configures no deployment workflow; production deployment remains a separate approved task.

## Implementation references

The shell follows the official React, Vite, and React Router documentation:

- https://react.dev/learn
- https://vite.dev/guide/
- https://reactrouter.com/home
