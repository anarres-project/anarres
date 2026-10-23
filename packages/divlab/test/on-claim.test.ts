import { describe, expect, it } from "vitest";
import { type ClaimedTask, type ClaimRefused, onClaim, type TaskBoard } from "../src/index.ts";

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
  refuseClaim: untouched,
};

describe("acting on a claim", () => {
  /** A board holding one ready task, or one a member holds, that keeps what Divlab claims. */
  const watching = (heldBy?: string) => {
    const claimed: ClaimedTask[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => (heldBy === undefined ? {} : { claimedBy: heldBy }),
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    const refused: ClaimRefused[] = [];
    watched.refuseClaim = async (refusal) => {
      refused.push(refusal);
    };
    return { claimed, refused, watched };
  };

  it("marks the task claimed by the member who asked", async () => {
    const { claimed, watched } = watching();
    await onClaim("ledger", { task: "12", member: "alice" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });

  it("leaves a task another member holds with them", async () => {
    const { claimed, watched } = watching("alice");
    await onClaim("ledger", { task: "12", member: "bob" }, watched);
    expect(claimed).toEqual([]);
  });

  it("tells a member who claims a task another member holds that it has already been claimed", async () => {
    const { refused, watched } = watching("alice");
    await onClaim("ledger", { task: "12", member: "bob" }, watched);
    expect(refused).toEqual([
      { project: "ledger", task: "12", member: "bob", reason: "it has already been claimed" },
    ]);
  });
});
