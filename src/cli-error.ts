export const EXIT = {
  ok: 0,
  regression: 1,
  usage: 2,
  budget: 3,
  adapter: 4,
  sigint: 130,
  sigterm: 143,
} as const;

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}
