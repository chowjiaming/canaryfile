export type AgentOutcome = {
  costUsd: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  durationMs: number;
  model: string | null;
  transcriptPath: string;
  timedOut: boolean;
  exitCode: number | null;
};

export type RunContext = {
  cwd: string;
  timeoutMs: number;
  remainingBudgetUsd: number;
  transcriptPath: string;
};

export type AgentAdapter = {
  id: string;
  detect(): Promise<boolean>;
  version(): Promise<string>;
  run(task: { prompt: string }, ctx: RunContext): Promise<AgentOutcome>;
};
