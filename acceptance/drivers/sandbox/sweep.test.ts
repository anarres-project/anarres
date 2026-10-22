import { describe, expect, it } from "vitest";
import { leftBehind } from "./sweep.ts";

const NOW = Date.UTC(2026, 9, 22, 10, 0, 0);
const hoursAgo = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

describe("the sandbox sweep", () => {
  it("finds a run's repository made more than an hour ago", () => {
    expect(leftBehind([{ name: "ledger-mvj9zaqb", created_at: hoursAgo(2) }], NOW)).toEqual([
      "ledger-mvj9zaqb",
    ]);
  });

  it("leaves a repository made within the hour: its run may still be going", () => {
    expect(leftBehind([{ name: "ledger-mvjb11k0", created_at: hoursAgo(0.5) }], NOW)).toEqual([]);
  });

  it("leaves any repository a run did not make, however old", () => {
    expect(leftBehind([{ name: "notes", created_at: hoursAgo(48) }], NOW)).toEqual([]);
  });
});
