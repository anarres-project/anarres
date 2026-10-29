import { describe, expect, it } from "vitest";
import { hookAnswer, scopeDecision, taskOfRecord, taskRecord } from "../src/index.ts";

const TASK = { role: "coding" as const, module: "parser" };
const ROOT = "/home/alice/anarres-work/ledger-4";

describe("the read-scope hook's decision (concept §8: read-scope hooks block other files)", () => {
  it("lets the session read a file of the task's folder its role may read", () => {
    expect(
      scopeDecision(TASK, ROOT, `${ROOT}/modules/parser/specifications/lexing.md`, "read"),
    ).toBe("allowed");
  });

  it("lets Architecture read the contracts its record names, and no others (decision 0014)", () => {
    const task = { role: "architecture" as const, module: "parser", contracts: ["tokens"] };
    expect(
      ["tokens", "entries"].map((contract) =>
        scopeDecision(task, ROOT, `${ROOT}/programme/contracts/${contract}/contract.md`, "read"),
      ),
    ).toEqual([
      "allowed",
      {
        refused:
          "programme/contracts/entries/contract.md is outside what Architecture may read for this task: Anarres keeps each role to its own inputs",
      },
    ]);
  });

  it("refuses a file of the task's folder its role may not read, saying why", () => {
    expect(
      scopeDecision(TASK, ROOT, `${ROOT}/modules/parser/architecture/overview.md`, "read"),
    ).toEqual({
      refused:
        "modules/parser/architecture/overview.md is outside what Coding may read for this task: Anarres keeps each role to its own inputs",
    });
  });

  it.each([
    ["the member's own files", "/home/alice/.ssh/id_ed25519"],
    [
      "a folder that only starts like the task's",
      `${ROOT}-other/modules/parser/specifications/a.md`,
    ],
  ])("refuses %s: the session works only in the task's folder", (_what, path) => {
    expect(scopeDecision(TASK, ROOT, path, "read")).toEqual({
      refused: `${path} is outside this task's folder: Anarres keeps a task's session to it`,
    });
  });

  it("lets the session read back its own work, where its role writes, in the task's folder (Bernard, 2026-10-24)", () => {
    expect(
      [`${ROOT}/modules/parser/src/lexer.ts`, `${ROOT}/feedback/FB-4.md`].map((path) =>
        scopeDecision(TASK, ROOT, path, "read"),
      ),
    ).toEqual(["allowed", "allowed"]);
  });

  it("lets the session write where its role writes, and not where it only reads", () => {
    expect(
      [`${ROOT}/modules/parser/src/lexer.ts`, `${ROOT}/modules/parser/tests/lexer.test.ts`].map(
        (path) => scopeDecision(TASK, ROOT, path, "write"),
      ),
    ).toEqual([
      "allowed",
      {
        refused:
          "modules/parser/tests/lexer.test.ts is outside what Coding may write for this task: Anarres keeps each role to its own place",
      },
    ]);
  });
});

describe("the hook's answer to Claude Code, for a tool call in a task's session", () => {
  it("denies a Read outside the role's scope, giving Claude the reason", () => {
    const call = {
      tool_name: "Read",
      tool_input: { file_path: `${ROOT}/modules/parser/architecture/overview.md` },
      cwd: ROOT,
    };
    expect(hookAnswer(call, TASK, ROOT)).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "modules/parser/architecture/overview.md is outside what Coding may read for this task: Anarres keeps each role to its own inputs",
      },
    });
  });

  it.each([
    ["Write", { file_path: `${ROOT}/modules/parser/tests/lexer.test.ts`, content: "" }],
    [
      "Edit",
      { file_path: `${ROOT}/modules/parser/tests/lexer.test.ts`, old_string: "a", new_string: "b" },
    ],
  ])("judges a %s as a write: Coding may read tests but not change them", (tool, input) => {
    const answer = hookAnswer({ tool_name: tool, tool_input: input, cwd: ROOT }, TASK, ROOT);
    expect(answer).toMatchObject({ hookSpecificOutput: { permissionDecision: "deny" } });
  });

  it("judges a NotebookEdit as a write of its notebook: Coding may change one in its own place", () => {
    const call = {
      tool_name: "NotebookEdit",
      tool_input: { notebook_path: `${ROOT}/modules/parser/src/explore.ipynb`, new_source: "" },
      cwd: ROOT,
    };
    expect(hookAnswer(call, TASK, ROOT)).toBeUndefined();
  });

  it.each([
    ["Glob", { pattern: "**/*.md", path: "/home/alice" }],
    ["Grep", { pattern: "secret", path: "/home/alice/.config" }],
  ])("denies a %s searching outside the task's folder", (tool, input) => {
    const answer = hookAnswer({ tool_name: tool, tool_input: input, cwd: ROOT }, TASK, ROOT);
    expect(answer).toMatchObject({ hookSpecificOutput: { permissionDecision: "deny" } });
  });

  it("denies a tool it does not know, in a task's folder, until Anarres judges what it touches", () => {
    const call = {
      tool_name: "Rewrite",
      tool_input: { target: `${ROOT}/modules/parser/src/lexer.ts` },
      cwd: ROOT,
    };
    expect(hookAnswer(call, TASK, ROOT)).toMatchObject({
      hookSpecificOutput: {
        permissionDecision: "deny",
        permissionDecisionReason:
          "Anarres does not yet know what Rewrite touches, so it is not used in a task's folder",
      },
    });
  });

  it("lets a search of the task's folder go ahead: it holds only what the role may read", () => {
    const call = { tool_name: "Grep", tool_input: { pattern: "lexer" }, cwd: ROOT };
    expect(hookAnswer(call, TASK, ROOT)).toBeUndefined();
  });
});

