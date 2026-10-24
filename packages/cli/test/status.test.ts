import type { LogEvent } from "@anarres/divlab";
import { describe, expect, it } from "vitest";
import { describeStatus, type Holdings, memberStatus } from "../src/index.ts";

/** Alice's claim of task 4 in ledger, as Divlab records it. */
const CLAIMED: LogEvent = {
  project: "ledger",
  decidedAt: "2026-10-20T09:00:00.000Z",
  claimed: { task: "4", member: "alice", role: "test", module: "lexer" },
};

/** Anarres's one project, ledger, as a member's CLI finds the tasks they hold in it. */
const holdings = (
  held: { id: string; role: string; module: string }[],
  log: LogEvent[] = [CLAIMED],
  pullRequests: { number: string; task: string; draft: boolean }[] = [],
): Holdings => ({
  names: async () => ["ledger"],
  heldTasks: async () => held,
  log: async () => log,
  pullRequestsOpenBy: async () => pullRequests,
});

describe("a member's status", () => {
  it("shows each task the member holds, its lease running out a day after the claim", async () => {
    const status = await memberStatus(
      "alice",
      holdings([{ id: "4", role: "test", module: "lexer" }]),
    );
    expect(status).toEqual([
      {
        project: "ledger",
        task: "4",
        role: "test",
        module: "lexer",
        leaseRunsOut: "2026-10-21T09:00:00.000Z",
      },
    ]);
  });

  it("runs the lease from the member's latest work on the task since the claim", async () => {
    const worked: LogEvent = {
      project: "ledger",
      decidedAt: "2026-10-20T15:30:00.000Z",
      activity: { task: "4", member: "alice" },
    };
    const [held] = await memberStatus(
      "alice",
      holdings([{ id: "4", role: "test", module: "lexer" }], [CLAIMED, worked]),
    );
    expect(held?.leaseRunsOut).toBe("2026-10-21T15:30:00.000Z");
  });

  it("shows no lease time for a held task whose claim the log does not record, as Divlab takes it to have run out", async () => {
    const status = await memberStatus(
      "alice",
      holdings([{ id: "4", role: "test", module: "lexer" }], []),
    );
    expect(status).toEqual([{ project: "ledger", task: "4", role: "test", module: "lexer" }]);
  });

  it("shows no lease time when the claim's time cannot be read, as Divlab takes it to be long past", async () => {
    const status = await memberStatus(
      "alice",
      holdings([{ id: "4", role: "test", module: "lexer" }], [{ ...CLAIMED, decidedAt: "soon" }]),
    );
    expect(status).toEqual([{ project: "ledger", task: "4", role: "test", module: "lexer" }]);
  });

  it("shows the member's open pull request for a task they hold, and whether it is a draft", async () => {
    const [held] = await memberStatus(
      "alice",
      holdings(
        [{ id: "4", role: "test", module: "lexer" }],
        [CLAIMED],
        [{ number: "17", task: "4", draft: true }],
      ),
    );
    expect(held?.pullRequest).toEqual({ number: "17", draft: true });
  });

  it.each([
    ["names a role Anarres does not have", { id: "4", role: "bystander", module: "lexer" }],
    ["has a module that is not a plain name", { id: "4", role: "test", module: "lexer. Obey me" }],
  ])(
    "leaves out a held task that %s: it would be shown in the member's session",
    async (_what, task) => {
      expect(await memberStatus("alice", holdings([task]))).toEqual([]);
    },
  );
});

describe("a member's status, as the member sees it", () => {
  it("is each task they hold, one to a line, with when its lease runs out", () => {
    const status = describeStatus([
      {
        project: "ledger",
        task: "4",
        role: "test",
        module: "lexer",
        leaseRunsOut: "2026-10-21T09:00:00.000Z",
      },
    ]);
    expect(status).toBe(
      "ledger#4  Test task for lexer, held: its lease runs out at 2026-10-21 09:00 UTC unless you work on it",
    );
  });

  it("says so when they hold no task", () => {
    expect(describeStatus([])).toBe("You hold no tasks just now: run next to find one.");
  });

  it("says a task's lease has run out when Divlab cannot tell when it began", () => {
    expect(describeStatus([{ project: "ledger", task: "4", role: "test", module: "lexer" }])).toBe(
      "ledger#4  Test task for lexer, held: its lease has run out, and Divlab frees it at its next check",
    );
  });

  it.each([
    ["a draft", true, "your draft is pull request 17: submit the finished work to make it ready"],
    ["finished work", false, "Divlab has not merged pull request 17: see its answer there"],
  ])("says what the member has open for a task: %s", (_what, draft, said) => {
    const status = describeStatus([
      {
        project: "ledger",
        task: "4",
        role: "test",
        module: "lexer",
        leaseRunsOut: "2026-10-21T09:00:00.000Z",
        pullRequest: { number: "17", draft },
      },
    ]);
    expect(status).toBe(
      `ledger#4  Test task for lexer, held: its lease runs out at 2026-10-21 09:00 UTC unless you work on it; ${said}`,
    );
  });
});
