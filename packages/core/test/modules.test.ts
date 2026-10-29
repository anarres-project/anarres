import { describe, expect, it } from "vitest";
import { contractsOfModule, contractsRevised, readModules } from "../src/index.ts";

describe("the Programme Architect's modules.yaml (decision 0013)", () => {
  it("lists the project's modules by name", () => {
    expect(readModules("modules:\n  - name: parser\n  - name: lexer\n")).toEqual({
      modules: ["parser", "lexer"],
      contracts: [],
    });
  });
  it("is unreadable when it names a module in more than a plain name", () => {
    expect(readModules("modules:\n  - name: parser [see](https://example.test)\n")).toEqual({
      unreadable: "modules.yaml names a module in more than a plain name",
    });
  });
  it("is unreadable when it lists no modules by name", () => {
    for (const text of ["", "modules: []\n", "modules: parser\n", "modules:\n  - parser\n"]) {
      expect(readModules(text)).toEqual({ unreadable: "modules.yaml lists no modules by name" });
    }
  });
  it("is unreadable when it cannot be read as YAML", () => {
    expect(readModules("modules: [unclosed\n")).toEqual({
      unreadable: "modules.yaml cannot be read as YAML",
    });
  });
  it("is unreadable when it lists a module twice", () => {
    expect(readModules("modules:\n  - name: parser\n  - name: parser\n")).toEqual({
      unreadable: "modules.yaml lists a module twice: parser",
    });
  });
  it("is unreadable when it names a module as the programme, whose name that is", () => {
    expect(readModules("modules:\n  - name: programme\n")).toEqual({
      unreadable: "modules.yaml names a module programme, the name of the whole programme",
    });
  });
});

describe("the contracts in modules.yaml (decision 0014)", () => {
  it("says which module provides each contract and which use it", () => {
    const text = [
      "modules:",
      "  - name: lexer",
      "    provides: [tokens]",
      "  - name: parser",
      "    uses: [tokens]",
      "",
    ].join("\n");
    expect(readModules(text)).toEqual({
      modules: ["lexer", "parser"],
      contracts: [{ name: "tokens", providedBy: "lexer", usedBy: ["parser"] }],
    });
  });
  it("is unreadable when a module uses a contract no module provides", () => {
    expect(readModules("modules:\n  - name: parser\n    uses: [tokens]\n")).toEqual({
      unreadable: "modules.yaml has a module use a contract no module provides: tokens",
    });
  });
  it("is unreadable when two modules provide one contract", () => {
    const text = [
      "modules:",
      "  - name: lexer",
      "    provides: [tokens]",
      "  - name: parser",
      "    provides: [tokens]",
      "",
    ].join("\n");
    expect(readModules(text)).toEqual({
      unreadable: "modules.yaml has more than one module provide a contract: tokens",
    });
  });
  it("is unreadable when a module uses a contract it provides", () => {
    const text = "modules:\n  - name: lexer\n    provides: [tokens]\n    uses: [tokens]\n";
    expect(readModules(text)).toEqual({
      unreadable: "modules.yaml has a module use a contract it provides: tokens",
    });
  });
  it("is unreadable when it names a contract in more than a plain name", () => {
    for (const text of [
      'modules:\n  - name: lexer\n    provides: ["tokens [see](https://example.test)"]\n',
      'modules:\n  - name: lexer\n    uses: ["../tokens"]\n',
    ]) {
      expect(readModules(text)).toEqual({
        unreadable: "modules.yaml names a contract in more than a plain name",
      });
    }
  });
  it("is unreadable when it gives a module's contracts other than as a list of names", () => {
    for (const text of [
      "modules:\n  - name: lexer\n    provides: tokens\n",
      "modules:\n  - name: lexer\n    uses: {tokens: true}\n",
      "modules:\n  - name: lexer\n    provides: [[tokens]]\n",
    ]) {
      expect(readModules(text)).toEqual({
        unreadable: "modules.yaml gives a module's contracts other than as a list of names",
      });
    }
  });
});

describe("a module's contracts (decision 0014)", () => {
  it("are those it provides and those it uses", () => {
    const contracts = [
      { name: "tokens", providedBy: "lexer", usedBy: ["parser"] },
      { name: "syntax-tree", providedBy: "parser", usedBy: [] },
      { name: "entries", providedBy: "ledger", usedBy: [] },
    ];
    expect(contractsOfModule(contracts, "parser")).toEqual(["tokens", "syntax-tree"]);
  });
});

describe("a module's contracts revised since a commit (decision 0015)", () => {
  it("are those it provides or uses with a file changed in their folder", () => {
    const contracts = [
      { name: "tokens", providedBy: "lexer", usedBy: ["parser"] },
      { name: "syntax-tree", providedBy: "parser", usedBy: [] },
      { name: "entries", providedBy: "ledger", usedBy: [] },
    ];
    const changed = ["programme/contracts/tokens/contract.md", "programme/contracts/entries/a.md"];
    expect(contractsRevised(contracts, "parser", changed)).toEqual(["tokens"]);
  });
});
