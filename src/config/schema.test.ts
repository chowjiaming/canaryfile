import { describe, expect, it } from "vitest";
import { parseCanaryfile } from "./schema.js";

const fixtureYaml = `
version: 1
agent:
  adapter: claude-code
  timeout: 180s
defaults:
  runs: 3
  budget: 0.25
tasks:
  - name: fix-date-off-by-one
    prompt: |
      Find and fix the bug.
    setup: fixture/date-bug
    verify:
      - run: node --test test/dates.test.js
    tags: [smoke, bugfix]
`;

describe("parseCanaryfile", () => {
  it("parses a fixture-shaped config and applies defaults", () => {
    const config = parseCanaryfile(fixtureYaml);

    expect(config.version).toBe(1);
    expect(config.agent.adapter).toBe("claude-code");
    expect(config.agent.model).toBe("default");
    expect(config.agent.timeoutMs).toBe(180_000);
    expect(config.agent.command).toBeNull();
    expect(config.defaults.runs).toBe(3);
    expect(config.defaults.budget).toBe(0.25);
    expect(config.stats.slack).toBe(0.1);
    expect(config.stats.costMultiplier).toBe(1.5);
    expect(config.tasks).toHaveLength(1);
    const task = config.tasks[0];
    expect(task?.name).toBe("fix-date-off-by-one");
    expect(task?.setup).toBe("fixture/date-bug");
    expect(task?.verify).toEqual(["node --test test/dates.test.js"]);
    expect(task?.tags).toEqual(["smoke", "bugfix"]);
    expect(task?.runs).toBeNull();
    expect(task?.budget).toBeNull();
    expect(task?.services).toEqual([]);
  });

  it("rejects unknown keys", () => {
    expect(() =>
      parseCanaryfile(`
version: 1
agent:
  adapter: claude-code
typo: true
tasks:
  - name: a
    prompt: p
    verify:
      - run: echo ok
`),
    ).toThrow(/typo/);
  });

  it("rejects duplicate task names", () => {
    expect(() =>
      parseCanaryfile(`
version: 1
agent:
  adapter: claude-code
tasks:
  - name: same
    prompt: p
    verify:
      - run: echo ok
  - name: same
    prompt: q
    verify:
      - run: echo ok
`),
    ).toThrow(/unique/);
  });

  it("parses duration minutes", () => {
    const config = parseCanaryfile(`
version: 1
agent:
  adapter: claude-code
  timeout: 5m
tasks:
  - name: a
    prompt: p
    verify:
      - run: echo ok
`);
    expect(config.agent.timeoutMs).toBe(300_000);
  });

  it("parses a custom adapter command template", () => {
    const config = parseCanaryfile(`
version: 1
agent:
  adapter: custom
  command: "my-agent --prompt {{prompt}}"
tasks:
  - name: a
    prompt: p
    verify:
      - run: echo ok
`);
    expect(config.agent.adapter).toBe("custom");
    expect(config.agent.command).toBe("my-agent --prompt {{prompt}}");
  });
});
