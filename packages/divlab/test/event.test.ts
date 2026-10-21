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

  it("refuses to act on an event it was not made for", () => {
    expect(() => whatToActOn("issue_comment", {})).toThrow(
      "Divlab does not act on issue_comment events",
    );
  });
});
