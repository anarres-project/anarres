import { describe, expect, it } from "vitest";
import { readModules } from "../src/index.ts";

describe("the Programme Architect's modules.yaml (decision 0013)", () => {
  it("lists the project's modules by name", () => {
    expect(readModules("modules:\n  - name: parser\n  - name: lexer\n")).toEqual({
      modules: ["parser", "lexer"],
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
