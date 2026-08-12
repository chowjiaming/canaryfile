import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { CliError, EXIT } from "../cli-error.js";
import { parseCanaryfile, type CanaryfileConfig } from "./schema.js";

export type LoadedConfig = {
  config: CanaryfileConfig;
  yamlPath: string;
  yamlDir: string;
  yamlSource: string;
  gitRoot: string;
};

async function gitRootOf(cwd: string): Promise<string> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
      cwd,
    });
    return stdout.trim();
  } catch {
    throw new CliError("not a git repository", EXIT.usage);
  }
}

async function findYamlPath(startDir: string, gitRoot: string): Promise<string> {
  let dir = path.resolve(startDir);
  const stop = path.resolve(gitRoot);

  while (true) {
    const candidate = path.join(dir, "canaryfile.yaml");
    try {
      await access(candidate);
      return candidate;
    } catch {
      if (dir === stop || path.dirname(dir) === dir) {
        throw new CliError(
          "canaryfile.yaml not found (walked up to git root)",
          EXIT.usage,
        );
      }
      dir = path.dirname(dir);
    }
  }
}

export async function loadConfig(cwd: string): Promise<LoadedConfig> {
  const gitRoot = await gitRootOf(cwd);
  const yamlPath = await findYamlPath(cwd, gitRoot);
  const yamlDir = path.dirname(yamlPath);
  const yamlSource = await readFile(yamlPath, "utf8");

  try {
    const config = parseCanaryfile(yamlSource);
    return { config, yamlPath, yamlDir, yamlSource, gitRoot };
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid config";
    throw new CliError(message, EXIT.usage);
  }
}
