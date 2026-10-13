import { describe, expect, it } from "vitest";
import { type EventLog, onMerge, type Repository, type TaskBoard } from "../src/index.ts";

const untouched = async () => {
  throw new Error("Divlab should not have acted");
};
const board: TaskBoard = {
  post: untouched,
  alertCoordinators: untouched,
  markModuleDone: untouched,
  task: untouched,
  close: untouched,
};
const emptyLog: EventLog = { read: async () => [], append: untouched };

describe("acting on a merge", () => {
  it("refuses to route a feedback signal it cannot read, naming it and why", async () => {
    const repository: Repository = {
      feedbackSignals: async () => ["feedback/FB-3.md"],
      readFile: async () => "Looks good to me.",
    };
    await expect(onMerge("ledger", repository, board, emptyLog)).rejects.toThrow(
      "The feedback signal feedback/FB-3.md cannot be read: it has no feedback signal header",
    );
  });
});
