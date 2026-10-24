import { describe, expect, it } from "vitest";
import { submission } from "../src/index.ts";

const TASK = { role: "coding" as const, module: "parser", task: "4" };
const SIGNAL = [
  "---",
  "feedback_signal:",
  '  task_id: "4"',
  "  from_role: coding",
  "  module: parser",
  "  verdict: pass",
  "---",
  "",
].join("\n");

describe("checking a member's work before it is submitted, as Divlab will check it", () => {
  it("is ready when its only changes are the role's place and one feedback signal naming the task", () => {
    const changed = [
      { path: "modules/parser/src/lexer.ts", text: "export {};\n" },
      { path: "feedback/FB-4.md", text: SIGNAL },
    ];
    expect(submission(TASK, changed)).toBe("ready");
  });

  it.each([
    [
      "it changes files outside the role's place",
      [
        { path: "modules/parser/tests/lexer.test.ts", text: "" },
        { path: "feedback/FB-4.md", text: SIGNAL },
      ],
      "it changes files outside what Coding may change: modules/parser/tests/lexer.test.ts",
    ],
    [
      "it has no feedback signal",
      [{ path: "modules/parser/src/lexer.ts", text: "" }],
      "it has no feedback signal: write one in feedback/, saying what it was for and how it went",
    ],
    [
      "its feedback signal cannot be read",
      [{ path: "feedback/FB-4.md", text: "Looks good to me." }],
      "its feedback signal cannot be read: it has no feedback signal header",
    ],
    [
      "its feedback signal is for another task",
      [{ path: "feedback/FB-4.md", text: SIGNAL.replace('"4"', '"5"') }],
      "its feedback signal names task 5, not task 4",
    ],
    [
      "its feedback signal is another role's",
      [{ path: "feedback/FB-4.md", text: SIGNAL.replace("from_role: coding", "from_role: test") }],
      "its feedback signal is from test and module parser, not coding and parser",
    ],
  ])("is not ready when %s", (_what, changed, why) => {
    expect(submission(TASK, changed)).toEqual({ refused: `Not submitted: ${why}.` });
  });
});
