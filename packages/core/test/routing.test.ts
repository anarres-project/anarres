import { describe, expect, it } from "vitest";
import { route } from "../src/index.ts";

const FEEDBACK = "feedback/T-0142";

describe("routing accepted work", () => {
  it("makes a Test task for the module when its specification passes", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "test", module: "parser" }] });
  });

  it("makes a Specification task when the module's architecture passes", () => {
    expect(
      route({
        fromRole: "architecture",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "specification", module: "parser" }] });
  });

  it("makes a Coding task when the module's tests pass", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "coding", module: "parser" }],
    });
  });

  it("makes a Reviewer task when the module's code passes", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "reviewer", module: "parser" }] });
  });

  it("makes a Security & Quality task when the module's review passes", () => {
    expect(
      route({
        fromRole: "reviewer",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "security-and-quality", module: "parser" }] });
  });

  it("advances a conditional pass just as it does a pass", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "conditional_pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "test", module: "parser" }] });
  });

  it("sends a failed test back to Specification when it reports an upstream ambiguity", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "specification", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("sends a failed specification back to the Programme Architect when it reports an upstream ambiguity", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "programme-architect", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("sends a failed architecture back to the Programme Architect when it reports an upstream ambiguity", () => {
    expect(
      route({
        fromRole: "architecture",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "programme-architect", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("sends a failed specification back to Architecture when it reports an architecture impediment", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "architecture_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "architecture", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("sends a failure with several impediments to the most upstream role that owns one", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }, { type: "architecture_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "programme-architect", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("sends failed code back to Coding when it reports test failures", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "test_failures" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("ranks an architecture impediment above test failures", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "test_failures" }, { type: "architecture_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "architecture", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("sends a failed review back to Coding", () => {
    expect(
      route({
        fromRole: "reviewer",
        module: "parser",
        verdict: "fail",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("sends a review that finds a scope gap to the Programme Architect", () => {
    expect(
      route({
        fromRole: "reviewer",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "scope_gap" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "programme-architect", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("sends a failed Security & Quality check back to Coding", () => {
    expect(
      route({
        fromRole: "security-and-quality",
        module: "parser",
        verdict: "fail",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("sends a failed test reporting an interface impediment to the Programme Architect", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "interface_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "programme-architect", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("sends a review reporting an interface impediment to the Programme Architect, not Coding", () => {
    expect(
      route({
        fromRole: "reviewer",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "interface_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "programme-architect", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it.each(["architecture", "specification", "coding", "security-and-quality"])(
    "sends %s reporting an interface impediment to the Programme Architect",
    (fromRole) => {
      expect(
        route({
          fromRole,
          module: "parser",
          verdict: "fail",
          impediments: [{ type: "interface_impediment" }],
          feedbackSignal: FEEDBACK,
        }),
      ).toEqual({
        tasks: [{ role: "programme-architect", module: "parser", feedbackSignal: FEEDBACK }],
      });
    },
  );

  it("makes a Research task when a failed test reports a knowledge gap", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "knowledge_gap" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [
        { role: "research", module: "parser", feedbackSignal: FEEDBACK, researchFor: "test" },
      ],
    });
  });

  it("makes a Research task when failed code reports a knowledge gap", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "knowledge_gap" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [
        { role: "research", module: "parser", feedbackSignal: FEEDBACK, researchFor: "coding" },
      ],
    });
  });

  it.each(["architecture", "specification"])(
    "makes a Research task when %s reports a knowledge gap",
    (fromRole) => {
      expect(
        route({
          fromRole,
          module: "parser",
          verdict: "fail",
          impediments: [{ type: "knowledge_gap" }],
          feedbackSignal: FEEDBACK,
        }),
      ).toEqual({
        tasks: [
          { role: "research", module: "parser", feedbackSignal: FEEDBACK, researchFor: fromRole },
        ],
      });
    },
  );

  it("sends a review reporting a knowledge gap back to Coding, as the AutoPM table reads", () => {
    expect(
      route({
        fromRole: "reviewer",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "knowledge_gap" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("records on a Research task which role reported the gap", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "knowledge_gap" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toStrictEqual({
      tasks: [
        { role: "research", module: "parser", feedbackSignal: FEEDBACK, researchFor: "coding" },
      ],
    });
  });

  it("puts research before anything else a failure reports", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "interface_impediment" }, { type: "knowledge_gap" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [
        { role: "research", module: "parser", feedbackSignal: FEEDBACK, researchFor: "test" },
      ],
    });
  });

  it("sends research that passes back to the role that reported the gap", () => {
    expect(
      route({
        fromRole: "research",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
        researchFor: "test",
      }),
    ).toStrictEqual({ tasks: [{ role: "test", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("sends research for Coding that passes back to Coding", () => {
    expect(
      route({
        fromRole: "research",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
        researchFor: "coding",
      }),
    ).toStrictEqual({ tasks: [{ role: "coding", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("alerts a PDC coordinator when research that passes names no role it was for", () => {
    expect(
      route({
        fromRole: "research",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("alerts a PDC coordinator when research fails, to decide what to do with the question", () => {
    expect(
      route({
        fromRole: "research",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "knowledge_gap" }],
        feedbackSignal: FEEDBACK,
        researchFor: "test",
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("routes blocked work just as it routes failed work", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "blocked",
        impediments: [{ type: "upstream_ambiguity" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "specification", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("alerts a PDC coordinator, posting no task, when a failure reports no problem", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("alerts a PDC coordinator when a failed test reports an architecture impediment", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "architecture_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("alerts a PDC coordinator when a failed test reports test failures", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "test_failures" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("alerts a PDC coordinator when a failure other than a review reports a scope gap", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "scope_gap" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("alerts a PDC coordinator when failed code reports an upstream ambiguity", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("routes on the impediments a rule covers, letting the others ride along", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }, { type: "architecture_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "architecture", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("sends a failed architecture back to Architecture when it reports an architecture impediment", () => {
    expect(
      route({
        fromRole: "architecture",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "architecture_impediment" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "architecture", module: "parser", feedbackSignal: FEEDBACK }] });
  });

  it("gives a revision task the feedback signal that sent the work back", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({
      tasks: [{ role: "specification", module: "parser", feedbackSignal: FEEDBACK }],
    });
  });

  it("keeps the feedback signal from the next role, which only revision tasks receive", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toStrictEqual({ tasks: [{ role: "test", module: "parser" }] });
  });

  it("keeps the next task in the same module as the accepted work", () => {
    expect(
      route({
        fromRole: "specification",
        module: "ledger",
        verdict: "pass",
        impediments: [],
        feedbackSignal: FEEDBACK,
      }),
    ).toEqual({ tasks: [{ role: "test", module: "ledger" }] });
  });
});
