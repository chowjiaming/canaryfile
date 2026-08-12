import pc from "picocolors";
import type { TaskExecution } from "../runner/executor.js";
import { spentUsd } from "../runner/budget.js";

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
