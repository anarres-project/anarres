import { describe, expect, it } from "vitest";
import { mayTake } from "../src/index.ts";

describe("whether a member may take a task (decision 0007)", () => {
  it("is refused to a member who has done other work in the module: one role per module", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "parser" }];
    expect(
      mayTake({ member: "alice", role: "reviewer", module: "parser" }, history, "pdc-coordinator"),
    ).toEqual({
      refused: "a member takes only one role in a module, and you have worked on it as Coding",
    });
  });

  it("is allowed when the other work in the module is someone else's", () => {
    const history = [{ member: "bob", role: "coding" as const, module: "parser" }];
    expect(
      mayTake({ member: "alice", role: "reviewer", module: "parser" }, history, "pdc-coordinator"),
    ).toBe("allowed");
  });

  it("is allowed when the member's other work is on another module", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "lexer" }];
    expect(
      mayTake({ member: "alice", role: "reviewer", module: "parser" }, history, "pdc-coordinator"),
    ).toBe("allowed");
  });

  it("is allowed for more work in the member's own role: revising it", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "parser" }];
    expect(
      mayTake({ member: "alice", role: "coding", module: "parser" }, history, "pdc-coordinator"),
    ).toBe("allowed");
  });

  it("is allowed for Research, which is not a role in the module", () => {
    const history = [{ member: "alice", role: "coding" as const, module: "parser" }];
    expect(
      mayTake({ member: "alice", role: "research", module: "parser" }, history, "pdc-coordinator"),
    ).toBe("allowed");
  });

  it("is allowed after Research on the module, which gives the member no role in it", () => {
    const history = [{ member: "alice", role: "research" as const, module: "parser" }];
    expect(
      mayTake({ member: "alice", role: "coding", module: "parser" }, history, "pdc-coordinator"),
    ).toBe("allowed");
  });

  it("is refused to a member whose trust level is too low for the role", () => {
    expect(mayTake({ member: "alice", role: "reviewer", module: "parser" }, [], "new")).toEqual({
      refused: "a Reviewer task needs an established member, and you are new",
    });
  });

  it("says which level a role needs, in words: a trusted member for Security & Quality", () => {
    const task = { member: "alice", role: "security-and-quality" as const, module: "parser" };
    expect(mayTake(task, [], "established")).toEqual({
      refused: "a Security & Quality task needs a trusted member, and you are established",
    });
  });

  it("does not let the member who wrote the programme's integration specification review it (0017)", () => {
    const task = { member: "carol", role: "integration-review" as const, module: "programme" };
    const history = [
      { member: "carol", role: "integration-specification" as const, module: "programme" },
    ];
    expect(mayTake(task, history, "trusted")).toEqual({
      refused:
        "a member takes only one role in a module, and you have worked on it as Integration Specification",
    });
  });

  it("lets a member who worked on a module take a role in the programme's integration (0017)", () => {
    const task = { member: "carol", role: "integration-test" as const, module: "programme" };
    const history = [{ member: "carol", role: "coding" as const, module: "parser" }];
    expect(mayTake(task, history, "new")).toBe("allowed");
  });
});
