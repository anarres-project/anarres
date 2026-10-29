import { describe, expect, it } from "vitest";
import {
  type ChangeNotByDivlab,
  checkMain,
  type EventLog,
  type LogEvent,
  type MainCommit,
  type Repository,
  type TaskBoard,
} from "../src/index.ts";

const untouched = async () => {
  throw new Error("Divlab should not have acted");
};

/** Divlab Sandbox's account on GitHub, as Divlab is told it. */
const DIVLAB = "divlab-sandbox[bot]";
const clock = () => new Date("2026-10-23T09:00:00Z");

/** Divlab's last check of main, earlier: the commits the tests give come after it. */
const CHECKED = {
  project: "ledger",
  decidedAt: "2026-10-23T08:00:00.000Z",
  mainChecked: { upTo: "b1" },
};

/** A main branch with these commits since Divlab last checked, and a board that keeps alerts. */
function mainWith(commits: MainCommit[]) {
  const alerts: ChangeNotByDivlab[] = [];
  const repository: Repository = {
    feedbackSignals: untouched,
    mergeCommitOf: untouched,
    commitsSince: async () => commits,
    head: untouched,
  };
  const board = {
    alertChangeNotByDivlab: async (change: ChangeNotByDivlab) => {
      alerts.push(change);
    },
  } as unknown as TaskBoard;
  const log: EventLog = { read: async () => [CHECKED], append: async () => {} };
  return { alerts, repository, board, log };
}

