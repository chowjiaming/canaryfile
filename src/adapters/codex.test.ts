import { describe, expect, it } from "vitest";
import { buildCodexArgs, parseCodexJsonl } from "./codex.js";

describe("parseCodexJsonl", () => {
  it("reads tokens from the last turn.completed event", () => {
    const stdout = [
      '{"type":"thread.started","thread_id":"t1"}',
      '{"type":"turn.completed","usage":{"input_tokens":11,"output_tokens":22},"model":"gpt-5"}',
    ].join("\n");
    expect(parseCodexJsonl(stdout)).toEqual({
      costUsd: null,
      tokensIn: 11,
      tokensOut: 22,
      model: "gpt-5",
    });
  });

  it("reads cost when present and ignores non-JSON lines", () => {
    const stdout = [
      "progress...",
      '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":2,"cost_usd":0.04}}',
    ].join("\n");
    expect(parseCodexJsonl(stdout)).toEqual({
      costUsd: 0.04,
      tokensIn: 1,
      tokensOut: 2,
      model: null,
    });
  });
});

describe("buildCodexArgs", () => {
  it("uses workspace-write sandbox and skips --model when default", () => {
    expect(buildCodexArgs({ prompt: "fix it", model: "default" })).toEqual([
      "exec",
      "--json",
      "--sandbox",
      "workspace-write",
      "--ephemeral",
      "--",
      "fix it",
    ]);
  });

  it("passes --model when configured", () => {
    const args = buildCodexArgs({ prompt: "fix it", model: "gpt-5" });
    expect(args).toContain("--model");
    expect(args).toContain("gpt-5");
  });
});
