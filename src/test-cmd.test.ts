import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { AgentAdapter } from "./adapters/types.js";
import { EXIT } from "./cli-error.js";
import { record } from "./record.js";
import { testCommand } from "./test-cmd.js";
import { commitAll, initGitRepo, writeYaml } from "./test/git-repo.js";

function fakeAdapter(pass: boolean, costUsd = 0.1): AgentAdapter {
  return {
    id: "claude-code",
    detect: async () => true,
    version: async () => "1.2.3",
    run: async (_task, ctx) => {
      await writeFile(ctx.transcriptPath, "{}", "utf8");
      if (pass) {
        await writeFile(path.join(ctx.cwd, "ok.txt"), "ok", "utf8");
      }
      return {
        costUsd,
        tokensIn: 10,
        tokensOut: 5,
        durationMs: 12,
        model: "claude-sonnet-X",
        transcriptPath: ctx.transcriptPath,
        timedOut: false,
        exitCode: 0,
      };
    },
  };
}

const yaml = `
version: 1
agent:
  adapter: claude-code
  timeout: 30s
defaults:
  runs: 5
  budget: 5
tasks:
  - name: smoke-task
    prompt: do the thing
    verify:
      - run: test -f ok.txt
`;

describe("testCommand", () => {
  it("exits 1 on a synthetic 5/5 → 0/5 regression", async () => {
    const dir = await initGitRepo();
    await writeYaml(dir, yaml);
    await commitAll(dir, "init");

    await record({
      cwd: dir,
      adapter: fakeAdapter(true),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:00:00Z"),
      write: () => undefined,
    });

    const code = await testCommand({
      cwd: dir,
      adapter: fakeAdapter(false),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:01:00Z"),
      write: () => undefined,
    });

    expect(code).toBe(EXIT.regression);
  });

  it("exits 0 when current matches the snapshot", async () => {
    const dir = await initGitRepo();
    await writeYaml(dir, yaml);
    await commitAll(dir, "init");

    await record({
      cwd: dir,
      adapter: fakeAdapter(true),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:00:00Z"),
      write: () => undefined,
    });

    const code = await testCommand({
      cwd: dir,
      adapter: fakeAdapter(true),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:01:00Z"),
      write: () => undefined,
    });

    expect(code).toBe(EXIT.ok);
  });

  it("prints JSON with FAIL when format is json", async () => {
    const dir = await initGitRepo();
    await writeYaml(dir, yaml);
    await commitAll(dir, "init");

    await record({
      cwd: dir,
      adapter: fakeAdapter(true),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:00:00Z"),
      write: () => undefined,
    });

    const chunks: string[] = [];
    const code = await testCommand({
      cwd: dir,
      adapter: fakeAdapter(false),
      handleSignals: false,
      now: () => new Date("2026-08-12T21:01:00Z"),
      format: "json",
      write: (text) => {
        chunks.push(text);
      },
    });

    expect(code).toBe(EXIT.regression);
    const parsed: unknown = JSON.parse(chunks.join("\n"));
    expect(parsed).toMatchObject({
      version: 1,
      summary: { regressions: 1 },
      tasks: [{ name: "smoke-task", snapshot: "5/5", current: "0/5", verdict: "fail" }],
    });
  });

  it("exits 2 when no snapshot exists", async () => {
    const dir = await initGitRepo();
    await writeYaml(dir, yaml);
    await commitAll(dir, "init");

    await expect(
      testCommand({
        cwd: dir,
        adapter: fakeAdapter(true),
        handleSignals: false,
        write: () => undefined,
      }),
    ).rejects.toMatchObject({ exitCode: EXIT.usage });
  });
});
