import { describe, expect, it } from "vitest";
import { memberFor, type Role, type TrustLevel, trustAllows, trustLevelOf } from "../src/index.ts";

describe("what a member's trust level lets them take (concept §11, decision 0007)", () => {
  it("does not let a new member take a Reviewer task", () => {
    expect(trustAllows("new", "reviewer")).toBe(false);
  });

  it("lets a new member take a Coding task", () => {
    expect(trustAllows("new", "coding")).toBe(true);
  });

  it.each<[Role, TrustLevel, TrustLevel | undefined]>([
    ["specification", "new", undefined],
    ["test", "new", undefined],
    ["coding", "new", undefined],
    ["research", "new", undefined],
    ["architecture", "established", "new"],
    ["reviewer", "established", "new"],
    ["security-and-quality", "trusted", "established"],
    ["programme-architect", "trusted", "established"],
  ])("lets %s be taken from %s up, not by %s", (role, lowest, below) => {
    expect(trustAllows(lowest, role)).toBe(true);
    expect(trustAllows("pdc-coordinator", role)).toBe(true);
    if (below !== undefined) expect(trustAllows(below, role)).toBe(false);
  });
});

describe("a member's trust level, as the governance file records it (decision 0007)", () => {
  it("is the level PDC coordinators recorded for them", () => {
    const file = { members: { alice: { level: "established" } } };
    expect(trustLevelOf(file, "alice")).toBe("established");
  });

  it.each([
    ["a member the file does not list", { members: {} }, "bob"],
    ["a level Anarres does not have", { members: { alice: { level: "admin" } } }, "alice"],
    ["a name that is no member's", { members: {} }, "toString"],
    ["a file that is not what Divlab writes", ["alice"], "alice"],
    ["no file at all", undefined, "alice"],
  ])("is new for %s: unknown trust is no trust", (_what, file, member) => {
    expect(trustLevelOf(file, member)).toBe("new");
  });
});

describe("the member an account belongs to (concept §6, decision 0007)", () => {
  it("is the member a PDC coordinator linked it to", () => {
    const file = { members: { alice: { level: "established", linked: ["alice-2"] } } };
    expect(memberFor(file, "alice-2")).toBe("alice");
  });

  it.each([
    ["no member links it", { members: { alice: { level: "new", linked: ["alice-2"] } } }],
    ["a member's record names no linked accounts", { members: { alice: { level: "new" } } }],
    ["the links are not a list", { members: { alice: { linked: "bob" } } }],
    ["the file is not what Divlab writes", ["bob"]],
    ["there is no file", undefined],
  ])("is the account itself when %s", (_what, file) => {
    expect(memberFor(file, "bob")).toBe("bob");
  });
});
