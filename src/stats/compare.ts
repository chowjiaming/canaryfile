import { median, type Snapshot, type TaskSnapshot } from "../snapshot/format.js";
import { canonicalJson, type Fingerprint } from "../snapshot/fingerprint.js";
import type { TaskExecution } from "../runner/executor.js";
import {
  combineVerdict,
  costVerdict,
  passVerdict,
  type CompareMode,
  type Verdict,
} from "./verdict.js";
import { wilsonInterval } from "./wilson.js";
import { CliError, EXIT } from "../cli-error.js";

export type TaskCompare = {
  name: string;
  snapshotKn: string;
  currentKn: string;
  costUsdMedian: number | null;
  costLabel: string;
  verdict: Verdict;
  intervalLabel: string;
};

export function fingerprintsDiffer(a: Fingerprint, b: Fingerprint): boolean {
  return canonicalJson(a) !== canonicalJson(b);
}

export function compareExecution(input: {
  execution: TaskExecution;
  snapshotTask: TaskSnapshot;
  slack: number;
  costMultiplier: number;
  mode: CompareMode;
  strictCost: boolean;
}): TaskCompare {
  const k1 = input.execution.runs.filter((run) => run.passed).length;
  const n1 = input.execution.runs.length;
  const k0 = input.snapshotTask.passes;
  const n0 = input.snapshotTask.runs;
  const currentCosts = input.execution.runs
    .map((run) => run.costUsd)
    .filter((value): value is number => value !== null);
  const currentMedian = median(currentCosts);
  const pass = passVerdict({
    k0,
    n0,
    k1,
    n1,
    slack: input.slack,
    mode: input.mode,
    flaky: input.snapshotTask.flaky,
  });
  const cost = costVerdict({
    snapshotMedian: input.snapshotTask.costUsdMedian,
    currentMedian,
    costMultiplier: input.costMultiplier,
    strictCost: input.strictCost,
  });
  const currentInterval = n1 > 0 ? wilsonInterval(k1, n1) : null;
  const costLabel =
    currentMedian === null ? "—" : `$${currentMedian.toFixed(2)}`;
  return {
    name: input.execution.task.name,
    snapshotKn: `${k0}/${n0}`,
    currentKn: `${k1}/${n1}`,
    costUsdMedian: currentMedian,
    costLabel,
    verdict: combineVerdict(pass, cost),
    intervalLabel: currentInterval
      ? `[${currentInterval.lower.toFixed(2)}, ${currentInterval.upper.toFixed(2)}]`
      : "",
  };
}

export function compareAll(input: {
  executions: TaskExecution[];
  snapshot: Snapshot;
  slack: number;
  costMultiplier: number;
  mode: CompareMode;
  strictCost: boolean;
}): TaskCompare[] {
  return input.executions.map((execution) => {
    const snapshotTask = input.snapshot.tasks[execution.task.name];
    if (!snapshotTask) {
      throw new CliError(
        `no snapshot for task "${execution.task.name}"; run \`canaryfile record\` first`,
        EXIT.usage,
      );
    }
    return compareExecution({
      execution,
      snapshotTask,
      slack: input.slack,
      costMultiplier: input.costMultiplier,
      mode: input.mode,
      strictCost: input.strictCost,
    });
  });
}
