import { wilsonInterval } from "./wilson.js";

export type Verdict = "pass" | "warn" | "fail" | "flaky";
export type CompareMode = "default" | "strict" | "lenient";

export type PassVerdictInput = {
  k0: number;
  n0: number;
  k1: number;
  n1: number;
  slack: number;
  mode: CompareMode;
  flaky: boolean;
};

export function passVerdict(input: PassVerdictInput): Verdict {
  if (input.n0 <= 0 || input.n1 <= 0) {
    return "fail";
  }
  const baseline = wilsonInterval(input.k0, input.n0);
  if (input.flaky) {
    return "flaky";
  }

  if (input.mode === "lenient") {
    return input.k1 === 0 ? "fail" : "pass";
  }
  if (input.mode === "strict") {
    return input.k0 === input.k1 && input.n0 === input.n1 ? "pass" : "fail";
  }

  const current = wilsonInterval(input.k1, input.n1);
  if (current.upper < baseline.lower - input.slack) {
    return "fail";
  }
  if (current.upper < baseline.lower) {
    return "warn";
  }
  return "pass";
}

export function costVerdict(input: {
  snapshotMedian: number | null;
  currentMedian: number | null;
  costMultiplier: number;
  strictCost: boolean;
}): "ok" | "warn" | "fail" {
  if (input.snapshotMedian === null || input.currentMedian === null) {
    return "ok";
  }
  if (input.currentMedian > input.costMultiplier * input.snapshotMedian) {
    return input.strictCost ? "fail" : "warn";
  }
  return "ok";
}

export function combineVerdict(pass: Verdict, cost: "ok" | "warn" | "fail"): Verdict {
  if (pass === "flaky") {
    return "flaky";
  }
  if (pass === "fail" || cost === "fail") {
    return "fail";
  }
  if (pass === "warn" || cost === "warn") {
    return "warn";
  }
  return "pass";
}
