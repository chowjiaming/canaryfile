import { writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  computeFingerprint,
  fingerprintShort,
  sha256Label,
} from "./fingerprint.js";
import { initGitRepo } from "../test/git-repo.js";

describe("fingerprint", () => {
  it("hashes yaml source and empty missing context files", async () => {
    const gitRoot = await initGitRepo();
    const yamlSource = "version: 1\n";
    const fingerprint = await computeFingerprint({
      adapter: "claude-code",
      agentVersion: "1.2.3",
      model: "default",
      yamlSource,
      gitRoot,
    });

    expect(fingerprint.configHash).toBe(sha256Label(yamlSource));
    expect(fingerprint.contextHash).toBe(sha256Label(""));
    expect(fingerprint.model).toBe("default");
    expect(fingerprintShort(fingerprint)).toMatch(/^[a-f0-9]{8}$/);
  });

  it("hashes git-root CLAUDE.md and .mcp.json in sorted name order", async () => {
    const gitRoot = await initGitRepo();
    await writeFile(path.join(gitRoot, ".mcp.json"), "mcp", "utf8");
    await writeFile(path.join(gitRoot, "CLAUDE.md"), "claude", "utf8");
    const fingerprint = await computeFingerprint({
      adapter: "claude-code",
      agentVersion: "1.0.0",
      model: "default",
      yamlSource: "x",
      gitRoot,
    });
    expect(fingerprint.contextHash).toBe(sha256Label("mcpclaude"));
  });

  it("canonicalJson sorts keys for a stable short hash", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});
