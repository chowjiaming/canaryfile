import type {
  AgentAdapter,
  AgentOutcome,
  ProcessResult,
  RunContext,
  RunProcess,
} from "./types.js";
import { writeTranscript } from "./transcript.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseClaudeJson(stdout: string): {
  costUsd: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  model: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return { costUsd: null, tokensIn: null, tokensOut: null, model: null };
  }
  const root = asRecord(parsed);
  if (!root) {
    return { costUsd: null, tokensIn: null, tokensOut: null, model: null };
  }
  const usage = asRecord(root.usage);
  const modelUsage = asRecord(root.modelUsage);
  const modelFromUsage = modelUsage ? (Object.keys(modelUsage)[0] ?? null) : null;
  return {
    costUsd: asNumber(root.total_cost_usd),
    tokensIn: usage ? asNumber(usage.input_tokens) : null,
    tokensOut: usage ? asNumber(usage.output_tokens) : null,
    model: asString(root.model) ?? modelFromUsage,
  };
}

export function buildClaudeArgs(input: {
  prompt: string;
  model: string;
  remainingBudgetUsd: number;
}): string[] {
  const args = [
    "-p",
    input.prompt,
    "--output-format",
    "json",
    "--dangerously-skip-permissions",
    "--max-budget-usd",
    String(input.remainingBudgetUsd),
  ];
  if (input.model !== "default") {
    args.push("--model", input.model);
  }
  return args;
}

export function createClaudeCodeAdapter(input: {
  runProcess: RunProcess;
  model: string;
}): AgentAdapter {
  return {
    id: "claude-code",
    async detect() {
      try {
        await input.runProcess("claude", ["-v"], {
          cwd: process.cwd(),
          timeoutMs: 10_000,
        });
        return true;
      } catch {
        return false;
      }
    },
    async version() {
      const result = await input.runProcess("claude", ["-v"], {
        cwd: process.cwd(),
        timeoutMs: 10_000,
      });
      return result.stdout.trim();
    },
    async run(task: { prompt: string }, ctx: RunContext): Promise<AgentOutcome> {
      const args = buildClaudeArgs({
        prompt: task.prompt,
        model: input.model,
        remainingBudgetUsd: ctx.remainingBudgetUsd,
      });
      let result: ProcessResult;
      try {
        result = await input.runProcess("claude", args, {
          cwd: ctx.cwd,
          timeoutMs: ctx.timeoutMs,
        });
      } catch {
        result = {
          stdout: "",
          stderr: "",
          exitCode: 1,
          timedOut: true,
          durationMs: ctx.timeoutMs,
        };
      }
      await writeTranscript(ctx.transcriptPath, result.stdout);
      const parsed = parseClaudeJson(result.stdout);
      return {
        costUsd: parsed.costUsd,
        tokensIn: parsed.tokensIn,
        tokensOut: parsed.tokensOut,
        durationMs: result.durationMs,
        model: parsed.model,
        transcriptPath: ctx.transcriptPath,
        timedOut: result.timedOut,
        exitCode: result.exitCode,
      };
    },
  };
}
