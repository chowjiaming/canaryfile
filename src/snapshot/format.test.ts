import { describe, expect, it } from "vitest";
import { median } from "./format.js";

describe("median", () => {
  it("returns null for an empty list", () => {
    expect(median([])).toBeNull();
  });

  it("returns the middle value for odd length", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the two middle values for even length", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});
