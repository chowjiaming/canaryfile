import { describe, expect, it } from "vitest";
import { buildClaudeArgs, parseClaudeJson } from "./claude-code.js";

describe("parseClaudeJson", () => {
  it("reads cost, tokens, and model from a result envelope", () => {
    const parsed = parseClaudeJson(
      JSON.stringify({
        total_cost_usd: 0.12,
        usage: { input_tokens: 10, output_tokens: 20 },
        modelUsage: { "claude-sonnet-X": { costUSD: 0.12 } },
      }),
    );
    expect(parsed).toEqual({
      costUsd: 0.12,
      tokensIn: 10,
      tokensOut: 20,
      model: "claude-sonnet-X",
    });
  });

  it("returns nulls when stdout is not JSON", () => {
    expect(parseClaudeJson("not json")).toEqual({
      costUsd: null,
      tokensIn: null,
      tokensOut: null,
      model: null,
    });
  });
});

describe("buildClaudeArgs", () => {
  it("skips --model when config model is default", () => {
    const args = buildClaudeArgs({
      prompt: "fix it",
      model: "default",
      remainingBudgetUsd: 0.25,
    });
    expect(args).toEqual([
      "-p",
      "fix it",
      "--output-format",
      "json",
      "--dangerously-skip-permissions",
      "--max-budget-usd",
      "0.25",
    ]);
  });

  it("passes --model when configured", () => {
    const args = buildClaudeArgs({
      prompt: "fix it",
      model: "claude-sonnet-X",
      remainingBudgetUsd: 1,
    });
    expect(args).toContain("--model");
    expect(args).toContain("claude-sonnet-X");
  });
});
