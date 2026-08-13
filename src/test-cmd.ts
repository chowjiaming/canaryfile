import { EXIT } from "./cli-error.js";
import { runPipeline, type RunOptions } from "./pipeline.js";
import { formatTestJson } from "./report/json.js";
import { formatTestMarkdown } from "./report/markdown.js";
import { formatTestBanner, formatTestTable } from "./report/terminal.js";
import type { ReportFormat, TestReportInput } from "./report/types.js";
import { compareAll, fingerprintsDiffer } from "./stats/compare.js";
import type { CompareMode } from "./stats/verdict.js";
import { readLatest } from "./snapshot/store.js";

export type TestOptions = RunOptions & {
  mode?: CompareMode;
  strictCost?: boolean;
  verbose?: boolean;
  format?: ReportFormat;
  write?: (text: string) => void;
};

export async function testCommand(options: TestOptions): Promise<number> {
  const write = options.write ?? ((text) => process.stdout.write(`${text}\n`));
  const pipeline = await runPipeline(options);
  const snapshot = await readLatest(pipeline.loaded.yamlDir);
  const mode = options.mode ?? "default";
  const format = options.format ?? "terminal";
  const rows = compareAll({
    executions: pipeline.executions,
    snapshot,
    slack: pipeline.loaded.config.stats.slack,
    costMultiplier: pipeline.loaded.config.stats.costMultiplier,
    mode,
    strictCost: options.strictCost ?? false,
  });
  const fingerprintChanged = fingerprintsDiffer(
    snapshot.fingerprint,
    pipeline.fingerprint,
  );
  const report: TestReportInput = {
    adapter: pipeline.fingerprint.adapter,
    snapshotCreatedAt: snapshot.createdAt,
    snapshotFingerprint: snapshot.fingerprint,
    currentFingerprint: pipeline.fingerprint,
    fingerprintChanged,
    rows,
    incomplete: pipeline.executions.some((execution) => execution.incomplete),
  };

  if (format === "json") {
    write(formatTestJson(report).trimEnd());
  } else if (format === "markdown") {
    write(formatTestMarkdown(report));
  } else {
    write(
      formatTestBanner({
        taskCount: rows.length,
        adapter: report.adapter,
        snapshotCreatedAt: snapshot.createdAt,
        snapshotModel: snapshot.fingerprint.model,
        currentModel: pipeline.fingerprint.model,
        fingerprintChanged,
      }),
    );
    write(formatTestTable(rows, options.verbose ?? false));
    const fails = rows.filter((row) => row.verdict === "fail").length;
    const warns = rows.filter((row) => row.verdict === "warn").length;
    write(
      `${fails} regression${fails === 1 ? "" : "s"}, ${warns} warning${warns === 1 ? "" : "s"}.`,
    );
  }

  if (report.incomplete) {
    return EXIT.budget;
  }
  if (rows.some((row) => row.verdict === "fail")) {
    return EXIT.regression;
  }
  return EXIT.ok;
}
