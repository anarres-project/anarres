import { describe, expect, it } from "vitest";
import { type Submitting, submission, submit } from "../src/index.ts";

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

describe("submitting a member's work", () => {
  /** GitHub as the member's CLI uses it, keeping what was asked of it, in order. */
  const watching = () => {
    const asked: unknown[] = [];
    const github: Submitting = {
      forkOf: async (project) => {
        asked.push(["fork", project]);
        return "alice/ledger";
      },
      branch: async (fork, name) => {
        asked.push(["branch", fork, name]);
      },
      putFile: async (fork, branch, path) => {
        asked.push(["put", fork, branch, path]);
      },
      openPullRequest: async (project, head, title, draft) => {
        asked.push(["pull request", project, head, title, draft]);
        return "17";
      },
    };
    return { asked, github };
  };

  it("puts the work on a branch of the member's fork, and asks the project to merge it", async () => {
    const { asked, github } = watching();
    const changed = [
      { path: "modules/parser/src/lexer.ts", text: "export {};\n" },
      { path: "feedback/FB-4.md", text: SIGNAL },
    ];
    const said = await submit({ project: "ledger", ...TASK }, changed, { draft: false }, github);
    expect(asked).toEqual([
      ["fork", "ledger"],
      ["branch", "alice/ledger", "anarres/task-4"],
      ["put", "alice/ledger", "anarres/task-4", "modules/parser/src/lexer.ts"],
      ["put", "alice/ledger", "anarres/task-4", "feedback/FB-4.md"],
      ["pull request", "ledger", "alice:anarres/task-4", "Coding work on parser (task 4)", false],
    ]);
    expect(said).toBe("Submitted ledger#4 as pull request 17: Divlab checks it and answers there.");
  });

  it("sends nothing when the work is not ready, and says why", async () => {
    const { asked, github } = watching();
    const changed = [{ path: "modules/parser/src/lexer.ts", text: "" }];
    const said = await submit({ project: "ledger", ...TASK }, changed, { draft: false }, github);
    expect([asked, said]).toEqual([
      [],
      "Not submitted: it has no feedback signal: write one in feedback/, saying what it was for and how it went.",
    ]);
  });
});
