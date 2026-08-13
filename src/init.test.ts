import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCanaryfile } from "./config/schema.js";
import { EXIT } from "./cli-error.js";
import { initCanaryfile } from "./init.js";

describe("initCanaryfile", () => {
  it("writes a parseable yaml with two example tasks and gitignore entries", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "canaryfile-init-"));
    const logs: string[] = [];
    const code = await initCanaryfile({
      cwd: dir,
      detectClaude: async () => true,
      detectCodex: async () => false,
      write: (text) => {
        logs.push(text);
      },
    });

    expect(code).toBe(EXIT.ok);
    const source = await readFile(path.join(dir, "canaryfile.yaml"), "utf8");
    const config = parseCanaryfile(source);
    expect(config.agent.adapter).toBe("claude-code");
    expect(config.tasks.map((task) => task.name)).toEqual([
      "example-bugfix",
      "example-feature",
    ]);
    const gitignore = await readFile(path.join(dir, ".gitignore"), "utf8");
    expect(gitignore).toContain(".canaryfile/runs/");
    expect(gitignore).toContain(".canaryfile/worktrees/");
    expect(logs.some((line) => line.includes("wrote canaryfile.yaml"))).toBe(true);
  });

  it("is idempotent and prefers codex when Claude is missing", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "canaryfile-init-"));
    await initCanaryfile({
      cwd: dir,
      detectClaude: async () => false,
      detectCodex: async () => true,
      write: () => undefined,
    });
    const first = await readFile(path.join(dir, "canaryfile.yaml"), "utf8");
    expect(parseCanaryfile(first).agent.adapter).toBe("codex");

    await writeFile(path.join(dir, "canaryfile.yaml"), `${first}\n# keep\n`, "utf8");
    const logs: string[] = [];
    await initCanaryfile({
      cwd: dir,
      detectClaude: async () => false,
      detectCodex: async () => true,
      write: (text) => {
        logs.push(text);
      },
    });
    expect(await readFile(path.join(dir, "canaryfile.yaml"), "utf8")).toContain("# keep");
    expect(logs).toContain("canaryfile.yaml already exists");
  });
});
