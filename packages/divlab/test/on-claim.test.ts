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
  comments: untouched,
};

describe("acting on a claim", () => {
  /**
   * A board holding one task, held by `heldBy` or ready, whose issue has a claim comment from each
   * of `claimsBy`, earliest first. It keeps what Divlab claims and refuses.
   */
  const watching = ({ heldBy, claimsBy }: { heldBy?: string; claimsBy: string[] }) => {
    const claimed: ClaimedTask[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => (heldBy === undefined ? {} : { claimedBy: heldBy }),
      comments: async () => claimsBy.map((member) => ({ member, text: "/claim" })),
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
    const { claimed, watched } = watching({ claimsBy: ["alice"] });
    await onClaim("ledger", { task: "12", member: "alice" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });

  it("leaves a task another member holds with them", async () => {
    const { claimed, watched } = watching({ heldBy: "alice", claimsBy: ["alice", "bob"] });
    await onClaim("ledger", { task: "12", member: "bob" }, watched);
    expect(claimed).toEqual([]);
  });

  it("tells a member who claims a task another member holds that it has already been claimed", async () => {
    const { refused, watched } = watching({ heldBy: "alice", claimsBy: ["alice", "bob"] });
    await onClaim("ledger", { task: "12", member: "bob" }, watched);
    expect(refused).toEqual([
      { project: "ledger", task: "12", member: "bob", reason: "it has already been claimed" },
    ]);
  });

  it("gives the task to the member who claimed it first, even when it hears a later claim first", async () => {
    const { claimed, watched } = watching({ claimsBy: ["alice", "bob"] });
    await onClaim("ledger", { task: "12", member: "bob" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });

  it("gives the task to the member who asked when the issue's comments do not show a claim yet", async () => {
    const { claimed, watched } = watching({ claimsBy: [] });
    await onClaim("ledger", { task: "12", member: "bob" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "bob" }]);
  });

  it("tells a member whose claim came second, though heard first, that it has already been claimed", async () => {
    const { refused, watched } = watching({ claimsBy: ["alice", "bob"] });
    await onClaim("ledger", { task: "12", member: "bob" }, watched);
    expect(refused).toEqual([
      { project: "ledger", task: "12", member: "bob", reason: "it has already been claimed" },
    ]);
  });

  it("leaves alone a member's claim on a task already given to them, as a later run finds it", async () => {
    const { claimed, refused, watched } = watching({ heldBy: "alice", claimsBy: ["alice", "bob"] });
    await onClaim("ledger", { task: "12", member: "alice" }, watched);
    expect([claimed, refused]).toEqual([[], []]);
  });
});
