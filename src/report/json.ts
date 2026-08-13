import { z } from "zod";
import { fingerprintSchema } from "../snapshot/format.js";
import type { TestReportInput } from "./types.js";

const testReportSchema = z.strictObject({
  version: z.literal(1),
  createdAt: z.string(),
  fingerprint: z.strictObject({
    snapshot: fingerprintSchema,
    current: fingerprintSchema,
    changed: z.boolean(),
  }),
  tasks: z.array(
    z.strictObject({
      name: z.string(),
      snapshot: z.string(),
      current: z.string(),
      costUsdMedian: z.number().nullable(),
      verdict: z.enum(["pass", "warn", "fail", "flaky"]),
      interval: z.string().nullable(),
    }),
  ),
  summary: z.strictObject({
    regressions: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    incomplete: z.boolean(),
  }),
});

export type TestJsonReport = z.infer<typeof testReportSchema>;

export function formatTestJson(input: TestReportInput): string {
  const regressions = input.rows.filter((row) => row.verdict === "fail").length;
  const warnings = input.rows.filter((row) => row.verdict === "warn").length;
  const report = testReportSchema.parse({
    version: 1,
    createdAt: input.snapshotCreatedAt,
    fingerprint: {
      snapshot: input.snapshotFingerprint,
      current: input.currentFingerprint,
      changed: input.fingerprintChanged,
    },
    tasks: input.rows.map((row) => ({
      name: row.name,
      snapshot: row.snapshotKn,
      current: row.currentKn,
      costUsdMedian: row.costUsdMedian,
      verdict: row.verdict,
      interval: row.intervalLabel.length > 0 ? row.intervalLabel : null,
    })),
    summary: {
      regressions,
      warnings,
      incomplete: input.incomplete,
    },
  });
  return `${JSON.stringify(report, null, 2)}\n`;
}
