import { describe, expect, it } from "vitest";
import { type EventLog, onLeaseCheck, type TaskBoard } from "../src/index.ts";

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
  releaseClaim: untouched,
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
      task: async () => ({ claimedBy: "alice" }),
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
    await onLeaseCheck("ledger", watched, log, clock);
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
    await onLeaseCheck("ledger", watched, claimedLongAgo, clock);
    expect(released).toEqual([]);
  });

  it("leaves alone a task another member has claimed since, whose lease is their own", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ claimedBy: "bob" }),
      releaseClaim: async (_project, task) => {
        released.push(task);
      },
    };
    await onLeaseCheck("ledger", watched, claimedLongAgo, clock);
    expect(released).toEqual([]);
  });

  it("judges a task's lease by its latest claim, so a member who claimed again keeps it", async () => {
    const released: string[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ claimedBy: "alice" }),
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
    await onLeaseCheck("ledger", watched, claimedAgain, clock);
    expect(released).toEqual([]);
  });

  it("records that the lease ran out, and when it found it had, before the board shows it", async () => {
    const seen: string[] = [];
    const appended: unknown[] = [];
    const watched: TaskBoard = {
      ...board,
      task: async () => ({ claimedBy: "alice" }),
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
    await onLeaseCheck("ledger", watched, log, clock);
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
});
