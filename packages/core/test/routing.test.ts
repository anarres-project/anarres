import { describe, expect, it } from "vitest";
import { route } from "../src/index.ts";

describe("routing accepted work", () => {
  it("makes a Test task for the module when its specification passes", () => {
    expect(
      route({ fromRole: "specification", module: "parser", verdict: "pass", impediments: [] }),
    ).toEqual({ tasks: [{ role: "test", module: "parser" }] });
  });

  it("makes a Specification task when the module's architecture passes", () => {
    expect(
      route({ fromRole: "architecture", module: "parser", verdict: "pass", impediments: [] }),
    ).toEqual({ tasks: [{ role: "specification", module: "parser" }] });
  });

  it("makes a Coding task when the module's tests pass", () => {
    expect(route({ fromRole: "test", module: "parser", verdict: "pass", impediments: [] })).toEqual(
      {
        tasks: [{ role: "coding", module: "parser" }],
      },
    );
  });

  it("makes a Reviewer task when the module's code passes", () => {
    expect(
      route({ fromRole: "coding", module: "parser", verdict: "pass", impediments: [] }),
    ).toEqual({ tasks: [{ role: "reviewer", module: "parser" }] });
  });

  it("makes a Security & Quality task when the module's review passes", () => {
    expect(
      route({ fromRole: "reviewer", module: "parser", verdict: "pass", impediments: [] }),
    ).toEqual({ tasks: [{ role: "security-and-quality", module: "parser" }] });
  });

  it("advances a conditional pass just as it does a pass", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "conditional_pass",
        impediments: [],
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
      }),
    ).toEqual({ tasks: [{ role: "specification", module: "parser" }] });
  });

  it("sends a failed specification back to the Programme Architect when it reports an upstream ambiguity", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }],
      }),
    ).toEqual({ tasks: [{ role: "programme-architect", module: "parser" }] });
  });

  it("sends a failed architecture back to the Programme Architect when it reports an upstream ambiguity", () => {
    expect(
      route({
        fromRole: "architecture",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }],
      }),
    ).toEqual({ tasks: [{ role: "programme-architect", module: "parser" }] });
  });

  it("sends a failed specification back to Architecture when it reports an architecture impediment", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "architecture_impediment" }],
      }),
    ).toEqual({ tasks: [{ role: "architecture", module: "parser" }] });
  });

  it("sends a failure with several impediments to the most upstream role that owns one", () => {
    expect(
      route({
        fromRole: "specification",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "upstream_ambiguity" }, { type: "architecture_impediment" }],
      }),
    ).toEqual({ tasks: [{ role: "programme-architect", module: "parser" }] });
  });

  it("sends failed code back to Coding when it reports test failures", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "test_failures" }],
      }),
    ).toEqual({ tasks: [{ role: "coding", module: "parser" }] });
  });

  it("ranks an architecture impediment above test failures", () => {
    expect(
      route({
        fromRole: "coding",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "test_failures" }, { type: "architecture_impediment" }],
      }),
    ).toEqual({ tasks: [{ role: "architecture", module: "parser" }] });
  });

  it("sends a failed review back to Coding", () => {
    expect(
      route({ fromRole: "reviewer", module: "parser", verdict: "fail", impediments: [] }),
    ).toEqual({ tasks: [{ role: "coding", module: "parser" }] });
  });

  it("sends a review that finds a scope gap to the Programme Architect", () => {
    expect(
      route({
        fromRole: "reviewer",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "scope_gap" }],
      }),
    ).toEqual({ tasks: [{ role: "programme-architect", module: "parser" }] });
  });

  it("sends a failed Security & Quality check back to Coding", () => {
    expect(
      route({
        fromRole: "security-and-quality",
        module: "parser",
        verdict: "fail",
        impediments: [],
      }),
    ).toEqual({ tasks: [{ role: "coding", module: "parser" }] });
  });

  it("routes blocked work just as it routes failed work", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "blocked",
        impediments: [{ type: "upstream_ambiguity" }],
      }),
    ).toEqual({ tasks: [{ role: "specification", module: "parser" }] });
  });

  it("alerts a PDC coordinator, posting no task, when a failure reports no problem", () => {
    expect(
      route({ fromRole: "specification", module: "parser", verdict: "fail", impediments: [] }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("alerts a PDC coordinator when a failed test reports an architecture impediment", () => {
    expect(
      route({
        fromRole: "test",
        module: "parser",
        verdict: "fail",
        impediments: [{ type: "architecture_impediment" }],
      }),
    ).toEqual({ alert: { reason: "no_matching_rule" } });
  });

  it("keeps the next task in the same module as the accepted work", () => {
    expect(
      route({ fromRole: "specification", module: "ledger", verdict: "pass", impediments: [] }),
    ).toEqual({ tasks: [{ role: "test", module: "ledger" }] });
  });
});
