import { describe, expect, it } from "vitest";
import { draftToRestore, restoreDraft, resumption } from "../src/index.ts";

const TASK = { role: "coding" as const, module: "parser", claimedBy: "alice" };

describe("resuming a task in a new session (concept §10)", () => {
  it("is in the task's folder, where it was prepared, while the member holds it", () => {
    expect(resumption({ project: "ledger", task: "4" }, TASK, "alice", { prepared: true })).toEqual(
      {
        folder: "anarres-work/ledger-4",
      },
    );
  });

  it("is the folder of the task named, for any project and task", () => {
    expect(resumption({ project: "atlas", task: "12" }, TASK, "alice", { prepared: true })).toEqual(
      {
        folder: "anarres-work/atlas-12",
      },
    );
  });

  it.each([
    ["someone else holds", { ...TASK, claimedBy: "bob" }],
    [
      "nobody holds, given back or its lease run out",
      { role: "coding" as const, module: "parser" },
    ],
    ["is not a task", undefined],
  ])("is refused for a task %s", (_what, task) => {
    expect(resumption({ project: "ledger", task: "4" }, task, "alice", { prepared: true })).toEqual(
      {
        refused:
          "Not resumed: you no longer hold ledger#4, so its work is no longer yours to do: run next for another task.",
      },
    );
  });

  it("is refused for a task not prepared on this machine, saying to prepare it", () => {
    expect(
      resumption({ project: "ledger", task: "4" }, TASK, "alice", { prepared: false }),
    ).toEqual({
      refused: "Not resumed: ledger#4 has not been prepared here: prepare it, then carry on.",
    });
  });
});

describe("bringing back a member's draft when preparing a task again (decision 0009)", () => {
  it("is the draft's files in the role's own place and its feedback signal, and nothing else", () => {
    const draft = [
      { path: "modules/parser/src/lexer.ts", text: "export {};\n" },
      { path: "feedback/FB-4.md", text: "---\n" },
      { path: "modules/parser/tests/lexer.test.ts", text: "" },
      { path: ".github/workflows/x.yml", text: "" },
    ];
    expect(draftToRestore(TASK, draft).map((file) => file.path)).toEqual([
      "modules/parser/src/lexer.ts",
      "feedback/FB-4.md",
    ]);
  });

  it("brings back one feedback signal only, as a task has one", () => {
    const draft = [
      { path: "feedback/FB-4.md", text: "" },
      { path: "feedback/FB-3.md", text: "" },
    ];
    expect(draftToRestore(TASK, draft).map((file) => file.path)).toEqual(["feedback/FB-4.md"]);
  });
});

describe("preparing a task again, with the member's open pull request for it (decision 0009)", () => {
  it("writes back the pull request's files in the role's own place, and says how many", async () => {
    const written: string[] = [];
    const restored = await restoreDraft(
      { project: "ledger", task: "4" },
      TASK,
      "alice",
      {
        pullRequestsOpenBy: async () => [
          { number: "16", task: "3", draft: true },
          { number: "17", task: "4", draft: true },
        ],
        changedFiles: async (_project, number) =>
          number === "17"
            ? [
                { path: "modules/parser/src/lexer.ts", text: "export {};\n" },
                { path: "modules/parser/tests/lexer.test.ts", text: "" },
              ]
            : [{ path: "modules/parser/src/other.ts", text: "" }],
      },
      (path) => void written.push(path),
    );
    expect([restored, written]).toEqual([1, ["modules/parser/src/lexer.ts"]]);
  });

  it("asks for no files, and writes none, when the member has no open pull request for the task", async () => {
    const asked: string[] = [];
    const restored = await restoreDraft(
      { project: "ledger", task: "4" },
      TASK,
      "alice",
      {
        pullRequestsOpenBy: async () => [{ number: "16", task: "3", draft: true }],
        changedFiles: async (_project, number) => {
          asked.push(number);
          return [];
        },
      },
      () => {},
    );
    expect([restored, asked]).toEqual([0, []]);
  });
});
