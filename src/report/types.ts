import type { Fingerprint } from "../snapshot/fingerprint.js";
import type { TaskCompare } from "../stats/compare.js";

export type ReportFormat = "terminal" | "json" | "markdown";

export type TestReportInput = {
  adapter: string;
  snapshotCreatedAt: string;
  snapshotFingerprint: Fingerprint;
  currentFingerprint: Fingerprint;
  fingerprintChanged: boolean;
  rows: TaskCompare[];
  incomplete: boolean;
};
