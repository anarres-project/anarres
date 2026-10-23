import { describe, expect, it } from "vitest";
import { mayTake } from "../src/index.ts";

describe("whether a member may take a task (decision 0007)", () => {
  it("is refused to a member who has done other work in the module: one role per module", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "parser" }];
    expect(mayTake({ member: "alice", role: "reviewer", module: "parser" }, history)).toEqual({
      refused: "a member takes only one role in a module, and you have worked on it as Coding",
    });
  });

  it("is allowed when the other work in the module is someone else's", () => {
    const history = [{ member: "bob", role: "coding" as const, module: "parser" }];
    expect(mayTake({ member: "alice", role: "reviewer", module: "parser" }, history)).toBe(
      "allowed",
    );
  });

  it("is allowed when the member's other work is on another module", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "lexer" }];
    expect(mayTake({ member: "alice", role: "reviewer", module: "parser" }, history)).toBe(
      "allowed",
    );
  });

  it("is allowed for more work in the member's own role: revising it", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "parser" }];
    expect(mayTake({ member: "alice", role: "coding", module: "parser" }, history)).toBe("allowed");
  });

  it("is allowed for Research, which is not a role in the module", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "parser" }];
    expect(mayTake({ member: "alice", role: "research", module: "parser" }, history)).toBe(
      "allowed",
    );
  });

  it("is allowed after Research on the module, which gives the member no role in it", () => {
    const history = [{ member: "alice", role: "research" as const, module: "parser" }];
    expect(mayTake({ member: "alice", role: "coding", module: "parser" }, history)).toBe("allowed");
  });
});
