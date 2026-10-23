import { describe, expect, it } from "vitest";
import {
  type ClaimedTask,
  type EventLog,
  type LogEvent,
  type Members,
  onClaim,
  onRelease,
  type Refused,
  type TaskBoard,
} from "../src/index.ts";

/** A governance file that lets the tests' members take any task, so other rules are what's tested. */
const everyoneTrusted: Members = {
  governanceFile: async () => ({
    members: { alice: { level: "pdc-coordinator" }, bob: { level: "pdc-coordinator" } },
  }),
};

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
  actedOn: untouched,
  markClaimed: untouched,
  refuseMember: untouched,
  comments: untouched,
  releaseClaim: untouched,
  tellLeaseRanOut: untouched,
  alertChangeNotByDivlab: untouched,
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
      task: async () => (heldBy === undefined ? TEST_TASK : { ...TEST_TASK, claimedBy: heldBy }),
      comments: async () => claimsBy.map((member) => ({ member, text: "/claim" })),
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    const refused: Refused[] = [];
    watched.refuseMember = async (refusal) => {
      refused.push(refusal);
    };
    return { claimed, refused, watched };
  };
  /** A log that is not looked at: these tests are about the board. */
  const log: EventLog = { read: async () => [], append: async () => {} };
  const clock = () => new Date("2026-10-23T09:00:00Z");
  const claiming = (claim: { task: string; member: string }, board: TaskBoard) =>
    onClaim("ledger", claim, board, log, clock, everyoneTrusted);

  it("marks the task claimed by the member who asked", async () => {
    const { claimed, watched } = watching({ claimsBy: ["alice"] });
    await claiming({ task: "12", member: "alice" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });

  it("leaves a task another member holds with them", async () => {
    const { claimed, watched } = watching({ heldBy: "alice", claimsBy: ["alice", "bob"] });
    await claiming({ task: "12", member: "bob" }, watched);
    expect(claimed).toEqual([]);
  });

  it("tells a member who claims a task another member holds that it has already been claimed", async () => {
    const { refused, watched } = watching({ heldBy: "alice", claimsBy: ["alice", "bob"] });
    await claiming({ task: "12", member: "bob" }, watched);
    expect(refused).toEqual([
      {
        project: "ledger",
        task: "12",
        member: "bob",
        reason: "Divlab did not give you this task: it has already been claimed",
      },
    ]);
  });

  it("gives the task to the member who claimed it first, even when it hears a later claim first", async () => {
    const { claimed, watched } = watching({ claimsBy: ["alice", "bob"] });
    await claiming({ task: "12", member: "bob" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "alice" }]);
  });

  it("gives the task to the member who asked when the issue's comments do not show a claim yet", async () => {
    const { claimed, watched } = watching({ claimsBy: [] });
    await claiming({ task: "12", member: "bob" }, watched);
    expect(claimed).toEqual([{ project: "ledger", task: "12", member: "bob" }]);
  });

  it("tells a member whose claim came second, though heard first, that it has already been claimed", async () => {
    const { refused, watched } = watching({ claimsBy: ["alice", "bob"] });
    await claiming({ task: "12", member: "bob" }, watched);
    expect(refused).toEqual([
      {
        project: "ledger",
        task: "12",
        member: "bob",
        reason: "Divlab did not give you this task: it has already been claimed",
      },
    ]);
  });

  it("leaves alone a member's claim on a task already given to them, as a later run finds it", async () => {
    const { claimed, refused, watched } = watching({ heldBy: "alice", claimsBy: ["alice", "bob"] });
    await claiming({ task: "12", member: "alice" }, watched);
    expect([claimed, refused]).toEqual([[], []]);
  });

  it("refuses a claim on something that is not a task, such as an alert or a finished task", async () => {
    const { claimed, refused, watched } = watching({ claimsBy: ["alice"] });
    watched.task = async () => undefined;
    await claiming({ task: "12", member: "alice" }, watched);
    expect([claimed, refused]).toEqual([
      [],
      [
        {
          project: "ledger",
          task: "12",
          member: "alice",
          reason: "Divlab did not give you this task: it is not a task anyone can claim",
        },
      ],
    ]);
  });

  it("records the claim it grants, saying when by its clock", async () => {
    const { watched } = watching({ claimsBy: ["alice"] });
    const appended: unknown[] = [];
    const log: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim("ledger", { task: "12", member: "alice" }, watched, log, clock, everyoneTrusted);
    expect(appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-23T09:00:00.000Z",
        claimed: { task: "12", member: "alice", role: "test", module: "parser" },
      },
    ]);
  });
});

