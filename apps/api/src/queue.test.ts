import { describe, it, expect } from "vitest";
import { delayForAttempt, RETRY_DELAYS_MS } from "./queue.js";

describe("webhook retry backoff schedule", () => {
  it("matches the spec: immediate, 30s, 2m, 10m, 30m", () => {
    expect(RETRY_DELAYS_MS).toEqual([0, 30_000, 120_000, 600_000, 1_800_000]);
  });

  it("returns the correct delay per attempt (1-based)", () => {
    expect(delayForAttempt(1)).toBe(0);
    expect(delayForAttempt(2)).toBe(30_000);
    expect(delayForAttempt(3)).toBe(120_000);
    expect(delayForAttempt(4)).toBe(600_000);
    expect(delayForAttempt(5)).toBe(1_800_000);
  });

  it("clamps beyond the last attempt to the final delay", () => {
    expect(delayForAttempt(6)).toBe(1_800_000);
    expect(delayForAttempt(99)).toBe(1_800_000);
  });
});
