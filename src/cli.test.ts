import { describe, expect, it } from "vitest";
import { EXIT } from "./cli-error.js";
import { main } from "./cli.js";

describe("cli", () => {
  it("exits 2 for unknown commands", async () => {
    const err = process.stderr.write.bind(process.stderr);
    const out = process.stdout.write.bind(process.stdout);
    process.stderr.write = (() => true) as typeof process.stderr.write;
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      const code = await main(["node", "canaryfile", "test"]);
      expect(code).toBe(EXIT.usage);
    } finally {
      process.stderr.write = err;
      process.stdout.write = out;
    }
  });

  it("exits 0 for --help", async () => {
    const err = process.stderr.write.bind(process.stderr);
    const out = process.stdout.write.bind(process.stdout);
    process.stderr.write = (() => true) as typeof process.stderr.write;
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      const code = await main(["node", "canaryfile", "--help"]);
      expect(code).toBe(EXIT.ok);
    } finally {
      process.stderr.write = err;
      process.stdout.write = out;
    }
  });
});
