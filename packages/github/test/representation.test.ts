import type { RoutingEvent } from "@anarres/divlab";
import { describe, expect, it } from "vitest";
import {
  eventFile,
  eventFromFile,
  issueForAlert,
  issueForModuleDone,
  issueForTask,
} from "../src/index.ts";

const EVENT: RoutingEvent = {
  project: "ledger",
  work: {
    fromRole: "test",
    module: "parser",
    verdict: "pass",
    impediments: [],
    feedbackSignal: "feedback/T-0142.md",
  },
  decision: { tasks: [{ role: "coding", module: "parser" }] },
  reason: { rule: "passed" },
};

describe("a task as a GitHub issue", () => {
  it("is labelled with its role, its module and as ready, and links its feedback signal", () => {
    expect(
      issueForTask({
        project: "ledger",
        role: "specification",
        module: "parser",
        feedbackSignal: "feedback/T-0142.md",
      }),
    ).toEqual({
      title: "Specification task for parser",
      labels: ["role:specification", "module:parser", "state:ready"],
      body: "Feedback signal: feedback/T-0142.md",
    });
  });

  it("says nothing of a feedback signal when it has none", () => {
    expect(issueForTask({ project: "ledger", role: "test", module: "parser" }).body).toBe("");
  });

  it("records on a Research task which role it is for", () => {
    expect(
      issueForTask({
        project: "ledger",
        role: "research",
        module: "parser",
        feedbackSignal: "feedback/T-0142.md",
        researchFor: "coding",
      }).labels,
    ).toEqual(["role:research", "module:parser", "state:ready", "research-for:coding"]);
  });
});

describe("a routing event as a file", () => {
  it("is one file under events/, named by its place in the log", () => {
    expect(eventFile(EVENT, 7).path).toBe("events/000007.json");
  });

  it("reads back as the event that was written", () => {
    expect(eventFromFile(eventFile(EVENT, 1).content)).toEqual(EVENT);
  });

  it("is refused when it is not a routing record", () => {
    expect(() => eventFromFile('{"project": "ledger"}')).toThrow("not a routing record");
  });
});

describe("a PDC coordinator alert as a GitHub issue", () => {
  const unroutable: RoutingEvent = {
    ...EVENT,
    work: { ...EVENT.work, verdict: "fail", impediments: [{ type: "test_failures" }] },
    decision: { alert: { reason: "no_matching_rule" } },
    reason: { rule: "no_matching_rule" },
  };

  it("is an escalation for the module, saying what was reported and that no rule covers it", () => {
    expect(issueForAlert(unroutable)).toEqual({
      title: "Escalation: no rule covers the Test work on parser",
      labels: ["escalation", "module:parser"],
      body: expect.stringContaining(
        "The Test work on parser failed, reporting test_failures. No routing rule covers that.",
      ),
    });
  });

  it("names the role that has been re-run more than three times", () => {
    const stuck: RoutingEvent = {
      ...unroutable,
      work: { ...unroutable.work, fromRole: "coding" },
      decision: { alert: { reason: "re_run_limit" } },
      reason: { rule: "re_run_limit", role: "coding" },
    };
    expect(issueForAlert(stuck)).toEqual({
      title: "Escalation: Coding has been re-run more than three times on parser",
      labels: ["escalation", "module:parser"],
      body: expect.stringContaining(
        "The Coding work on parser failed, reporting test_failures. Coding has already been re-run three times for this module, so Divlab has not sent it back again.",
      ),
    });
  });

  it("carries the routing record for tools, after the words", () => {
    const { body } = issueForAlert(unroutable);
    const json = body.match(/```json\n([\s\S]*)\n```$/)?.[1];
    expect(JSON.parse(json ?? "null")).toEqual(unroutable);
  });

  it("says blocked work was blocked", () => {
    const blocked: RoutingEvent = {
      ...unroutable,
      work: { ...unroutable.work, verdict: "blocked" },
    };
    expect(issueForAlert(blocked).body).toMatch(/^The Test work on parser was blocked, reporting/);
  });

  it("says when the work reported no problem", () => {
    const silent: RoutingEvent = { ...unroutable, work: { ...unroutable.work, impediments: [] } };
    expect(issueForAlert(silent).body).toMatch(
      /^The Test work on parser failed, reporting no problem\./,
    );
  });
});

describe("a finished module on GitHub", () => {
  it("is an issue labelled with the module and as done", () => {
    expect(issueForModuleDone("parser")).toEqual({
      title: "Module parser is done",
      labels: ["module:parser", "state:done"],
      body: "",
    });
  });
});
