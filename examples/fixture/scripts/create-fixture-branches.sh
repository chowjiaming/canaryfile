#!/usr/bin/env bash
# Creates the three fixture/* branches, each introducing exactly one
# bug on top of main. Run once from a clean main, then push:
#   bash examples/fixture/scripts/create-fixture-branches.sh
#   git push origin 'fixture/*'
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
FIX="$ROOT/examples/fixture"
BASE="$(git branch --show-current)"

guard() { git checkout -q "$BASE"; }
trap guard EXIT

# 1. fixture/date-bug — timezone-naive date formatting
git checkout -q -B fixture/date-bug "$BASE"
cat > "$FIX/src/dates.js" <<'EOF'
export function formatEventDate(isoDate) {
  // BUG: new Date("2026-08-12") is parsed as midnight UTC, then
  // formatted in local time — one day behind for TZ behind UTC.
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
EOF
git commit -qam "fixture: introduce timezone date bug"
git checkout -q "$BASE"

# 2. fixture/missing-health — health handler deleted
git checkout -q -B fixture/missing-health "$BASE"
cat > "$FIX/src/health.js" <<'EOF'
// BUG: createHealthHandler was removed in a refactor.
export function createHealthHandler() {
  return { status: "up" };
}
EOF
git commit -qam "fixture: break health handler shape"
git checkout -q "$BASE"

# 3. fixture/logging-regression — error level dropped
git checkout -q -B fixture/logging-regression "$BASE"
cat > "$FIX/src/logging.js" <<'EOF'
// BUG: "error" missing — error logs are silently dropped.
const LEVELS = ["debug", "info", "warn"];

export function wrapLogger(logger) {
  const wrapped = {};
  for (const level of LEVELS) {
    wrapped[level] = (...args) => logger[level](...args);
  }
  return wrapped;
}
EOF
git commit -qam "fixture: drop error log level"
git checkout -q "$BASE"

trap - EXIT
echo "Created fixture/date-bug, fixture/missing-health, fixture/logging-regression"