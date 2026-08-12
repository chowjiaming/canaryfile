import { CliError, EXIT } from "../cli-error.js";
import type { CanaryfileConfig } from "./schema.js";

export type RecordFilters = {
  task?: string;
  tag?: string;
  runs?: number;
};

export type ResolvedTask = {
  name: string;
  prompt: string;
  setup: string | null;
  verify: string[];
  runs: number;
  budget: number;
  tags: string[];
};

export function selectTasks(
  config: CanaryfileConfig,
  filters: RecordFilters,
): ResolvedTask[] {
  let selected = config.tasks;

  if (filters.task !== undefined) {
    selected = selected.filter((task) => task.name === filters.task);
  } else if (filters.tag !== undefined) {
    selected = selected.filter((task) => task.tags.includes(filters.tag!));
  }

  if (selected.length === 0) {
    const reason =
      filters.task !== undefined
        ? `no task named "${filters.task}"`
        : filters.tag !== undefined
          ? `no tasks tagged "${filters.tag}"`
          : "no tasks";
    throw new CliError(reason, EXIT.usage);
  }

  return selected.map((task) => ({
    name: task.name,
    prompt: task.prompt,
    setup: task.setup,
    verify: task.verify,
    runs: filters.runs ?? task.runs ?? config.defaults.runs,
    budget: task.budget ?? config.defaults.budget,
    tags: task.tags,
  }));
}
