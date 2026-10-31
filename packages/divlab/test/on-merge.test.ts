import type { Role } from "@anarres/core";
import { describe, expect, it } from "vitest";
import {
  type CoordinatorAlert,
  type EventLog,
  type LogEvent,
  type NotAccepted,
  onChecked,
  onMerge,
  onPullRequest,
  type PostedTask,
  type PullRequests,
  type Repository,
  type TaskBoard,
} from "../src/index.ts";

/** Divlab's clock in these tests: a fixed time. */
const clock = () => new Date("2026-10-22T09:00:00Z");

/** A task as the board describes it: the role and module it is for. */
const TEST_TASK = { role: "test" as const, module: "parser" };

const untouched = async () => {
  throw new Error("Divlab should not have acted");
};
const board: TaskBoard = {
  post: untouched,
  alertCoordinators: untouched,
  alertNotAccepted: untouched,
  alertUnprotectedMain: untouched,
  unprotectedMainAlertOpen: untouched,
  alertUnreadableReviewList: untouched,
  alertUnreadableModules: untouched,
  unreadableModulesAlertOpen: untouched,
  readyTasks: untouched,
  unreadableReviewListAlertOpen: untouched,
  markModuleDone: untouched,
  task: untouched,
  close: untouched,
  actedOn: async () => [],
  markClaimed: untouched,
  refuseMember: untouched,
  comments: untouched,
  releaseClaim: untouched,
  tellLeaseRanOut: untouched,
  alertChangeNotByDivlab: untouched,
  claimedTasks: untouched,
  alertClaimedWithoutClaim: untouched,
};

describe("acting on a merge", () => {
  const passedSpecification =
    "---\nfeedback_signal:\n  from_role: specification\n  module: parser\n  verdict: pass\n---\n";
  /** One feedback signal on main; the tripwire never needs to read what it says. */
  const onMain = (_text: string): Repository => ({
    feedbackSignals: async () => ["feedback/FB-9.md"],
    mergeCommitOf: async (_project, pullRequest) => `merge-of-${pullRequest}`,
    merge: untouched,
    openHead: async () => "c0ffee",
    commitsSince: async () => [],
    head: async () => "h3ad",
  });
  /** A board and log that keep what Divlab does, for the test to look at. */
  const watching = () => {
    const seen = {
      posted: [] as PostedTask[],
      alerts: [] as NotAccepted[],
      appended: [] as unknown[],
    };
    const watchedBoard: TaskBoard = {
      ...board,
      post: async (task) => {
        seen.posted.push(task);
      },
      alertNotAccepted: async (record) => {
        seen.alerts.push(record);
      },
    };
    const watchedLog: EventLog = {
      read: async () => [],
      append: async (event) => {
        seen.appended.push(event);
      },
    };
    return { seen, watchedBoard, watchedLog };
  };

  it("never routes work that reached main without Divlab merging it", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, watchedLog, clock);
    expect(seen.posted).toEqual([]);
  });

  it("records and alerts work that reached main without Divlab only once, not on every run", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const alreadyRecorded: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          notAccepted: {
            feedbackSignal: "feedback/FB-9.md",
            reason: "it reached main without Divlab merging it",
          },
        },
      ],
    };
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, alreadyRecorded, clock);
    expect([seen.appended, seen.alerts]).toEqual([[], []]);
  });

  it("finishes routing work it merged but was interrupted before routing", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const begun: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, begun, clock);
    expect([seen.posted, seen.alerts]).toEqual([
      [
        {
          project: "ledger",
          role: "test",
          module: "parser",
          decidedOn: "feedback/FB-9.md",
          inputsAt: "merge-of-7",
        },
      ],
      [],
    ]);
  });

  it("keeps who did the work when it finishes an interrupted merge", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const begun: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            member: "alice",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, begun, clock);
    expect(seen.appended.find((event) => "work" in (event as object))).toMatchObject({
      member: "alice",
    });
  });

  it("records the commit of a merge it finishes after an interrupted run, as GitHub gives it", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const begun: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    const merged: Repository = {
      ...onMain(passedSpecification),
      mergeCommitOf: async (_project, pullRequest) => `merge-of-${pullRequest}`,
      merge: untouched,
      openHead: untouched,
      commitsSince: async () => [],
      head: async () => "h3ad",
    };
    await onMerge("ledger", merged, watchedBoard, begun, clock);
    expect(seen.appended.find((event) => "work" in (event as object))).toMatchObject({
      mergedAs: "merge-of-7",
    });
  });

  it("finishes interrupted merges in the order it merged them, not the order they are listed", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const merged = (feedbackSignal: string, module: string) => ({
      project: "ledger",
      aboutToMerge: {
        pullRequest: module,
        head: "c0ffee",
        feedbackSignal,
        work: { fromRole: "specification", module, verdict: "pass", impediments: [] },
      },
    });
    const begun: EventLog = {
      ...watchedLog,
      read: async () => [merged("feedback/FB-2.md", "lexer"), merged("feedback/FB-1.md", "parser")],
    };
    const listed: Repository = {
      feedbackSignals: async () => ["feedback/FB-1.md", "feedback/FB-2.md"],
      mergeCommitOf: async (_project, pullRequest) => `merge-of-${pullRequest}`,
      merge: untouched,
      openHead: untouched,
      commitsSince: async () => [],
      head: async () => "h3ad",
    };
    await onMerge("ledger", listed, watchedBoard, begun, clock);
    expect(seen.posted.map((task) => task.module)).toEqual(["lexer", "parser"]);
  });

  it("counts the decisions it records in a run when routing the next work in that run", async () => {
    const alerts: unknown[] = [];
    const codingFails = (n: number) => ({
      fromRole: "coding",
      module: "parser",
      verdict: "fail",
      impediments: [{ type: "test_failures" }],
      feedbackSignal: `feedback/FB-${n}.md`,
    });
    const sentBack = (n: number) => ({
      project: "ledger",
      work: codingFails(n),
      decision: {
        tasks: [
          { role: "coding" as const, module: "parser", feedbackSignal: `feedback/FB-${n}.md` },
        ],
      },
      reason: { rule: "reported" as const, impediment: "test_failures" },
    });
    const begun = (n: number) => {
      const { feedbackSignal, ...work } = codingFails(n);
      return {
        project: "ledger",
        aboutToMerge: { pullRequest: String(n), head: "c0ffee", feedbackSignal, work },
      };
    };
    const twoInterrupted: EventLog = {
      read: async () => [
        sentBack(1),
        { project: "ledger", actedOn: { feedbackSignal: "feedback/FB-1.md" } },
        sentBack(2),
        { project: "ledger", actedOn: { feedbackSignal: "feedback/FB-2.md" } },
        begun(3),
        begun(4),
      ],
      append: async () => {},
    };
    const onMainNow: Repository = {
      feedbackSignals: async () => [
        "feedback/FB-1.md",
        "feedback/FB-2.md",
        "feedback/FB-3.md",
        "feedback/FB-4.md",
      ],
      mergeCommitOf: async (_project, pullRequest) => `merge-of-${pullRequest}`,
      merge: untouched,
      openHead: untouched,
      commitsSince: async () => [],
      head: async () => "h3ad",
    };
    const alerting: TaskBoard = {
      ...board,
      post: async () => {},
      alertCoordinators: async (alert) => {
        alerts.push(alert.reason);
      },
    };
    await onMerge("ledger", onMainNow, alerting, twoInterrupted, clock);
    expect(alerts).toEqual([{ rule: "re_run_limit", role: "coding" }]);
  });

  it("never routes work it was about to merge but did not, whose signal is not on main", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const putOffAgain: Repository = {
      ...onMain(passedSpecification),
      merge: async () => {
        throw new Error("Merge already in progress");
      },
    };
    const begunOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-3.md",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    await expect(onMerge("ledger", putOffAgain, watchedBoard, begunOnly, clock)).rejects.toThrow();
    expect(seen.posted).toEqual([]);
  });

  it("asks GitHub again for a merge it was about to make, which GitHub put off", async () => {
    const { watchedBoard, watchedLog } = watching();
    const begunOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-3.md",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    const asked: string[][] = [];
    const repository: Repository = {
      ...onMain(passedSpecification),
      merge: async (project, pullRequest, head) => {
        asked.push([project, pullRequest, head]);
        return "merged";
      },
    };
    await onMerge("ledger", repository, watchedBoard, begunOnly, clock);
    expect(asked).toEqual([["ledger", "7", "c0ffee"]]);
  });

  it("does not ask again for a merge whose pull request was closed since", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const begunOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-3.md",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    const repository: Repository = {
      ...onMain(passedSpecification),
      openHead: async () => undefined,
    };
    await onMerge("ledger", repository, watchedBoard, begunOnly, clock);
    expect(seen.posted).toEqual([]);
  });

  it("does not ask again for a merge whose pull request was pushed to since: that is decided afresh", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const begunOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-3.md",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    const repository: Repository = {
      ...onMain(passedSpecification),
      openHead: async () => "n3wer",
    };
    await onMerge("ledger", repository, watchedBoard, begunOnly, clock);
    expect(seen.posted).toEqual([]);
  });

  it("routes work GitHub put off once it merges it, from the merge's commit", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const begunOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-3.md",
            work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
          },
        },
      ],
    };
    const repository: Repository = {
      ...onMain(passedSpecification),
      merge: async () => "m3rged",
    };
    await onMerge("ledger", repository, watchedBoard, begunOnly, clock);
    expect(seen.posted).toEqual([
      {
        project: "ledger",
        role: "test",
        module: "parser",
        decidedOn: "feedback/FB-3.md",
        inputsAt: "m3rged",
      },
    ]);
  });

  it("records when it found work that reached main without it, by its clock", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, watchedLog, clock);
    expect(seen.appended).toMatchObject([{ decidedAt: "2026-10-22T09:00:00.000Z" }]);
  });

  it("acts on a decision it recorded but never acted on", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const work = { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] };
    const recordedOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work,
          },
        },
        {
          project: "ledger",
          work: { ...work, feedbackSignal: "feedback/FB-9.md" },
          decision: { tasks: [{ role: "test", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const nothingActedOn: TaskBoard = { ...watchedBoard, actedOn: async () => [] };
    await onMerge("ledger", onMain(passedSpecification), nothingActedOn, recordedOnly, clock);
    expect(seen.posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "test", module: "parser" },
    ]);
  });

  it("marks the last module done and posts the integration task its decision names (0017)", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const work = {
      fromRole: "security-and-quality",
      module: "parser",
      verdict: "pass",
      impediments: [],
    };
    const recordedOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work,
          },
        },
        {
          project: "ledger",
          work: { ...work, feedbackSignal: "feedback/FB-9.md", lastModule: true },
          decision: {
            moduleDone: true,
            tasks: [{ role: "integration-specification", module: "programme" }],
          },
          reason: { rule: "pipeline_complete" },
        },
      ],
    };
    const done: string[] = [];
    const finishing: TaskBoard = {
      ...watchedBoard,
      actedOn: async () => [],
      markModuleDone: async ({ module }) => {
        done.push(module);
      },
    };
    await onMerge("ledger", onMain(passedSpecification), finishing, recordedOnly, clock);
    expect([done, seen.posted.map(({ role, module }) => ({ role, module }))]).toEqual([
      ["parser"],
      [{ role: "integration-specification", module: "programme" }],
    ]);
  });

  it("closes the task a recorded decision was for, when it acts on it later", async () => {
    const { watchedBoard, watchedLog } = watching();
    const closed: string[] = [];
    const work = { fromRole: "test", module: "parser", verdict: "pass", impediments: [] };
    const recordedOnly: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "9",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work,
          },
        },
        {
          project: "ledger",
          task: "3",
          work: { ...work, feedbackSignal: "feedback/FB-9.md" },
          decision: { tasks: [{ role: "coding", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const closing: TaskBoard = {
      ...watchedBoard,
      close: async (_project, task) => {
        closed.push(task);
      },
    };
    await onMerge("ledger", onMain(passedSpecification), closing, recordedOnly, clock);
    expect(closed).toEqual(["3"]);
  });

  it("never acts twice on a decision: one the board shows it acted on is left alone", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const work = { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] };
    const routed: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work,
          },
        },
        {
          project: "ledger",
          work: { ...work, feedbackSignal: "feedback/FB-9.md" },
          decision: { tasks: [{ role: "test", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const actedOn: TaskBoard = { ...watchedBoard, actedOn: async () => ["feedback/FB-9.md"] };
    await onMerge("ledger", onMain(passedSpecification), actedOn, routed, clock);
    expect(seen.posted).toEqual([]);
  });

  it("records having acted when the board shows it did, so it need not ask again", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const work = { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] };
    const routed: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work,
          },
        },
        {
          project: "ledger",
          work: { ...work, feedbackSignal: "feedback/FB-9.md" },
          decision: { tasks: [{ role: "test", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const actedOn: TaskBoard = { ...watchedBoard, actedOn: async () => ["feedback/FB-9.md"] };
    await onMerge("ledger", onMain(passedSpecification), actedOn, routed, clock);
    expect(seen.appended).toEqual([
      { project: "ledger", actedOn: { feedbackSignal: "feedback/FB-9.md" } },
    ]);
  });

  it("trusts its own record of having acted, never asking the board, whose lists lag", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    const work = { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] };
    const actedAndRecorded: EventLog = {
      ...watchedLog,
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-9.md",
            work,
          },
        },
        {
          project: "ledger",
          work: { ...work, feedbackSignal: "feedback/FB-9.md" },
          decision: { tasks: [{ role: "test", module: "parser" }] },
          reason: { rule: "passed" },
        },
        { project: "ledger", actedOn: { feedbackSignal: "feedback/FB-9.md" } },
      ],
    };
    const lagging: TaskBoard = { ...watchedBoard, actedOn: untouched };
    await onMerge("ledger", onMain(passedSpecification), lagging, actedAndRecorded, clock);
    expect(seen.posted).toEqual([]);
  });

  it.each([
    ["a claim", { claimed: { task: "12", member: "alice" } }],
    ["a lease that ran out", { leaseRanOut: { task: "12", member: "alice" } }],
    ["activity on a task", { activity: { task: "12", member: "alice" } }],
  ])("reads past %s in the log, which is about no feedback signal", async (_kind, record) => {
    const { seen, watchedBoard, watchedLog } = watching();
    const withRecord: EventLog = {
      ...watchedLog,
      read: async () => [
        { project: "ledger", decidedAt: "2026-10-22T08:00:00.000Z", ...record } as LogEvent,
      ],
    };
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, withRecord, clock);
    expect(seen.alerts.map((alert) => alert.notAccepted.feedbackSignal)).toEqual([
      "feedback/FB-9.md",
    ]);
  });

  it("alerts PDC coordinators of work that reached main without Divlab merging it", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, watchedLog, clock);
    expect(seen.alerts).toEqual(seen.appended);
  });

  it("records work that reached main without Divlab merging it as not accepted, saying why", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, watchedLog, clock);
    expect(seen.appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        notAccepted: {
          feedbackSignal: "feedback/FB-9.md",
          reason: "it reached main without Divlab merging it",
        },
      },
    ]);
  });

  it("records an unreadable signal on main as not accepted like any other, without stopping", async () => {
    const { seen, watchedBoard, watchedLog } = watching();
    await onMerge("ledger", onMain("Looks good to me."), watchedBoard, watchedLog, clock);
    expect(seen.appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        notAccepted: {
          feedbackSignal: "feedback/FB-9.md",
          reason: "it reached main without Divlab merging it",
        },
      },
    ]);
  });
});

