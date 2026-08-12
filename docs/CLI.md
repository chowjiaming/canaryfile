# CLI spec

canaryfile init
  Interactive-ish scaffold: detects installed agent CLIs, writes a
  commented canaryfile.yaml with 2 example tasks, appends
  .canaryfile/runs/ to .gitignore. Idempotent.

canaryfile record [--tag t] [--runs n] [--task name]
  Runs tasks, writes snapshot. Prints per-task k/n + cost table.

canaryfile test [--tag t] [--strict|--lenient] [--strict-cost]
                [--json|--markdown] [--verbose]
  Runs tasks, compares to latest snapshot, prints verdict table.
  Exit codes: 0 pass, 1 regression, 2 usage/config error,
  3 budget exceeded, 4 adapter not found.

canaryfile diff <snapshotA> <snapshotB> [--markdown]
canaryfile list                        # snapshots + fingerprints
canaryfile badge                       # prints shields.io endpoint
                                       # JSON + markdown snippet

## Default output (test)
  canaryfile test — 3 tasks, 5 runs each, adapter claude-code
  snapshot: 2026-08-01 (model claude-sonnet-W)
  current:  model claude-sonnet-X  ← fingerprint changed

  TASK                    SNAPSHOT   CURRENT   COST     VERDICT
  fix-date-off-by-one     5/5        5/5       $0.31    pass
  add-health-endpoint     5/5        3/5       $0.44    warn
  refactor-logging        4/5        1/5       $0.52    FAIL

  1 regression, 1 warning. exit 1.