describe("who may claim a task (decision 0007)", () => {
  it("refuses a member who has done other work in the module, saying why", async () => {
    const claimed: ClaimedTask[] = [];
    const refused: Refused[] = [];
    const reviewTask: TaskBoard = {
      ...board,
      task: async () => ({ role: "reviewer", module: "parser" }),
      comments: async () => [{ member: "alice", text: "/claim" }],
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
      refuseMember: async (refusal) => {
        refused.push(refusal);
      },
    };
    const aliceCoded: EventLog = {
      read: async () => [
        {
          project: "ledger",
          member: "alice",
          work: {
            fromRole: "coding",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-3.md",
          },
          decision: { tasks: [{ role: "reviewer", module: "parser" }] },
          reason: { rule: "passed" },
        } as LogEvent,
      ],
      append: async () => {},
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim(
      "ledger",
      { task: "12", member: "alice" },
      reviewTask,
      aliceCoded,
      clock,
      everyoneTrusted,
    );
    expect([claimed, refused]).toEqual([
      [],
      [
        {
          project: "ledger",
          task: "12",
          member: "alice",
          reason:
            "Divlab did not give you this task: a member takes only one role in a module, and you have worked on it as Coding",
        },
      ],
    ]);
  });

  it("refuses a member who holds a task in the module in another role", async () => {
    const refused: Refused[] = [];
    const codingTask: TaskBoard = {
      ...board,
      task: async () => ({ role: "coding", module: "parser" }),
      comments: async () => [{ member: "alice", text: "/claim" }],
      refuseMember: async (refusal) => {
        refused.push(refusal);
      },
    };
    const aliceHoldsTheTests: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-23T08:00:00.000Z",
          claimed: { task: "11", member: "alice", role: "test", module: "parser" },
        },
      ],
      append: async () => {},
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim(
      "ledger",
      { task: "12", member: "alice" },
      codingTask,
      aliceHoldsTheTests,
      clock,
      everyoneTrusted,
    );
    expect(refused.map((refusal) => refusal.reason)).toEqual([
      "Divlab did not give you this task: a member takes only one role in a module, and you have worked on it as Test",
    ]);
  });

  it.each([
    ["gave back", { released: { task: "11", member: "alice" } }],
    ["let run out", { leaseRanOut: { task: "11", member: "alice" } }],
  ])("does not count a task the member %s: they produced nothing", async (_what, ended) => {
    const claimed: ClaimedTask[] = [];
    const codingTask: TaskBoard = {
      ...board,
      task: async () => ({ role: "coding", module: "parser" }),
      comments: async () => [{ member: "alice", text: "/claim" }],
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    const heldOnceThenEnded: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-23T08:00:00.000Z",
          claimed: { task: "11", member: "alice", role: "test", module: "parser" },
        },
        { project: "ledger", decidedAt: "2026-10-23T08:30:00.000Z", ...ended } as LogEvent,
      ],
      append: async () => {},
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim(
      "ledger",
      { task: "12", member: "alice" },
      codingTask,
      heldOnceThenEnded,
      clock,
      everyoneTrusted,
    );
    expect(claimed.map((claim) => claim.member)).toEqual(["alice"]);
  });

  it("gives the task to the earliest claim that is allowed, passing over one that is not", async () => {
    const claimed: ClaimedTask[] = [];
    const reviewTask: TaskBoard = {
      ...board,
      task: async () => ({ role: "reviewer", module: "parser" }),
      comments: async () => [
        { member: "alice", text: "/claim" },
        { member: "bob", text: "/claim" },
      ],
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    const aliceCoded: EventLog = {
      read: async () => [
        {
          project: "ledger",
          member: "alice",
          work: {
            fromRole: "coding",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-3.md",
          },
          decision: { tasks: [{ role: "reviewer", module: "parser" }] },
          reason: { rule: "passed" },
        } as LogEvent,
      ],
      append: async () => {},
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim(
      "ledger",
      { task: "12", member: "bob" },
      reviewTask,
      aliceCoded,
      clock,
      everyoneTrusted,
    );
    expect(claimed.map((claim) => claim.member)).toEqual(["bob"]);
  });

  it("refuses a member whose trust level is too low for the task, saying why", async () => {
    const refused: Refused[] = [];
    const reviewTask: TaskBoard = {
      ...board,
      task: async () => ({ role: "reviewer", module: "parser" }),
      refuseMember: async (refusal) => {
        refused.push(refusal);
      },
    };
    const nobodyListed: Members = { governanceFile: async () => ({ members: {} }) };
    const log: EventLog = { read: async () => [], append: async () => {} };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim("ledger", { task: "12", member: "alice" }, reviewTask, log, clock, nobodyListed);
    expect(refused.map((refusal) => refusal.reason)).toEqual([
      "Divlab did not give you this task: a Reviewer task needs an established member, and you are new",
    ]);
  });

  it("treats an account a PDC coordinator linked to a member as that member", async () => {
    const refused: Refused[] = [];
    const reviewTask: TaskBoard = {
      ...board,
      task: async () => ({ role: "reviewer", module: "parser" }),
      comments: async () => [{ member: "alice-2", text: "/claim" }],
      refuseMember: async (refusal) => {
        refused.push(refusal);
      },
    };
    const aliceCoded: EventLog = {
      read: async () => [
        {
          project: "ledger",
          member: "alice",
          work: {
            fromRole: "coding",
            module: "parser",
            verdict: "pass",
            impediments: [],
            feedbackSignal: "feedback/FB-3.md",
          },
          decision: { tasks: [{ role: "reviewer", module: "parser" }] },
          reason: { rule: "passed" },
        } as LogEvent,
      ],
      append: async () => {},
    };
    const linked: Members = {
      governanceFile: async () => ({
        members: { alice: { level: "established", linked: ["alice-2"] } },
      }),
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim(
      "ledger",
      { task: "12", member: "alice-2" },
      reviewTask,
      aliceCoded,
      clock,
      linked,
    );
    expect(refused.map((refusal) => refusal.reason)).toEqual([
      "Divlab did not give you this task: a member takes only one role in a module, and you have worked on it as Coding",
    ]);
  });

  it("gives a task whose lease has run out to a new claim, without waiting for the hourly check", async () => {
    const claimed: ClaimedTask[] = [];
    const heldByAlice: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: "alice" }),
      comments: async () => [
        { member: "alice", text: "/claim", at: "2026-10-20T08:59:00.000Z" },
        { member: "bob", text: "/claim", at: "2026-10-23T08:59:00.000Z" },
      ],
      releaseClaim: async () => {},
      tellLeaseRanOut: async () => {},
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    const aliceClaimedLongAgo: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-20T09:00:00.000Z",
          claimed: { task: "12", member: "alice", role: "test", module: "parser" },
        },
      ],
      append: async () => {},
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    await onClaim(
      "ledger",
      { task: "12", member: "bob" },
      heldByAlice,
      aliceClaimedLongAgo,
      clock,
      everyoneTrusted,
    );
    expect(claimed.map((claim) => claim.member)).toEqual(["bob"]);
  });

  it("gives a task a member gave back to a claim made since, not to its old claims", async () => {
    const claimed: ClaimedTask[] = [];
    const givenBack: TaskBoard = {
      ...board,
      task: async () => TEST_TASK,
      comments: async () => [
        { member: "alice", text: "/claim", at: "2026-10-23T07:00:00.000Z" },
        { member: "carol", text: "/claim", at: "2026-10-23T08:30:00.000Z" },
      ],
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    const aliceGaveItBack: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-23T07:01:00.000Z",
          claimed: { task: "12", member: "alice", role: "test", module: "parser" },
        },
        {
          project: "ledger",
          decidedAt: "2026-10-23T08:00:00.000Z",
          released: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    const trusted: Members = {
      governanceFile: async () => ({ members: { carol: { level: "pdc-coordinator" } } }),
    };
    await onClaim(
      "ledger",
      { task: "12", member: "carol" },
      givenBack,
      aliceGaveItBack,
      clock,
      trusted,
    );
    expect(claimed.map((claim) => claim.member)).toEqual(["carol"]);
  });

  it("gives a task freed by the hourly lease check to a claim made since, not to its old claims", async () => {
    const claimed: ClaimedTask[] = [];
    const freedTask: TaskBoard = {
      ...board,
      task: async () => TEST_TASK,
      comments: async () => [
        { member: "alice", text: "/claim", at: "2026-10-21T07:00:00.000Z" },
        { member: "carol", text: "/claim", at: "2026-10-23T08:30:00.000Z" },
      ],
      markClaimed: async (claim) => {
        claimed.push(claim);
      },
    };
    const aliceRanOut: EventLog = {
      read: async () => [
        {
          project: "ledger",
          decidedAt: "2026-10-21T07:01:00.000Z",
          claimed: { task: "12", member: "alice", role: "test", module: "parser" },
        },
        {
          project: "ledger",
          decidedAt: "2026-10-22T07:17:00.000Z",
          leaseRanOut: { task: "12", member: "alice" },
        },
      ],
      append: async () => {},
    };
    const clock = () => new Date("2026-10-23T09:00:00Z");
    const trusted: Members = {
      governanceFile: async () => ({ members: { carol: { level: "pdc-coordinator" } } }),
    };
    await onClaim(
      "ledger",
      { task: "12", member: "carol" },
      freedTask,
      aliceRanOut,
      clock,
      trusted,
    );
    expect(claimed.map((claim) => claim.member)).toEqual(["carol"]);
  });
});

