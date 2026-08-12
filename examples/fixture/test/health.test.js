import assert from "node:assert/strict";
import { test } from "node:test";
import { createHealthHandler } from "../src/health.js";

test("health handler returns ok", () => {
  assert.deepEqual(createHealthHandler(), { ok: true });
});