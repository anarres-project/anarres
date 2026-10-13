import { describe, expect, it } from "vitest";
import { readFeedbackSignal } from "../src/index.ts";

describe("reading a feedback signal", () => {
  it("gives the work its header reports: role, module, verdict and the task it was for", () => {
    const signal = [
      "---",
      "feedback_signal:",
      '  task_id: "12"',
      "  from_role: specification",
      "  module: parser",
      "  verdict: pass",
      "---",
      "",
      "The specification covers every requirement in the slice.",
    ].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({
      fromRole: "specification",
      module: "parser",
      verdict: "pass",
      impediments: [],
      task: "12",
    });
  });

  it("gives the problems failed work reports, and no task when it names none", () => {
    const signal = [
      "---",
      "feedback_signal:",
      "  from_role: coding",
      "  module: ledger",
      "  verdict: fail",
      "  impediments:",
      "    - type: test_failures",
      "      severity: high",
      "    - type: architecture_impediment",
      "---",
    ].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({
      fromRole: "coding",
      module: "ledger",
      verdict: "fail",
      impediments: [{ type: "test_failures" }, { type: "architecture_impediment" }],
    });
  });

  it("finds a file with no feedback signal header unreadable", () => {
    expect(readFeedbackSignal("The tests all pass.")).toEqual({
      unreadable: "it has no feedback signal header",
    });
  });

  it("finds a header that does not start the file no header at all", () => {
    const signal = [
      "Notes first.",
      "---",
      "feedback_signal:",
      ...["from_role: test", "module: parser", "verdict: pass"].map((f) => `  ${f}`),
      "---",
    ].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({ unreadable: "it has no feedback signal header" });
  });

  it("finds a header that never ends unreadable", () => {
    const signal = [
      "---",
      "feedback_signal:",
      ...["from_role: test", "module: parser", "verdict: pass"].map((f) => `  ${f}`),
    ].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({ unreadable: "its header never ends" });
  });

  it("finds a header that is not valid YAML unreadable", () => {
    const signal = ["---", "feedback_signal:", "  from_role: [coding", "---"].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({ unreadable: "its header is not valid YAML" });
  });

  it.each([
    ["has other fields", "title: Release notes"],
    ["is empty", ""],
    ["is a single value", "pass"],
    ["leaves the feedback signal empty", "feedback_signal:"],
  ])("finds a header that %s, with no feedback signal in it, unreadable", (_, header) => {
    const signal = ["---", header, "---"].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({ unreadable: "its header has no feedback signal" });
  });

  it.each([
    ["from_role", ["module: parser", "verdict: pass"]],
    ["module", ["from_role: test", "verdict: pass"]],
    ["verdict", ["from_role: test", "module: parser"]],
    ["from_role", ["from_role: 7", "module: parser", "verdict: pass"]],
    ["module", ["from_role: test", "module: [parser]", "verdict: pass"]],
  ])("finds a feedback signal without a %s in words unreadable", (field, fields) => {
    const signal = ["---", "feedback_signal:", ...fields.map((f) => `  ${f}`), "---"].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({
      unreadable: `its feedback signal does not give its ${field}`,
    });
  });

  it.each([
    ["are not a list", ["impediments: test_failures"]],
    ["are words, not problems", ["impediments:", "  - test_failures"]],
    ["leave out the type", ["impediments:", "  - severity: high"]],
    ["include an empty entry", ["impediments:", "  -"]],
  ])("finds a feedback signal whose impediments %s unreadable", (_, impediments) => {
    const signal = [
      "---",
      "feedback_signal:",
      ...["from_role: coding", "module: parser", "verdict: fail", ...impediments].map(
        (f) => `  ${f}`,
      ),
      "---",
    ].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({
      unreadable: "its feedback signal's impediments do not each give a type",
    });
  });

  it("gives the task as text when the header gives it as a number", () => {
    const signal = [
      "---",
      "feedback_signal:",
      ...["task_id: 12", "from_role: test", "module: parser", "verdict: pass"].map((f) => `  ${f}`),
      "---",
    ].join("\n");
    expect(readFeedbackSignal(signal)).toMatchObject({ task: "12" });
  });

  it.each([
    ["a list", "task_id: [12, 13]"],
    ["a fraction", "task_id: 12.5"],
    ["a yes or no", "task_id: true"],
  ])("finds a feedback signal whose task is %s unreadable", (_, task) => {
    const signal = [
      "---",
      "feedback_signal:",
      ...[task, "from_role: test", "module: parser", "verdict: pass"].map((f) => `  ${f}`),
      "---",
    ].join("\n");
    expect(readFeedbackSignal(signal)).toEqual({
      unreadable: "its feedback signal does not give its task_id as text or a whole number",
    });
  });
});
