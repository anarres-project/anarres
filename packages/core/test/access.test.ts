import { describe, expect, it } from "vitest";
import { mayRead, outsideScope, type Role, readScope, writeScope } from "../src/index.ts";

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

describe("what a role's work may read (concept §6)", () => {
  it("lets Coding read its module's specifications and tests, and not its architecture", () => {
    expect(
      [
        "modules/parser/specifications/lexing.md",
        "modules/parser/tests/lexer.test.ts",
        "modules/parser/architecture/overview.md",
      ].map((path) => mayRead("coding", "parser", path)),
    ).toEqual([true, true, false]);
  });

  it("lets Reviewer read its module's requirement slice, specifications and code, not its tests", () => {
    expect(
      [
        "programme/slices/parser/requirements.md",
        "modules/parser/specifications/lexing.md",
        "modules/parser/src/lexer.ts",
        "modules/parser/tests/lexer.test.ts",
      ].map((path) => mayRead("reviewer", "parser", path)),
    ).toEqual([true, true, true, false]);
  });

  it.each<[Role, string[], string[]]>([
    ["programme-architect", ["requirements/r1.md"], ["programme/slices/parser/s.md"]],
    ["architecture", ["programme/slices/parser/s.md"], ["modules/parser/specifications/a.md"]],
    [
      "specification",
      ["programme/slices/parser/s.md", "modules/parser/architecture/a.md"],
      ["modules/parser/tests/t.ts"],
    ],
    [
      "test",
      ["modules/parser/architecture/a.md", "modules/parser/specifications/a.md"],
      ["modules/parser/src/x.ts"],
    ],
    [
      "security-and-quality",
      ["modules/parser/architecture/a.md", "modules/parser/src/x.ts"],
      ["modules/parser/tests/t.ts"],
    ],
    ["research", [], ["modules/parser/src/x.ts"]],
  ])("lets %s read %j and not %j", (role, readable, unreadable) => {
    expect(readable.every((path) => mayRead(role, "parser", path))).toBe(true);
    expect(unreadable.some((path) => mayRead(role, "parser", path))).toBe(false);
  });

  it("does not let a role read another module's place, nor climb out of its own", () => {
    expect(
      ["modules/lexer/specifications/a.md", "modules/parser/specifications/../../../.env"].map(
        (path) => mayRead("coding", "parser", path),
      ),
    ).toEqual([false, false]);
  });
});

describe("the places a role's work reads, as a member's CLI fetches them", () => {
  it("are the role's read scope for the module", () => {
    expect(readScope("coding", "parser")).toEqual([
      "modules/parser/specifications/",
      "modules/parser/tests/",
    ]);
  });
});

describe("the place a role's work writes, as a continuation reads it too (decision 0008)", () => {
  it("is the role's write scope for the module", () => {
    expect(writeScope("coding", "parser")).toBe("modules/parser/src/");
  });
});

describe("what a continuation of partial work may read (decision 0008)", () => {
  it("is its role's inputs and its role's own place, and no path that climbs out", () => {
    expect(
      [
        "modules/parser/specifications/lexing.md",
        "modules/parser/src/lexer.ts",
        "modules/parser/src/../../../secrets.env",
      ].map((path) => mayRead("coding", "parser", path, { continuation: true })),
    ).toEqual([true, true, false]);
  });
});

describe("the contracts a role's work reads (decision 0014)", () => {
  it("lets Architecture read the contracts its module provides and uses, and no others", () => {
    expect(
      [
        "programme/contracts/tokens/contract.md",
        "programme/contracts/syntax-tree/contract.md",
        "programme/contracts/entries/contract.md",
      ].map((path) =>
        mayRead("architecture", "parser", path, { contracts: ["tokens", "syntax-tree"] }),
      ),
    ).toEqual([true, true, false]);
  });
  it("lets Specification read its module's contracts too", () => {
    expect(
      mayRead("specification", "parser", "programme/contracts/tokens/contract.md", {
        contracts: ["tokens"],
      }),
    ).toBe(true);
  });
  it("lets no other module role read a contract, even its module's", () => {
    const roles: Role[] = ["test", "coding", "reviewer", "security-and-quality"];
    expect(
      roles.map((role) =>
        mayRead(role, "parser", "programme/contracts/tokens/contract.md", {
          contracts: ["tokens"],
        }),
      ),
    ).toEqual([false, false, false, false]);
  });
});
