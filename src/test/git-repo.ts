import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";

export async function initGitRepo(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "canaryfile-"));
  await execa("git", ["init", "-b", "main"], { cwd: dir });
  await execa("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execa("git", ["config", "user.name", "Test"], { cwd: dir });
  await execa("git", ["config", "commit.gpgsign", "false"], { cwd: dir });
  return dir;
}

export async function commitAll(dir: string, message: string): Promise<void> {
  await execa("git", ["add", "-A"], { cwd: dir });
  await execa("git", ["commit", "-m", message], { cwd: dir });
}

export async function writeYaml(dir: string, body: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "canaryfile.yaml"), body, "utf8");
}
