import sax from "sax";

/** How a test case in a project's test report ended (decision 0011). */
export type TestOutcome = "passed" | "failed" | "errored" | "skipped";

/**
 * The elements inside a test case that say how it ended, if not by passing. A map, so a name the
 * report chooses can never reach a property every object has.
 */
const ENDINGS = new Map<string, TestOutcome>([
  ["failure", "failed"],
  ["error", "errored"],
  ["skipped", "skipped"],
]);

/** The most of a report Divlab reads, in characters or bytes: far more than a module's tests need. */
export const TEST_REPORT_LIMIT = 2_000_000;

/** What Divlab says of a report over the limit. */
export const TEST_REPORT_TOO_LARGE = { unreadable: "the test report is larger than 2 MB" };

/** Characters no plain name holds: control characters, line breaks among them. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point.
const CONTROL = /[\u0000-\u001f\u007f]/;

/** A project's test report, as data: each test case by name, and how it ended. */
export type TestReport = { cases: { name: string; outcome: TestOutcome }[] };

/**
 * A JUnit XML report, read as data: it was written by running a member's code. Nothing in it is
 * fetched, expanded or run.
 */
export function readTestReport(xml: string): TestReport | { unreadable: string } {
  if (xml.length > TEST_REPORT_LIMIT) return TEST_REPORT_TOO_LARGE;
  const cases: TestReport["cases"] = [];
  const parser = sax.parser(true);
  let open = 0;
  let wellFormed = true;
  let declaresType = false;
  let nameless = false;
  parser.onerror = () => {
    wellFormed = false;
  };
  parser.ondoctype = () => {
    declaresType = true;
  };
  parser.onclosetag = () => {
    open -= 1;
  };
  parser.onopentag = ({ name, attributes }) => {
    open += 1;
    if (name === "testcase") {
      const { classname, name: test } = attributes;
      if (test === undefined) nameless = true;
      const named = classname === undefined ? test : `${classname} > ${test}`;
      cases.push({ name: String(named), outcome: "passed" });
    }
    const ended = ENDINGS.get(name);
    const current = cases.at(-1);
    if (ended && current) current.outcome = ended;
  };
  parser.write(xml).close();
  if (declaresType) {
    return { unreadable: "the test report declares a document type, which no test report needs" };
  }
  if (nameless) return { unreadable: "a test case in the test report has no name" };
  // Divlab writes the names into what it tells members: text, never anything a reader would act on.
  if (cases.some(({ name }) => CONTROL.test(name))) {
    return { unreadable: "a test case's name in the test report is not plain text" };
  }
  if (!wellFormed || open !== 0) return { unreadable: "the test report is not well-formed XML" };
  return { cases };
}
