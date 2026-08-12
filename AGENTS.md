# Project conventions

## Language boundary (hard rule)
- `src/` is strict TypeScript: no `any`, zod at every I/O boundary.
- `examples/fixture/` is INTENTIONALLY plain JavaScript. It is frozen
  test data for the demo. NEVER convert it to TypeScript, never add
  types, never add dependencies to its package.json, never "clean it
  up." If a task seems to require editing it, stop and ask.

## Fixture branches (hard rule)
- The `fixture/*` branches contain deliberate bugs. NEVER merge them
  into main, never fix the bugs on those branches, never delete them.

## Build & test
- Typecheck: `npm run typecheck` (src/ only)
- Unit tests: `npm test`
- Integration tests run against examples/fixture and require the
  fixture/* branches to exist.

## Read first
- docs/OVERVIEW.md before any product decision
- docs/ARCHITECTURE.md before creating any module
- docs/STATS.md before touching stats/ — the reference verdict table
  must pass as unit tests
- ROADMAP.md for milestone scope — do not build beyond the current
  milestone