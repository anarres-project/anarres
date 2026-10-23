import { describe, expect, it } from "vitest";
import {
  type EventLog,
  type NotAccepted,
  onMerge,
  onPullRequest,
  type PostedTask,
  type PullRequests,
  type Repository,
  type TaskBoard,
} from "../src/index.ts";

/** Divlab's clock in these tests: a fixed time. */
const clock = () => new Date("2026-10-22T09:00:00Z");

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
  refuseClaim: untouched,
};

describe("acting on a merge", () => {
  const passedSpecification =
    "---\nfeedback_signal:\n  from_role: specification\n  module: parser\n  verdict: pass\n---\n";
  /** One feedback signal on main; the tripwire never needs to read what it says. */
  const onMain = (_text: string): Repository => ({
    feedbackSignals: async () => ["feedback/FB-9.md"],
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
      [{ project: "ledger", role: "test", module: "parser", decidedOn: "feedback/FB-9.md" }],
      [],
    ]);
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
    await onPullRequest(
      "ledger",
      "7",
      submitting(merged),
      { ...board, post: async () => {} },
      log,
      clock,
    );
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
    await onPullRequest("ledger", "7", submitting(), posting, log, clock);
    expect(posted).toEqual([
      { project: "ledger", role: "test", module: "parser", decidedOn: "feedback/FB-1.md" },
    ]);
  });

  it("tells the board which decision each task comes from, so it is posted once", async () => {
    const posted: PostedTask[] = [];
    const posting: TaskBoard = {
      ...board,
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
      text: "---\nfeedback_signal:\n  from_role: security-and-quality\n  module: parser\n  verdict: pass\n---\n",
    };
    const marking: TaskBoard = {
      ...board,
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
    await onPullRequest("ledger", "8", submitting(merged, [unreadable]), board, log, clock);
    expect(merged).toEqual([]);
  });

  it("tells the member why it did not merge their pull request", async () => {
    const refusals: string[] = [];
    const unreadable = { path: "feedback/FB-2.md", text: "Looks good to me." };
    await onPullRequest("ledger", "8", submitting([], [unreadable], refusals), board, log, clock);
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
    await onPullRequest(
      "ledger",
      "7",
      pullRequests,
      { ...board, post: async () => {} },
      log,
      clock,
    );
    expect(merged).toEqual(["7 at c0ffee"]);
  });

  it("closes the task the work in the pull request was for", async () => {
    const closed: string[] = [];
    const forTask = {
      path: "feedback/FB-4.md",
      text: '---\nfeedback_signal:\n  task_id: "3"\n  from_role: test\n  module: parser\n  verdict: pass\n---\n',
    };
    const closing: TaskBoard = {
      ...board,
      post: async () => {},
      task: async () => ({}),
      close: async (_project, task) => {
        closed.push(task);
      },
    };
    await onPullRequest("ledger", "9", submitting([], [forTask]), closing, log, clock);
    expect(closed).toEqual(["3"]);
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
      ...board,
      post: async () => {},
      task: async () => ({}),
      close: async () => {},
    };
    await onPullRequest("ledger", "9", submitting([], [forTask]), closing, recording, clock);
    const decision = appended.find(
      (event) => typeof event === "object" && event !== null && "work" in event,
    );
    expect(decision).toMatchObject({ task: "3" });
  });

  it("sends passed Research back to the role its task was for, as Divlab recorded on the task", async () => {
    const posted: PostedTask[] = [];
    const research = {
      path: "feedback/FB-5.md",
      text: '---\nfeedback_signal:\n  task_id: "4"\n  from_role: research\n  module: parser\n  verdict: pass\n---\n',
    };
    const recorded: TaskBoard = {
      ...board,
      post: async (task) => {
        posted.push(task);
      },
      task: async () => ({ researchFor: "coding" }),
      close: async () => {},
    };
    await onPullRequest("ledger", "10", submitting([], [research]), recorded, log, clock);
    expect(posted.map((task) => task.role)).toEqual(["coding"]);
  });

  it("does not merge work whose feedback signal's file is not plainly named, and says why", async () => {
    const merged: string[] = [];
    const refusals: string[] = [];
    const notPlain = { ...specificationPasses, path: "feedback/FB-1_*see*.md" };
    await onPullRequest(
      "ledger",
      "13",
      submitting(merged, [notPlain], refusals),
      board,
      log,
      clock,
    );
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
    await onPullRequest(
      "ledger",
      "11",
      submitting([], [artefactOnly], refusals),
      board,
      log,
      clock,
    );
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
      { ...board, post: async () => {} },
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
      { ...board, post: async () => {} },
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
      ...board,
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
      { ...board, post: async () => {} },
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
      { ...board, post: async () => {} },
      counting,
      clock,
    );
    expect(reads).toBe(1);
  });

  it("records that it is about to merge, with the work, before it merges", async () => {
    const happened: unknown[] = [];
    const pullRequests: PullRequests = {
      ...submitting(),
      merge: async (_project, pullRequest) => {
        happened.push(`merged ${pullRequest}`);
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
      { ...board, post: async () => {} },
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
          work: { fromRole: "specification", module: "parser", verdict: "pass", impediments: [] },
        },
      },
      "merged 7",
    ]);
  });
});
