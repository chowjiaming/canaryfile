import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allPassed, runVerifiers } from "./verify.js";

describe("runVerifiers", () => {
  it("passes when every command exits 0", async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "canary-verify-"));
    const results = await runVerifiers(["echo ok", "true"], cwd);
    expect(allPassed(results)).toBe(true);
    expect(results.map((result) => result.exitCode)).toEqual([0, 0]);
  });

  it("records non-zero exit codes without throwing", async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "canary-verify-"));
    await writeFile(path.join(cwd, "marker.txt"), "x", "utf8");
    const results = await runVerifiers(["false", "echo ok"], cwd);
    expect(allPassed(results)).toBe(false);
    expect(results[0]?.exitCode).not.toBe(0);
    expect(results[1]?.exitCode).toBe(0);
  });
});