describe("checking every change to a project's main branch (Bernard, 2026-10-23)", () => {
  it("alerts PDC coordinators of a commit on main that Divlab did not make", async () => {
    const { alerts, repository, board, log } = mainWith([
      { sha: "c0ffee", author: "mallory", signedByGitHub: true },
    ]);
    await checkMain("ledger", repository, board, log, clock, DIVLAB);
    expect(alerts).toEqual([
      {
        project: "ledger",
        decidedAt: "2026-10-23T09:00:00.000Z",
        changeNotByDivlab: { commit: "c0ffee", author: "mallory" },
      },
    ]);
  });

  it("leaves alone a commit GitHub signed as made by Divlab's account: its own log writes", async () => {
    const { alerts, repository, board, log } = mainWith([
      { sha: "e7e7e7", author: DIVLAB, signedByGitHub: true },
    ]);
    await checkMain("ledger", repository, board, log, clock, DIVLAB);
    expect(alerts).toEqual([]);
  });

  it("alerts a commit naming Divlab's account that GitHub did not sign: anyone can name it", async () => {
    const { alerts, repository, board, log } = mainWith([
      { sha: "f0f0f0", author: DIVLAB, signedByGitHub: false },
    ]);
    await checkMain("ledger", repository, board, log, clock, DIVLAB);
    expect(alerts.map((alert) => alert.changeNotByDivlab.commit)).toEqual(["f0f0f0"]);
  });

  it("leaves alone a merge Divlab recorded, though its commit carries the member as author", async () => {
    const { alerts, repository, board } = mainWith([
      { sha: "m3rg3d", author: "alice", signedByGitHub: true },
    ]);
    const merged: EventLog = {
      read: async () => [
        CHECKED,
        {
          project: "ledger",
          mergedAs: "m3rg3d",
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
    await checkMain("ledger", repository, board, merged, clock, DIVLAB);
    expect(alerts).toEqual([]);
  });

  it("records a change it did not make in the project's log", async () => {
    const { repository, board } = mainWith([
      { sha: "c0ffee", author: "mallory", signedByGitHub: true },
    ]);
    const appended: unknown[] = [];
    const recording: EventLog = {
      read: async () => [CHECKED],
      append: async (event) => {
        appended.push(event);
      },
    };
    await checkMain("ledger", repository, board, recording, clock, DIVLAB);
    expect(appended).toContainEqual({
      project: "ledger",
      decidedAt: "2026-10-23T09:00:00.000Z",
      changeNotByDivlab: { commit: "c0ffee", author: "mallory" },
    });
  });

  it("alerts a change only once: one already recorded is not alerted again", async () => {
    const { alerts, repository, board } = mainWith([
      { sha: "c0ffee", author: "mallory", signedByGitHub: true },
    ]);
    const recorded: EventLog = {
      read: async () => [
        CHECKED,
        {
          project: "ledger",
          decidedAt: "2026-10-23T08:00:00.000Z",
          changeNotByDivlab: { commit: "c0ffee", author: "mallory" },
        },
      ],
      append: async () => {},
    };
    await checkMain("ledger", repository, board, recorded, clock, DIVLAB);
    expect(alerts).toEqual([]);
  });

  it("does not record how far it checked when it found only its own commits, fewer than 50 (Bernard, 2026-10-29)", async () => {
    const { repository, board } = mainWith([
      { sha: "e7e7e7", author: DIVLAB, signedByGitHub: true },
      { sha: "e8e8e8", author: DIVLAB, signedByGitHub: true },
    ]);
    const appended: unknown[] = [];
    const recording: EventLog = {
      read: async () => [CHECKED],
      append: async (event) => {
        appended.push(event);
      },
    };
    await checkMain("ledger", repository, board, recording, clock, DIVLAB);
    expect(appended).toEqual([]);
  });

  it("records how far it checked when it found a change Divlab did not make", async () => {
    const { repository, board } = mainWith([
      { sha: "c0ffee", author: "mallory", signedByGitHub: true },
    ]);
    const appended: LogEvent[] = [];
    const recording: EventLog = {
      read: async () => [CHECKED],
      append: async (event) => {
        appended.push(event);
      },
    };
    await checkMain("ledger", repository, board, recording, clock, DIVLAB);
    expect(appended.filter((event) => "mainChecked" in event)).toEqual([
      { project: "ledger", decidedAt: "2026-10-23T09:00:00.000Z", mainChecked: { upTo: "c0ffee" } },
    ]);
  });

  it("records how far it checked once 50 commits have gone by, so the next check never pages", async () => {
    const { repository, board } = mainWith(
      Array.from({ length: 50 }, (_, i) => ({
        sha: i === 49 ? "e8e8e8" : `e${i}`,
        author: DIVLAB,
        signedByGitHub: true,
      })),
    );
    const appended: unknown[] = [];
    const recording: EventLog = {
      read: async () => [CHECKED],
      append: async (event) => {
        appended.push(event);
      },
    };
    await checkMain("ledger", repository, board, recording, clock, DIVLAB);
    expect(appended).toEqual([
      { project: "ledger", decidedAt: "2026-10-23T09:00:00.000Z", mainChecked: { upTo: "e8e8e8" } },
    ]);
  });

  it("checks only the commits since its last check", async () => {
    const asked: (string | undefined)[] = [];
    const { board } = mainWith([]);
    const repository: Repository = {
      feedbackSignals: untouched,
      mergeCommitOf: untouched,
      commitsSince: async (_project, since) => {
        asked.push(since);
        return [];
      },
      head: untouched,
    };
    const checkedBefore: EventLog = {
      read: async () => [
        { project: "ledger", decidedAt: "2026-10-23T07:00:00.000Z", mainChecked: { upTo: "a1" } },
        { project: "ledger", decidedAt: "2026-10-23T08:00:00.000Z", mainChecked: { upTo: "b2" } },
      ],
      append: async () => {},
    };
    await checkMain("ledger", repository, board, checkedBefore, clock, DIVLAB);
    expect(asked).toEqual(["b2"]);
  });

  it("starts from main as it stands when it has never checked: what came before was setting up", async () => {
    const appended: unknown[] = [];
    const { alerts, board } = mainWith([]);
    const repository: Repository = {
      feedbackSignals: untouched,
      mergeCommitOf: untouched,
      commitsSince: untouched,
      head: async () => "s3tup",
    };
    const neverChecked: EventLog = {
      read: async () => [],
      append: async (event) => {
        appended.push(event);
      },
    };
    await checkMain("ledger", repository, board, neverChecked, clock, DIVLAB);
    expect([alerts, appended]).toEqual([
      [],
      [
        {
          project: "ledger",
          decidedAt: "2026-10-23T09:00:00.000Z",
          mainChecked: { upTo: "s3tup" },
        },
      ],
    ]);
  });
});
