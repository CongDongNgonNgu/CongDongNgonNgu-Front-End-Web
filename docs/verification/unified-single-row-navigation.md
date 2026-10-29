# Unified single-row navigation

Scope: Frontend dev / Vercel TEST only. Backend, authentication contracts, routes, database, main and production deployment configuration are unchanged.

The previous desktop authenticated CSS wrapped the task navigation into a full-width second row. Desktop now shares one logo / navigation / utility-actions order for both authentication states. Account retains its accessible name while showing its existing avatar and chevron. Brand text is shown from 1280px; navigation decoration is compact below 1200px. Tablet below 1024px uses the existing drawer and mobile header, retaining a 72px row from 768px. Mobile retains its existing 56px row and bottom navigation.

## Observed comparison

Measurements include the 1px header border. Vietnamese home page at 1440px:

| State | Previous TEST header | Updated header | Previous h1 top | Updated h1 top |
| --- | ---: | ---: | ---: | ---: |
| Anonymous | 73px | 73px | 272.0625px | 272.0625px |
| Authenticated | 119px | 73px | 318.0625px | 272.0625px |

At 390px both states remain 57px, with h1 top 109.796875px. Updated desktop/tablet states are 73px at every tested width from 768px. No header-height or hero-position change was observed during delayed authentication bootstrap, login or logout at 390, 768, 1024 and 1440px.

## Verification

- `npm ci`: pass; lockfile unchanged.
- `npm run typecheck`, `npm run lint`, `npm test -- --run`: pass, 146 files / 827 tests.
- `npm run build`, `npm run performance:check`: pass.
- `npm audit --audit-level=moderate`: pass, zero vulnerabilities.
- Deployment Node safety tests on Windows: 1 passed, 5 platform-specific tests skipped. Linux shell/deployment gates remain part of required GitHub CI.
- `scripts/verify-navigation-runtime.mjs`: 52 layout measurements across Vietnamese/English, anonymous/authenticated at 320, 375, 390, 412, 768, 1024, 1280, 1440, 1920px, plus loading/login/logout transitions. Checks viewport containment, overlapping desktop controls, header height and hero position.
- Browser interactions: keyboard/focus return, Escape, outside click, route-close, browser back/forward, direct URL active state, account, notifications, search, language changes and mobile drawer route parity.
- Axe WCAG A/AA header checks: zero violations for both authentication states at 390 and 1440px.
- Screenshots captured and visually reviewed for desktop/mobile anonymous/authenticated.

Browser verification uses Chrome via the existing optional Playwright tooling. Chrome DevTools MCP was unavailable because its profile was already in use. No application dependency was added. API responses are isolated synthetic fixtures, including auth/notifications; these results verify actual frontend assets and behavior, not live backend authentication or database integration.

## Reproduce

Use existing optional `playwright-core` and `axe-core` tools. Set `HEADER_PLAYWRIGHT_MODULE` to the module path if it is outside this repository, and `HEADER_AXE_PATH` to `axe-core/axe.js` to include accessibility checks. Build first, then run:

```text
node scripts/verify-navigation-runtime.mjs
```

Artifacts default to ignored `artifacts/navigation/`: `report.json` and `vi-{anonymous,authenticated}-{390,1440}.png`. Set `HEADER_TARGET_ORIGIN` to the Vercel TEST origin to verify deployed frontend assets with isolated synthetic API responses. Set `HEADER_ARTIFACT_DIR` to keep a separate report. `HEADER_BASELINE=1` records the old layout for comparison without asserting the new design.

Rollback, if required, is a normal revert PR targeting dev. No production workflow activation is required.

## Isolated main release verification ? 2026-10-29

Source cherry-picked: cf24061bd6a741b7ac3fe2aa8214a967fd42b568. Release branch starts from main containing the accepted OAuth CSRF hotfix; no auth/session application file is changed. The synthetic member fixture now answers /auth/csrf to match that existing main contract.

Local lint, typecheck, 146 test files / 831 tests, Production-API build, performance budget and high-severity audit passed (zero vulnerabilities). Runtime checks passed all 52 measurements at 320/375/390/412/768/1024/1280/1440/1920px, two locales, both auth states, loading/login/logout transitions, keyboard/drawer/dropdowns and four axe header checks. These browser sessions use synthetic API data and do not constitute a live Google-account login acceptance. Production verification remains a post-CD gate.
