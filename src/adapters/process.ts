import { execa, ExecaError } from "execa";
import type { ProcessResult, RunProcess } from "./types.js";

export const execaRunProcess: RunProcess = async (file, args, options) => {
  const started = Date.now();
  try {
    const result = await execa(file, args, {
      cwd: options.cwd,
      timeout: options.timeoutMs,
      reject: false,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 1,
      timedOut: result.timedOut,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    if (error instanceof ExecaError) {
      if (error.code === "ENOENT") {
        throw error;
      }
      return {
        stdout: typeof error.stdout === "string" ? error.stdout : "",
        stderr: typeof error.stderr === "string" ? error.stderr : "",
        exitCode: typeof error.exitCode === "number" ? error.exitCode : 1,
        timedOut: error.timedOut,
        durationMs,
      };
    }
    const fallback: ProcessResult = {
      stdout: "",
      stderr: error instanceof Error ? error.message : "process failed",
      exitCode: 1,
      timedOut: false,
      durationMs,
    };
    return fallback;
  }
};
