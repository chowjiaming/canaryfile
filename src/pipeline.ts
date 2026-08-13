import { createAdapter } from "./adapters/resolve.js";
import type { AgentAdapter } from "./adapters/types.js";
import { CliError, EXIT } from "./cli-error.js";
import { loadConfig, type LoadedConfig } from "./config/load.js";
import { selectTasks, type RecordFilters, type ResolvedTask } from "./config/select.js";
import { executeTask, type TaskExecution } from "./runner/executor.js";
import { installWorktreeCleanup, uninstallWorktreeCleanup } from "./runner/worktree.js";
import { computeFingerprint, type Fingerprint } from "./snapshot/fingerprint.js";

export type RunOptions = RecordFilters & {
  cwd: string;
  now?: () => Date;
  adapter?: AgentAdapter;
  handleSignals?: boolean;
};

export type PipelineResult = {
  loaded: LoadedConfig;
  tasks: ResolvedTask[];
  executions: TaskExecution[];
  fingerprint: Fingerprint;
  createdAt: string;
};

function utcTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function resolveAdapter(
  loaded: LoadedConfig,
  injected: AgentAdapter | undefined,
): AgentAdapter {
  if (injected) {
    return injected;
  }
  return createAdapter({
    adapterId: loaded.config.agent.adapter,
    model: loaded.config.agent.model,
    command: loaded.config.agent.command,
  });
}

export async function runPipeline(options: RunOptions): Promise<PipelineResult> {
  const handleSignals = options.handleSignals ?? true;
  if (handleSignals) {
    installWorktreeCleanup();
  }

  try {
    const loaded = await loadConfig(options.cwd);
    const adapter = resolveAdapter(loaded, options.adapter);
    if (!(await adapter.detect())) {
      throw new CliError(`adapter not found: ${adapter.id}`, EXIT.adapter);
    }

    const tasks = selectTasks(loaded.config, {
      ...(options.task !== undefined ? { task: options.task } : {}),
      ...(options.tag !== undefined ? { tag: options.tag } : {}),
      ...(options.runs !== undefined ? { runs: options.runs } : {}),
    });

    const createdAt = utcTimestamp((options.now ?? (() => new Date()))());
    const fingerprint = await computeFingerprint({
      adapter: adapter.id,
      agentVersion: await adapter.version(),
      yamlSource: loaded.yamlSource,
      gitRoot: loaded.gitRoot,
      model: loaded.config.agent.model,
    });

    const executions: TaskExecution[] = [];
    for (const task of tasks) {
      executions.push(
        await executeTask({
          task,
          adapter,
          gitRoot: loaded.gitRoot,
          yamlDir: loaded.yamlDir,
          timeoutMs: loaded.config.agent.timeoutMs,
          createdAt,
        }),
      );
    }

    return { loaded, tasks, executions, fingerprint, createdAt };
  } finally {
    if (handleSignals) {
      uninstallWorktreeCleanup();
    }
  }
}
