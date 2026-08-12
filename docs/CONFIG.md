# canaryfile.yaml schema

Full annotated example — this is the canonical spec. Validate with
zod; unknown keys are errors (typos must fail loud).

```yaml
version: 1                      # required, must be 1

agent:
  adapter: claude-code          # claude-code | codex | custom
  model: default                # "default" = agent's configured model
  timeout: 300s                 # per run; duration string (s|m)
  command: null                 # custom adapter only; template string,
                                # {{prompt}} and {{workdir}} substituted

defaults:
  runs: 5                       # N per task, 1..25
  budget: 0.50                  # USD per task, hard stop

stats:
  slack: 0.1                    # regression tolerance (see STATS.md)
  costMultiplier: 1.5           # cost regression threshold

tasks:
  - name: fix-date-off-by-one   # required, unique, [a-z0-9-]
    prompt: |                   # required, sent verbatim to the agent
      The /api/events endpoint returns dates one day behind.
      Find and fix the bug.
    setup: null                 # optional git ref (branch/tag/sha) to
                                # check out in the worktree
    verify:                     # required, 1..10 shell commands
      - run: npm test -- events.test.ts
      - run: grep -q "toUTC" src/events.ts
    services: []                # optional list of service names
    runs: null                  # override defaults.runs
    budget: null                # override defaults.budget
    tags: [bugfix, smoke]       # for --tag filtering

services:
  server:
    start: npm run dev          # run in worktree, backgrounded
    ready: curl -sf localhost:3000/health   # retried every 2s, 30s cap
    stop: null                  # default: kill process group
```

## Semantics
- A run passes iff ALL verify commands exit 0 within the worktree.
- `setup` refs let you pin a broken fixture (e.g. a branch with a
  known bug) so the task is reproducible forever.
- Verifiers run AFTER the agent process exits, in the worktree.
- Budget is cumulative across runs of a task; exceeding it stops
  remaining runs for that task (task marked INCOMPLETE, exit 3).