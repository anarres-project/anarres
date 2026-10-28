import { describe, expect, it } from "vitest";
import { readToolchain } from "../src/index.ts";

describe("a project's declared toolchain (anarres.yaml)", () => {
  it("is the image its tests run in and the command that runs them", () => {
    expect(readToolchain("toolchain:\n  image: node:24\n  test: npm test\n")).toEqual({
      image: "node:24",
      test: "npm test",
    });
  });
  it("is none when the file declares none", () => {
    expect(readToolchain("name: ledger\n")).toBeUndefined();
  });
  it("is none when its test command is not one line, as the checks workflow passes it on", () => {
    expect(
      readToolchain("toolchain:\n  image: node:24\n  test: |\n    npm ci\n    npm test\n"),
    ).toBeUndefined();
  });
  it("is none when its image or test command is not text", () => {
    expect(readToolchain("toolchain:\n  image: 24\n  test: npm test\n")).toBeUndefined();
    expect(readToolchain("toolchain:\n  image: node:24\n  test: [npm, test]\n")).toBeUndefined();
  });
  it("is none when the file is empty", () => {
    expect(readToolchain("")).toBeUndefined();
  });
  it("is none when the file cannot be read as YAML", () => {
    expect(readToolchain("toolchain: [unclosed\n")).toBeUndefined();
  });
});
