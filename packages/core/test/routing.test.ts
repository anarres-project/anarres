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

  it("keeps the next task in the same module as the accepted work", () => {
    expect(route({ fromRole: "specification", module: "ledger", verdict: "pass" })).toEqual([
      { role: "test", module: "ledger" },
    ]);
  });
});
