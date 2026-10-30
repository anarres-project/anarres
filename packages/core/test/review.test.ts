import { describe, expect, it } from "vitest";
import {
  approvalCounts,
  approvalsStanding,
  needsReview,
  reviewListUnreadable,
} from "../src/index.ts";

describe("whether work on a module needs a person's approval (decision 0016)", () => {
  it("does when PDC coordinators name the module, for its project, in the governance file", () => {
    const file = { members: {}, review: { ledger: ["parser"] } };
    expect(needsReview(file, "ledger", "parser")).toBe(true);
  });

  it.each([
    ["another module of the project", "ledger", "lexer"],
    ["the same module's name in another project", "atlas", "parser"],
    ["a project whose name an object has of itself", "constructor", "parser"],
  ])("does not for %s", (_what, project, module) => {
    const file = { members: {}, review: { ledger: ["parser"] } };
    expect(needsReview(file, project, module)).toBe(false);
  });

  it("does not when the governance file names no module for review at all", () => {
    expect(needsReview({ members: {} }, "ledger", "parser")).toBe(false);
  });

  it.each<[string, unknown]>([
    ["a list that is not one per project", { review: ["parser"] }],
    ["a project's modules not given as a list", { review: { atlas: "lexer" } }],
    ["a module not named plainly", { review: { atlas: ["../lexer"] } }],
    ["a module named by something not text", { review: { atlas: [7] } }],
    ["a file that cannot be read at all", undefined],
  ])("does for every module, holding everything, given %s", (_what, file) => {
    expect(needsReview(file, "ledger", "parser")).toBe(true);
  });
});

describe("whether the list of modules needing review cannot be read, so coordinators are told", () => {
  it("can be read when it names modules plainly, project by project", () => {
    expect(reviewListUnreadable({ members: {}, review: { ledger: ["parser"] } })).toBe(false);
  });

  it("cannot be read when a project's module is not named plainly", () => {
    expect(reviewListUnreadable({ members: {}, review: { ledger: ["../parser"] } })).toBe(true);
  });
});

describe("whether a person's approval of work counts (decision 0016)", () => {
  const work = { author: "alice", module: "parser" };

  it("does from a trusted member with no part in the module", () => {
    const file = { members: { carol: { level: "trusted" } } };
    expect(approvalCounts(file, "carol", work, [])).toBe(true);
  });

  it.each([
    ["an established member", "established", false],
    ["a new member", "new", false],
    ["a PDC coordinator", "pdc-coordinator", true],
  ])("counts from %s: %s", (_who, level, counts) => {
    const file = { members: { carol: { level } } };
    expect(approvalCounts(file, "carol", work, [])).toBe(counts);
  });

  it("does not from the work's own author, however trusted", () => {
    const file = { members: { alice: { level: "trusted" } } };
    expect(approvalCounts(file, "alice", work, [])).toBe(false);
  });

  it("does not from the member whose linked account wrote the work", () => {
    const file = { members: { alice: { level: "trusted", linked: ["alice-two"] } } };
    expect(approvalCounts(file, "alice", { ...work, author: "alice-two" }, [])).toBe(false);
  });

  it("does from an account PDC coordinators linked to a trusted member, at that member's level", () => {
    const file = { members: { carol: { level: "trusted", linked: ["carol-two"] } } };
    expect(approvalCounts(file, "carol-two", work, [])).toBe(true);
  });

  it("does not from a member with a part in the module", () => {
    const file = { members: { carol: { level: "trusted" } } };
    const history = [{ member: "carol", role: "architecture" as const, module: "parser" }];
    expect(approvalCounts(file, "carol", work, history)).toBe(false);
  });

  it("does from a member whose only part in the module was Research, which is not a role in it", () => {
    const file = { members: { carol: { level: "trusted" } } };
    const history = [{ member: "carol", role: "research" as const, module: "parser" }];
    expect(approvalCounts(file, "carol", work, history)).toBe(true);
  });
});

describe("the approvals that stand on a pull request: each reviewer's latest review decides", () => {
  it("withdraws a reviewer's approval once they ask for changes after it", () => {
    const reviews = [
      { reviewer: "carol", commit: "c0ffee", verdict: "approved" as const },
      { reviewer: "carol", commit: "c0ffee", verdict: "changes requested" as const },
    ];
    expect(approvalsStanding(reviews)).toEqual([]);
  });

  it("keeps a reviewer's approval while it is their latest review, whatever they said before", () => {
    const reviews = [
      { reviewer: "carol", commit: "c0ffee", verdict: "changes requested" as const },
      { reviewer: "carol", commit: "c0ffee", verdict: "approved" as const },
    ];
    expect(approvalsStanding(reviews)).toEqual([{ reviewer: "carol", commit: "c0ffee" }]);
  });

  it("leaves one reviewer's approval standing when another asks for changes", () => {
    const reviews = [
      { reviewer: "carol", commit: "c0ffee", verdict: "approved" as const },
      { reviewer: "dave", commit: "c0ffee", verdict: "changes requested" as const },
    ];
    expect(approvalsStanding(reviews)).toEqual([{ reviewer: "carol", commit: "c0ffee" }]);
  });

  it("withdraws a reviewer's approval once their latest review was dismissed", () => {
    const reviews = [
      { reviewer: "carol", commit: "c0ffee", verdict: "approved" as const },
      { reviewer: "carol", commit: "c0ffee", verdict: "dismissed" as const },
    ];
    expect(approvalsStanding(reviews)).toEqual([]);
  });
});
