import assert from "node:assert/strict";
import { test } from "node:test";
import { wrapLogger } from "../src/logging.js";

test("forwards all levels including error", () => {
  const calls = [];
  const logger = {
    debug: (...a) => calls.push(["debug", ...a]),
    info: (...a) => calls.push(["info", ...a]),
    warn: (...a) => calls.push(["warn", ...a]),
    error: (...a) => calls.push(["error", ...a]),
  };
  const wrapped = wrapLogger(logger);
  wrapped.info("hello");
  wrapped.error("boom");
  assert.deepEqual(calls, [
    ["info", "hello"],
    ["error", "boom"],
  ]);
});