import { describe, expect, it } from "vitest";
import { resumption } from "../src/index.ts";

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
