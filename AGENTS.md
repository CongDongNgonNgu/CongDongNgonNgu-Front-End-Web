# AGENTS.md — CongDongNgonNgu Frontend Rules

Scope: the entire `CongDongNgonNgu-Front-End-Web` repository.

This file is the repo-local execution policy for Codex. The canonical cross-repository baseline lives in `CongDongNgonNgu-Workspace/docs/engineering/FRONTEND-ARCHITECTURE.md`; when Workspace is available, read it as part of preflight. This file is intentionally self-contained so a fresh frontend-only Codex session still follows the established architecture.

## Mandatory preflight
Before editing frontend code:
1. Read this file.
2. If the Workspace repository is available, read its root `AGENTS.md`, `state/PROJECT-STATE.md`, current phase documents, `docs/engineering/CODEX-WORKING-RULES.md`, and `docs/engineering/FRONTEND-ARCHITECTURE.md`.
3. Inspect the real source, relevant tests, CSS modules, route/config/API boundaries, neighbouring components, and git state.
4. Identify the smallest maintainable change that satisfies the current task.
5. For a new user-facing page, global shell surface, or substantial redesign, confirm the required Stitch MCP design work is complete before implementation.

Do not rely on remembered instructions from a previous Codex session.

## Non-negotiable architecture rules

### Component ownership
A React component owns behavior and styles that are specific to that component. Prefer colocated files:

```text
Component.tsx
Component.module.css
```

When extracting a component, move its component-specific CSS with it. Do not place unrelated child-component styles into a feature-wide dumping stylesheet.

Shared CSS is allowed only when it represents one genuinely shared responsibility used by multiple consumers.

### Page responsibility
Pages should primarily handle:
- composition;
- routing/navigation boundaries;
- top-level loading/error state;
- orchestration between focused feature parts.

Do not let a page become a mixed UI + API + persistence + browser-history + search-keyboard + validation + payload-mapping monolith.

Move coherent complex React behavior to `hooks/`. Move transport to services/API clients. Move pure validation, mapping, sanitization, persistence, catalog operations, calculations, and state transforms into focused domain modules.

### Split by responsibility, not line count
Large files are a review signal, not an automatic failure. Split when responsibilities change independently or become difficult to locate/test. Do not fragment cohesive code just to make files short.

### Preserve established patterns
Use current architecture as the default instead of inventing a competing pattern. Important reference areas include:
- `src/features/auth` for focused auth components/pages and CSS ownership;
- `src/features/onboarding` for step components, hooks, and focused draft/language/profile/validation modules;
- `src/components/layout/Header` for shell/orchestration separated from desktop/mobile/search/drawer/auth-action components.

Do not collapse these patterns back into monolithic files in later phases.

### Shared primitives
Prefer existing `src/components/ui` and layout primitives when their semantics fit. Do not create a duplicate primitive without a concrete reason.

Do not promote feature-specific UI into the global design system prematurely. Promote only when the API and semantics are genuinely cross-feature.

## CSS rules
- Use CSS Modules for component/feature-specific styling.
- Colocate component-specific CSS with its owning component.
- Keep global CSS for resets, tokens, typography foundations, deliberate global layout utilities, and truly application-wide behavior.
- Do not reach through broad selectors into unrelated component internals merely to avoid creating the correct local CSS module.
- Remove dead selectors/imports when ownership moves.
- Preserve focus-visible, error, disabled, selected, loading, responsive, and accessibility states during refactors.
- Do not create files such as a giant `Feature.module.css` that become a dumping ground for unrelated feature children.

## Hooks and domain modules
A hook must represent one coherent React behavior; it must not become a new dumping file for everything removed from a page.

Keep pure functions outside hooks when they can be tested as domain logic. Typical focused modules include validation, payload mapping, draft persistence, catalog filtering, normalization, and state transforms.

A compatibility barrel is acceptable when splitting an established public module would otherwise cause noisy unrelated import churn. Removing that barrel later should be a deliberate task.

## Refactor-only safety
When a task is explicitly a refactor:
- do not redesign the UI;
- do not change routes or backend contracts;
- do not change storage keys or auth/session semantics;
- do not alter copy unless the task explicitly requires it;
- preserve keyboard behavior, focus management, ARIA semantics, and responsive output;
- do not weaken tests or rewrite expectations merely to make a regression pass.

A pure refactor that intentionally preserves an already approved UI does not require a new Stitch design.

## New UI and redesigns
For a new user-facing page, global shell surface, or substantial redesign, follow the Workspace Stitch MCP policy. Inspect current tokens/components and neighbouring pages first, obtain/refine the design through Stitch, then implement it with project-native components rather than copying generated markup wholesale.

Verify applicable major surfaces at 320, 375, 390, 412, 768, 1024, and 1440 px.

## Accessibility
Accessibility is part of architecture and acceptance. Preserve or implement semantic HTML, labelled controls, keyboard-complete interaction, visible focus, correct overlay/dialog/drawer semantics, useful async feedback, and focus return/Escape handling where relevant.

## Verification gate
Before frontend work is complete, run every applicable gate:

```text
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm audit --audit-level=high
```

Also run focused/task-specific tests and any required responsive, accessibility, visual, integration, or E2E verification. Required CI must be green before merge/completion.

## Completion review
Before reporting the task complete, inspect the actual diff and confirm:
- component-specific styles have a clear owner;
- no new mixed-responsibility page/module/stylesheet was introduced;
- complex React behavior is separated coherently where appropriate;
- pure domain logic is not unnecessarily coupled to React;
- existing primitives/patterns were reused where they fit;
- refactors preserved behavior, accessibility, API contracts, and responsive behavior;
- all applicable tests/build/audit/CI gates passed.

If architecture conformance is unresolved, the task is not complete even if tests pass.
