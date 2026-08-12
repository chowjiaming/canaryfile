import { describe, expect, it } from "vitest";
import { budgetExceeded, remainingBudgetUsd, spentUsd } from "./budget.js";

describe("budget", () => {
  it("ignores null costs when summing spend", () => {
    expect(spentUsd([0.1, null, 0.2])).toBe(0.3);
  });

  it("reports remaining budget", () => {
    expect(remainingBudgetUsd(0.5, [0.1, 0.2])).toBe(0.2);
  });

  it("exceeds only when spend is greater than the cap", () => {
    expect(budgetExceeded(0.25, [0.25])).toBe(false);
    expect(budgetExceeded(0.25, [0.26])).toBe(true);
  });
});
