/**
 * Judges the `@wip` scenarios. Each must fail honestly, in one of three ways:
 *
 * - NotYetImplemented: the system can't do it yet (raised at the driver);
 * - HarnessNotYetBuilt: the harness can't arrange or observe it yet;
 * - not yet right: the system answers, but an assertion in a Then step fails.
 *
 * A `@wip` scenario that passes has been built and must lose its tag; one that fails any other
 * way (an error in a Given or When, an undefined step) is a defect hiding behind the tag.
 * Run with `npm run test:wip`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

const REPORT = "reports/wip.ndjson";

rmSync(REPORT, { force: true });
spawnSync("npx", ["cucumber-js", "--profile", "wip"], {
  stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, NODE_OPTIONS: "--import tsx" },
});

type Exception = { type: string; message?: string };
type StepResult = { status: string; exception?: Exception; message?: string };
type PickleStep = { id: string; text: string; type?: string };
type Failure = { result: StepResult; step: PickleStep | undefined };

const pickleNames = new Map<string, string>();
const pickleSteps = new Map<string, PickleStep>();
const pickleOfTestCase = new Map<string, string>();
const pickleStepOfTestStep = new Map<string, string>();
const testCaseOfAttempt = new Map<string, string>();
const outcome = new Map<string, Failure>();

for (const line of readFileSync(REPORT, "utf8").split("\n")) {
  if (!line) continue;
  const message = JSON.parse(line);
  if (message.pickle) {
    pickleNames.set(message.pickle.id, `${message.pickle.uri}: ${message.pickle.name}`);
    for (const step of message.pickle.steps) pickleSteps.set(step.id, step);
  } else if (message.testCase) {
    pickleOfTestCase.set(message.testCase.id, message.testCase.pickleId);
    for (const step of message.testCase.testSteps) {
      if (step.pickleStepId) pickleStepOfTestStep.set(step.id, step.pickleStepId);
    }
  } else if (message.testCaseStarted) {
    testCaseOfAttempt.set(message.testCaseStarted.id, message.testCaseStarted.testCaseId);
  } else if (message.testStepFinished) {
    const { testCaseStartedId, testStepId, testStepResult } = message.testStepFinished;
    const previous = outcome.get(testCaseStartedId);
    if (!previous || previous.result.status === "PASSED") {
      const step = pickleSteps.get(pickleStepOfTestStep.get(testStepId) ?? "");
      outcome.set(testCaseStartedId, { result: testStepResult, step });
    }
  }
}

const counts = { notYetImplemented: 0, harnessNotYetBuilt: 0, notYetRight: 0 };
const problems: string[] = [];

for (const [attempt, { result, step }] of outcome) {
  const name = pickleNames.get(pickleOfTestCase.get(testCaseOfAttempt.get(attempt) ?? "") ?? "");
  const failed = result.status === "FAILED";
  const type = result.exception?.type;
  if (result.status === "PASSED") {
    problems.push(`${name}\n    passes: it has been built, so remove its @wip tag`);
  } else if (failed && type === "NotYetImplemented") {
    counts.notYetImplemented += 1;
  } else if (failed && type === "HarnessNotYetBuilt") {
    counts.harnessNotYetBuilt += 1;
  } else if (failed && type === "AssertionError" && step?.type === "Outcome") {
    counts.notYetRight += 1;
  } else {
    const why = result.exception
      ? `${result.exception.type}: ${result.exception.message}`
      : `${result.status} ${result.message ?? ""}`;
    problems.push(`${name}\n    at "${step?.text}"\n    fails dishonestly: ${why.trim()}`);
  }
}

console.log(
  `@wip: ${outcome.size} scenario(s); ${counts.notYetImplemented} not yet implemented, ` +
    `${counts.harnessNotYetBuilt} harness not yet built, ${counts.notYetRight} not yet right, ` +
    `${problems.length} problem(s)`,
);
for (const problem of problems) console.error(`  ✗ ${problem}`);
process.exit(problems.length === 0 ? 0 : 1);
