import { CliError, EXIT } from "../cli-error.js";
import type {
  AgentAdapter,
  AgentOutcome,
  ProcessResult,
  RunContext,
  RunProcess,
} from "./types.js";
import { writeTranscript } from "./transcript.js";

const TOKEN = /\{\{prompt\}\}|\{\{workdir\}\}|[^\s]+/g;

export function parseCommandTemplate(template: string): string[] {
  const tokens = template.trim().match(TOKEN);
  if (tokens === null || tokens.length === 0) {
    throw new CliError("custom adapter requires agent.command", EXIT.usage);
  }
  return tokens;
}

export function renderCustomArgv(input: {
  template: string;
  prompt: string;
  workdir: string;
}): { file: string; args: string[] } {
  const tokens = parseCommandTemplate(input.template).map((token) =>
    token
      .replaceAll("{{prompt}}", input.prompt)
      .replaceAll("{{workdir}}", input.workdir),
  );
  const file = tokens[0];
  if (file === undefined || file.length === 0) {
    throw new CliError("custom adapter requires agent.command", EXIT.usage);
  }
  return { file, args: tokens.slice(1) };
}

export function createCustomAdapter(input: {
  runProcess: RunProcess;
  command: string;
}): AgentAdapter {
  const argvPreview = parseCommandTemplate(input.command);
  const binary = argvPreview[0] ?? "custom";

  return {
    id: "custom",
    async detect() {
      try {
        await input.runProcess(binary, ["--help"], {
          cwd: process.cwd(),
          timeoutMs: 10_000,
        });
        return true;
      } catch {
        return false;
      }
    },
    async version() {
      return "custom";
    },
    async run(task: { prompt: string }, ctx: RunContext): Promise<AgentOutcome> {
      const { file, args } = renderCustomArgv({
        template: input.command,
        prompt: task.prompt,
        workdir: ctx.cwd,
      });
      let result: ProcessResult;
      try {
        result = await input.runProcess(file, args, {
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
      return {
        costUsd: null,
        tokensIn: null,
        tokensOut: null,
        durationMs: result.durationMs,
        model: null,
        transcriptPath: ctx.transcriptPath,
        timedOut: result.timedOut,
        exitCode: result.exitCode,
      };
    },
  };
}
