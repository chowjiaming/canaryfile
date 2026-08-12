import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type Fingerprint = {
  adapter: string;
  agentVersion: string;
  model: string;
  configHash: string;
  contextHash: string;
};

const CONTEXT_FILES = [".mcp.json", "CLAUDE.md"] as const;

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function sha256Label(data: string | Buffer): string {
  return `sha256:${sha256Hex(data)}`;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeys(record[key])]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export function fingerprintShort(fingerprint: Fingerprint): string {
  return sha256Hex(canonicalJson(fingerprint)).slice(0, 8);
}

async function readOrEmpty(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export async function computeFingerprint(input: {
  adapter: string;
  agentVersion: string;
  model: string;
  yamlSource: string;
  gitRoot: string;
}): Promise<Fingerprint> {
  const contextParts = await Promise.all(
    [...CONTEXT_FILES].sort().map(async (name) => readOrEmpty(path.join(input.gitRoot, name))),
  );

  return {
    adapter: input.adapter,
    agentVersion: input.agentVersion,
    model: input.model,
    configHash: sha256Label(input.yamlSource),
    contextHash: sha256Label(contextParts.join("")),
  };
}
