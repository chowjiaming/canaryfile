import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { wilsonInterval } from "./wilson.js";

describe("wilsonInterval", () => {
  it("keeps 5/5 inside [0, 1] after clamping", () => {
    const { lower, upper } = wilsonInterval(5, 5);
    expect(lower).toBeGreaterThan(0.4);
    expect(lower).toBeLessThan(upper);
    expect(upper).toBeLessThanOrEqual(1);
    expect(lower).toBeGreaterThanOrEqual(0);
  });

  it("is wider for 2/5 than for 5/5", () => {
    expect(wilsonInterval(2, 5).width).toBeGreaterThan(wilsonInterval(5, 5).width);
  });

  it("satisfies L <= U, bounds in [0, 1] for n in 1..25", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), fc.integer({ min: 0, max: 25 }), (n, kRaw) => {
        const k = Math.min(kRaw, n);
        const interval = wilsonInterval(k, n);
        expect(interval.lower).toBeLessThanOrEqual(interval.upper);
        expect(interval.lower).toBeGreaterThanOrEqual(0);
        expect(interval.upper).toBeLessThanOrEqual(1);
        expect(interval.width).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});
