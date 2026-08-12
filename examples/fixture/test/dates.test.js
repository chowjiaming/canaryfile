import assert from "node:assert/strict";
import { test } from "node:test";
import { formatEventDate } from "../src/dates.js";

// Run with TZ=America/Toronto (see canaryfile.yaml) to expose the bug.
test("formats an ISO date without timezone shift", () => {
  assert.equal(formatEventDate("2026-08-12"), "August 12, 2026");
  assert.equal(formatEventDate("2026-01-01"), "January 1, 2026");
});