describe("acting on a release", () => {
  const log: EventLog = { read: async () => [], append: async () => {} };
  const clock = () => new Date("2026-10-23T09:00:00Z");
  /** A board holding one task, held by `heldBy`, that keeps the claims Divlab gives up. */
  const holding = (heldBy: string) => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ ...TEST_TASK, claimedBy: heldBy }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
      // What the member is told is looked at by one test; the rest let it happen.
      refuseMember: async () => {},
    };
    return { released, watched };
  };

  it("makes the task ready again when the member holding it gives it back", async () => {
    const { released, watched } = holding("alice");
    await onRelease("ledger", { task: "12", member: "alice" }, watched, log, clock);
    expect(released).toEqual(["12"]);
  });

  it("leaves the task with its holder when someone else asks to give it back", async () => {
    const { released, watched } = holding("alice");
    await onRelease("ledger", { task: "12", member: "bob" }, watched, log, clock);
    expect(released).toEqual([]);
  });

  it("records that the member gave the task back, and when, before the board shows it", async () => {
    const seen: string[] = [];
    const appended: unknown[] = [];
    const { watched } = holding("alice");
    watched.releaseClaim = async () => {
      seen.push("released");
    };
    const recording: EventLog = {
      read: async () => [],
      append: async (event) => {
        seen.push("recorded");
        appended.push(event);
      },
    };
    await onRelease("ledger", { task: "12", member: "alice" }, watched, recording, clock);
    expect([seen, appended]).toEqual([
      ["recorded", "released"],
      [
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          released: { task: "12", member: "alice" },
        },
      ],
    ]);
  });

  it("tells someone who asks to give back a task they do not hold that only its holder can", async () => {
    const refused: Refused[] = [];
    const { watched } = holding("alice");
    watched.refuseMember = async (refusal) => {
      refused.push(refusal);
    };
    await onRelease("ledger", { task: "12", member: "bob" }, watched, log, clock);
    expect(refused).toEqual([
      {
        project: "ledger",
        task: "12",
        member: "bob",
        reason:
          "Divlab did not release this task: only the member holding a task can give it back, and you do not hold it",
      },
    ]);
  });
});
