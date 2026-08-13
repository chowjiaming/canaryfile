import { describe, expect, it } from "vitest";
import { combineVerdict, costVerdict, passVerdict } from "./verdict.js";

describe("passVerdict reference table (n0 = n1 = 5, s = 0.1, z = 1.96)", () => {
  const cases: Array<{
    name: string;
    k0: number;
    k1: number;
    expected: "pass" | "warn" | "fail" | "flaky";
    flaky?: boolean;
  }> = [
    { name: "5/5 → 5/5 PASS", k0: 5, k1: 5, expected: "pass" },
    { name: "5/5 → 4/5 PASS", k0: 5, k1: 4, expected: "pass" },
    { name: "5/5 → 3/5 PASS", k0: 5, k1: 3, expected: "pass" },
    { name: "5/5 → 2/5 PASS", k0: 5, k1: 2, expected: "pass" },
    { name: "5/5 → 1/5 PASS", k0: 5, k1: 1, expected: "pass" },
    { name: "5/5 → 0/5 FAIL", k0: 5, k1: 0, expected: "fail" },
    { name: "3/5 → 1/5 PASS (overlap)", k0: 3, k1: 1, expected: "pass" },
    { name: "0/5 → 5/5 PASS", k0: 0, k1: 5, expected: "pass" },
  ];

  for (const row of cases) {
    it(row.name, () => {
      expect(
        passVerdict({
          k0: row.k0,
          n0: 5,
          k1: row.k1,
          n1: 5,
          slack: 0.1,
          mode: "default",
          flaky: row.flaky ?? false,
        }),
      ).toBe(row.expected);
    });
  }

  it("never gates a flaky snapshot task", () => {
    expect(
      passVerdict({
        k0: 5,
        n0: 5,
        k1: 0,
        n1: 5,
        slack: 0.1,
        mode: "default",
        flaky: true,
      }),
    ).toBe("flaky");
  });

  it("--strict fails any change in k/n", () => {
    expect(
      passVerdict({
        k0: 5,
        n0: 5,
        k1: 4,
        n1: 5,
        slack: 0.1,
        mode: "strict",
        flaky: false,
      }),
    ).toBe("fail");
  });

  it("--lenient fails only when current passes are 0", () => {
    expect(
      passVerdict({
        k0: 5,
        n0: 5,
        k1: 1,
        n1: 5,
        slack: 0.1,
        mode: "lenient",
        flaky: false,
      }),
    ).toBe("pass");
    expect(
      passVerdict({
        k0: 5,
        n0: 5,
        k1: 0,
        n1: 5,
        slack: 0.1,
        mode: "lenient",
        flaky: false,
      }),
    ).toBe("fail");
  });
});

describe("costVerdict", () => {
  it("warns when median cost exceeds the multiplier", () => {
    expect(
      costVerdict({
        snapshotMedian: 1,
        currentMedian: 1.6,
        costMultiplier: 1.5,
        strictCost: false,
      }),
    ).toBe("warn");
  });

  it("promotes cost regression to fail with --strict-cost", () => {
    expect(
      costVerdict({
        snapshotMedian: 1,
        currentMedian: 1.6,
        costMultiplier: 1.5,
        strictCost: true,
      }),
    ).toBe("fail");
  });

  it("skips cost when either median is null", () => {
    expect(
      costVerdict({
        snapshotMedian: 1,
        currentMedian: null,
        costMultiplier: 1.5,
        strictCost: true,
      }),
    ).toBe("ok");
  });
});

describe("combineVerdict", () => {
  it("lets pass-rate fail win over cost warn", () => {
    expect(combineVerdict("fail", "warn")).toBe("fail");
  });

  it("keeps flaky above cost fail", () => {
    expect(combineVerdict("flaky", "fail")).toBe("flaky");
  });
});
