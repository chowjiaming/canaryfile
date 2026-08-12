import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CliError, EXIT } from "../cli-error.js";
import { loadConfig } from "./load.js";
import { commitAll, initGitRepo, writeYaml } from "../test/git-repo.js";

describe("loadConfig", () => {
  it("finds canaryfile.yaml by walking up from cwd", async () => {
    const dir = await initGitRepo();
    await writeYaml(
      dir,
      `
version: 1
agent:
  adapter: claude-code
tasks:
  - name: a
    prompt: p
    verify:
      - run: echo ok
`,
    );
    await commitAll(dir, "init");
    const nested = path.join(dir, "src", "deep");
    await mkdir(nested, { recursive: true });

    const loaded = await loadConfig(nested);
    expect(loaded.yamlDir).toBe(dir);
    expect(loaded.gitRoot).toBe(dir);
    expect(loaded.config.tasks[0]?.name).toBe("a");
  });

  it("fails when not in a git repo", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "canary-nogit-"));
    try {
      await loadConfig(dir);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.usage);
    }
  });
});

