import { describe, expect, it } from "vitest";
import { type EventLog, onLeaseCheck, type Repository, type TaskBoard } from "../src/index.ts";

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
  unreadableReviewListAlertOpen: untouched,
  markModuleDone: untouched,
  task: untouched,
  close: untouched,
  actedOn: untouched,
  markClaimed: untouched,
  refuseMember: untouched,
  comments: untouched,
  releaseClaim: untouched,
  // Telling the member is looked at by one test; the rest let it happen.
  tellLeaseRanOut: async () => {},
  alertChangeNotByDivlab: untouched,
  // No task is marked claimed but those the tests' logs hold claims for.
  claimedTasks: async () => [],
  // Telling coordinators is looked at by one test; the rest let it happen.
  alertClaimedWithoutClaim: async () => {},
};

/** Main as these tests leave it: Divlab began no merge it has not finished. */
const nothingBegun: Repository = {
  feedbackSignals: async () => [],
  mergeCommitOf: untouched,
  merge: untouched,
  openHead: untouched,
  commitsSince: untouched,
  head: untouched,
};

/** Divlab's clock in these tests: 25 hours after the claim below. */
const clock = () => new Date("2026-10-23T10:00:00Z");

/** A log holding one claim, made 25 hours before the clock. */
const claimedLongAgo: EventLog = {
  read: async () => [
    {
      project: "ledger",
      decidedAt: "2026-10-22T09:00:00.000Z",
      claimed: { task: "12", member: "alice" },
    },
  ],
  append: async () => {},
};

describe("checking a project's leases", () => {
  it("makes a task ready again when its lease has run out", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    const log: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-22T09:00:00.000Z",
          claimed: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, log, clock, nothingBegun);
    expect(released).toEqual(["12"]);
  });

  it("leaves alone a task the claim no longer holds, such as one whose work is done", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => undefined,
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    await onLeaseCheck("ledger", watched, claimedLongAgo, clock, nothingBegun);
    expect(released).toEqual([]);
  });

  it("leaves alone a task another member has claimed since, whose lease is their own", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "bob" }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    await onLeaseCheck("ledger", watched, claimedLongAgo, clock, nothingBegun);
    expect(released).toEqual([]);
  });

  it("judges a task's lease by its latest claim, so a member who claimed again keeps it", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    const claimedAgain: EventLog = {
      read: async () => [
        ...(await claimedLongAgo.read("ledger")),
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          claimed: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, claimedAgain, clock, nothingBegun);
    expect(released).toEqual([]);
  });

  it("records that the lease ran out, and when it found it had, before the board shows it", async () => {
    const seen: string[] = [];
    const appended: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async () => {
        seen.push("released");
      },
    };
    const log: EventLog = {
      ...claimedLongAgo,
      append: async (event) => {
        seen.push("recorded");
        appended.push(event);
      },
    };
    await onLeaseCheck("ledger", watched, log, clock, nothingBegun);
    expect([seen, appended]).toEqual([
      ["recorded", "released"],
      [
        {
          project: "ledger",
          decidedAt: "2026-10-23T10:00:00.000Z",
          leaseRanOut: { task: "12", member: "alice" },
        },
      ],
    ]);
  });

  it("judges a lease by the latest activity on its task, such as draft work", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    const workedOnSince: EventLog = {
      read: async () => [
        ...(await claimedLongAgo.read("ledger")),
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          activity: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, workedOnSince, clock, nothingBegun);
    expect(released).toEqual([]);
  });

  it("renews a lease only with activity by the member holding it", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    const someoneElse: EventLog = {
      read: async () => [
        ...(await claimedLongAgo.read("ledger")),
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          activity: { task: "12", member: "bob" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, someoneElse, clock, nothingBegun);
    expect(released).toEqual(["12"]);
  });

  it("tells the member their lease ran out, on the task", async () => {
    const told: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async () => {},
      tellLeaseRanOut: async (ranOut) => {
        told.push(ranOut);
      },
    };
    await onLeaseCheck("ledger", watched, claimedLongAgo, clock, nothingBegun);
    expect(told).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });

  it("finishes a claim a run recorded but stopped before the board showed it", async () => {
    const marked: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => TEST_TASK,
      markClaimed: async (claim) => void marked.push(claim),
    };
    const log: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          claimed: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, log, clock, nothingBegun);
    expect(marked).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });

  it("leaves ready a task whose claim was given back since, though its lease has not run out", async () => {
    const marked: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => TEST_TASK,
      markClaimed: async (claim) => void marked.push(claim),
    };
    const log: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          claimed: { task: "12", member: "alice" },
        },
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:30:00.000Z",
          released: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, log, clock, nothingBegun);
    expect(marked).toEqual([]);
  });

  it("gives a task marked claimed back to its holder when nobody is assigned it now", async () => {
    const marked: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimed: true }),
      markClaimed: async (claim) => void marked.push(claim),
    };
    const log: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          claimed: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, log, clock, nothingBegun);
    expect(marked).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });
});

