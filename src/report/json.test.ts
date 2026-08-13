import { describe, expect, it } from "vitest";
import { formatTestJson } from "./json.js";
import { formatTestMarkdown } from "./markdown.js";
import type { TestReportInput } from "./types.js";

const fingerprint = {
  adapter: "claude-code",
  agentVersion: "1.2.3",
  model: "default",
  configHash: "sha256:aaa",
  contextHash: "sha256:bbb",
};

const input: TestReportInput = {
  adapter: "claude-code",
  snapshotCreatedAt: "2026-08-01T00:00:00Z",
  snapshotFingerprint: fingerprint,
  currentFingerprint: { ...fingerprint, model: "claude-sonnet-X" },
  fingerprintChanged: true,
  incomplete: false,
  rows: [
    {
      name: "fix-date-off-by-one",
      snapshotKn: "5/5",
      currentKn: "5/5",
      costUsdMedian: 0.31,
      costLabel: "$0.31",
      verdict: "pass",
      intervalLabel: "[0.57, 1.00]",
    },
    {
      name: "refactor-logging",
      snapshotKn: "4/5",
      currentKn: "1/5",
      costUsdMedian: 0.52,
      costLabel: "$0.52",
      verdict: "fail",
      intervalLabel: "[0.04, 0.62]",
    },
  ],
};

describe("formatTestJson", () => {
  it("emits a versioned report with verdicts and fingerprint change", () => {
    const parsed: unknown = JSON.parse(formatTestJson(input));
    expect(parsed).toEqual({
      version: 1,
      createdAt: "2026-08-01T00:00:00Z",
      fingerprint: {
        snapshot: fingerprint,
        current: { ...fingerprint, model: "claude-sonnet-X" },
        changed: true,
      },
      tasks: [
        {
          name: "fix-date-off-by-one",
          snapshot: "5/5",
          current: "5/5",
          costUsdMedian: 0.31,
          verdict: "pass",
          interval: "[0.57, 1.00]",
        },
        {
          name: "refactor-logging",
          snapshot: "4/5",
          current: "1/5",
          costUsdMedian: 0.52,
          verdict: "fail",
          interval: "[0.04, 0.62]",
        },
      ],
      summary: { regressions: 1, warnings: 0, incomplete: false },
    });
  });
});

describe("formatTestMarkdown", () => {
  it("renders a pipe table and summary", () => {
    const markdown = formatTestMarkdown(input);
    expect(markdown).toContain("| fix-date-off-by-one | 5/5 | 5/5 | $0.31 | pass |");
    expect(markdown).toContain("| refactor-logging | 4/5 | 1/5 | $0.52 | FAIL |");
    expect(markdown).toContain("1 regression, 0 warnings.");
    expect(markdown).toContain("← fingerprint changed");
  });
});
