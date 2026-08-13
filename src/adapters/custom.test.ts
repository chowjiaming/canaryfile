import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CliError, EXIT } from "../cli-error.js";
import { createAdapter } from "./resolve.js";
import { createCustomAdapter, renderCustomArgv } from "./custom.js";
import type { ProcessResult, RunProcess } from "./types.js";

describe("renderCustomArgv", () => {
  it("substitutes prompt and workdir as argv tokens", () => {
    expect(
      renderCustomArgv({
        template: "my-agent --prompt {{prompt}} --cwd {{workdir}}",
        prompt: "fix the bug",
        workdir: "/tmp/work",
      }),
    ).toEqual({
      file: "my-agent",
      args: ["--prompt", "fix the bug", "--cwd", "/tmp/work"],
    });
  });

  it("substitutes placeholders glued onto a flag", () => {
    expect(
      renderCustomArgv({
        template: "my-agent --prompt={{prompt}}",
        prompt: "hello world",
        workdir: "/tmp",
      }),
    ).toEqual({
      file: "my-agent",
      args: ["--prompt=hello world"],
    });
  });
});

describe("createAdapter", () => {
  it("rejects custom without a command", () => {
    try {
      createAdapter({
        adapterId: "custom",
        model: "default",
        command: null,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).exitCode).toBe(EXIT.usage);
    }
  });
});

describe("createCustomAdapter", () => {
  it("runs the rendered argv and writes a transcript", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "canaryfile-custom-"));
    const transcriptPath = path.join(dir, "run.json");
    const calls: { file: string; args: string[] }[] = [];
    const runProcess: RunProcess = async (file, args) => {
      calls.push({ file, args });
      const result: ProcessResult = {
        stdout: "ok",
        stderr: "",
        exitCode: 0,
        timedOut: false,
        durationMs: 5,
      };
      return result;
    };
    const adapter = createCustomAdapter({
      runProcess,
      command: "my-agent {{prompt}} {{workdir}}",
    });
    const outcome = await adapter.run(
      { prompt: "do it" },
      {
        cwd: dir,
        timeoutMs: 1000,
        remainingBudgetUsd: 1,
        transcriptPath,
      },
    );

    expect(calls).toEqual([{ file: "my-agent", args: ["do it", dir] }]);
    expect(outcome.costUsd).toBeNull();
    expect(await readFile(transcriptPath, "utf8")).toBe("ok");
  });
});