describe("checking a task marked claimed that Divlab's log has no claim for", () => {
  it("makes the task ready again", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      claimedTasks: async () => [{ task: "12", ...TEST_TASK, claimedBy: "mallory" }],
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    const noClaims: EventLog = { read: async () => [], append: async () => {} };
    await onLeaseCheck("ledger", watched, noClaims, clock, nothingBegun);
    expect(released).toEqual(["12"]);
  });

  it("tells PDC coordinators which task it was", async () => {
    const alerts: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      claimedTasks: async () => [{ task: "12", ...TEST_TASK, claimedBy: "mallory" }],
      releaseClaim: async () => {},
      alertClaimedWithoutClaim: async (alert) => {
        alerts.push(alert);
      },
    };
    const noClaims: EventLog = { read: async () => [], append: async () => {} };
    await onLeaseCheck("ledger", watched, noClaims, clock, nothingBegun);
    expect(alerts).toEqual([
      { project: "ledger", task: "12", role: "test", module: "parser", shownAs: "mallory" },
    ]);
  });

  it("says nobody was shown holding the task when nobody was", async () => {
    const alerts: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      claimedTasks: async () => [{ task: "12", ...TEST_TASK }],
      releaseClaim: async () => {},
      alertClaimedWithoutClaim: async (alert) => {
        alerts.push(alert);
      },
    };
    const noClaims: EventLog = { read: async () => [], append: async () => {} };
    await onLeaseCheck("ledger", watched, noClaims, clock, nothingBegun);
    expect(alerts).toEqual([{ project: "ledger", task: "12", role: "test", module: "parser" }]);
  });

  it("records what it found, and when, before the board shows the task ready", async () => {
    const seen: string[] = [];
    const appended: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      claimedTasks: async () => [{ task: "12", ...TEST_TASK, claimedBy: "mallory" }],
      releaseClaim: async () => {
        seen.push("released");
      },
    };
    const log: EventLog = {
      read: async () => [],
      append: async (event) => {
        seen.push("recorded");
        appended.push(event);
      },
    };
    await onLeaseCheck("ledger", watched, log, clock, nothingBegun);
    expect([seen, appended]).toEqual([
      ["recorded", "released"],
      [
        {
          project: "ledger",
          decidedAt: "2026-10-23T10:00:00.000Z",
          claimedWithoutClaim: { task: "12", shownAs: "mallory" },
        },
      ],
    ]);
  });
});

describe("checking a task the log shows free but the board still shows claimed", () => {
  it("makes a task given back ready, finishing what a stopped run began", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      claimedTasks: async () => [{ task: "12", ...TEST_TASK, claimedBy: "alice" }],
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    const givenBack: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          claimed: { task: "12", member: "alice" },
        },
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:30:00.000Z",
          released: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    await onLeaseCheck("ledger", watched, givenBack, clock, nothingBegun);
    expect(released).toEqual(["12"]);
  });

  it("frees a task given back long ago without saying its lease ran out", async () => {
    const appended: unknown[] = [];
    const told: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      claimedTasks: async () => [{ task: "12", ...TEST_TASK, claimedBy: "alice" }],
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async () => {},
      tellLeaseRanOut: async (ranOut) => void told.push(ranOut),
    };
    const givenBackLongAgo: EventLog = {
      read: async () => [
        ...(await claimedLongAgo.read("ledger")),
        {
          project: "ledger",
          decidedAt: "2026-10-22T09:30:00.000Z",
          released: { task: "12", member: "alice" },
        },
      ],
      append: async (event) => void appended.push(event),
    };
    await onLeaseCheck("ledger", watched, givenBackLongAgo, clock, nothingBegun);
    expect([appended, told]).toEqual([[], []]);
  });

  it("frees a task whose lease ran out in the log once, without recording or saying it again", async () => {
    const seen: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      claimedTasks: async () => [{ task: "12", ...TEST_TASK, claimedBy: "alice" }],
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      releaseClaim: async (_project, task) => void seen.push(`released ${task}`),
      tellLeaseRanOut: async () => void seen.push("told"),
    };
    const ranOut: EventLog = {
      read: async () => [
        ...(await claimedLongAgo.read("ledger")),
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:30:00.000Z",
          leaseRanOut: { task: "12", member: "alice" },
        },
      ],
      append: async () => void seen.push("recorded"),
    };
    await onLeaseCheck("ledger", watched, ranOut, clock, nothingBegun);
    expect(seen).toEqual(["released 12"]);
  });
});

describe("finishing, in the hourly check, what Divlab began", () => {
  it("asks GitHub again for a merge it was about to make, which GitHub put off", async () => {
    const begun: EventLog = {
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
      append: async () => {},
    };
    const asked: string[] = [];
    const repository: Repository = {
      feedbackSignals: async () => [],
      mergeCommitOf: untouched,
      merge: async (_project, pullRequest) => {
        asked.push(pullRequest);
        throw new Error("Merge already in progress");
      },
      openHead: async () => "c0ffee",
      commitsSince: untouched,
      head: untouched,
    };
    await onLeaseCheck("ledger", board, begun, clock, repository).catch(() => {});
    expect(asked).toEqual(["7"]);
  });

  it("leaves alone the task of the work it finishes, though its lease ran out by the log it read", async () => {
    const work = {
      fromRole: "specification",
      module: "parser",
      verdict: "pass",
      impediments: [],
      task: "12",
    };
    const begunLongAgo: EventLog = {
      read: async () => [
        ...(await claimedLongAgo.read("ledger")),
        {
          project: "ledger",
          aboutToMerge: {
            pullRequest: "7",
            head: "c0ffee",
            feedbackSignal: "feedback/FB-3.md",
            work,
          },
        },
      ],
      append: async () => {},
    };
    const open = new Set(["12"]);
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      post: async () => {},
      actedOn: async () => [],
      task: async (_project, task) =>
        open.has(task) ? { ...TEST_TASK, claimedBy: "alice" } : undefined,
      close: async (_project, task) => {
        open.delete(task);
      },
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    const repository: Repository = {
      ...nothingBegun,
      merge: async () => "m3rged",
      openHead: async () => "c0ffee",
    };
    await onLeaseCheck("ledger", watched, begunLongAgo, clock, repository);
    expect([released, [...open]]).toEqual([[], []]);
  });
});
