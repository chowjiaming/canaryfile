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
```
interface AgentAdapter {
  id: string;
  detect(): Promise<boolean>;
  version(): Promise<string>;
  run(task: { prompt: string }, ctx: RunContext): Promise<AgentOutcome>;
}

interface AgentOutcome {
  costUsd: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  model: string | null;     // as reported by the agent; fingerprint uses config model
  transcriptPath: string;
  timedOut: boolean;
  exitCode: number | null;
}
```

The adapter runs the agent only. The executor runs shell verifiers afterward
and builds the recorded result.

## Execution flow (canaryfile record / test)
1. Load + validate canaryfile.yaml
2. Resolve adapter; fail fast if not installed (exit 4)
3. Compute fingerprint (config model, agent version, sha256 of CLAUDE.md,
   .mcp.json at git root, canaryfile.yaml at yaml dir)
4. For each selected task (filter by --task / --tag), sequentially:
   a. git worktree add <yaml-dir>/.canaryfile/worktrees/<task>-<i> <setup ref>
   b. adapter.run() with timeout in the mapped yaml-dir cwd
   c. run verifiers in that cwd
   d. remove worktree
   e. Enforce budget after every run; hard stop remaining runs of that task
5. Write snapshot + latest.json; print k/n + cost table
6. Exit 0 (record finished), 2 (usage), 3 (budget), or 4 (adapter)

`canaryfile test` (compare to latest snapshot, Wilson verdicts, exit 1 on
regression) is M2.

## Key invariants
- The user's working tree and current branch are NEVER modified.
  All agent activity happens in worktrees.
- Worktrees and services are cleaned up on SIGINT/SIGTERM/error.
- Every run's transcript is kept under .canaryfile/runs/ (gitignored);
  snapshots (NOT gitignored) go in .canaryfile/snapshots/.