import { describe, expect, it } from "vitest";
import { checkProtection, type ProjectRepositories, type TaskBoard } from "../src/index.ts";

const untouched = async () => {
  throw new Error("Divlab should not have acted");
};

/** A project whose main branch is protected or not, and a board that keeps its alerts. */
function project(protectedMain: boolean, alertOpen = false) {
  const alerts: string[] = [];
  const repositories: ProjectRepositories = {
    protectMain: untouched,
    allowDivlabChecks: untouched,
    mainIsProtected: async () => protectedMain,
  };
  const board: TaskBoard = {
    post: untouched,
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
    alertUnprotectedMain: async (name) => {
      alerts.push(name);
    },
    unprotectedMainAlertOpen: async () => alertOpen,
  };
  return { alerts, repositories, board };
}

describe("checking that a project's main branch is protected (decision 0006)", () => {
  it("alerts PDC coordinators when the project's main branch is not protected", async () => {
    const { alerts, repositories, board } = project(false);
    await checkProtection("ledger", repositories, board);
    expect(alerts).toEqual(["ledger"]);
  });

  it("says nothing while the project's main branch is protected", async () => {
    const { alerts, repositories, board } = project(true);
    await checkProtection("ledger", repositories, board);
    expect(alerts).toEqual([]);
  });

  it("does not alert again while its earlier alert is still open", async () => {
    const { alerts, repositories, board } = project(false, true);
    await checkProtection("ledger", repositories, board);
    expect(alerts).toEqual([]);
  });
});
