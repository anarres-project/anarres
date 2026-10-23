import { describe, expect, it } from "vitest";
import { describeOffers } from "../src/index.ts";

describe("the offers a member sees", () => {
  it("name each task by its project, issue, role and module, one to a line", () => {
    const offers = [
      { project: "ledger", task: "4", role: "test" as const, module: "lexer" },
      { project: "atlas", task: "9", role: "security-and-quality" as const, module: "parser" },
    ];
    expect(describeOffers(offers)).toBe(
      ["ledger#4  Test task for lexer", "atlas#9  Security & Quality task for parser"].join("\n"),
    );
  });

  it("say so when there is nothing the member may take", () => {
    expect(describeOffers([])).toBe("No tasks you may take are ready just now.");
  });
});
