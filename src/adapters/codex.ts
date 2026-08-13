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

function usageFrom(record: Record<string, unknown>): {
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
} {
  const usage = asRecord(record.usage);
  return {
    tokensIn: usage ? asNumber(usage.input_tokens) : null,
    tokensOut: usage ? asNumber(usage.output_tokens) : null,
    costUsd:
      asNumber(record.total_cost_usd) ??
      asNumber(record.cost_usd) ??
      (usage ? (asNumber(usage.total_cost_usd) ?? asNumber(usage.cost_usd)) : null),
  };
}

export function parseCodexJsonl(stdout: string): {
  costUsd: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  model: string | null;
} {
  let costUsd: number | null = null;
  let tokensIn: number | null = null;
  let tokensOut: number | null = null;
  let model: string | null = null;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const root = asRecord(parsed);
    if (!root) {
      continue;
    }
    const usage = usageFrom(root);
    if (usage.tokensIn !== null) {
      tokensIn = usage.tokensIn;
    }
    if (usage.tokensOut !== null) {
      tokensOut = usage.tokensOut;
    }
    if (usage.costUsd !== null) {
      costUsd = usage.costUsd;
    }
    const nestedModel = asString(root.model);
    if (nestedModel !== null) {
      model = nestedModel;
    }
  }

  return { costUsd, tokensIn, tokensOut, model };
}

export function buildCodexArgs(input: { prompt: string; model: string }): string[] {
  const args = [
    "exec",
    "--json",
    "--sandbox",
    "workspace-write",
    "--ephemeral",
  ];
  if (input.model !== "default") {
    args.push("--model", input.model);
  }
  args.push("--", input.prompt);
  return args;
}

export function createCodexAdapter(input: {
  runProcess: RunProcess;
  model: string;
}): AgentAdapter {
  return {
    id: "codex",
    async detect() {
      try {
        await input.runProcess("codex", ["--version"], {
          cwd: process.cwd(),
          timeoutMs: 10_000,
        });
        return true;
      } catch {
        return false;
      }
    },
    async version() {
      const result = await input.runProcess("codex", ["--version"], {
        cwd: process.cwd(),
        timeoutMs: 10_000,
      });
      return result.stdout.trim() || result.stderr.trim();
    },
    async run(task: { prompt: string }, ctx: RunContext): Promise<AgentOutcome> {
      const args = buildCodexArgs({ prompt: task.prompt, model: input.model });
      let result: ProcessResult;
      try {
        result = await input.runProcess("codex", args, {
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
      const transcript = [result.stdout, result.stderr].filter(Boolean).join("\n");
      await writeTranscript(ctx.transcriptPath, transcript);
      const parsed = parseCodexJsonl(result.stdout);
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
