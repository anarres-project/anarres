import { describe, expect, it } from "vitest";
import { gitSteps, preparation } from "../src/index.ts";

const SHA = "0123456789abcdef0123456789abcdef01234567";

describe("preparing a task the member holds (concept §8)", () => {
  it("fetches only the places the task's role may read, as they were at its pinned commit", () => {
    const task = { role: "coding" as const, module: "parser", claimedBy: "alice", inputsAt: SHA };
    expect(preparation("anarres-project", "ledger", task, "alice")).toEqual({
      repository: "anarres-project/ledger",
      commit: SHA,
      paths: ["modules/parser/specifications/", "modules/parser/tests/"],
      contracts: [],
    });
  });

  it("also fetches its role's own place for a continuation, to see the work it continues", () => {
    const task = {
      role: "coding" as const,
      module: "parser",
      claimedBy: "alice",
      inputsAt: SHA,
      continuation: true as const,
    };
    expect(preparation("anarres-project", "ledger", task, "alice")).toMatchObject({
      paths: ["modules/parser/specifications/", "modules/parser/tests/", "modules/parser/src/"],
    });
  });

  it("fetches the contracts the task's module provides and uses, as modules.yaml says at that commit", () => {
    const task = {
      role: "architecture" as const,
      module: "parser",
      claimedBy: "alice",
      inputsAt: SHA,
    };
    const modules = [
      "modules:",
      "  - name: lexer",
      "    provides: [tokens]",
      "  - name: parser",
      "    uses: [tokens]",
      "  - name: ledger",
      "    provides: [entries]",
      "",
    ].join("\n");
    expect(preparation("anarres-project", "ledger", task, "alice", modules)).toMatchObject({
      paths: ["programme/slices/parser/", "programme/contracts/tokens/"],
    });
  });

  it("says which contracts it fetches, for the record the read-scope hook keeps to", () => {
    const task = {
      role: "specification" as const,
      module: "lexer",
      claimedBy: "alice",
      inputsAt: SHA,
    };
    const modules = "modules:\n  - name: lexer\n    provides: [tokens]\n  - name: parser\n";
    expect(preparation("anarres-project", "ledger", task, "alice", modules)).toMatchObject({
      contracts: ["tokens"],
    });
  });

  it("is refused, saying why, when modules.yaml at that commit cannot be read", () => {
    const task = {
      role: "architecture" as const,
      module: "parser",
      claimedBy: "alice",
      inputsAt: SHA,
    };
    expect(preparation("anarres-project", "ledger", task, "alice", "modules: [unclosed\n")).toEqual(
      {
        refused:
          "Nothing fetched for ledger: its modules.yaml cannot be read: modules.yaml cannot be read as YAML.",
      },
    );
  });

  it.each([
    ["is not a task", undefined, "it is not a task"],
    [
      "someone else holds",
      { role: "coding" as const, module: "parser", claimedBy: "bob", inputsAt: SHA },
      "you do not hold it: claim it first",
    ],
    [
      "nobody holds yet",
      { role: "coding" as const, module: "parser", inputsAt: SHA },
      "you do not hold it: claim it first",
    ],
    [
      "has no pinned inputs",
      { role: "coding" as const, module: "parser", claimedBy: "alice" },
      "it does not say which commit its inputs are read at",
    ],
  ])("is refused for a task that %s", (_what, task, why) => {
    expect(preparation("anarres-project", "ledger", task, "alice")).toEqual({
      refused: `Nothing fetched for ledger: ${why}.`,
    });
  });
});

describe("fetching a prepared task", () => {
  it("makes a sparse checkout of only those places, at only that commit, without a shell", () => {
    const fetch = {
      repository: "anarres-project/ledger",
      commit: SHA,
      paths: ["modules/parser/specifications/", "modules/parser/tests/"],
    };
    expect(gitSteps(fetch, "work/ledger-4")).toEqual([
      ["init", "--quiet", "work/ledger-4"],
      [
        "-C",
        "work/ledger-4",
        "sparse-checkout",
        "set",
        "--no-cone",
        "/modules/parser/specifications/",
        "/modules/parser/tests/",
      ],
      [
        "-C",
        "work/ledger-4",
        "fetch",
        "--quiet",
        "--depth=1",
        "--filter=blob:none",
        "https://github.com/anarres-project/ledger.git",
        SHA,
      ],
      ["-C", "work/ledger-4", "checkout", "--quiet", "--detach", "FETCH_HEAD"],
    ]);
  });
});
