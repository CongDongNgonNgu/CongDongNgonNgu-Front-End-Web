# Member locale acceptance

Phase24 extends the existing LNG-19-006 foundation. These optional scripts exercise rendered browser UI using isolated synthetic data, with no database or upstream mutations. Build first with the existing default root-relative /api/v1 API path.

- member-locale-fixture-server.mjs: loopback synthetic API + current dist.
- verify-member-locale-runtime.mjs: vi/en,320/375/390/412/768/1024/1440, member forms/profile/exchange, canonical payloads and locale/session/history preservation.
- verify-member-locale-a11y.mjs: axe + actual keyboard focus/validation/dialog checks, vi/en at390/1440. Manual screen reader is not covered.

Provide optional installed tooling via MEMBER_LOCALE_PLAYWRIGHT_MODULE and MEMBER_LOCALE_AXE_PATH. No browser/a11y dependency is added to the app. Browser launch can use MEMBER_LOCALE_BROWSER_EXECUTABLE or MEMBER_LOCALE_BROWSER_CHANNEL. Artifact destinations: MEMBER_LOCALE_ARTIFACT_DIR and MEMBER_LOCALE_A11Y_DIR. Generated artifacts are ignored.

MEMBER_LOCALE_TARGET_ORIGIN runs against deployed frontend static assets with a strictly bounded synthetic API adapter. The report explicitly distinguishes this from live Backend/auth acceptance; all API mutations stay in the loopback fixture. Unexpected external requests abort and fail. Public live GET observations are recorded separately in Workspace. No real private session/data is required.

Detailed source/copy/error/privacy, initial failures, remediations and final accepted revision evidence belong in the authoritative Workspace Phase24 dossier.
