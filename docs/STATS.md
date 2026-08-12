# Statistics — verdict computation

## Model
Each task is a Bernoulli trial with unknown pass rate p. A snapshot
records p0 estimated from n0 runs; a test run estimates p1 from n1
runs. n is small (3–25), so use Wilson score intervals, never normal
approximations.

## Wilson score interval
z = 1.96 (95%). For k passes in n trials, phat = k/n:

  denom  = 1 + z²/n
  center = (phat + z²/(2n)) / denom
  half   = (z / denom) * sqrt(phat(1-phat)/n + z²/(4n²))
  L = center - half,  U = center + half

## Regression rule
slack s = 0.1 (configurable: stats.slack in canaryfile.yaml)

  REGRESSION  iff  U(p1, n1) < L(p0, n0) - s
  WARN        iff  intervals do not overlap but regression rule
                   is not met
  PASS        otherwise

Reference verdicts at n0 = n1 = 5, s = 0.1 (encode as unit tests):
  5/5 → 5/5 PASS | 5/5 → 4/5 PASS | 5/5 → 3/5 WARN
  5/5 → ≤2/5 FAIL | 3/5 → 1/5 FAIL | 0/5 → 5/5 PASS (improvement)

## Flaky-task detection
If the snapshot's own interval width (U0 - L0) > 0.5, mark the task
flaky: true in the snapshot. Flaky tasks never gate (reported as
FLAKY, exit code unaffected). Rationale: a task that can't reproduce
its own baseline is noise; failing CI on it destroys trust in the tool.

## Cost/token regression (separate from pass rate)
- Compare median cost per run: COST_REGRESSION iff
  median(cost1) > stats.costMultiplier * median(cost0) (default 1.5)
- Cost regressions are WARN by default; --strict-cost promotes to FAIL
- Tokens: report medians, no verdict (informational only)

## Modes
- default: rules above
- --strict: any interval overlap short of identical = FAIL
- --lenient: FAIL only when p1 == 0

## Reporting honesty
- Always display "k/n", never percentages alone
- --verbose prints [L, U] intervals per task