import { describe, expect, it } from "vitest";
import { readTestReport, testCounts } from "../src/index.ts";

/** A JUnit XML report, as a project's test framework writes it. */
const report = (cases: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites><testsuite name="parser">${cases}</testsuite></testsuites>\n`;

/** The test cases of a report that must be readable. */
function casesOf(xml: string) {
  const read = readTestReport(xml);
  if ("unreadable" in read) throw new Error(read.unreadable);
  return read.cases;
}

describe("a project's test report (JUnit XML, decision 0011)", () => {
  it("names each test case by its class and name, and says it passed", () => {
    expect(readTestReport(report('<testcase classname="parser" name="reads a number"/>'))).toEqual({
      cases: [{ name: "parser > reads a number", outcome: "passed" }],
    });
  });
  it("says a test case with a failure failed: an assertion did not hold", () => {
    const failed =
      '<testcase classname="parser" name="reads a number"><failure message="expected 1"/></testcase>';
    expect(casesOf(report(failed))).toEqual([
      { name: "parser > reads a number", outcome: "failed" },
    ]);
  });
  it("says a test case with an error errored: it could not run", () => {
    const errored =
      '<testcase classname="parser" name="reads a number"><error message="no such module"/></testcase>';
    expect(casesOf(report(errored))).toEqual([
      { name: "parser > reads a number", outcome: "errored" },
    ]);
  });
  it("says a skipped test case was skipped: it did not run", () => {
    const skipped = '<testcase classname="parser" name="reads a number"><skipped/></testcase>';
    expect(casesOf(report(skipped))).toEqual([
      { name: "parser > reads a number", outcome: "skipped" },
    ]);
  });
  it("reads only the elements JUnit gives: one named like a built-in property changes nothing", () => {
    const odd =
      '<testcase classname="parser" name="reads a number"><constructor/><toString/></testcase>';
    expect(casesOf(report(odd))).toEqual([{ name: "parser > reads a number", outcome: "passed" }]);
  });
  it("is unreadable when it is not well-formed XML", () => {
    expect(readTestReport("<testsuites><testcase name='reads a number'>")).toEqual({
      unreadable: "the test report is not well-formed XML",
    });
  });
  it("is unreadable when it declares a document type, which no test report needs", () => {
    const declaring =
      '<?xml version="1.0"?>\n<!DOCTYPE testsuites [<!ENTITY a "aaaa">]>\n<testsuites><testcase classname="parser" name="reads a number"/></testsuites>';
    expect(readTestReport(declaring)).toEqual({
      unreadable: "the test report declares a document type, which no test report needs",
    });
  });
  it("is unreadable when it is larger than any module's report needs to be", () => {
    const huge = report(`<!-- ${"x".repeat(2_000_000)} -->`);
    expect(readTestReport(huge)).toEqual({
      unreadable: "the test report is larger than 2 MB",
    });
  });
  it("names a test case by its name alone when its framework gives no class", () => {
    expect(casesOf(report('<testcase name="reads a number"/>'))).toEqual([
      { name: "reads a number", outcome: "passed" },
    ]);
  });
  it("is unreadable when a test case has no name, as it could be compared with nothing", () => {
    expect(readTestReport(report('<testcase classname="parser"/>'))).toEqual({
      unreadable: "a test case in the test report has no name",
    });
  });
  it("is unreadable when a test case's name holds a control character, such as a line break", () => {
    expect(
      readTestReport(report('<testcase classname="parser" name="reads&#10;a number"/>')),
    ).toEqual({
      unreadable: "a test case's name in the test report is not plain text",
    });
  });
});

describe("the test counts a report gives the state vector (decision 0012)", () => {
  it("counts the tests, those passing and those failing", () => {
    const cases = [
      { name: "a", outcome: "passed" as const },
      { name: "b", outcome: "failed" as const },
      { name: "c", outcome: "failed" as const },
    ];
    expect(testCounts({ cases })).toEqual({ total: 3, passed: 1, failed: 2 });
  });
  it("counts an errored test as failing and leaves out a skipped one, which did not run", () => {
    const cases = [
      { name: "a", outcome: "passed" as const },
      { name: "b", outcome: "errored" as const },
      { name: "c", outcome: "skipped" as const },
    ];
    expect(testCounts({ cases })).toEqual({ total: 2, passed: 1, failed: 1 });
  });
});
