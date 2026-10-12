/**
 * Judges the `@wip` scenarios. Each must fail honestly: with NotYetImplemented (the system can't
 * do it yet) or HarnessNotYetBuilt (the harness can't arrange or observe it yet). A `@wip`
 * scenario that passes has been built and must lose its tag; one that fails any other way is a
 * defect hiding behind the tag. Run with `npm run test:wip`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

const HONEST = ["NotYetImplemented", "HarnessNotYetBuilt"] as const;
const REPORT = "reports/wip.ndjson";

rmSync(REPORT, { force: true });
spawnSync("npx", ["cucumber-js", "--profile", "wip"], {
  stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, NODE_OPTIONS: "--import tsx" },
});

type Exception = { type: string; message?: string };
type StepResult = { status: string; exception?: Exception; message?: string };

const pickleNames = new Map<string, string>();
const pickleOfTestCase = new Map<string, string>();
const testCaseOfAttempt = new Map<string, string>();
const outcome = new Map<string, StepResult>();

for (const line of readFileSync(REPORT, "utf8").split("\n")) {
  if (!line) continue;
  const message = JSON.parse(line);
  if (message.pickle) {
    pickleNames.set(message.pickle.id, `${message.pickle.uri}: ${message.pickle.name}`);
  } else if (message.testCase) {
    pickleOfTestCase.set(message.testCase.id, message.testCase.pickleId);
  } else if (message.testCaseStarted) {
    testCaseOfAttempt.set(message.testCaseStarted.id, message.testCaseStarted.testCaseId);
  } else if (message.testStepFinished) {
    const { testCaseStartedId, testStepResult } = message.testStepFinished;
    const previous = outcome.get(testCaseStartedId);
    if (!previous || previous.status === "PASSED") outcome.set(testCaseStartedId, testStepResult);
  }
}

const counts = { NotYetImplemented: 0, HarnessNotYetBuilt: 0 };
const problems: string[] = [];

for (const [attempt, result] of outcome) {
  const name = pickleNames.get(pickleOfTestCase.get(testCaseOfAttempt.get(attempt) ?? "") ?? "");
  const type = result.exception?.type;
  if (result.status === "PASSED") {
    problems.push(`${name}\n    passes: it has been built, so remove its @wip tag`);
  } else if (result.status === "FAILED" && (type === HONEST[0] || type === HONEST[1])) {
    counts[type] += 1;
  } else {
    const why = result.exception
      ? `${result.exception.type}: ${result.exception.message}`
      : `${result.status} ${result.message ?? ""}`;
    problems.push(`${name}\n    fails dishonestly: ${why.trim()}`);
  }
}

console.log(
  `@wip: ${outcome.size} scenario(s); ${counts.NotYetImplemented} not yet implemented, ` +
    `${counts.HarnessNotYetBuilt} harness not yet built, ${problems.length} problem(s)`,
);
for (const problem of problems) console.error(`  ✗ ${problem}`);
process.exit(problems.length === 0 ? 0 : 1);
