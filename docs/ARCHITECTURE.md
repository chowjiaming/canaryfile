# Architecture

## Stack
- TypeScript, Node >= 20, ESM
- commander (CLI), zod (config validation), yaml (parsing),
  execa (processes), picocolors (terminal). No other runtime deps
  without discussion.
- Build: tsup → single ESM bundle. Tests: vitest (+ fast-check for
  the stats module).
- Publish: npm `canaryfile`, bin `canaryfile`.

## Module layout
src/
  cli.ts            # commander wiring, exit codes
  config/
    schema.ts       # zod schemas for canaryfile.yaml
    load.ts         # discovery, parse, defaults, validation errors
  adapters/
    types.ts        # AgentAdapter interface
    claude-code.ts  # v1 adapter
    codex.ts        # v1 adapter
    custom.ts       # user-supplied command template
  runner/
    worktree.ts     # create/cleanup git worktrees
    services.ts     # start/ready/stop lifecycle for task services
    executor.ts     # run one task N times, collect RunResults
    budget.ts       # cumulative cost tracking, hard stop
  grade/
    verify.ts       # run shell verifiers, interpret exit codes
  stats/
    wilson.ts       # Wilson score interval
    verdict.ts      # regression rule, flaky detection, cost check
  snapshot/
    format.ts       # types + zod schema
    store.ts        # read/write .canaryfile/snapshots/
    fingerprint.ts  # hash of model, agent version, config files
  report/
    terminal.ts     # human table (default)
    json.ts         # --json
    markdown.ts     # --markdown (PR comments, badge data)

## Adapter interface
interface AgentAdapter {
  id: string;
  detect(): Promise<boolean>;        // is the agent CLI installed?
  version(): Promise<string>;        // for fingerprinting
  run(task: ResolvedTask, ctx: RunContext): Promise<RunResult>;
}

interface RunResult {
  ok: boolean;              // all verifiers passed
  verifierResults: { cmd: string; exitCode: number }[];
  costUsd: number | null;   // null if adapter can't report
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  model: string;            // as reported by the agent
  transcriptPath: string;   // saved under .canaryfile/runs/
}

## Execution flow (canaryfile test)
1. Load + validate canaryfile.yaml
2. Resolve adapter; fail fast if not installed (exit 4)
3. Compute fingerprint (model, agent version, sha256 of CLAUDE.md,
   .mcp.json, canaryfile.yaml)
4. Load latest snapshot; warn if fingerprint changed (that's the
   point — but the user should see WHY results differ)
5. For each selected task (filter by --tag):
   a. git worktree add .canaryfile/worktrees/<task>-<i> <setup ref>
   b. Start services (if any), wait for ready probe
   c. adapter.run() with timeout; then run verifiers in the worktree
   d. Stop services, remove worktree
   e. Enforce budget after every run; hard stop → exit 3
6. Compute verdicts vs snapshot (see docs/STATS.md)
7. Print table; write .canaryfile/runs/<timestamp>/ artifacts
8. Exit 0 (pass), 1 (regression), or 2 (usage error)

## Key invariants
- The user's working tree and current branch are NEVER modified.
  All agent activity happens in worktrees.
- Worktrees and services are cleaned up on SIGINT/SIGTERM/error.
- Every run's transcript is kept under .canaryfile/runs/ (gitignored);
  snapshots (NOT gitignored) go in .canaryfile/snapshots/.