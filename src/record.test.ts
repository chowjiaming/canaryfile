import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { AgentAdapter } from "./adapters/types.js";
import { CliError, EXIT } from "./cli-error.js";
import { record } from "./record.js";
import { commitAll, initGitRepo, writeYaml } from "./test/git-repo.js";

function fakeAdapter(
  run: AgentAdapter["run"] = async (_task, ctx) => {
    await writeFile(ctx.transcriptPath, "{}", "utf8");
    return {
      costUsd: 0.1,
      tokensIn: 100,
      tokensOut: 20,
      durationMs: 40,
      model: "claude-sonnet-X",
      transcriptPath: ctx.transcriptPath,
      timedOut: false,
      exitCode: 0,
    };
  },
): AgentAdapter {
  return {
    id: "claude-code",
    detect: async () => true,
    version: async () => "1.2.3",
    run,
  };
}

const yaml = `
version: 1
agent:
  adapter: claude-code
  timeout: 30s
defaults:
  runs: 1
  budget: 1
tasks:
  - name: smoke-task
    prompt: do the thing
    verify:
      - run: test -f canaryfile.yaml
    tags: [smoke]
`;

describe("record", () => {
  it("writes a snapshot for a passing task without touching the working tree", async () => {
    const dir = await initGitRepo();
    await writeYaml(dir, yaml);
    await writeFile(path.join(dir, "ORIGINAL"), "keep", "utf8");
    await commitAll(dir, "init");

    const adapter = fakeAdapter(async (_task, ctx) => {
      await writeFile(path.join(ctx.cwd, "AGENT_WAS_HERE"), "yes", "utf8");
      await writeFile(ctx.transcriptPath, "{}", "utf8");
      return {
        costUsd: 0.1,
        tokensIn: 10,
        tokensOut: 5,
        durationMs: 12,
        model: "claude-sonnet-X",
        transcriptPath: ctx.transcriptPath,
        timedOut: false,
        exitCode: 0,
      };
    });

    const code = await record({
      cwd: dir,
      adapter,
      handleSignals: false,
      now: () => new Date("2026-08-12T21:00:00Z"),
      write: () => undefined,
    });

    expect(code).toBe(EXIT.ok);
    const latest = JSON.parse(
      await readFile(path.join(dir, ".canaryfile/snapshots/latest.json"), "utf8"),
    ) as {
      createdAt: string;
      fingerprint: { model: string; adapter: string };
      tasks: Record<string, { runs: number; passes: number; flaky: boolean }>;
    };
    expect(latest.createdAt).toBe("2026-08-12T21:00:00Z");
    expect(latest.fingerprint.model).toBe("default");
    expect(latest.fingerprint.adapter).toBe("claude-code");
    expect(latest.tasks["smoke-task"]?.runs).toBe(1);
    expect(latest.tasks["smoke-task"]?.passes).toBe(1);
    expect(latest.tasks["smoke-task"]?.flaky).toBe(false);

    await expect(readFile(path.join(dir, "ORIGINAL"), "utf8")).resolves.toBe("keep");
    await expect(access(path.join(dir, "AGENT_WAS_HERE"))).rejects.toThrow();
  });

  it("exits 0 when verifiers fail — record captures a baseline", async () => {
    const dir = await initGitRepo();
    await writeYaml(
      dir,
      `
version: 1
agent:
  adapter: claude-code
defaults:
  runs: 1
  budget: 1
tasks:
  - name: will-fail
    prompt: p
    verify:
      - run: exit 1
`,
    );
    await commitAll(dir, "init");

    const code = await record({
      cwd: dir,
      adapter: fakeAdapter(),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:00:00Z"),
      write: () => undefined,
    });

    expect(code).toBe(EXIT.ok);
    const latest = JSON.parse(
      await readFile(path.join(dir, ".canaryfile/snapshots/latest.json"), "utf8"),
    ) as { tasks: Record<string, { passes: number; runs: number }> };
    expect(latest.tasks["will-fail"]?.passes).toBe(0);
    expect(latest.tasks["will-fail"]?.runs).toBe(1);
  });

  it("returns exit 3 and still writes a snapshot when budget is exceeded", async () => {
    const dir = await initGitRepo();
    await writeYaml(
      dir,
      `
version: 1
agent:
  adapter: claude-code
defaults:
  runs: 3
  budget: 0.15
tasks:
  - name: pricey
    prompt: p
    verify:
      - run: echo ok
`,
    );
    await commitAll(dir, "init");

    const code = await record({
      cwd: dir,
      adapter: fakeAdapter(async (_task, ctx) => {
        await writeFile(ctx.transcriptPath, "{}", "utf8");
        return {
          costUsd: 0.1,
          tokensIn: 1,
          tokensOut: 1,
          durationMs: 1,
          model: null,
          transcriptPath: ctx.transcriptPath,
          timedOut: false,
          exitCode: 0,
        };
      }),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:00:00Z"),
      write: () => undefined,
    });

    expect(code).toBe(EXIT.budget);
    const latest = JSON.parse(
      await readFile(path.join(dir, ".canaryfile/snapshots/latest.json"), "utf8"),
    ) as { tasks: Record<string, { runs: number }> };
    expect(latest.tasks["pricey"]?.runs).toBe(2);
  });

  it("returns exit 4 when the adapter is missing", async () => {
    const dir = await initGitRepo();
    await writeYaml(dir, yaml);
    await commitAll(dir, "init");
    const adapter = fakeAdapter();
    adapter.detect = async () => false;

    try {
      await record({
        cwd: dir,
        adapter,
        handleSignals: false,
        write: () => undefined,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.adapter);
    }
  });

  it("maps nested yaml dirs into the worktree cwd", async () => {
    const gitRoot = await initGitRepo();
    const nested = path.join(gitRoot, "examples", "app");
    await writeYaml(
      nested,
      `
version: 1
agent:
  adapter: claude-code
defaults:
  runs: 1
  budget: 1
tasks:
  - name: nested
    prompt: p
    verify:
      - run: test -f canaryfile.yaml
`,
    );
    await commitAll(gitRoot, "init");

    let seenCwd = "";
    const code = await record({
      cwd: nested,
      adapter: fakeAdapter(async (_task, ctx) => {
        seenCwd = ctx.cwd;
        await writeFile(ctx.transcriptPath, "{}", "utf8");
        return {
          costUsd: null,
          tokensIn: null,
          tokensOut: null,
          durationMs: 1,
          model: null,
          transcriptPath: ctx.transcriptPath,
          timedOut: false,
          exitCode: 0,
        };
      }),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:00:00Z"),
      write: () => undefined,
    });

    expect(code).toBe(EXIT.ok);
    expect(seenCwd.endsWith(path.join("examples", "app"))).toBe(true);
    await expect(
      readFile(path.join(nested, ".canaryfile/snapshots/latest.json"), "utf8"),
    ).resolves.toContain("nested");
  });

  it("returns exit 4 when yaml names an adapter M1 does not ship", async () => {
    const dir = await initGitRepo();
    await writeYaml(
      dir,
      `
version: 1
agent:
  adapter: codex
tasks:
  - name: a
    prompt: p
    verify:
      - run: echo ok
`,
    );
    await commitAll(dir, "init");

    try {
      await record({
        cwd: dir,
        handleSignals: false,
        write: () => undefined,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.adapter);
    }
  });
});
