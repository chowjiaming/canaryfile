import { describe, expect, it } from "vitest";
import { parseCanaryfile } from "./schema.js";
import { selectTasks } from "./select.js";
import { CliError, EXIT } from "../cli-error.js";

const source = `
version: 1
agent:
  adapter: claude-code
defaults:
  runs: 3
  budget: 0.25
tasks:
  - name: one
    prompt: p1
    verify:
      - run: echo one
    tags: [smoke]
  - name: two
    prompt: p2
    runs: 2
    budget: 1
    verify:
      - run: echo two
    tags: [bugfix]
`;

describe("selectTasks", () => {
  const config = parseCanaryfile(source);

  it("selects all tasks and applies defaults", () => {
    const tasks = selectTasks(config, {});
    expect(tasks.map((task) => task.name)).toEqual(["one", "two"]);
    expect(tasks[0]?.runs).toBe(3);
    expect(tasks[0]?.budget).toBe(0.25);
    expect(tasks[1]?.runs).toBe(2);
    expect(tasks[1]?.budget).toBe(1);
  });

  it("selects by --task and ignores --tag", () => {
    const tasks = selectTasks(config, { task: "two", tag: "smoke" });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.name).toBe("two");
  });

  it("filters by --tag", () => {
    const tasks = selectTasks(config, { tag: "smoke" });
    expect(tasks.map((task) => task.name)).toEqual(["one"]);
  });

  it("lets --runs override yaml", () => {
    const tasks = selectTasks(config, { runs: 7 });
    expect(tasks.every((task) => task.runs === 7)).toBe(true);
  });

  it("throws usage when --task is missing", () => {
    try {
      selectTasks(config, { task: "nope" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.usage);
    }
  });
});
