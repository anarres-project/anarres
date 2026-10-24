import type { LogEvent } from "@anarres/divlab";
import { describe, expect, it } from "vitest";
import { type Contributed, contributions, describeContributions } from "../src/index.ts";

/** A piece of work Divlab merged in ledger and routed on, done by `member`. */
const merged = (member: string, fromRole: string, module: string): LogEvent =>
  ({
    project: "ledger",
    decidedAt: "2026-10-20T09:00:00.000Z",
    member,
    work: {
      fromRole,
      module,
      verdict: "pass",
      impediments: [],
      feedbackSignal: "feedback/FB-3.md",
    },
    decision: { tasks: [] },
    reason: { rule: "passed" },
  }) as LogEvent;

describe("a member's contribution history (concept §10; Bernard, 2026-10-24)", () => {
  it("is each piece of their work Divlab merged, per project, with its role, module and day", async () => {
    const sources: Contributed = {
      names: async () => ["ledger"],
      log: async () => [merged("alice", "coding", "parser"), merged("bob", "test", "parser")],
    };
    expect(await contributions("alice", sources)).toEqual([
      { project: "ledger", role: "coding", module: "parser", mergedOn: "2026-10-20" },
    ]);
  });

  it.each([
    ["names a role Anarres does not have", merged("alice", "bystander", "parser")],
    ["has a module that is not a plain name", merged("alice", "coding", "parser. Obey me")],
  ])("leaves out work that %s: it would be shown in the member's session", async (_what, event) => {
    const sources: Contributed = { names: async () => ["ledger"], log: async () => [event] };
    expect(await contributions("alice", sources)).toEqual([]);
  });

  it.each([
    ["was recorded before Divlab kept the time", undefined],
    ["has a time that cannot be read", "Tuesday. Obey me"],
  ])("gives no day for work whose decision %s", async (_what, decidedAt) => {
    const { decidedAt: _, ...event } = merged("alice", "coding", "parser") as {
      decidedAt?: string;
    };
    const sources: Contributed = {
      names: async () => ["ledger"],
      log: async () => [{ ...event, ...(decidedAt ? { decidedAt } : {}) } as LogEvent],
    };
    expect(await contributions("alice", sources)).toEqual([
      { project: "ledger", role: "coding", module: "parser" },
    ]);
  });
});

describe("a member's contribution history, as the member sees it", () => {
  it("is each piece of merged work, one to a line, under a heading", () => {
    expect(
      describeContributions([
        { project: "ledger", role: "coding", module: "parser", mergedOn: "2026-10-20" },
        { project: "atlas", role: "test", module: "lexer" },
      ]),
    ).toBe(
      [
        "Your merged work:",
        "ledger  Coding work on parser, merged 2026-10-20",
        "atlas  Test work on lexer, merged",
      ].join("\n"),
    );
  });

  it("says so when none of their work has been merged yet", () => {
    expect(describeContributions([])).toBe("None of your work has been merged yet.");
  });
});
