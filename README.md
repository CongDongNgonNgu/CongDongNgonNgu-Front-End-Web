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
at `http://localhost:3000`; no production API URL is committed.

## Implementation references

The shell follows the official React, Vite, and React Router documentation:

- https://react.dev/learn
- https://vite.dev/guide/
- https://reactrouter.com/home
