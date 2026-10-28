import { describe, expect, it } from "vitest";
import { readToolchain } from "../src/index.ts";

describe("a project's declared toolchain (anarres.yaml)", () => {
  it("is the image its tests run in, the command that runs them, and where it writes its report", () => {
    expect(
      readToolchain(
        "toolchain:\n  image: node:24\n  test: npm test\n  report: reports/junit.xml\n",
      ),
    ).toEqual({ image: "node:24", test: "npm test", report: "reports/junit.xml" });
  });
  it("is none when the file declares none", () => {
    expect(readToolchain("name: ledger\n")).toBeUndefined();
  });
  it("is none when its test command is not one line, as the checks workflow passes it on", () => {
    expect(
      readToolchain(
        "toolchain:\n  image: node:24\n  report: junit.xml\n  test: |\n    npm ci\n    npm test\n",
      ),
    ).toBeUndefined();
  });
  it("is none when its image or test command is not text", () => {
    expect(
      readToolchain("toolchain:\n  image: 24\n  test: npm test\n  report: junit.xml\n"),
    ).toBeUndefined();
    expect(
      readToolchain("toolchain:\n  image: node:24\n  test: [npm, test]\n  report: junit.xml\n"),
    ).toBeUndefined();
  });
  it("is none when the file is empty", () => {
    expect(readToolchain("")).toBeUndefined();
  });
  it("is none when the file cannot be read as YAML", () => {
    expect(readToolchain("toolchain: [unclosed\n")).toBeUndefined();
  });
  it("is none when it names no report as text: Test work's check reads the report", () => {
    expect(readToolchain("toolchain:\n  image: node:24\n  test: npm test\n")).toBeUndefined();
  });
});
