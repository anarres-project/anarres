import { describe, expect, it } from "vitest";
import { route } from "../src/index.ts";

describe("routing accepted work", () => {
  it("makes a Test task for the module when its specification passes", () => {
    expect(route({ fromRole: "specification", module: "parser", verdict: "pass" })).toEqual([
      { role: "test", module: "parser" },
    ]);
  });

  it("makes a Specification task when the module's architecture passes", () => {
    expect(route({ fromRole: "architecture", module: "parser", verdict: "pass" })).toEqual([
      { role: "specification", module: "parser" },
    ]);
  });

  it("makes a Coding task when the module's tests pass", () => {
    expect(route({ fromRole: "test", module: "parser", verdict: "pass" })).toEqual([
      { role: "coding", module: "parser" },
    ]);
  });

  it("makes a Reviewer task when the module's code passes", () => {
    expect(route({ fromRole: "coding", module: "parser", verdict: "pass" })).toEqual([
      { role: "reviewer", module: "parser" },
    ]);
  });

  it("makes a Security & Quality task when the module's review passes", () => {
    expect(route({ fromRole: "reviewer", module: "parser", verdict: "pass" })).toEqual([
      { role: "security-and-quality", module: "parser" },
    ]);
  });

  it("advances a conditional pass just as it does a pass", () => {
    expect(
      route({ fromRole: "specification", module: "parser", verdict: "conditional_pass" }),
    ).toEqual([{ role: "test", module: "parser" }]);
  });

  it("keeps the next task in the same module as the accepted work", () => {
    expect(route({ fromRole: "specification", module: "ledger", verdict: "pass" })).toEqual([
      { role: "test", module: "ledger" },
    ]);
  });
});
