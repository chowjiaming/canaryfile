import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CliError, EXIT } from "../cli-error.js";
import { fingerprintShort } from "./fingerprint.js";
import { parseSnapshot, type Snapshot } from "./format.js";

export function snapshotFileName(snapshot: Snapshot): string {
  return `${snapshot.createdAt}-${fingerprintShort(snapshot.fingerprint)}.json`;
}

export async function writeSnapshot(
  yamlDir: string,
  snapshot: Snapshot,
): Promise<{ snapshotPath: string; latestPath: string }> {
  const parsed = parseSnapshot(snapshot);
  const dir = path.join(yamlDir, ".canaryfile", "snapshots");
  await mkdir(dir, { recursive: true });
  const body = `${JSON.stringify(parsed, null, 2)}\n`;
  const snapshotPath = path.join(dir, snapshotFileName(parsed));
  const latestPath = path.join(dir, "latest.json");
  await writeFile(snapshotPath, body, "utf8");
  await writeFile(latestPath, body, "utf8");
  return { snapshotPath, latestPath };
}

export async function readLatest(yamlDir: string): Promise<Snapshot> {
  const latestPath = path.join(yamlDir, ".canaryfile", "snapshots", "latest.json");
  let raw: string;
  try {
    raw = await readFile(latestPath, "utf8");
  } catch {
    throw new CliError(
      "no snapshot found; run `canaryfile record` first",
      EXIT.usage,
    );
  }
  try {
    return parseSnapshot(JSON.parse(raw));
  } catch {
    throw new CliError(`invalid snapshot: ${latestPath}`, EXIT.usage);
  }
}
