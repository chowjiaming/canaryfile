import { CliError, EXIT } from "../cli-error.js";
import { createClaudeCodeAdapter } from "./claude-code.js";
import { createCodexAdapter } from "./codex.js";
import { createCustomAdapter } from "./custom.js";
import { execaRunProcess } from "./process.js";
import type { AgentAdapter, RunProcess } from "./types.js";

export function createAdapter(input: {
  adapterId: string;
  model: string;
  command: string | null;
  runProcess?: RunProcess;
}): AgentAdapter {
  const runProcess = input.runProcess ?? execaRunProcess;
  switch (input.adapterId) {
    case "claude-code":
      return createClaudeCodeAdapter({ runProcess, model: input.model });
    case "codex":
      return createCodexAdapter({ runProcess, model: input.model });
    case "custom":
      if (input.command === null || input.command.trim().length === 0) {
        throw new CliError("custom adapter requires agent.command", EXIT.usage);
      }
      return createCustomAdapter({ runProcess, command: input.command });
    default:
      throw new CliError(`adapter not found: ${input.adapterId}`, EXIT.adapter);
  }
}
