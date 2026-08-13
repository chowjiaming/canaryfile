import { z } from "zod";

export const fingerprintSchema = z.strictObject({
  adapter: z.string(),
  agentVersion: z.string(),
  model: z.string(),
  configHash: z.string(),
  contextHash: z.string(),
});

const taskSnapshotSchema = z.strictObject({
  runs: z.number().int().nonnegative(),
  passes: z.number().int().nonnegative(),
  flaky: z.boolean(),
  costUsdMedian: z.number().nullable(),
  tokensInMedian: z.number().nullable(),
  tokensOutMedian: z.number().nullable(),
  durationMsMedian: z.number().nullable(),
  verifierFailures: z.record(z.string(), z.number().int().nonnegative()),
});

export const snapshotSchema = z.strictObject({
  version: z.literal(1),
  createdAt: z.string(),
  fingerprint: fingerprintSchema,
  tasks: z.record(z.string(), taskSnapshotSchema),
});

export type Snapshot = z.infer<typeof snapshotSchema>;
export type TaskSnapshot = z.infer<typeof taskSnapshotSchema>;

export function parseSnapshot(raw: unknown): Snapshot {
  return snapshotSchema.parse(raw);
}

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? null;
  }
  const low = sorted[mid - 1];
  const high = sorted[mid];
  if (low === undefined || high === undefined) {
    return null;
  }
  return (low + high) / 2;
}
