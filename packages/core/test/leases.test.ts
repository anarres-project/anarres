import { describe, expect, it } from "vitest";
import { leaseHasRunOut } from "../src/index.ts";

describe("a lease", () => {
  it("has run out 25 hours after the last activity on its task", () => {
    expect(leaseHasRunOut("2026-10-22T09:00:00.000Z", new Date("2026-10-23T10:00:00Z"))).toBe(true);
  });

  it("still holds 23 hours after the last activity", () => {
    expect(leaseHasRunOut("2026-10-22T09:00:00.000Z", new Date("2026-10-23T08:00:00Z"))).toBe(
      false,
    );
  });

  it("has run out at exactly 24 hours: that is when it expires", () => {
    expect(leaseHasRunOut("2026-10-22T09:00:00.000Z", new Date("2026-10-23T09:00:00Z"))).toBe(true);
  });

  it("has run out if when it began cannot be read, so no task is held for ever", () => {
    expect(leaseHasRunOut("sometime last week", new Date("2026-10-23T09:00:00Z"))).toBe(true);
  });
});
