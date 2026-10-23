import { describe, expect, it } from "vitest";
import { type ClaimedTask, onClaim, type TaskBoard } from "../src/index.ts";

const untouched = async () => {
  throw new Error("Divlab should not have acted");
};
const board: TaskBoard = {
  post: untouched,
  alertCoordinators: untouched,
  alertNotAccepted: untouched,
  alertUnprotectedMain: untouched,
  unprotectedMainAlertOpen: untouched,
  markModuleDone: untouched,
  task: untouched,
  close: untouched,
  actedOn: untouched,
  markClaimed: untouched,
};

describe("acting on a claim", () => {
  it("marks the task claimed by the member who asked", async () => {
    const claimed: ClaimedTask[] = [];
    const watched: TaskBoard = {
      ...board,
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    await onClaim("ledger", { task: "12", member: "alice" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });
});
