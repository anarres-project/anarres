import { describe, expect, it } from "vitest";
import { claim, taskNamed } from "../src/index.ts";

describe("the task a member names to claim, as the offers name it", () => {
  it("is the project and issue number written project#number", () => {
    expect(taskNamed("ledger#4")).toEqual({ project: "ledger", task: "4" });
  });

  it.each([
    ["no issue number", "ledger"],
    ["a number that is not a whole one", "ledger#4/../9"],
    ["a project that is not a repository's name", "../orgs#4"],
    ["more than one task", "ledger#4#5"],
    ["a number GitHub could not have given", "ledger#0"],
  ])("is none when the name gives %s", (_what, named) => {
    expect(taskNamed(named)).toBeUndefined();
  });
});

describe("claiming a task", () => {
  it("asks Divlab for it, as the member, on the task's issue", async () => {
    const asked: unknown[] = [];
    const said = await claim("ledger#4", {
      askToClaim: async (project, task) => {
        asked.push({ project, task });
      },
    });
    expect([asked, said]).toEqual([
      [{ project: "ledger", task: "4" }],
      "Asked for ledger#4. Divlab answers on the task's issue: run next to see what is still offered.",
    ]);
  });

  it("asks for nothing when the task is not named as the offers name it", async () => {
    const said = await claim("../orgs#4", {
      askToClaim: async () => {
        throw new Error("asked");
      },
    });
    expect(said).toBe("Name the task as the offers do, project#number: ../orgs#4 is not one.");
  });
});
