import pc from "picocolors";
import type { TaskExecution } from "../runner/executor.js";
import { spentUsd } from "../runner/budget.js";
import type { TaskCompare } from "../stats/compare.js";

export function formatRecordTable(executions: TaskExecution[]): string {
  const header = `${pc.bold("TASK".padEnd(28))} ${"RESULT".padEnd(8)} COST`;
  const rows = executions.map((execution) => {
    const passes = execution.runs.filter((run) => run.passed).length;
    const n = execution.runs.length;
    const cost = spentUsd(execution.runs.map((run) => run.costUsd));
    const costLabel = execution.runs.every((run) => run.costUsd === null)
      ? "—"
      : `$${cost.toFixed(2)}`;
    const result = execution.incomplete
      ? `${passes}/${n}*`
      : `${passes}/${n}`;
    return `${execution.task.name.padEnd(28)} ${result.padEnd(8)} ${costLabel}`;
  });
  return [header, ...rows].join("\n");
}

export function formatTestTable(rows: TaskCompare[], verbose: boolean): string {
  const header = verbose
    ? `${pc.bold("TASK".padEnd(28))} ${"SNAPSHOT".padEnd(10)} ${"CURRENT".padEnd(10)} ${"COST".padEnd(8)} ${"VERDICT".padEnd(8)} INTERVAL`
    : `${pc.bold("TASK".padEnd(28))} ${"SNAPSHOT".padEnd(10)} ${"CURRENT".padEnd(10)} ${"COST".padEnd(8)} VERDICT`;
  const body = rows.map((row) => {
    const verdict = row.verdict === "fail" ? "FAIL" : row.verdict;
    const base = `${row.name.padEnd(28)} ${row.snapshotKn.padEnd(10)} ${row.currentKn.padEnd(10)} ${row.costLabel.padEnd(8)} ${verdict}`;
    return verbose ? `${base.padEnd(68)} ${row.intervalLabel}` : base;
  });
  return [header, ...body].join("\n");
}
