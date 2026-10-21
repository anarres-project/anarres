import { describe, expect, it } from "vitest";
import {
  type EventLog,
  onMerge,
  onPullRequest,
  type PostedTask,
  type PullRequests,
  type Repository,
  type TaskBoard,
} from "../src/index.ts";

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

describe("acting on a pull request", () => {
  const specificationPasses = {
    path: "feedback/FB-1.md",
    text: "---\nfeedback_signal:\n  from_role: specification\n  module: parser\n  verdict: pass\n---\n",
  };
  const submitting = (
    merged: string[] = [],
    files: { path: string; text: string }[] = [specificationPasses],
    refusals: string[] = [],
  ): PullRequests => ({
    head: async () => "c0ffee",
    changedFiles: async () => files,
    merge: async (_project, pullRequest) => {
      merged.push(pullRequest);
    },
    refuse: async (_project, pullRequest, reason) => {
      refusals.push(`${pullRequest}: ${reason}`);
    },
  });
  const log: EventLog = { read: async () => [], append: async () => {} };

  it("merges a pull request whose feedback signal it can read", async () => {
    const merged: string[] = [];
    await onPullRequest("ledger", "7", submitting(merged), { ...board, post: async () => {} }, log);
    expect(merged).toEqual(["7"]);
  });

  it("routes the work in the pull request it merges", async () => {
    const posted: PostedTask[] = [];
    const posting: TaskBoard = {
      ...board,
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", submitting(), posting, log);
    expect(posted).toEqual([{ project: "ledger", role: "test", module: "parser" }]);
  });

  it("does not merge a pull request whose feedback signal it cannot read", async () => {
    const merged: string[] = [];
    const unreadable = { path: "feedback/FB-2.md", text: "Looks good to me." };
    await onPullRequest("ledger", "8", submitting(merged, [unreadable]), board, log);
    expect(merged).toEqual([]);
  });

  it("tells the member why it did not merge their pull request", async () => {
    const refusals: string[] = [];
    const unreadable = { path: "feedback/FB-2.md", text: "Looks good to me." };
    await onPullRequest("ledger", "8", submitting([], [unreadable], refusals), board, log);
    expect(refusals).toEqual([
      "8: The feedback signal feedback/FB-2.md cannot be read: it has no feedback signal header",
    ]);
  });

  it("merges exactly the version of the pull request it read, not one pushed since", async () => {
    const merged: string[] = [];
    const pullRequests: PullRequests = {
      ...submitting(),
      merge: async (_project, pullRequest, head) => {
        merged.push(`${pullRequest} at ${head}`);
      },
    };
    await onPullRequest("ledger", "7", pullRequests, { ...board, post: async () => {} }, log);
    expect(merged).toEqual(["7 at c0ffee"]);
  });
});
