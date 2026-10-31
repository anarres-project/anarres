import { describe, expect, it } from "vitest";
import { highRiskListUnreadable, isHighRisk } from "../src/index.ts";

describe("whether a module is high-risk (decision 0019)", () => {
  it("is when PDC coordinators name it for its project in the governance file", () => {
    expect(isHighRisk({ members: {}, highRisk: { ledger: ["parser"] } }, "ledger", "parser")).toBe(
      true,
    );
  });

  it.each([
    { members: {}, highRisk: ["parser"] },
    { members: {}, highRisk: { ledger: ["par/ser"] } },
  ])("is, for every module, while the list cannot be read: %j", (file) => {
    expect(isHighRisk(file, "ledger", "lexer")).toBe(true);
  });
});

describe("whether the list of high-risk modules cannot be read (decision 0019)", () => {
  it("cannot when a project's entry names a module in more than a plain name", () => {
    expect(highRiskListUnreadable({ members: {}, highRisk: { ledger: ["par/ser"] } })).toBe(true);
  });
});
