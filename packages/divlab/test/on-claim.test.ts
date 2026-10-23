import { describe, expect, it } from "vitest";
import {
  type ClaimedTask,
  type EventLog,
  type LogEvent,
  onClaim,
  onRelease,
  type Refused,
  type TaskBoard,
} from "../src/index.ts";

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
    onClaim("ledger", claim, board, log, clock);

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
    await onClaim("ledger", { task: "12", member: "alice" }, watched, log, clock);
    expect(appended).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-23T09:00:00.000Z",
        claimed: { task: "12", member: "alice" },
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
    await onClaim("ledger", { task: "12", member: "alice" }, reviewTask, aliceCoded, clock);
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
