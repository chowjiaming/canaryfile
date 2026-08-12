import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { CliError, EXIT } from "../cli-error.js";

export type Worktree = {
  path: string;
  cwd: string;
};

const live = new Map<string, string>();
let signalsInstalled = false;

async function cleanupLiveWorktrees(): Promise<void> {
  const entries = [...live.entries()];
  live.clear();
  await Promise.all(
    entries.map(([worktreePath, gitRoot]) =>
      execa("git", ["worktree", "remove", "--force", worktreePath], {
        cwd: gitRoot,
        reject: false,
      }),
    ),
  );
}

function onSigint(): void {
  void cleanupLiveWorktrees().finally(() => process.exit(EXIT.sigint));
}

function onSigterm(): void {
  void cleanupLiveWorktrees().finally(() => process.exit(EXIT.sigterm));
}

export function installWorktreeCleanup(): void {
  if (signalsInstalled) {
    return;
  }
  signalsInstalled = true;
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
}

export function uninstallWorktreeCleanup(): void {
  if (!signalsInstalled) {
    return;
  }
  signalsInstalled = false;
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
}

export async function createWorktree(input: {
  gitRoot: string;
  yamlDir: string;
  taskName: string;
  runIndex: number;
  setup: string | null;
}): Promise<Worktree> {
  const worktreePath = path.join(
    input.yamlDir,
    ".canaryfile",
    "worktrees",
    `${input.taskName}-${input.runIndex}`,
  );
  await mkdir(path.dirname(worktreePath), { recursive: true });
  const ref = input.setup ?? "HEAD";
  try {
    await execa("git", ["worktree", "add", "--detach", worktreePath, ref], {
      cwd: input.gitRoot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "git worktree add failed";
    throw new CliError(`setup ref "${ref}" failed: ${message}`, EXIT.usage);
  }
  live.set(worktreePath, input.gitRoot);
  const rel = path.relative(input.gitRoot, input.yamlDir);
  const cwd = rel === "" ? worktreePath : path.join(worktreePath, rel);
  return { path: worktreePath, cwd };
}

export async function removeWorktree(
  gitRoot: string,
  worktreePath: string,
): Promise<void> {
  live.delete(worktreePath);
  await execa("git", ["worktree", "remove", "--force", worktreePath], {
    cwd: gitRoot,
    reject: false,
  });
}
