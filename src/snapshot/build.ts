import type { TaskExecution } from "../runner/executor.js";
import { isFlakyInterval, wilsonInterval } from "../stats/wilson.js";
import { median, type Snapshot, type TaskSnapshot } from "./format.js";
import type { Fingerprint } from "./fingerprint.js";

export function buildTaskSnapshot(execution: TaskExecution): TaskSnapshot {
  const verifierFailures: Record<string, number> = {};
  for (const run of execution.runs) {
    for (const result of run.verifierResults) {
      if (result.exitCode !== 0) {
        verifierFailures[result.cmd] = (verifierFailures[result.cmd] ?? 0) + 1;
      }
    }
  }

  const costs = execution.runs
    .map((run) => run.costUsd)
    .filter((value): value is number => value !== null);
  const tokensIn = execution.runs
    .map((run) => run.tokensIn)
    .filter((value): value is number => value !== null);
  const tokensOut = execution.runs
    .map((run) => run.tokensOut)
    .filter((value): value is number => value !== null);
  const durations = execution.runs.map((run) => run.durationMs);
  const passes = execution.runs.filter((run) => run.passed).length;
  const runs = execution.runs.length;
  const flaky = runs > 0 && isFlakyInterval(wilsonInterval(passes, runs));

  return {
    runs,
    passes,
    flaky,
    costUsdMedian: median(costs),
    tokensInMedian: median(tokensIn),
    tokensOutMedian: median(tokensOut),
    durationMsMedian: median(durations),
    verifierFailures,
  };
}

export function buildSnapshot(input: {
  createdAt: string;
  fingerprint: Fingerprint;
  executions: TaskExecution[];
}): Snapshot {
  const tasks: Snapshot["tasks"] = {};
  for (const execution of input.executions) {
    tasks[execution.task.name] = buildTaskSnapshot(execution);
  }
  return {
    version: 1,
    createdAt: input.createdAt,
    fingerprint: input.fingerprint,
    tasks,
  };
}
