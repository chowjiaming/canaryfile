import type { TestReportInput } from "./types.js";

function verdictCell(verdict: string): string {
  return verdict === "fail" ? "FAIL" : verdict;
}

export function formatTestMarkdown(input: TestReportInput): string {
  const regressions = input.rows.filter((row) => row.verdict === "fail").length;
  const warnings = input.rows.filter((row) => row.verdict === "warn").length;
  const taskWord = input.rows.length === 1 ? "task" : "tasks";
  const lines = [
    `**canaryfile test** — ${input.rows.length} ${taskWord}, adapter ${input.adapter}`,
    "",
    `snapshot: ${input.snapshotCreatedAt} (model ${input.snapshotFingerprint.model})`,
    `current: model ${input.currentFingerprint.model}${input.fingerprintChanged ? " ← fingerprint changed" : ""}`,
    "",
    "| TASK | SNAPSHOT | CURRENT | COST | VERDICT |",
    "| --- | --- | --- | --- | --- |",
    ...input.rows.map(
      (row) =>
        `| ${row.name} | ${row.snapshotKn} | ${row.currentKn} | ${row.costLabel} | ${verdictCell(row.verdict)} |`,
    ),
    "",
    `${regressions} regression${regressions === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`,
  ];
  return lines.join("\n");
}
