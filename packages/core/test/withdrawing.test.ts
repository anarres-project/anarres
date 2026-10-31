import { describe, expect, it } from "vitest";
import { withdrawnOnReopening } from "../src/index.ts";

describe("withdrawing integration tasks when a module is reopened (decision 0017)", () => {
  it("withdraws the ready integration task when the decision sends work to a module that is done", () => {
    expect(
      withdrawnOnReopening(
        { tasks: [{ role: "architecture", module: "parser" }] },
        new Set(["parser", "lexer"]),
        [{ task: "12", role: "integration-specification", module: "programme" }],
      ),
    ).toEqual(["12"]);
  });

  it("withdraws nothing when the decision sends work only to modules not done", () => {
    expect(
      withdrawnOnReopening({ tasks: [{ role: "test", module: "parser" }] }, new Set(["lexer"]), [
        { task: "12", role: "integration-specification", module: "programme" },
      ]),
    ).toEqual([]);
  });

  it("withdraws only integration tasks, leaving the modules' and the Programme Architect's", () => {
    expect(
      withdrawnOnReopening(
        { tasks: [{ role: "architecture", module: "parser" }] },
        new Set(["parser"]),
        [
          { task: "11", role: "test", module: "lexer" },
          { task: "12", role: "integration-test", module: "programme" },
          { task: "13", role: "programme-architect", module: "programme" },
        ],
      ),
    ).toEqual(["12"]);
  });

  it.each([{ alert: { reason: "no_matching_rule" as const } }, { moduleDone: true as const }])(
    "withdraws nothing when the decision sends no work: %j",
    (decision) => {
      expect(
        withdrawnOnReopening(decision, new Set(["parser"]), [
          { task: "12", role: "integration-test", module: "programme" },
        ]),
      ).toEqual([]);
    },
  );
});
