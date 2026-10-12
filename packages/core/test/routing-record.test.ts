import { describe, expect, it } from "vitest";
import { type AcceptedWork, routingRecord } from "../src/index.ts";

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
    expect(routingRecord(work)).toEqual({
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
    expect(routingRecord(work)).toEqual({
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
    expect(routingRecord(work).reason).toEqual({ rule: "no_matching_rule" });
  });

  it("records that a passed Security & Quality check completed the module's pipeline", () => {
    const work: AcceptedWork = {
      fromRole: "security-and-quality",
      module: "parser",
      verdict: "pass",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work).reason).toEqual({ rule: "pipeline_complete" });
  });

  it("records that a failed review went back to Coding because it failed", () => {
    const work: AcceptedWork = {
      fromRole: "reviewer",
      module: "parser",
      verdict: "fail",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work).reason).toEqual({ rule: "failed" });
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
    expect(routingRecord(work).reason).toEqual({ rule: "research_returned" });
  });

  it("records that no rule covers research that names no role it was for", () => {
    const work: AcceptedWork = {
      fromRole: "research",
      module: "parser",
      verdict: "pass",
      impediments: [],
      feedbackSignal: FEEDBACK,
    };
    expect(routingRecord(work).reason).toEqual({ rule: "no_matching_rule" });
  });
});
