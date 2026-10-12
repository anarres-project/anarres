import { describe, expect, it } from "vitest";
import { type AcceptedWork, type RoutingRecord, routingRecord } from "../src/index.ts";

const FEEDBACK = "feedback/T-0142";

describe("recording a routing decision", () => {
  it("records passed work with the task it made and that it passed", () => {
    const work: AcceptedWork = {
      fromRole: "test",
      module: "parser",
      verdict: "pass",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work, [])).toEqual({
      work,
      decision: { tasks: [{ role: "coding", module: "parser" }] },
      reason: { rule: "passed" },
    });
  });

  it("records failed work with the problem that decided where it went", () => {
    const work: AcceptedWork = {
      fromRole: "coding",
      module: "parser",
      verdict: "fail",
      impediments: [{ type: "test_failures" }, { type: "architecture_impediment" }],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work, [])).toEqual({
      work,
      decision: {
        tasks: [{ role: "architecture", module: "parser", feedbackSignal: FEEDBACK }],
      },
      reason: { rule: "reported", impediment: "architecture_impediment" },
    });
  });

  it("records that no rule covers a failure that reports no problem", () => {
    const work: AcceptedWork = {
      fromRole: "specification",
      module: "parser",
      verdict: "fail",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work, []).reason).toEqual({ rule: "no_matching_rule" });
  });

  it("records that a passed Security & Quality check completed the module's pipeline", () => {
    const work: AcceptedWork = {
      fromRole: "security-and-quality",
      module: "parser",
      verdict: "pass",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work, []).reason).toEqual({ rule: "pipeline_complete" });
  });

  it("records that a failed review went back to Coding because it failed", () => {
    const work: AcceptedWork = {
      fromRole: "reviewer",
      module: "parser",
      verdict: "fail",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work, []).reason).toEqual({ rule: "failed" });
  });

  it("records that research went back to the role that reported the gap", () => {
    const work: AcceptedWork = {
      fromRole: "research",
      module: "parser",
      verdict: "pass",
      impediments: [],
      feedbackSignal: FEEDBACK,
      researchFor: "test",
    };
    expect(routingRecord(work, []).reason).toEqual({ rule: "research_returned" });
  });

  it("records that no rule covers research that names no role it was for", () => {
    const work: AcceptedWork = {
      fromRole: "research",
      module: "parser",
      verdict: "pass",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work, []).reason).toEqual({ rule: "no_matching_rule" });
  });
});

describe("escalating a role that keeps being sent back", () => {
  const codingFails: AcceptedWork = {
    fromRole: "coding",
    module: "parser",
    verdict: "fail",
    impediments: [{ type: "test_failures" }],
    feedbackSignal: FEEDBACK,
  };

  /** What the module's event log holds after each piece of work, in order. */
  const historyOf = (...works: AcceptedWork[]) => {
    const history: RoutingRecord[] = [];
    for (const work of works) history.push(routingRecord(work, history));
    return history;
  };

  it("alerts a PDC coordinator instead of re-running a role a fourth time", () => {
    const history = historyOf(codingFails, codingFails, codingFails);
    expect(routingRecord(codingFails, history)).toEqual({
      work: codingFails,
      decision: { alert: { reason: "re_run_limit" } },
      reason: { rule: "re_run_limit", role: "coding" },
    });
  });

  it("still re-runs a role the third time", () => {
    const history = historyOf(codingFails, codingFails);
    expect(routingRecord(codingFails, history).decision).toEqual({
      tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("counts only the re-runs of the role being sent back", () => {
    const testFails: AcceptedWork = {
      ...codingFails,
      fromRole: "test",
      impediments: [{ type: "upstream_ambiguity" }],
    };
    const history = historyOf(testFails, testFails, testFails);
    expect(routingRecord(codingFails, history).decision).toEqual({
      tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("does not count the task that first brought the work to the role as a re-run", () => {
    const testPasses: AcceptedWork = {
      ...codingFails,
      fromRole: "test",
      verdict: "pass",
      impediments: [],
    };
    const history = historyOf(testPasses, codingFails, codingFails);
    expect(routingRecord(codingFails, history).decision).toEqual({
      tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("starts counting again once the role's work passes", () => {
    const codingPasses: AcceptedWork = { ...codingFails, verdict: "pass", impediments: [] };
    const reviewFails: AcceptedWork = { ...codingFails, fromRole: "reviewer", impediments: [] };
    const history = historyOf(codingFails, codingFails, codingFails, codingPasses);
    expect(routingRecord(reviewFails, history).decision).toEqual({
      tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("starts counting again once the role's work passes conditionally", () => {
    const codingPasses: AcceptedWork = {
      ...codingFails,
      verdict: "conditional_pass",
      impediments: [],
    };
    const reviewFails: AcceptedWork = { ...codingFails, fromRole: "reviewer", impediments: [] };
    const history = historyOf(codingFails, codingFails, codingFails, codingPasses);
    expect(routingRecord(reviewFails, history).decision).toEqual({
      tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("counts only the re-runs in the module the work belongs to", () => {
    const ledgerFails: AcceptedWork = { ...codingFails, module: "ledger" };
    const history = historyOf(ledgerFails, ledgerFails, ledgerFails);
    expect(routingRecord(codingFails, history).decision).toEqual({
      tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("keeps counting when another role's work passes in between", () => {
    const testPasses: AcceptedWork = {
      ...codingFails,
      fromRole: "test",
      verdict: "pass",
      impediments: [],
    };
    const history = historyOf(codingFails, codingFails, codingFails, testPasses);
    expect(routingRecord(codingFails, history).reason).toEqual({
      rule: "re_run_limit",
      role: "coding",
    });
  });

  it("keeps alerting for what no rule covers, however often it happens", () => {
    const unroutable: AcceptedWork = { ...codingFails, fromRole: "specification", impediments: [] };
    const history = historyOf(unroutable, unroutable, unroutable);
    expect(routingRecord(unroutable, history).reason).toEqual({ rule: "no_matching_rule" });
  });
});
