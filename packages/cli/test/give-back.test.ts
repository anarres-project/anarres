import { describe, expect, it } from "vitest";
import { giveBack } from "../src/index.ts";

describe("giving a task back", () => {
  it("asks Divlab to make it ready again, as the member, when nothing has been done on it", async () => {
    const asked: unknown[] = [];
    const said = await giveBack({ project: "ledger", task: "4" }, [], {
      askToRelease: async (project, task) => {
        asked.push({ project, task });
      },
    });
    expect([asked, said]).toEqual([
      [{ project: "ledger", task: "4" }],
      "Gave back ledger#4. Divlab makes it ready again for whoever takes it next.",
    ]);
  });

  it("asks for nothing while work done on it is not yet handed over, and says to hand it over", async () => {
    const said = await giveBack(
      { project: "ledger", task: "4" },
      ["modules/parser/tests/work.md"],
      {
        askToRelease: async () => {
          throw new Error("asked");
        },
      },
    );
    expect(said).toBe(
      "Not given back: ledger#4 has work not yet handed over (modules/parser/tests/work.md). Write its feedback signal as partial, with a handover note, and submit it: hand it over, and Divlab posts a continuation for whoever takes it next.",
    );
  });
});
