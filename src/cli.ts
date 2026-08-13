#!/usr/bin/env node
import { Command, CommanderError } from "commander";
import { CliError, EXIT } from "./cli-error.js";
import { record } from "./record.js";
import { testCommand } from "./test-cmd.js";
import type { CompareMode } from "./stats/verdict.js";

function parseRuns(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 25) {
    throw new CommanderError(
      EXIT.usage,
      "commander.invalidArgument",
      "--runs must be an integer 1..25",
    );
  }
  return n;
}

export async function main(argv: string[]): Promise<number> {
  const program = new Command();
  let commandExit: number | undefined;
  program
    .name("canaryfile")
    .description("Snapshot testing for your AI coding agent")
    .version("0.1.0")
    .exitOverride()
    .showHelpAfterError(false);

  program
    .command("record")
    .option("--tag <tag>", "run tasks with this tag")
    .option("--task <name>", "run a single task by name")
    .option("--runs <n>", "override runs per task", parseRuns)
    .action(async (opts: { tag?: string; task?: string; runs?: number }) => {
      try {
        commandExit = await record({
          cwd: process.cwd(),
          ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
          ...(opts.task !== undefined ? { task: opts.task } : {}),
          ...(opts.runs !== undefined ? { runs: opts.runs } : {}),
        });
      } catch (error) {
        if (error instanceof CliError) {
          process.stderr.write(`${error.message}\n`);
          commandExit = error.exitCode;
          return;
        }
        throw error;
      }
    });

  program
    .command("test")
    .option("--tag <tag>", "run tasks with this tag")
    .option("--task <name>", "run a single task by name")
    .option("--runs <n>", "override runs per task", parseRuns)
    .option("--strict", "fail unless k/n is identical to the snapshot")
    .option("--lenient", "fail only when current passes are 0")
    .option("--strict-cost", "promote cost regressions to FAIL")
    .option("--verbose", "print Wilson [L, U] per task")
    .action(
      async (opts: {
        tag?: string;
        task?: string;
        runs?: number;
        strict?: boolean;
        lenient?: boolean;
        strictCost?: boolean;
        verbose?: boolean;
      }) => {
        if (opts.strict && opts.lenient) {
          process.stderr.write("use only one of --strict or --lenient\n");
          commandExit = EXIT.usage;
          return;
        }
        const mode: CompareMode = opts.strict
          ? "strict"
          : opts.lenient
            ? "lenient"
            : "default";
        try {
          commandExit = await testCommand({
            cwd: process.cwd(),
            mode,
            ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
            ...(opts.task !== undefined ? { task: opts.task } : {}),
            ...(opts.runs !== undefined ? { runs: opts.runs } : {}),
            ...(opts.strictCost !== undefined ? { strictCost: opts.strictCost } : {}),
            ...(opts.verbose !== undefined ? { verbose: opts.verbose } : {}),
          });
        } catch (error) {
          if (error instanceof CliError) {
            process.stderr.write(`${error.message}\n`);
            commandExit = error.exitCode;
            return;
          }
          throw error;
        }
      },
    );

  try {
    await program.parseAsync(argv);
    return commandExit ?? EXIT.ok;
  } catch (error) {
    if (error instanceof CliError) {
      process.stderr.write(`${error.message}\n`);
      return error.exitCode;
    }
    if (error instanceof CommanderError) {
      if (
        error.code === "commander.helpDisplayed" ||
        error.code === "commander.version"
      ) {
        return EXIT.ok;
      }
      if (error.message) {
        process.stderr.write(`${error.message}\n`);
      }
      return EXIT.usage;
    }
    throw error;
  }
}

const invoked = process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js");
if (invoked) {
  main(process.argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
