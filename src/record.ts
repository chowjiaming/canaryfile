import { formatRecordTable } from "./report/terminal.js";
import { runPipeline, type RunOptions } from "./pipeline.js";
import { buildSnapshot } from "./snapshot/build.js";
import { writeSnapshot } from "./snapshot/store.js";
import { EXIT } from "./cli-error.js";

export type RecordOptions = RunOptions & {
  write?: (text: string) => void;
};

export async function record(options: RecordOptions): Promise<number> {
  const write = options.write ?? ((text) => process.stdout.write(`${text}\n`));
  const pipeline = await runPipeline(options);
  const snapshot = buildSnapshot({
    createdAt: pipeline.createdAt,
    fingerprint: pipeline.fingerprint,
    executions: pipeline.executions,
  });
  await writeSnapshot(pipeline.loaded.yamlDir, snapshot);
  write(formatRecordTable(pipeline.executions));

  if (pipeline.executions.some((execution) => execution.incomplete)) {
    return EXIT.budget;
  }
  return EXIT.ok;
}
