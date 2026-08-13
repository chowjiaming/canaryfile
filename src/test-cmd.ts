import { EXIT } from "./cli-error.js";
import { runPipeline, type RunOptions } from "./pipeline.js";
import { formatTestTable } from "./report/terminal.js";
import { compareAll, fingerprintsDiffer } from "./stats/compare.js";
import type { CompareMode } from "./stats/verdict.js";
import { readLatest } from "./snapshot/store.js";

export type TestOptions = RunOptions & {
  mode?: CompareMode;
  strictCost?: boolean;
  verbose?: boolean;
  write?: (text: string) => void;
};

export async function testCommand(options: TestOptions): Promise<number> {
  const write = options.write ?? ((text) => process.stdout.write(`${text}\n`));
  const pipeline = await runPipeline(options);
  const snapshot = await readLatest(pipeline.loaded.yamlDir);
  const mode = options.mode ?? "default";
  const rows = compareAll({
    executions: pipeline.executions,
    snapshot,
    slack: pipeline.loaded.config.stats.slack,
    costMultiplier: pipeline.loaded.config.stats.costMultiplier,
    mode,
    strictCost: options.strictCost ?? false,
  });

  if (fingerprintsDiffer(snapshot.fingerprint, pipeline.fingerprint)) {
    write(
      `fingerprint changed: snapshot ${snapshot.fingerprint.model} / ${snapshot.fingerprint.agentVersion} → current ${pipeline.fingerprint.model} / ${pipeline.fingerprint.agentVersion}`,
    );
  }

  write(formatTestTable(rows, options.verbose ?? false));
  const fails = rows.filter((row) => row.verdict === "fail").length;
  const warns = rows.filter((row) => row.verdict === "warn").length;
  write(`${fails} regression${fails === 1 ? "" : "s"}, ${warns} warning${warns === 1 ? "" : "s"}.`);

  if (pipeline.executions.some((execution) => execution.incomplete)) {
    return EXIT.budget;
  }
  if (fails > 0) {
    return EXIT.regression;
  }
  return EXIT.ok;
}
