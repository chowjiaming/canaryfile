import { execa } from "execa";

export type VerifierResult = {
  cmd: string;
  exitCode: number;
};

export async function runVerifiers(
  commands: string[],
  cwd: string,
): Promise<VerifierResult[]> {
  const results: VerifierResult[] = [];
  for (const cmd of commands) {
    const { exitCode } = await execa(cmd, {
      cwd,
      shell: true,
      reject: false,
    });
    results.push({ cmd, exitCode: exitCode ?? 1 });
  }
  return results;
}

export function allPassed(results: VerifierResult[]): boolean {
  return results.every((result) => result.exitCode === 0);
}
