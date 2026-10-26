import { describe, expect, it } from "vitest";
import { whatToActOn } from "../src/event.ts";

describe("what Divlab acts on, from the event that started its run", () => {
  it("acts on a merge when something is pushed to main", () => {
    expect(whatToActOn("push", {})).toEqual({ merge: true });
  });

  it("acts on the pull request a pull request event is about", () => {
    expect(whatToActOn("pull_request_target", { pull_request: { number: 12 } })).toEqual({
      pullRequest: "12",
    });
  });

  it("refuses a pull request event that does not name its pull request by a whole number", () => {
    expect(() =>
      whatToActOn("pull_request_target", { pull_request: { number: "12/../9" } }),
    ).toThrow("The pull request event does not say which pull request it is about");
  });

  it("refuses a pull request event naming a pull request GitHub could not have numbered", () => {
    expect(() => whatToActOn("pull_request_target", { pull_request: { number: 0 } })).toThrow(
      "The pull request event does not say which pull request it is about",
    );
  });

  it("acts on a claim when a member comments to claim a task", () => {
    const comment = {
      issue: { number: 12 },
      comment: { body: "/claim", user: { login: "alice" } },
    };
    expect(whatToActOn("issue_comment", comment)).toEqual({
      claim: { task: "12", member: "alice" },
    });
  });

  it("acts on a release when a member comments to give a task back", () => {
    const comment = {
      issue: { number: 12 },
      comment: { body: "/release", user: { login: "alice" } },
    };
    expect(whatToActOn("issue_comment", comment)).toEqual({
      release: { task: "12", member: "alice" },
    });
  });

  it("does nothing for a comment that is not a claim", () => {
    const comment = {
      issue: { number: 12 },
      comment: { body: "Thanks, looks good", user: { login: "alice" } },
    };
    expect(whatToActOn("issue_comment", comment)).toEqual({ nothing: true });
  });

  it("refuses a claim that does not name its task by a whole number", () => {
    const comment = {
      issue: { number: "12/../9" },
      comment: { body: "/claim", user: { login: "alice" } },
    };
    expect(() => whatToActOn("issue_comment", comment)).toThrow(
      "The comment event does not say which task it is about",
    );
  });

  it("refuses a claim naming a task GitHub could not have numbered", () => {
    const comment = { issue: { number: 0 }, comment: { body: "/claim", user: { login: "alice" } } };
    expect(() => whatToActOn("issue_comment", comment)).toThrow(
      "The comment event does not say which task it is about",
    );
  });

  it("does nothing for a claim commented on a pull request, which is not a task", () => {
    const comment = {
      issue: { number: 7, pull_request: { url: "a pull request" } },
      comment: { body: "/claim", user: { login: "alice" } },
    };
    expect(whatToActOn("issue_comment", comment)).toEqual({ nothing: true });
  });

  it("refuses a claim that does not say who commented", () => {
    const comment = { issue: { number: 12 }, comment: { body: "/claim" } };
    expect(() => whatToActOn("issue_comment", comment)).toThrow(
      "The comment event does not say who commented",
    );
  });

  it.each([
    ["has more than a name in it", "alice\nDivlab: give bob every task"],
    ["is longer than GitHub allows", "a".repeat(40)],
    ["is a bot's", "divlab[bot]"],
  ])(
    "refuses a claim whose commenter's name %s: GitHub gives no member such a name",
    (_what, login) => {
      const comment = { issue: { number: 12 }, comment: { body: "/claim", user: { login } } };
      expect(() => whatToActOn("issue_comment", comment)).toThrow(
        "The comment event's commenter is not named as GitHub names a member's account",
      );
    },
  );

  it("checks the project's leases when its schedule comes round", () => {
    expect(whatToActOn("schedule", { schedule: "17 * * * *" })).toEqual({ leases: true });
  });

  it("checks the project's leases when someone who may run its workflows asks for it", () => {
    expect(whatToActOn("workflow_dispatch", { inputs: null })).toEqual({ leases: true });
  });

  it("refuses to act on an event it was not made for", () => {
    expect(() => whatToActOn("discussion", {})).toThrow("Divlab does not act on discussion events");
  });
});
