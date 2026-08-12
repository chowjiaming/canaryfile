# Milestones

## M1 — Core runner (walking skeleton)
- config load/validate, claude-code adapter, worktree isolation,
  shell verifiers, single task end-to-end, transcript capture
- Done when: `canaryfile record` runs one real task in
  examples/fixture and writes a valid snapshot

## M2 — Stats + test command
- wilson.ts + verdict.ts with the reference table as unit tests,
  flaky detection, cost check, snapshot compare, exit codes
- Done when: the full verdict reference table passes in CI, and
  `canaryfile test` exits 1 on a synthetic regression

## M3 — UX + distribution
- init, terminal table, --json/--markdown, codex + custom adapters,
  npm publish, README with demo GIF
- Done when: fresh clone → npm i -g → init → record → test in <5 min

## M4 — CI surface
- GitHub Action with PR comments, badge endpoint, examples/fixture
  dogfooding workflow
- Done when: a PR editing examples/fixture/canaryfile.yaml gets an
  automated pass/fail comment

## Conventions for the implementing agent
- Strict TS, no `any`. zod at every boundary.
- All shell execution via execa with explicit cwd; never shell:true
  with interpolated user input. `run:` verifier strings are the
  documented exception — user's own config, same trust model as
  npm scripts.
- Tests: vitest; stats module needs property-based tests
  (fast-check) in addition to the reference table.
- Commits: conventional commits; every module lands with tests.