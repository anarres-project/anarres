import { describe, expect, it } from "vitest";
import {
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
    await onMerge("ledger", onMain(passedSpecification), watchedBoard, begunOnly, clock);
    expect(seen.posted).toEqual([]);
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
  const held: TaskBoard = {
    ...board,
    task: async () => ({ role: "specification", module: "parser", claimedBy: "alice" }),
    close: async () => {},
  };
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
  });
  const log: EventLog = { read: async () => [], append: async () => {} };

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
      held,
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
    await onPullRequest("ledger", "7", submitting(merged, fromNowhere, refusals), held, log, clock);
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
    await onPullRequest("ledger", "7", failing, { ...held, post: async () => {} }, log, clock);
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
    await onPullRequest("ledger", "7", running, { ...held, post: async () => {} }, log, clock);
    expect([merged, refusals]).toEqual([[], []]);
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
      { ...held, post: async () => {} },
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
    await onPullRequest("ledger", "7", failing, { ...held, post: async () => {} }, log, clock);
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
    await onPullRequest("ledger", "7", failing, { ...held, post: async () => {} }, log, clock);
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
      { ...held, post: async () => {} },
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
    await onPullRequest("ledger", "7", running, held, recording, clock);
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
    await onPullRequest("ledger", "7", failing, held, recording, clock);
    expect(appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-22T09:00:00.000Z",
        activity: { task: "1", member: "alice" },
      },
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
      { ...held, post: async (task) => void posted.push(task) },
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
      ...held,
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
      ...held,
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
      ...held,
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
      ...held,
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
      ...held,
      post: async (task) => {
        posted.push(task);
      },
      task: async () => ({ ...TEST_TASK, researchFor: "coding", claimedBy: "alice" }),
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
});
