import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentAdapter } from "../adapters/types.js";
import type { ResolvedTask } from "../config/select.js";
import { allPassed, runVerifiers, type VerifierResult } from "../grade/verify.js";
import { budgetExceeded, remainingBudgetUsd } from "./budget.js";
import { createWorktree, removeWorktree } from "./worktree.js";

export type GradedRun = {
  passed: boolean;
  verifierResults: VerifierResult[];
  costUsd: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  transcriptPath: string;
};

export type TaskExecution = {
  task: ResolvedTask;
  runs: GradedRun[];
  incomplete: boolean;
};

export async function executeTask(input: {
  task: ResolvedTask;
  adapter: AgentAdapter;
  gitRoot: string;
  yamlDir: string;
  timeoutMs: number;
  createdAt: string;
}): Promise<TaskExecution> {
  const runs: GradedRun[] = [];
  const costs: (number | null)[] = [];
  const runsDir = path.join(
    input.yamlDir,
    ".canaryfile",
    "runs",
    input.createdAt,
  );
  await mkdir(runsDir, { recursive: true });

  for (let i = 1; i <= input.task.runs; i += 1) {
    const remaining = remainingBudgetUsd(input.task.budget, costs);
    const worktree = await createWorktree({
      gitRoot: input.gitRoot,
      yamlDir: input.yamlDir,
      taskName: input.task.name,
      runIndex: i,
      setup: input.task.setup,
    });
    const transcriptPath = path.join(runsDir, `${input.task.name}-${i}.json`);
    try {
      const outcome = await input.adapter.run(
        { prompt: input.task.prompt },
        {
          cwd: worktree.cwd,
          timeoutMs: input.timeoutMs,
          remainingBudgetUsd: Math.max(remaining, 0),
          transcriptPath,
        },
      );
      const verifierResults = await runVerifiers(input.task.verify, worktree.cwd);
      const graded: GradedRun = {
        passed: allPassed(verifierResults),
        verifierResults,
        costUsd: outcome.costUsd,
        tokensIn: outcome.tokensIn,
        tokensOut: outcome.tokensOut,
        durationMs: outcome.durationMs,
        transcriptPath: outcome.transcriptPath,
      };
      runs.push(graded);
      costs.push(graded.costUsd);
    } finally {
      await removeWorktree(input.gitRoot, worktree.path);
    }

    if (budgetExceeded(input.task.budget, costs)) {
      return { task: input.task, runs, incomplete: true };
    }
  }

  return { task: input.task, runs, incomplete: false };
}
