#!/usr/bin/env node
import { Command, CommanderError } from "commander";
import { CliError, EXIT } from "./cli-error.js";
import { record } from "./record.js";

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
    .option(
      "--runs <n>",
      "override runs per task",
      (value) => {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1 || n > 25) {
          throw new CommanderError(
            EXIT.usage,
            "commander.invalidArgument",
            "--runs must be an integer 1..25",
          );
        }
        return n;
      },
    )
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
