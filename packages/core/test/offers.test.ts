import { describe, expect, it } from "vitest";
import { rankOffers, underWay } from "../src/index.ts";

describe("the order a member is offered tasks in (concept §8, Bernard, 2026-10-29)", () => {
  it("puts work already under way ahead of work not yet begun", () => {
    const begun = { id: "begun", underWay: false, posted: "2026-10-29T09:00:00Z" };
    const underWay = { id: "under way", underWay: true, posted: "2026-10-29T10:00:00Z" };
    expect(rankOffers([begun, underWay]).map((task) => task.id)).toEqual(["under way", "begun"]);
  });

  it("puts, of tasks alike in that, the one posted longest ago first", () => {
    const later = { id: "later", underWay: false, posted: "2026-10-29T10:00:00Z" };
    const earlier = { id: "earlier", underWay: false, posted: "2026-10-28T23:00:00Z" };
    expect(rankOffers([later, earlier]).map((task) => task.id)).toEqual(["earlier", "later"]);
  });
});

describe("a task whose work is under way", () => {
  it("is one Divlab posted for a feedback signal, and not a module's next task for work that passed", () => {
    expect([underWay({ feedbackSignal: "feedback/FB-7.md" }), underWay({})]).toEqual([true, false]);
  });
});
