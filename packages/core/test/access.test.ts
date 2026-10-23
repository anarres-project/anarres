import { describe, expect, it } from "vitest";
import { outsideScope, type Role } from "../src/index.ts";

describe("what a role's work may change (concept §6)", () => {
  it("does not let Coding change its module's tests", () => {
    const paths = ["modules/parser/src/lexer.ts", "modules/parser/tests/lexer.test.ts"];
    expect(outsideScope("coding", "parser", paths)).toEqual(["modules/parser/tests/lexer.test.ts"]);
  });

  it("lets work add its one feedback signal, as every role writes one per task", () => {
    const paths = ["modules/parser/src/lexer.ts", "feedback/FB-7.md"];
    expect(outsideScope("coding", "parser", paths)).toEqual([]);
  });

  it("does not let work change a second feedback signal: one per task", () => {
    const paths = ["feedback/FB-7.md", "feedback/FB-3.md"];
    expect(outsideScope("coding", "parser", paths)).toEqual(["feedback/FB-3.md"]);
  });

  it("lets Specification change its module's specifications, and not its code", () => {
    const paths = ["modules/parser/specifications/lexing.md", "modules/parser/src/lexer.ts"];
    expect(outsideScope("specification", "parser", paths)).toEqual(["modules/parser/src/lexer.ts"]);
  });

  it.each<[Role, string]>([
    ["programme-architect", "programme/modules.yaml"],
    ["architecture", "modules/parser/architecture/overview.md"],
    ["specification", "modules/parser/specifications/lexing.md"],
    ["test", "modules/parser/tests/lexer.test.ts"],
    ["coding", "modules/parser/src/lexer.ts"],
    ["reviewer", "modules/parser/reviews/review-1.md"],
    ["security-and-quality", "modules/parser/reviews/security-1.md"],
    ["research", "research-briefs/tokenisers.md"],
  ])("lets %s write %s, and nothing in another role's place", (role, inScope) => {
    expect(outsideScope(role, "parser", [inScope])).toEqual([]);
    expect(outsideScope(role, "parser", ["modules/parser/elsewhere/x.md"])).toEqual([
      "modules/parser/elsewhere/x.md",
    ]);
  });

  it("does not let a module's work change another module", () => {
    expect(outsideScope("coding", "parser", ["modules/lexer/src/lexer.ts"])).toEqual([
      "modules/lexer/src/lexer.ts",
    ]);
  });

  it.each([
    ["climbs out of it", "modules/parser/src/../../../.github/workflows/divlab.yml"],
    ["names its own place oddly", "modules/parser/src/./lexer.ts"],
    ["has an empty part", "modules/parser/src//lexer.ts"],
    ["uses the other slash", "modules/parser/src/..\\..\\x"],
  ])("counts as outside a role's place a path that %s", (_what, path) => {
    expect(outsideScope("coding", "parser", [path])).toEqual([path]);
  });
});
