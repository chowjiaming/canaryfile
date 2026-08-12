# Snapshot format

Path: .canaryfile/snapshots/<ISO-date>-<fingerprint-short>.json
Latest pointer: .canaryfile/snapshots/latest.json (copy, not symlink)
Snapshots are committed to git. .canaryfile/runs/ is gitignored.

{
  "version": 1,
  "createdAt": "2026-08-12T21:00:00Z",
  "fingerprint": {
    "adapter": "claude-code",
    "agentVersion": "1.2.3",
    "model": "claude-sonnet-X",
    "configHash": "sha256:...",     // canaryfile.yaml
    "contextHash": "sha256:..."    // CLAUDE.md + .mcp.json, sorted
  },
  "tasks": {
    "fix-date-off-by-one": {
      "runs": 5,
      "passes": 5,
      "flaky": false,
      "costUsdMedian": 0.31,
      "tokensInMedian": 41200,
      "tokensOutMedian": 3800,
      "durationMsMedian": 84000,
      "verifierFailures": {}        // cmd → count, for debugging
    }
  }
}

## Rules
- `canaryfile record` always writes a NEW dated snapshot and updates
  latest.json. Never mutate history.
- `canaryfile test` compares against latest.json only.
- Fingerprint mismatch between snapshot and current environment is
  printed prominently — it is the expected case (model upgraded!),
  not an error.
- `canaryfile diff <snapA> <snapB>` renders a markdown table of
  per-task deltas (pass rate, cost, tokens) for PR descriptions.