describe("acting on a pull request", () => {
  const specificationPasses = {
    path: "feedback/FB-1.md",
    text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: specification\n  module: parser\n  verdict: pass\n---\n',
  };
  /** The board shows the work's task held by the member who opened the pull request. */
  /** The board shows the work's task, for its role, held by the member who opened the pull request. */
  const heldAs = (role: Role): TaskBoard => ({
    ...board,
    task: async () => ({ role, module: "parser", claimedBy: "alice" }),
    close: async () => {},
  });
  const held = heldAs("specification");
  const submitting = (
    merged: string[] = [],
    files: { path: string; text: string }[] = [specificationPasses],
    refusals: string[] = [],
  ): PullRequests => ({
    pullRequest: async () => ({ head: "c0ffee", draft: false, author: "alice" }),
    changedFiles: async () => files,
    merge: async (_project, pullRequest) => {
      merged.push(pullRequest);
      return "m3rg3d";
    },
    refuse: async (_project, pullRequest, reason) => {
      refusals.push(`${pullRequest}: ${reason}`);
    },
    check: async () => ({
      state: "passed",
      url: "https://github.com/commons/ledger/actions/runs/1",
    }),
    openAt: async () => [],
    // PDC coordinators name no module for review, and nobody has reviewed anything.
    governanceFile: async () => ({ members: {} }),
    reviews: async () => [],
    refusalsGiven: async () => [],
    // Nothing on main changed since any task's inputs were pinned.
    changedOnMainSince: async () => [],
    modulesOnMain: async () => undefined,
    modulesAt: async () => undefined,
    // The project's tests on Test work: its new test ran and failed, as it should.
    testReport: async () => ({
      state: "finished",
      url: "https://github.com/commons/ledger/actions/runs/1",
      report: { cases: [{ name: "parser > reads a number", outcome: "failed" }] },
    }),
  });
  const log: EventLog = { read: async () => [], append: async () => {} };

  it("starts the integration pipeline when the module the work completes is the last not done (0017)", async () => {
    const posted: PostedTask[] = [];
    const securityPasses = {
      path: "feedback/FB-1.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n',
    };
    const listed: PullRequests = {
      ...submitting([], [securityPasses]),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const lexerDone: EventLog = {
      read: async () => [
        {
          project: "ledger",
          work: {
            fromRole: "security-and-quality",
            module: "lexer",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-0.md",
          },
          decision: { moduleDone: true },
          reason: { rule: "pipeline_complete" },
        },
      ],
      append: async () => {},
    };
    const finishing: TaskBoard = {
      ...heldAs("security-and-quality"),
      markModuleDone: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", listed, finishing, lexerDone, clock);
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "integration-specification", module: "programme" },
    ]);
  });

  it("runs the integration tests again when the last module is done again after integration began (0017)", async () => {
    const posted: PostedTask[] = [];
    const securityPasses = {
      path: "feedback/FB-3.md",
      text: '---\nfeedback_signal:\n  task_id: "3"\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n',
    };
    const listed: PullRequests = {
      ...submitting([], [securityPasses]),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const done = (module: string, feedbackSignal: string): LogEvent => ({
      project: "ledger",
      work: {
        fromRole: "security-and-quality",
        module,
        verdict: "pass",
        impediments: [],
        feedbackSignal,
      },
      decision: { moduleDone: true },
      reason: { rule: "pipeline_complete" },
    });
    const integrationBegan: EventLog = {
      read: async () => [
        done("lexer", "feedback/FB-0.md"),
        done("parser", "feedback/FB-1.md"),
        {
          project: "ledger",
          work: {
            fromRole: "integration-specification",
            module: "programme",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-2.md",
          },
          decision: { tasks: [{ role: "integration-test", module: "programme" }] },
          reason: { rule: "passed" },
        },
      ],
      append: async () => {},
    };
    const finishing: TaskBoard = {
      ...heldAs("security-and-quality"),
      markModuleDone: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", listed, finishing, integrationBegan, clock);
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "integration-test", module: "programme" },
    ]);
  });

  it("withdraws a ready integration task when its decision reopens a module that was done (0017)", async () => {
    const closed: string[] = [];
    const integrationFails = {
      path: "feedback/FB-3.md",
      text: '---\nfeedback_signal:\n  task_id: "3"\n  from_role: integration-test\n  module: programme\n  verdict: fail\n  module_at_fault: parser\n  impediments:\n    - type: test_failures\n---\n',
    };
    const listed: PullRequests = {
      ...submitting([], [integrationFails]),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const done = (module: string, feedbackSignal: string): LogEvent => ({
      project: "ledger",
      work: {
        fromRole: "security-and-quality",
        module,
        verdict: "pass",
        impediments: [],
        feedbackSignal,
      },
      decision: { moduleDone: true },
      reason: { rule: "pipeline_complete" },
    });
    const bothDone: EventLog = {
      read: async () => [done("lexer", "feedback/FB-0.md"), done("parser", "feedback/FB-1.md")],
      append: async () => {},
    };
    const integrating: TaskBoard = {
      ...board,
      task: async () => ({ role: "integration-test", module: "programme", claimedBy: "alice" }),
      post: async () => {},
      close: async (_project, task) => {
        closed.push(task);
      },
      readyTasks: async () => [
        { id: "11", role: "test", module: "lexer" },
        { id: "12", role: "integration-review", module: "programme" },
      ],
    };
    await onPullRequest("ledger", "7", listed, integrating, bothDone, clock);
    expect(closed).toContain("12");
    expect(closed).not.toContain("11");
  });

  it("records the integration tasks a decision withdraws with the decision itself (0017)", async () => {
    const appended: LogEvent[] = [];
    const integrationFails = {
      path: "feedback/FB-3.md",
      text: '---\nfeedback_signal:\n  task_id: "3"\n  from_role: integration-test\n  module: programme\n  verdict: fail\n  module_at_fault: parser\n  impediments:\n    - type: test_failures\n---\n',
    };
    const listed: PullRequests = {
      ...submitting([], [integrationFails]),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const parserDone: LogEvent = {
      project: "ledger",
      work: {
        fromRole: "security-and-quality",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: "feedback/FB-1.md",
      },
      decision: { moduleDone: true },
      reason: { rule: "pipeline_complete" },
    };
    const recording: EventLog = {
      read: async () => [parserDone],
      append: async (event) => {
        appended.push(event);
      },
    };
    const integrating: TaskBoard = {
      ...board,
      task: async () => ({ role: "integration-test", module: "programme", claimedBy: "alice" }),
      post: async () => {},
      close: async () => {},
      readyTasks: async () => [{ id: "12", role: "integration-review", module: "programme" }],
    };
    await onPullRequest("ledger", "7", listed, integrating, recording, clock);
    const decided = appended.find((event) => "decision" in event);
    expect(decided).toMatchObject({ withdrawn: ["12"] });
  });

  it("starts no integration while a module done before has been sent work again (0017)", async () => {
    const posted: PostedTask[] = [];
    const securityPasses = {
      path: "feedback/FB-5.md",
      text: '---\nfeedback_signal:\n  task_id: "5"\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n',
    };
    const listed: PullRequests = {
      ...submitting([], [securityPasses]),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const done = (module: string, feedbackSignal: string): LogEvent => ({
      project: "ledger",
      work: {
        fromRole: "security-and-quality",
        module,
        verdict: "pass",
        impediments: [],
        feedbackSignal,
      },
      decision: { moduleDone: true },
      reason: { rule: "pipeline_complete" },
    });
    const lexerReopened: EventLog = {
      read: async () => [
        done("lexer", "feedback/FB-0.md"),
        done("parser", "feedback/FB-1.md"),
        {
          project: "ledger",
          work: {
            fromRole: "programme-architect",
            module: "programme",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-2.md",
            modulesToStart: [],
          },
          decision: {
            tasks: [
              { role: "architecture", module: "lexer", feedbackSignal: "feedback/FB-2.md" },
              { role: "architecture", module: "parser", feedbackSignal: "feedback/FB-2.md" },
            ],
          },
          reason: { rule: "contract_revised", contracts: ["tokens"] },
        },
      ],
      append: async () => {},
    };
    const finishing: TaskBoard = {
      ...heldAs("security-and-quality"),
      markModuleDone: async () => {},
      post: async (task) => {
        posted.push(task);
      },
      readyTasks: async () => [],
    };
    await onPullRequest("ledger", "7", listed, finishing, lexerReopened, clock);
    expect(posted).toEqual([]);
  });

  it("posts nothing further when integration work passes while a module is reopened (0017)", async () => {
    const posted: PostedTask[] = [];
    const specificationPasses = {
      path: "feedback/FB-6.md",
      text: '---\nfeedback_signal:\n  task_id: "6"\n  from_role: integration-specification\n  module: programme\n  verdict: pass\n---\n',
    };
    const listed: PullRequests = {
      ...submitting(
        [],
        [
          specificationPasses,
          { path: "integration/specifications/checkout.feature", text: "Feature: Checkout\n" },
        ],
      ),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const done = (module: string, feedbackSignal: string): LogEvent => ({
      project: "ledger",
      work: {
        fromRole: "security-and-quality",
        module,
        verdict: "pass",
        impediments: [],
        feedbackSignal,
      },
      decision: { moduleDone: true },
      reason: { rule: "pipeline_complete" },
    });
    const parserReopened: EventLog = {
      read: async () => [
        done("lexer", "feedback/FB-0.md"),
        done("parser", "feedback/FB-1.md"),
        {
          project: "ledger",
          work: {
            fromRole: "programme-architect",
            module: "programme",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-2.md",
            modulesToStart: [],
          },
          decision: {
            tasks: [{ role: "architecture", module: "parser", feedbackSignal: "feedback/FB-2.md" }],
          },
          reason: { rule: "contract_revised", contracts: ["tokens"] },
        },
      ],
      append: async () => {},
    };
    const integrating: TaskBoard = {
      ...board,
      task: async () => ({
        role: "integration-specification",
        module: "programme",
        claimedBy: "alice",
      }),
      close: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", listed, integrating, parserReopened, clock);
    expect(posted).toEqual([]);
  });

  it("starts no integration while another module is not done", async () => {
    const posted: PostedTask[] = [];
    const securityPasses = {
      path: "feedback/FB-1.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n',
    };
    const listed: PullRequests = {
      ...submitting([], [securityPasses]),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const finishing: TaskBoard = {
      ...heldAs("security-and-quality"),
      markModuleDone: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", listed, finishing, log, clock);
    expect(posted).toEqual([]);
  });

  it("tells PDC coordinators when it cannot read main's modules.yaml as a module is done", async () => {
    const alerted: { project: string; reason: string }[] = [];
    const securityPasses = {
      path: "feedback/FB-1.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n',
    };
    const spoiled: PullRequests = {
      ...submitting([], [securityPasses]),
      modulesOnMain: async () => "modules: [unclosed",
    };
    const finishing: TaskBoard = {
      ...heldAs("security-and-quality"),
      markModuleDone: async () => {},
      post: async () => {},
      alertUnreadableModules: async (project, reason) => {
        alerted.push({ project, reason });
      },
      unreadableModulesAlertOpen: async () => false,
    };
    await onPullRequest("ledger", "7", spoiled, finishing, log, clock);
    expect(alerted).toEqual([
      { project: "ledger", reason: expect.stringContaining("modules.yaml") },
    ]);
  });

  it("alerts PDC coordinators when a failing integration test names a module main's modules.yaml does not list (0017)", async () => {
    const alerts: CoordinatorAlert[] = [];
    const integrationFails = {
      path: "feedback/FB-1.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: integration-test\n  module: programme\n  verdict: fail\n  module_at_fault: parsr\n  impediments:\n    - type: test_failures\n---\n',
    };
    const listed: PullRequests = {
      ...submitting([], [integrationFails]),
      modulesOnMain: async () => "modules:\n  - name: lexer\n  - name: parser\n",
    };
    const integrating: TaskBoard = {
      ...board,
      task: async () => ({ role: "integration-test", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async () => {},
      alertCoordinators: async (alert) => {
        alerts.push(alert);
      },
    };
    await onPullRequest("ledger", "7", listed, integrating, log, clock);
    expect(alerts.map(({ reason }) => reason)).toEqual([
      { rule: "unlisted_module_at_fault", module: "parsr" },
    ]);
  });

  it("alerts PDC coordinators when a failing integration test names a module and main's modules.yaml cannot be read", async () => {
    const alerts: CoordinatorAlert[] = [];
    const integrationFails = {
      path: "feedback/FB-1.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: integration-test\n  module: programme\n  verdict: fail\n  module_at_fault: parser\n  impediments:\n    - type: test_failures\n---\n',
    };
    const spoiled: PullRequests = {
      ...submitting([], [integrationFails]),
      modulesOnMain: async () => "modules: [unclosed",
    };
    const integrating: TaskBoard = {
      ...board,
      task: async () => ({ role: "integration-test", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async () => {},
      alertCoordinators: async (alert) => {
        alerts.push(alert);
      },
    };
    await onPullRequest("ledger", "7", spoiled, integrating, log, clock);
    expect(alerts.map(({ reason }) => reason)).toEqual([
      { rule: "unlisted_module_at_fault", module: "parser" },
    ]);
  });

  it("does not tell PDC coordinators again while its alert that modules.yaml cannot be read is open", async () => {
    const alerted: string[] = [];
    const securityPasses = {
      path: "feedback/FB-1.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n',
    };
    const spoiled: PullRequests = {
      ...submitting([], [securityPasses]),
      modulesOnMain: async () => "modules: [unclosed",
    };
    const alertedBefore: TaskBoard = {
      ...heldAs("security-and-quality"),
      markModuleDone: async () => {},
      post: async () => {},
      alertUnreadableModules: async (project) => {
        alerted.push(project);
      },
      unreadableModulesAlertOpen: async () => true,
    };
    await onPullRequest("ledger", "7", spoiled, alertedBefore, log, clock);
    expect(alerted).toEqual([]);
  });

  it("does not merge a draft: its member has not finished the work", async () => {
    const merged: string[] = [];
    const draft: PullRequests = {
      ...submitting(merged),
      pullRequest: async () => ({ head: "c0ffee", draft: true, author: "alice" }),
    };
    await onPullRequest("ledger", "7", draft, { ...held, post: async () => {} }, log, clock);
    expect(merged).toEqual([]);
  });

  it("records a draft from the member holding its task as activity on the task", async () => {
    const appended: unknown[] = [];
    const forTask = {
      path: "feedback/FB-4.md",
      text: '---\nfeedback_signal:\n  task_id: "12"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
    };
    const draft: PullRequests = {
      ...submitting([], [forTask]),
      pullRequest: async () => ({ head: "c0ffee", draft: true, author: "alice" }),
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    const held: TaskBoard = { ...board, task: async () => ({ ...TEST_TASK, claimedBy: "alice" }) };
    await onPullRequest("ledger", "7", draft, held, recording, clock);
    expect(appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        activity: { task: "12", member: "alice" },
      },
    ]);
  });

  it("records no activity for a draft from someone who does not hold its task", async () => {
    const appended: unknown[] = [];
    const forTask = {
      path: "feedback/FB-4.md",
      text: '---\nfeedback_signal:\n  task_id: "12"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
    };
    const draft: PullRequests = {
      ...submitting([], [forTask]),
      pullRequest: async () => ({ head: "c0ffee", draft: true, author: "mallory" }),
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    const held: TaskBoard = { ...board, task: async () => ({ ...TEST_TASK, claimedBy: "alice" }) };
    await onPullRequest("ledger", "7", draft, held, recording, clock);
    expect(appended).toEqual([]);
  });

  it("says nothing about a draft with no feedback signal yet, and records nothing", async () => {
    const merged: string[] = [];
    const refusals: string[] = [];
    const appended: unknown[] = [];
    const draft: PullRequests = {
      ...submitting(merged, [], refusals),
      pullRequest: async () => ({ head: "c0ffee", draft: true, author: "alice" }),
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest("ledger", "7", draft, held, recording, clock);
    expect([merged, refusals, appended]).toEqual([[], [], []]);
  });

  it("does not merge work that changes files outside its role's place, and names them", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const codingWithTests = [
      {
        path: "feedback/FB-5.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/src/lexer.ts", text: "export {};\n" },
      { path: "modules/parser/tests/lexer.test.ts", text: "// changed\n" },
    ];
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, codingWithTests, refusals),
      heldAs("coding" as Role),
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The work changes files outside what Coding may change: modules/parser/tests/lexer.test.ts",
      ],
    ]);
  });

  it("does not merge work from a role Anarres does not have, and says so", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const fromNowhere = [
      {
        path: "feedback/FB-6.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: oracle\n  module: parser\n  verdict: pass\n---\n',
      },
    ];
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, fromNowhere, refusals),
      heldAs("oracle" as Role),
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      ["7: The feedback signal feedback/FB-6.md names a role Anarres does not have: oracle"],
    ]);
  });

  it("does not merge work that does not say which task it was for, and tells the member", async () => {
    const merged: string[] = [];
    const refusals: string[] = [];
    const forNoTask = {
      path: "feedback/FB-9.md",
      text: "---\nfeedback_signal:\n  from_role: specification\n  module: parser\n  verdict: pass\n---\n",
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, [forNoTask], refusals),
      { ...held, post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The feedback signal feedback/FB-9.md does not say which task the work was for: work is merged only for a task its member holds",
      ],
    ]);
  });

  it("does not merge work from a member who does not hold its task, and tells them", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const heldByBob: TaskBoard = {
      ...held,
      post: async () => {},
      task: async () => ({ role: "specification", module: "parser", claimedBy: "bob" }),
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, undefined, refusals),
      heldByBob,
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The work is for task 1, and only the member holding it can submit its work: claim a task before doing it",
      ],
    ]);
  });

  it("does not merge work naming an issue that is not an open task, such as a closed one", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const noTask: TaskBoard = { ...held, post: async () => {}, task: async () => undefined };
    await onPullRequest("ledger", "7", submitting(merged, undefined, refusals), noTask, log, clock);
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The work is for task 1, and only the member holding it can submit its work: claim a task before doing it",
      ],
    ]);
  });

  it("does not merge Integration Test work the project's tests failed on (0017)", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const integrationTest = {
      path: "feedback/FB-7.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: integration-test\n  module: programme\n  verdict: pass\n---\n',
    };
    const failing: PullRequests = {
      ...submitting(
        merged,
        [integrationTest, { path: "integration/tests/checkout.test.ts", text: "export {};\n" }],
        refusals,
      ),
      check: async () => ({
        state: "failed",
        url: "https://github.com/commons/ledger/actions/runs/42",
      }),
    };
    const held: TaskBoard = {
      ...board,
      task: async () => ({ role: "integration-test", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async () => {},
    };
    await onPullRequest("ledger", "7", failing, held, log, clock);
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The project's tests failed on this work, so it is not merged: https://github.com/commons/ledger/actions/runs/42",
      ],
    ]);
  });

  it("refuses Integration Test work that says it passed but changes no integration test (0017)", async () => {
    const refusals: string[] = [];
    const integrationTest = {
      path: "feedback/FB-7.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: integration-test\n  module: programme\n  verdict: pass\n---\n',
    };
    const held: TaskBoard = {
      ...board,
      task: async () => ({ role: "integration-test", module: "programme", claimedBy: "alice" }),
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting([], [integrationTest], refusals),
      held,
      log,
      clock,
    );
    expect(refusals).toEqual([
      "7: Integration Test work that says it passed changes the integration tests, in integration/tests/, and this changes none: the project's tests run only on code and tests",
    ]);
  });

  it("does not merge Coding work the project's tests failed on, and tells the member where", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const coding = {
      path: "feedback/FB-7.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
    };
    const failing: PullRequests = {
      ...submitting(
        merged,
        [coding, { path: "modules/parser/src/parser.ts", text: "export {};\n" }],
        refusals,
      ),
      check: async () => ({
        state: "failed",
        url: "https://github.com/commons/ledger/actions/runs/42",
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      failing,
      { ...heldAs("coding" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The project's tests failed on this work, so it is not merged: https://github.com/commons/ledger/actions/runs/42",
      ],
    ]);
  });

  it("neither merges nor says anything while the project's tests are still running", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const coding = {
      path: "feedback/FB-7.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
    };
    const running: PullRequests = {
      ...submitting(
        merged,
        [coding, { path: "modules/parser/src/parser.ts", text: "export {};\n" }],
        refusals,
      ),
      check: async () => ({
        state: "running",
        url: "https://github.com/commons/ledger/actions/runs/44",
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      running,
      { ...heldAs("coding" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([[], []]);
  });

  it("leaves work on a module PDC coordinators require reviewed unmerged, saying it waits for a reviewer", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const unreviewed: PullRequests = {
      ...submitting(merged, [specificationPasses], refusals),
      governanceFile: async () => ({ members: {}, review: { ledger: ["parser"] } }),
      reviews: async () => [],
    };
    await onPullRequest("ledger", "7", unreviewed, { ...held, post: async () => {} }, log, clock);
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The work waits for a reviewer's approval: PDC coordinators require a person to approve work on parser before it is merged, a trusted member or a PDC coordinator with no part in the module",
      ],
    ]);
  });

  it("alerts PDC coordinators when it cannot read which modules need review", async () => {
    const alerted: string[] = [];
    const unreadable: PullRequests = {
      ...submitting(),
      governanceFile: async () => ({ members: {}, review: { ledger: ["../parser"] } }),
    };
    const board: TaskBoard = {
      ...held,
      post: async () => {},
      unreadableReviewListAlertOpen: async () => false,
      alertUnreadableReviewList: async (project) => {
        alerted.push(project);
      },
    };
    await onPullRequest("ledger", "7", unreadable, board, log, clock);
    expect(alerted).toEqual(["ledger"]);
  });

  it("alerts PDC coordinators of an unreadable list only once, while its alert is still open", async () => {
    const alerted: string[] = [];
    const unreadable: PullRequests = {
      ...submitting(),
      governanceFile: async () => ({ members: {}, review: { ledger: ["../parser"] } }),
    };
    const board: TaskBoard = {
      ...held,
      post: async () => {},
      unreadableReviewListAlertOpen: async () => true,
      alertUnreadableReviewList: async (project) => {
        alerted.push(project);
      },
    };
    await onPullRequest("ledger", "7", unreadable, board, log, clock);
    expect(alerted).toEqual([]);
  });

  it("says only once that work waits for a reviewer, not on every run that finds no approval", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const waiting =
      "The work waits for a reviewer's approval: PDC coordinators require a person to approve work on parser before it is merged, a trusted member or a PDC coordinator with no part in the module";
    const alreadySaid: PullRequests = {
      ...submitting(merged, [specificationPasses], refusals),
      governanceFile: async () => ({ members: {}, review: { ledger: ["parser"] } }),
      refusalsGiven: async () => [waiting],
    };
    await onPullRequest("ledger", "7", alreadySaid, { ...held, post: async () => {} }, log, clock);
    expect([merged, refusals]).toEqual([[], []]);
  });

  it("merges work on a module PDC coordinators require reviewed once a trusted member approves its commit", async () => {
    const merged: string[] = [];
    const approved: PullRequests = {
      ...submitting(merged),
      governanceFile: async () => ({
        members: { carol: { level: "trusted" } },
        review: { ledger: ["parser"] },
      }),
      reviews: async () => [{ reviewer: "carol", commit: "c0ffee", verdict: "approved" }],
    };
    await onPullRequest("ledger", "7", approved, { ...held, post: async () => {} }, log, clock);
    expect(merged).toEqual(["7"]);
  });

  it("does not count an approval of an earlier commit: what was pushed since has not been reviewed", async () => {
    const merged: string[] = [];
    const approvedBefore: PullRequests = {
      ...submitting(merged),
      governanceFile: async () => ({
        members: { carol: { level: "trusted" } },
        review: { ledger: ["parser"] },
      }),
      reviews: async () => [{ reviewer: "carol", commit: "ea51e5", verdict: "approved" }],
    };
    await onPullRequest(
      "ledger",
      "7",
      approvedBefore,
      { ...held, post: async () => {} },
      log,
      clock,
    );
    expect(merged).toEqual([]);
  });

  it("does not count an approval from a member with a part in the module", async () => {
    const merged: string[] = [];
    const approvedByPart: PullRequests = {
      ...submitting(merged),
      governanceFile: async () => ({
        members: { carol: { level: "trusted" } },
        review: { ledger: ["parser"] },
      }),
      reviews: async () => [{ reviewer: "carol", commit: "c0ffee", verdict: "approved" }],
    };
    const carolHolds: EventLog = {
      ...log,
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-22T08:00:00.000Z",
          claimed: { task: "3", member: "carol", role: "architecture", module: "parser" },
        },
      ],
    };
    await onPullRequest(
      "ledger",
      "7",
      approvedByPart,
      { ...held, post: async () => {} },
      carolHolds,
      clock,
    );
    expect(merged).toEqual([]);
  });

  it("acts on the open pull requests at a commit once the project's checks finish on it", async () => {
    const merged: string[] = [];
    const atCommit: PullRequests = {
      ...submitting(merged),
      openAt: async (_project, commit) => (commit === "c0ffee" ? ["7"] : []),
    };
    await onChecked("ledger", "c0ffee", atCommit, { ...held, post: async () => {} }, log, clock);
    expect(merged).toEqual(["7"]);
  });

  it("refuses Coding work that changes the project's workflows, whatever its check found", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const codingAndWorkflow = [
      {
        path: "feedback/FB-7.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: ".github/workflows/checks.yml", text: "name: Project checks\n" },
    ];
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, codingAndWorkflow, refusals),
      { ...heldAs("coding" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      ["7: The work changes files outside what Coding may change: .github/workflows/checks.yml"],
    ]);
  });

  it("merges Coding work reporting failure whatever its check found: it advances nothing", async () => {
    const merged: string[] = [];
    const codingFails = {
      path: "feedback/FB-7.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: fail\n  impediments:\n    - type: test_failures\n---\n',
    };
    const failing: PullRequests = {
      ...submitting(merged, [codingFails]),
      check: async () => ({
        state: "failed",
        url: "https://github.com/commons/ledger/actions/runs/42",
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      failing,
      { ...heldAs("coding" as Role), post: async () => {} },
      log,
      clock,
    );
    expect(merged).toEqual(["7"]);
  });

  it("merges partial Coding work handed over whatever its check found: it advances nothing", async () => {
    const merged: string[] = [];
    const partialCoding = {
      path: "feedback/FB-7.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  status: partial\n  verdict: pass\n---\n',
    };
    const failing: PullRequests = {
      ...submitting(merged, [partialCoding]),
      check: async () => ({
        state: "failed",
        url: "https://github.com/commons/ledger/actions/runs/42",
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      failing,
      { ...heldAs("coding" as Role), post: async () => {} },
      log,
      clock,
    );
    expect(merged).toEqual(["7"]);
  });

  it("merges other roles' work whatever the project's check found: it changes no code", async () => {
    const merged: string[] = [];
    const failing: PullRequests = {
      ...submitting(merged),
      check: async () => ({
        state: "failed",
        url: "https://github.com/commons/ledger/actions/runs/42",
      }),
    };
    await onPullRequest("ledger", "7", failing, { ...held, post: async () => {} }, log, clock);
    expect(merged).toEqual(["7"]);
  });

  it("refuses Coding work that says it passed but changes none of the module's code", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const noCode = {
      path: "feedback/FB-7.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, [noCode], refusals),
      { ...heldAs("coding" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: Coding work that says it passed changes the module's code, in modules/parser/src/, and this changes none: the project's tests run only on code",
      ],
    ]);
  });

  it("records the holder's Coding work waiting on its check as activity on the task", async () => {
    const appended: unknown[] = [];
    const coding = [
      {
        path: "feedback/FB-7.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/src/parser.ts", text: "export {};\n" },
    ];
    const running: PullRequests = {
      ...submitting([], coding),
      check: async () => ({
        state: "running",
        url: "https://github.com/commons/ledger/actions/runs/44",
      }),
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest("ledger", "7", running, heldAs("coding" as Role), recording, clock);
    expect(appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        activity: { task: "1", member: "alice" },
      },
    ]);
  });

  it("records the holder's Coding work its check failed on as activity: a fix will follow", async () => {
    const appended: unknown[] = [];
    const coding = [
      {
        path: "feedback/FB-7.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/src/parser.ts", text: "export {};\n" },
    ];
    const failing: PullRequests = {
      ...submitting([], coding),
      check: async () => ({
        state: "failed",
        url: "https://github.com/commons/ledger/actions/runs/42",
      }),
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest("ledger", "7", failing, heldAs("coding" as Role), recording, clock);
    expect(appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        activity: { task: "1", member: "alice" },
      },
    ]);
  });

  it("refuses Test work a new test of which passed, naming it: it tests nothing yet", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const testWork = [
      {
        path: "feedback/FB-8.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/tests/parser.test.ts", text: "test('reads a number')\n" },
    ];
    const passing: PullRequests = {
      ...submitting(merged, testWork, refusals),
      testReport: async () => ({
        state: "finished",
        url: "https://github.com/commons/ledger/actions/runs/46",
        report: { cases: [{ name: "parser > reads a number", outcome: "passed" }] },
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      passing,
      { ...heldAs("test" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: Each new test must run and fail before its code exists, and these do not: parser > reads a number (passed). See https://github.com/commons/ledger/actions/runs/46",
      ],
    ]);
  });

  it("neither merges nor says anything about Test work while its tests are still running", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const testWork = [
      {
        path: "feedback/FB-8.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/tests/parser.test.ts", text: "test('reads a number')\n" },
    ];
    const running: PullRequests = {
      ...submitting(merged, testWork, refusals),
      testReport: async () => ({
        state: "running",
        url: "https://github.com/commons/ledger/actions/runs/47",
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      running,
      { ...heldAs("test" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([[], []]);
  });

  it("records the holder's Test work waiting on its tests as activity on the task", async () => {
    const appended: unknown[] = [];
    const testWork = [
      {
        path: "feedback/FB-8.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/tests/parser.test.ts", text: "test('reads a number')\n" },
    ];
    const running: PullRequests = {
      ...submitting([], testWork),
      testReport: async () => ({
        state: "running",
        url: "https://github.com/commons/ledger/actions/runs/47",
      }),
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest("ledger", "7", running, heldAs("test" as Role), recording, clock);
    expect(appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        activity: { task: "1", member: "alice" },
      },
    ]);
  });

  it("counts as new only the tests main does not have: those it has may pass", async () => {
    const merged: string[] = [];
    const testWork = [
      {
        path: "feedback/FB-9.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/tests/parser.test.ts", text: "test('reads a word')\n" },
    ];
    const revising: PullRequests = {
      ...submitting(merged, testWork),
      testReport: async () => ({
        state: "finished",
        url: "https://github.com/commons/ledger/actions/runs/48",
        report: {
          cases: [
            { name: "parser > reads a number", outcome: "passed" },
            { name: "parser > reads a word", outcome: "failed" },
          ],
        },
      }),
    };
    const earlier: EventLog = {
      read: async () => [
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "3",
            head: "0ld",
            feedbackSignal: "feedback/FB-2.md",
            work: { fromRole: "test", module: "parser", verdict: "pass", impediments: [] },
            testsAdded: ["parser > reads a number"],
          },
        },
      ],
      append: async () => {},
    };
    await onPullRequest(
      "ledger",
      "7",
      revising,
      { ...heldAs("test" as Role), post: async () => {} },
      earlier,
      clock,
    );
    expect(merged).toEqual(["7"]);
  });

  it("records the tests Test work added when it merges it, so main has them from then on", async () => {
    const appended: LogEvent[] = [];
    const testWork = [
      {
        path: "feedback/FB-8.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/tests/parser.test.ts", text: "test('reads a number')\n" },
    ];
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting([], testWork),
      { ...heldAs("test" as Role), post: async () => {} },
      recording,
      clock,
    );
    const begun = appended.find((event) => "aboutToMerge" in event);
    expect(begun && "aboutToMerge" in begun && begun.aboutToMerge.testsAdded).toEqual([
      "parser > reads a number",
    ]);
  });

  it("refuses Test work that adds no test: there is nothing to show failing", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const testWork = [
      {
        path: "feedback/FB-8.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
    ];
    const none: PullRequests = {
      ...submitting(merged, testWork, refusals),
      testReport: async () => ({
        state: "finished",
        url: "https://github.com/commons/ledger/actions/runs/49",
        report: { cases: [] },
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      none,
      { ...heldAs("test" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: Test work that says it passed adds tests, and the project's tests show none new. See https://github.com/commons/ledger/actions/runs/49",
      ],
    ]);
  });

  it("refuses Test work whose test report cannot be read, saying why", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const testWork = [
      {
        path: "feedback/FB-8.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/tests/parser.test.ts", text: "test('reads a number')\n" },
    ];
    const unreadable: PullRequests = {
      ...submitting(merged, testWork, refusals),
      testReport: async () => ({
        state: "finished",
        url: "https://github.com/commons/ledger/actions/runs/50",
        report: { unreadable: "the test report is not well-formed XML" },
      }),
    };
    await onPullRequest(
      "ledger",
      "7",
      unreadable,
      { ...heldAs("test" as Role), post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The project's test report on this work cannot be read: the test report is not well-formed XML. See https://github.com/commons/ledger/actions/runs/50",
      ],
    ]);
  });

  it("merges Test work reporting failure without reading its tests: it advances nothing", async () => {
    const merged: string[] = [];
    const testFails = {
      path: "feedback/FB-8.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: fail\n  impediments:\n    - type: upstream_ambiguity\n---\n',
    };
    const unread: PullRequests = { ...submitting(merged, [testFails]), testReport: untouched };
    await onPullRequest(
      "ledger",
      "7",
      unread,
      { ...heldAs("test" as Role), post: async () => {} },
      log,
      clock,
    );
    expect(merged).toEqual(["7"]);
  });

  it("records the project's test counts from its report when it merges Test work", async () => {
    const appended: LogEvent[] = [];
    const testWork = [
      {
        path: "feedback/FB-8.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/tests/parser.test.ts", text: "test('reads a number')\n" },
    ];
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting([], testWork),
      { ...heldAs("test" as Role), post: async () => {} },
      recording,
      clock,
    );
    const begun = appended.find((event) => "aboutToMerge" in event);
    expect(begun && "aboutToMerge" in begun && begun.aboutToMerge.tests).toEqual({
      total: 1,
      passed: 0,
      failed: 1,
    });
  });

  it("records the project's test counts from its report when it merges Coding work", async () => {
    const appended: LogEvent[] = [];
    const coding = [
      {
        path: "feedback/FB-7.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: coding\n  module: parser\n  verdict: pass\n---\n',
      },
      { path: "modules/parser/src/parser.ts", text: "export {};\n" },
    ];
    const passing: PullRequests = {
      ...submitting([], coding),
      testReport: async () => ({
        state: "finished",
        url: "https://github.com/commons/ledger/actions/runs/51",
        report: { cases: [{ name: "parser > reads a number", outcome: "passed" }] },
      }),
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest(
      "ledger",
      "7",
      passing,
      { ...heldAs("coding" as Role), post: async () => {} },
      recording,
      clock,
    );
    const begun = appended.find((event) => "aboutToMerge" in event);
    expect(begun && "aboutToMerge" in begun && begun.aboutToMerge.tests).toEqual({
      total: 1,
      passed: 1,
      failed: 0,
    });
  });

  it("does not merge work for a module other than its task's, and says so", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const forLexer = {
      path: "feedback/FB-10.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: specification\n  module: lexer\n  verdict: pass\n---\n',
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, [forLexer], refusals),
      { ...held, post: async () => {} },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      [
        "7: The work is for task 1, and is not for the module and role its task is for: Specification on parser",
      ],
    ]);
  });

  it("starts the modules the programme's Programme Architect lists, once it merges the work", async () => {
    const posted: PostedTask[] = [];
    const architecting = [
      {
        path: "feedback/FB-11.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: programme-architect\n  module: programme\n  verdict: pass\n---\n',
      },
      { path: "programme/modules.yaml", text: "modules:\n  - name: parser\n  - name: lexer\n" },
    ];
    const programmeHeld: TaskBoard = {
      ...board,
      // Nothing in integration is ready while the revision reopens a module.
      readyTasks: async () => [],
      task: async () => ({ role: "programme-architect", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", submitting([], architecting), programmeHeld, log, clock);
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "parser" },
      { role: "architecture", module: "lexer" },
    ]);
  });

  it("starts only the modules no earlier modules.yaml started", async () => {
    const posted: PostedTask[] = [];
    const architecting = [
      {
        path: "feedback/FB-12.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: programme-architect\n  module: programme\n  verdict: pass\n---\n',
      },
      { path: "programme/modules.yaml", text: "modules:\n  - name: parser\n  - name: lexer\n" },
    ];
    const programmeHeld: TaskBoard = {
      ...board,
      // Nothing in integration is ready while the revision reopens a module.
      readyTasks: async () => [],
      task: async () => ({ role: "programme-architect", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    const earlier: EventLog = {
      read: async () => [
        {
          project: "ledger",
          work: {
            fromRole: "programme-architect",
            module: "programme",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-3.md",
            modulesToStart: ["parser"],
          },
          decision: { tasks: [{ role: "architecture", module: "parser" }] },
          reason: { rule: "modules_listed" },
        },
      ],
      append: async () => {},
    };
    await onPullRequest("ledger", "7", submitting([], architecting), programmeHeld, earlier, clock);
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "lexer" },
    ]);
  });

  it("sends a module with no task open back to Architecture when its contract is revised (0015)", async () => {
    const posted: PostedTask[] = [];
    const revising = [
      {
        path: "feedback/FB-12.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: programme-architect\n  module: programme\n  verdict: pass\n---\n',
      },
      {
        path: "programme/modules.yaml",
        text: "modules:\n  - name: lexer\n    provides: [tokens]\n  - name: parser\n    uses: [tokens]\n",
      },
      { path: "programme/contracts/tokens/contract.md", text: "# Tokens, revised\n" },
    ];
    const programmeHeld: TaskBoard = {
      ...board,
      // Nothing in integration is ready while the revision reopens a module.
      readyTasks: async () => [],
      task: async () => ({ role: "programme-architect", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    const work = (fromRole: string, module: string) => ({
      fromRole,
      module,
      verdict: "pass",
      impediments: [],
      feedbackSignal: `feedback/${module}-${fromRole}.md`,
    });
    // Both modules started; lexer has a task open, and parser is done.
    const earlier: EventLog = {
      read: async () => [
        {
          project: "ledger",
          work: {
            ...work("programme-architect", "programme"),
            modulesToStart: ["lexer", "parser"],
          },
          decision: {
            tasks: [
              { role: "architecture", module: "lexer" },
              { role: "architecture", module: "parser" },
            ],
          },
          reason: { rule: "modules_listed" },
        },
        {
          project: "ledger",
          work: work("security-and-quality", "parser"),
          decision: { moduleDone: true },
          reason: { rule: "pipeline_complete" },
        },
      ],
      append: async () => {},
    };
    await onPullRequest("ledger", "7", submitting([], revising), programmeHeld, earlier, clock);
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "parser" },
    ]);
  });

  it("reads main's modules.yaml for a revised contract when the work leaves the file as it is", async () => {
    const posted: PostedTask[] = [];
    const revisingOnlyTheContract = [
      {
        path: "feedback/FB-12.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: programme-architect\n  module: programme\n  verdict: pass\n---\n',
      },
      { path: "programme/contracts/tokens/contract.md", text: "# Tokens, revised\n" },
    ];
    const listedOnMain: PullRequests = {
      ...submitting([], revisingOnlyTheContract),
      modulesOnMain: async () =>
        "modules:\n  - name: lexer\n    provides: [tokens]\n  - name: parser\n    uses: [tokens]\n",
    };
    const programmeHeld: TaskBoard = {
      ...board,
      // Nothing in integration is ready while the revision reopens a module.
      readyTasks: async () => [],
      task: async () => ({ role: "programme-architect", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    const work = (fromRole: string, module: string) => ({
      fromRole,
      module,
      verdict: "pass",
      impediments: [],
      feedbackSignal: `feedback/${module}-${fromRole}.md`,
    });
    const earlier: EventLog = {
      read: async () => [
        {
          project: "ledger",
          work: {
            ...work("programme-architect", "programme"),
            modulesToStart: ["lexer", "parser"],
          },
          decision: {
            tasks: [
              { role: "architecture", module: "lexer" },
              { role: "architecture", module: "parser" },
            ],
          },
          reason: { rule: "modules_listed" },
        },
        {
          project: "ledger",
          work: work("security-and-quality", "parser"),
          decision: { moduleDone: true },
          reason: { rule: "pipeline_complete" },
        },
      ],
      append: async () => {},
    };
    await onPullRequest("ledger", "7", listedOnMain, programmeHeld, earlier, clock);
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "parser" },
    ]);
  });

  it("sends a module with no task open back to Architecture when the revision stops listing it with the contract (0015)", async () => {
    const posted: PostedTask[] = [];
    const revising = [
      {
        path: "feedback/FB-12.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: programme-architect\n  module: programme\n  verdict: pass\n---\n',
      },
      {
        path: "programme/modules.yaml",
        text: "modules:\n  - name: lexer\n    provides: [tokens]\n  - name: parser\n",
      },
      { path: "programme/contracts/tokens/contract.md", text: "# Tokens, revised\n" },
    ];
    const listedOnMain: PullRequests = {
      ...submitting([], revising),
      modulesOnMain: async () =>
        "modules:\n  - name: lexer\n    provides: [tokens]\n  - name: parser\n    uses: [tokens]\n",
    };
    const programmeHeld: TaskBoard = {
      ...board,
      // Nothing in integration is ready while the revision reopens a module.
      readyTasks: async () => [],
      task: async () => ({ role: "programme-architect", module: "programme", claimedBy: "alice" }),
      close: async () => {},
      post: async (task) => {
        posted.push(task);
      },
    };
    const work = (fromRole: string, module: string) => ({
      fromRole,
      module,
      verdict: "pass",
      impediments: [],
      feedbackSignal: `feedback/${module}-${fromRole}.md`,
    });
    // Both modules started; lexer has a task open, and parser is done.
    const earlier: EventLog = {
      read: async () => [
        {
          project: "ledger",
          work: {
            ...work("programme-architect", "programme"),
            modulesToStart: ["lexer", "parser"],
          },
          decision: {
            tasks: [
              { role: "architecture", module: "lexer" },
              { role: "architecture", module: "parser" },
            ],
          },
          reason: { rule: "modules_listed" },
        },
        {
          project: "ledger",
          work: work("security-and-quality", "parser"),
          decision: { moduleDone: true },
          reason: { rule: "pipeline_complete" },
        },
      ],
      append: async () => {},
    };
    await onPullRequest("ledger", "7", listedOnMain, programmeHeld, earlier, clock);
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "parser" },
    ]);
  });

  it("refuses the Programme Architect's work when its modules.yaml cannot be read, saying why", async () => {
    const [merged, refusals]: string[][] = [[], []];
    const architecting = [
      {
        path: "feedback/FB-13.md",
        text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: programme-architect\n  module: programme\n  verdict: pass\n---\n',
      },
      { path: "programme/modules.yaml", text: "modules:\n  - name: parser\n  - name: parser\n" },
    ];
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged, architecting, refusals),
      {
        ...board,
        task: async () => ({
          role: "programme-architect",
          module: "programme",
          claimedBy: "alice",
        }),
        close: async () => {},
        post: async () => {},
      },
      log,
      clock,
    );
    expect([merged, refusals]).toEqual([
      [],
      ["7: The work's modules.yaml cannot be read: modules.yaml lists a module twice: parser"],
    ]);
  });

  it("merges a pull request whose feedback signal it can read", async () => {
    const merged: string[] = [];
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged),
      { ...held, post: async () => {} },
      log,
      clock,
    );
    expect(merged).toEqual(["7"]);
  });

  it("routes the work in the pull request it merges", async () => {
    const posted: PostedTask[] = [];
    const posting: TaskBoard = {
      ...held,
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", submitting(), posting, log, clock);
    expect(posted).toEqual([
      {
        project: "ledger",
        role: "test",
        module: "parser",
        decidedOn: "feedback/FB-1.md",
        inputsAt: "m3rg3d",
      },
    ]);
  });

  it("posts each task with the commit its inputs are pinned at: the merge that decided it", async () => {
    const posted: PostedTask[] = [];
    await onPullRequest(
      "ledger",
      "7",
      submitting(),
      {
        ...held,
        post: async (task) => {
          posted.push(task);
        },
      },
      log,
      clock,
    );
    expect(posted.map((task) => task.inputsAt)).toEqual(["m3rg3d"]);
  });

  it("posts partial work's task again as a continuation, carrying its feedback signal", async () => {
    const posted: PostedTask[] = [];
    const partialTest = {
      path: "feedback/FB-8.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: test\n  module: parser\n  status: partial\n  verdict: pass\n---\n',
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting([], [partialTest]),
      { ...heldAs("test" as Role), post: async (task) => void posted.push(task) },
      log,
      clock,
    );
    expect(posted).toEqual([
      {
        project: "ledger",
        role: "test",
        module: "parser",
        feedbackSignal: "feedback/FB-8.md",
        continuation: true,
        decidedOn: "feedback/FB-8.md",
        inputsAt: "m3rg3d",
      },
    ]);
  });

  it("tells the board which decision each task comes from, so it is posted once", async () => {
    const posted: PostedTask[] = [];
    const posting: TaskBoard = {
      ...held,
      post: async (task) => {
        posted.push(task);
      },
    };
    await onPullRequest("ledger", "7", submitting(), posting, log, clock);
    expect(posted.map((task) => task.decidedOn)).toEqual(["feedback/FB-1.md"]);
  });

  it("tells the board which decision a finished module comes from", async () => {
    const finished: unknown[] = [];
    const securityPasses = {
      path: "feedback/FB-6.md",
      text: '---\nfeedback_signal:\n  task_id: "1"\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n',
    };
    const marking: TaskBoard = {
      ...heldAs("security-and-quality" as Role),
      markModuleDone: async (done) => {
        finished.push(done);
      },
    };
    await onPullRequest("ledger", "12", submitting([], [securityPasses]), marking, log, clock);
    expect(finished).toEqual([
      { project: "ledger", module: "parser", decidedOn: "feedback/FB-6.md" },
    ]);
  });

  it("does not merge a pull request whose feedback signal it cannot read", async () => {
    const merged: string[] = [];
    const unreadable = { path: "feedback/FB-2.md", text: "Looks good to me." };
    await onPullRequest("ledger", "8", submitting(merged, [unreadable]), held, log, clock);
    expect(merged).toEqual([]);
  });

  it("tells the member why it did not merge their pull request", async () => {
    const refusals: string[] = [];
    const unreadable = { path: "feedback/FB-2.md", text: "Looks good to me." };
    await onPullRequest("ledger", "8", submitting([], [unreadable], refusals), held, log, clock);
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
        return "m3rg3d";
      },
    };
    await onPullRequest("ledger", "7", pullRequests, { ...held, post: async () => {} }, log, clock);
    expect(merged).toEqual(["7 at c0ffee"]);
  });

  it("closes the task the work in the pull request was for", async () => {
    const closed: string[] = [];
    const forTask = {
      path: "feedback/FB-4.md",
      text: '---\nfeedback_signal:\n  task_id: "3"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
    };
    const closing: TaskBoard = {
      ...heldAs("test" as Role),
      post: async () => {},
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      close: async (_project, task) => {
        closed.push(task);
      },
    };
    await onPullRequest("ledger", "9", submitting([], [forTask]), closing, log, clock);
    expect(closed).toEqual(["3"]);
  });

  it("never closes an issue the work names that is not a task, such as an alert", async () => {
    const closed: string[] = [];
    const namingAnAlert = {
      path: "feedback/FB-4.md",
      text: '---\nfeedback_signal:\n  task_id: "3"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
    };
    const closing: TaskBoard = {
      ...heldAs("test" as Role),
      post: async () => {},
      task: async () => undefined,
      close: async (_project, task) => {
        closed.push(task);
      },
    };
    await onPullRequest("ledger", "9", submitting([], [namingAnAlert]), closing, log, clock);
    expect(closed).toEqual([]);
  });

  it("records which task the work was for in its decision", async () => {
    const appended: unknown[] = [];
    const forTask = {
      path: "feedback/FB-4.md",
      text: '---\nfeedback_signal:\n  task_id: "3"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    const closing: TaskBoard = {
      ...heldAs("test" as Role),
      post: async () => {},
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      close: async () => {},
    };
    await onPullRequest("ledger", "9", submitting([], [forTask]), closing, recording, clock);
    const decision = appended.find(
      (event) => typeof event === "object" && event !== null && "work" in event,
    );
    expect(decision).toMatchObject({ task: "3" });
  });

  it("records who did the work in its decision: the member who opened the pull request", async () => {
    const appended: unknown[] = [];
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest(
      "ledger",
      "9",
      submitting(),
      { ...held, post: async () => {} },
      recording,
      clock,
    );
    const decision = appended.find(
      (event) => typeof event === "object" && event !== null && "work" in event,
    );
    expect(decision).toMatchObject({ member: "alice" });
  });

  it("records the commit its merge made, so it can tell its merges on main from anyone's", async () => {
    const appended: unknown[] = [];
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest(
      "ledger",
      "9",
      submitting(),
      { ...held, post: async () => {} },
      recording,
      clock,
    );
    const decision = appended.find(
      (event) => typeof event === "object" && event !== null && "work" in event,
    );
    expect(decision).toMatchObject({ mergedAs: "m3rg3d" });
  });

  it("sends passed Research back to the role its task was for, as Divlab recorded on the task", async () => {
    const posted: PostedTask[] = [];
    const research = {
      path: "feedback/FB-5.md",
      text: '---\nfeedback_signal:\n  task_id: "4"\n  from_role: research\n  module: parser\n  verdict: pass\n---\n',
    };
    const recorded: TaskBoard = {
      ...heldAs("research" as Role),
      post: async (task) => {
        posted.push(task);
      },
      task: async () => ({
        role: "research",
        module: "parser",
        researchFor: "coding",
        claimedBy: "alice",
      }),
      close: async () => {},
    };
    await onPullRequest("ledger", "10", submitting([], [research]), recorded, log, clock);
    expect(posted.map((task) => task.role)).toEqual(["coding"]);
  });

  it("does not merge work whose feedback signal's file is not plainly named, and says why", async () => {
    const merged: string[] = [];
    const refusals: string[] = [];
    const notPlain = { ...specificationPasses, path: "feedback/FB-1_*see*.md" };
    await onPullRequest("ledger", "13", submitting(merged, [notPlain], refusals), held, log, clock);
    expect([merged, refusals]).toEqual([
      [],
      [
        "13: The feedback signal feedback/FB-1_*see*.md cannot be read: its file name is not a plain name",
      ],
    ]);
  });

  it("tells the member when their pull request has no feedback signal", async () => {
    const refusals: string[] = [];
    const artefactOnly = { path: "modules/parser/spec.md", text: "# Specification\n" };
    await onPullRequest("ledger", "11", submitting([], [artefactOnly], refusals), held, log, clock);
    expect(refusals).toEqual([
      "11: The pull request has no feedback signal: work needs one, in feedback/, saying what it was for and how it went",
    ]);
  });

  it("records when it decided, by its clock, in UTC", async () => {
    const appended: unknown[] = [];
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    const britishSummerTime = () => new Date("2026-10-22T10:00:00+01:00");
    await onPullRequest(
      "ledger",
      "7",
      submitting(),
      { ...held, post: async () => {} },
      recording,
      britishSummerTime,
    );
    const decision = appended.find(
      (event) => typeof event === "object" && event !== null && "work" in event,
    );
    expect(decision).toMatchObject({ decidedAt: "2026-10-22T09:00:00.000Z" });
  });

  it("records when it decided to merge, by its clock", async () => {
    const appended: unknown[] = [];
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting(),
      { ...held, post: async () => {} },
      recording,
      clock,
    );
    expect(appended[0]).toMatchObject({
      aboutToMerge: { pullRequest: "7" },
      decidedAt: "2026-10-22T09:00:00.000Z",
    });
  });

  it("records that it acted on its decision, once it has", async () => {
    const happened: unknown[] = [];
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        happened.push(event);
      },
    };
    const posting: TaskBoard = {
      ...held,
      post: async (task) => {
        happened.push(`posted ${task.role}`);
      },
    };
    await onPullRequest("ledger", "7", submitting(), posting, recording, clock);
    expect(happened.slice(-2)).toEqual([
      "posted test",
      { project: "ledger", actedOn: { feedbackSignal: "feedback/FB-1.md" } },
    ]);
  });

  it("reads the project's log before recording anything, so each record costs one request", async () => {
    const calls: string[] = [];
    const recording: EventLog = {
      read: async () => {
        calls.push("read");
        return [];
      },
      append: async () => {
        calls.push("append");
      },
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting(),
      { ...held, post: async () => {} },
      recording,
      clock,
    );
    expect(calls[0]).toBe("read");
  });

  it("reads the project's log once for a pull request, however much it records", async () => {
    let reads = 0;
    const counting: EventLog = {
      read: async () => {
        reads += 1;
        return [];
      },
      append: async () => {},
    };
    await onPullRequest(
      "ledger",
      "7",
      submitting(),
      { ...held, post: async () => {} },
      counting,
      clock,
    );
    expect(reads).toBe(1);
  });

  it("records that it is about to merge, with the work and who did it, before it merges", async () => {
    const happened: unknown[] = [];
    const pullRequests: PullRequests = {
      ...submitting(),
      merge: async (_project, pullRequest) => {
        happened.push(`merged ${pullRequest}`);
        return "m3rg3d";
      },
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        happened.push(event);
      },
    };
    await onPullRequest(
      "ledger",
      "7",
      pullRequests,
      { ...held, post: async () => {} },
      recording,
      clock,
    );
    expect(happened.slice(0, 2)).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        aboutToMerge: {
          pullRequest: "7",
          head: "c0ffee",
          feedbackSignal: "feedback/FB-1.md",
          member: "alice",
          work: {
            task: "1",
            fromRole: "specification",
            module: "parser",
            verdict: "pass",
            impediments: [],
          },
        },
      },
      "merged 7",
    ]);
  });

  it("gives work whose inputs changed since its task was posted back to its role (0015)", async () => {
    const posted: PostedTask[] = [];
    // Divlab's record of the decision that posted the task, and the commit its merge made.
    const postedAtPinned: EventLog = {
      ...log,
      read: async () => [
        {
          project: "ledger",
          mergedAs: "p1nned",
          work: {
            fromRole: "architecture",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-0.md",
          },
          decision: { tasks: [{ role: "specification", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const sliceChanged: PullRequests = {
      ...submitting(),
      changedOnMainSince: async (_project, commit) =>
        commit === "p1nned" ? ["programme/slices/parser/requirements.md"] : [],
    };
    await onPullRequest(
      "ledger",
      "7",
      sliceChanged,
      { ...held, post: async (task) => void posted.push(task) },
      postedAtPinned,
      clock,
    );
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "specification", module: "parser" },
    ]);
  });

  it("gives work back to its role when too much changed on main to tell whether its inputs did (0015)", async () => {
    const posted: PostedTask[] = [];
    const postedAtPinned: EventLog = {
      ...log,
      read: async () => [
        {
          project: "ledger",
          mergedAs: "p1nned",
          work: {
            fromRole: "architecture",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-0.md",
          },
          decision: { tasks: [{ role: "specification", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const tooMuchChanged: PullRequests = {
      ...submitting(),
      changedOnMainSince: async () => ({ tooMany: true }),
    };
    await onPullRequest(
      "ledger",
      "7",
      tooMuchChanged,
      { ...held, post: async (task) => void posted.push(task) },
      postedAtPinned,
      clock,
    );
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "specification", module: "parser" },
    ]);
  });

  it("sends a module with contracts back to Architecture when too much changed to tell whether they did (0015)", async () => {
    const posted: PostedTask[] = [];
    const postedAtPinned: EventLog = {
      ...log,
      read: async () => [
        {
          project: "ledger",
          mergedAs: "p1nned",
          work: {
            fromRole: "architecture",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-0.md",
          },
          decision: { tasks: [{ role: "specification", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const listing =
      "modules:\n  - name: lexer\n    provides: [tokens]\n  - name: parser\n    uses: [tokens]";
    const tooMuchChanged: PullRequests = {
      ...submitting(),
      changedOnMainSince: async () => ({ tooMany: true }),
      modulesOnMain: async () => listing,
      modulesAt: async () => listing,
    };
    await onPullRequest(
      "ledger",
      "7",
      tooMuchChanged,
      { ...held, post: async (task) => void posted.push(task) },
      postedAtPinned,
      clock,
    );
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "parser" },
    ]);
  });

  it("sends a module back to Architecture when a contract it uses was revised since (0015)", async () => {
    const posted: PostedTask[] = [];
    const postedAtPinned: EventLog = {
      ...log,
      read: async () => [
        {
          project: "ledger",
          mergedAs: "p1nned",
          work: {
            fromRole: "architecture",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-0.md",
          },
          decision: { tasks: [{ role: "specification", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const contractRevised: PullRequests = {
      ...submitting(),
      changedOnMainSince: async () => ["programme/contracts/tokens/contract.md"],
      modulesOnMain: async () =>
        [
          "modules:",
          "  - name: lexer",
          "    provides: [tokens]",
          "  - name: parser",
          "    uses: [tokens]",
        ].join("\n"),
    };
    await onPullRequest(
      "ledger",
      "7",
      contractRevised,
      { ...held, post: async (task) => void posted.push(task) },
      postedAtPinned,
      clock,
    );
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "parser" },
    ]);
  });

  it("sends a module back to Architecture when a revised contract no longer lists it (0015)", async () => {
    const posted: PostedTask[] = [];
    const postedAtPinned: EventLog = {
      ...log,
      read: async () => [
        {
          project: "ledger",
          mergedAs: "p1nned",
          work: {
            fromRole: "architecture",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-0.md",
          },
          decision: { tasks: [{ role: "specification", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
    };
    const listing = (parser: string[]) =>
      ["modules:", "  - name: lexer", "    provides: [tokens]", "  - name: parser", ...parser].join(
        "\n",
      );
    const noLongerUsed: PullRequests = {
      ...submitting(),
      changedOnMainSince: async () => ["programme/contracts/tokens/contract.md"],
      modulesOnMain: async () => listing([]),
      modulesAt: async (_project, commit) =>
        commit === "p1nned" ? listing(["    uses: [tokens]"]) : undefined,
    };
    await onPullRequest(
      "ledger",
      "7",
      noLongerUsed,
      { ...held, post: async (task) => void posted.push(task) },
      postedAtPinned,
      clock,
    );
    expect(posted.map(({ role, module }) => ({ role, module }))).toEqual([
      { role: "architecture", module: "parser" },
    ]);
  });

  it("names a revised contract once in its record, though modules.yaml lists it on main and at the pinned commit (0015)", async () => {
    const appended: LogEvent[] = [];
    const postedAtPinned: EventLog = {
      read: async () => [
        {
          project: "ledger",
          mergedAs: "p1nned",
          work: {
            fromRole: "architecture",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-0.md",
          },
          decision: { tasks: [{ role: "specification", module: "parser" }] },
          reason: { rule: "passed" },
        },
      ],
      append: async (event) => void appended.push(event),
    };
    const listing =
      "modules:\n  - name: lexer\n    provides: [tokens]\n  - name: parser\n    uses: [tokens]";
    const contractRevised: PullRequests = {
      ...submitting(),
      changedOnMainSince: async () => ["programme/contracts/tokens/contract.md"],
      modulesOnMain: async () => listing,
      modulesAt: async () => listing,
    };
    await onPullRequest(
      "ledger",
      "7",
      contractRevised,
      { ...held, post: async () => {} },
      postedAtPinned,
      clock,
    );
    expect(appended.flatMap((event) => ("reason" in event ? [event.reason] : []))).toEqual([
      { rule: "contract_revised", contracts: ["tokens"] },
    ]);
  });
});
