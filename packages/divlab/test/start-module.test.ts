import { describe, expect, it } from "vitest";
import { type PostedTask, startModule, startProject, type TaskBoard } from "../src/index.ts";

const untouched = async () => {
  throw new Error("Divlab should not have acted");
};

/** A board that keeps the tasks posted to it. */
function boardKeepingPosts() {
  const posted: PostedTask[] = [];
  const board: TaskBoard = {
    post: async (task) => {
      posted.push(task);
    },
    alertCoordinators: untouched,
    alertNotAccepted: untouched,
    markModuleDone: untouched,
    task: untouched,
    close: untouched,
    actedOn: untouched,
    markClaimed: untouched,
    refuseMember: untouched,
    comments: untouched,
    releaseClaim: untouched,
    tellLeaseRanOut: untouched,
    alertChangeNotByDivlab: untouched,
    claimedTasks: untouched,
    alertClaimedWithoutClaim: untouched,
    alertUnprotectedMain: untouched,
    unprotectedMainAlertOpen: untouched,
    alertUnreadableReviewList: untouched,
    unreadableReviewListAlertOpen: untouched,
  };
  return { posted, board };
}

describe("starting a module", () => {
  it("posts a ready Architecture task, the first role in a module's pipeline", async () => {
    const { posted, board } = boardKeepingPosts();
    await startModule("ledger", "parser", board);
    expect(posted).toEqual([{ project: "ledger", role: "architecture", module: "parser" }]);
  });
});

describe("starting a project", () => {
  it("posts one ready task, the Programme Architect's, for the programme", async () => {
    const { posted, board } = boardKeepingPosts();
    await startProject("ledger", board);
    expect(posted).toEqual([
      { project: "ledger", role: "programme-architect", module: "programme" },
    ]);
  });
});
