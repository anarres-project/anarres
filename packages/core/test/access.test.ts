import { describe, expect, it } from "vitest";
import {
  changedInputs,
  mayRead,
  outsideScope,
  type Role,
  readScope,
  writeScope,
} from "../src/index.ts";

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
    ["research", "research-briefs/parser/tokenisers.md"],
    ["integration-specification", "integration/specifications/checkout.md"],
    ["integration-test", "integration/tests/checkout.test.ts"],
    ["integration-review", "integration/reviews/review-1.md"],
  ])("lets %s write %s, and nothing in another role's place", (role, inScope) => {
    expect(outsideScope(role, "parser", [inScope])).toEqual([]);
    expect(outsideScope(role, "parser", ["modules/parser/elsewhere/x.md"])).toEqual([
      "modules/parser/elsewhere/x.md",
    ]);
  });

  it("lets Research write a brief for its task's module only (Bernard, 2026-10-29)", () => {
    expect(
      outsideScope("research", "parser", [
        "research-briefs/parser/tokenisers.md",
        "research-briefs/ledger/rounding.md",
        "research-briefs/loose.md",
      ]),
    ).toEqual(["research-briefs/ledger/rounding.md", "research-briefs/loose.md"]);
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
    [
      "integration-specification",
      ["requirements/r1.md", "programme/contracts/tokens/c.md"],
      ["modules/parser/specifications/a.md", "programme/slices/parser/s.md"],
    ],
    [
      "integration-test",
      [
        "requirements/r1.md",
        "programme/contracts/tokens/c.md",
        "integration/specifications/checkout.md",
      ],
      ["modules/parser/src/x.ts", "modules/parser/tests/t.ts"],
    ],
    [
      "integration-review",
      [
        "requirements/r1.md",
        "programme/contracts/tokens/c.md",
        "integration/specifications/checkout.md",
        "integration/tests/checkout.test.ts",
      ],
      ["modules/parser/src/x.ts", "programme/slices/parser/s.md"],
    ],
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

describe("what a revision of work whose inputs changed may read (decision 0015)", () => {
  it("is its role's inputs and its role's own place, where the work already done is", () => {
    expect(readScope("test", "parser", { staleRevision: true })).toEqual([
      ...readScope("test", "parser"),
      "modules/parser/tests/",
    ]);
  });
});

describe("the inputs that changed since a task was posted (decision 0015)", () => {
  it("are the changed paths its role reads for the task", () => {
    const changed = ["programme/slices/parser/requirements.md", "programme/slices/ledger/a.md"];
    expect(changedInputs("test", "parser", {}, changed)).toEqual([
      "programme/slices/parser/requirements.md",
    ]);
  });
});

describe("what a revision after research may read (Bernard, 2026-10-29)", () => {
  it("is its role's inputs and the module's research briefs, and no other module's", () => {
    expect(readScope("coding", "parser", { afterResearch: true })).toEqual([
      ...readScope("coding", "parser"),
      "research-briefs/parser/",
    ]);
  });
});

describe("what a Research task may read (Bernard, 2026-10-29: the question and briefs)", () => {
  it("is its module's research briefs, and nothing of the module's work", () => {
    expect(readScope("research", "parser")).toEqual(["research-briefs/parser/"]);
  });

  it("is also the feedback signal that reported the knowledge gap, its question, and no other", () => {
    const task = { question: "feedback/fb-7.md" };
    expect(
      ["feedback/fb-7.md", "feedback/fb-3.md"].map((path) =>
        mayRead("research", "parser", path, task),
      ),
    ).toEqual([true, false]);
  });

  it.each([
    ["a folder of the module's work", "modules/parser/src/"],
    ["a file outside the feedback signals", "modules/parser/src/lexer.ts"],
    ["a path that climbs out", "feedback/../modules/parser/src/lexer.ts"],
    ["the feedback folder whole", "feedback/"],
    ["a signal in a folder of its own", "feedback/old/fb-7.md"],
  ])(
    "widens nothing when the question is not a feedback signal's plain path: %s",
    (_what, question) => {
      expect(readScope("research", "parser", { question })).toEqual(
        readScope("research", "parser"),
      );
    },
  );

  it("is the question's own file, not one whose name only begins with it", () => {
    expect(
      mayRead("research", "parser", "feedback/fb-7.md.old", { question: "feedback/fb-7.md" }),
    ).toBe(false);
  });

  it("is Research's alone: no other role reads a question", () => {
    expect(mayRead("coding", "parser", "feedback/fb-7.md", { question: "feedback/fb-7.md" })).toBe(
      false,
    );
  });
});