describe("the hook in a continuation's folder (decision 0008)", () => {
  it("lets the session read its role's own place: the work it continues", () => {
    const continuing = { ...TASK, continuation: true as const };
    expect(scopeDecision(continuing, ROOT, `${ROOT}/modules/parser/src/lexer.ts`, "read")).toBe(
      "allowed",
    );
  });

  it("does not let it climb out of its own place", () => {
    const continuing = { ...TASK, continuation: true as const };
    expect(
      scopeDecision(continuing, ROOT, `${ROOT}/modules/parser/src/../../../secrets.env`, "read"),
    ).not.toBe("allowed");
  });

  it("reads a continuation from the folder's record", () => {
    expect(taskOfRecord('{"role":"coding","module":"parser","continuation":true}')).toEqual({
      ...TASK,
      continuation: true,
    });
  });
});

describe("the hook in a task's folder whose record cannot be read", () => {
  it("denies every file call: it fails closed, never open", () => {
    const call = {
      tool_name: "Read",
      tool_input: { file_path: `${ROOT}/modules/parser/specifications/lexing.md` },
      cwd: ROOT,
    };
    expect(hookAnswer(call, undefined, ROOT)).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "This task's record cannot be read, so its scope is unknown: prepare the task again",
      },
    });
  });
});

describe("the record prepare leaves in a task's folder, as the hook reads it", () => {
  it("gives the task's role and module", () => {
    expect(taskOfRecord('{"role":"coding","module":"parser"}')).toEqual(TASK);
  });

  it("is written as prepare writes it, and read back as the task it names", () => {
    const continuation = { role: "coding" as const, module: "parser", continuation: true as const };
    expect(taskOfRecord(taskRecord(continuation))).toEqual(continuation);
  });

  it("keeps that the task revises work whose inputs changed, so it reads that work (0015)", () => {
    const revision = { role: "test" as const, module: "parser", staleRevision: true as const };
    expect(taskOfRecord(taskRecord(revision))).toEqual(revision);
  });

  it("keeps that the task follows research, so it reads the module's research briefs", () => {
    const revision = { role: "coding" as const, module: "parser", afterResearch: true as const };
    expect(taskOfRecord(taskRecord(revision))).toEqual(revision);
  });

  it("keeps the contracts prepare fetched, so the session may read them (decision 0014)", () => {
    const task = { role: "architecture" as const, module: "parser", contracts: ["tokens"] };
    expect(taskOfRecord(taskRecord(task))).toEqual(task);
  });

  it.each([
    ["is not JSON", "role: coding"],
    ["names a role Anarres does not have", '{"role":"admin","module":"parser"}'],
    ["names a module that is not a plain name", '{"role":"coding","module":"../.."}'],
    [
      "names a contract that is not a plain name",
      '{"role":"architecture","module":"parser","contracts":["../.."]}',
    ],
    [
      "gives its contracts other than as a list of names",
      '{"role":"architecture","module":"parser","contracts":"tokens"}',
    ],
  ])("gives no task when it %s", (_what, text) => {
    expect(taskOfRecord(text)).toBeUndefined();
  });
});
