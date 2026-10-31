import { GitHubAdapter } from "@anarres/github";
import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  type IWorldOptions,
  Status,
  setDefaultTimeout,
  setParallelCanAssign,
  setWorldConstructor,
  World,
} from "@cucumber/cucumber";
import type { Driver } from "../drivers/driver.ts";
import { InProcessDriver } from "../drivers/in-process/driver.ts";
import { FakeGitHub } from "../drivers/in-process/fake-github.ts";
import {
  SANDBOX_UNREACHABLE,
  SYSTEM_CALLS,
  standingIn,
  unreached,
} from "../drivers/in-process/sandbox-coverage.ts";
import { SandboxDriver } from "../drivers/sandbox/driver.ts";
import { mayStart } from "../drivers/sandbox/governance-alone.ts";
import { runRepository } from "../drivers/sandbox/sweep.ts";
import { Aliases } from "../dsl/aliases.ts";
import { Anarres } from "../dsl/anarres.ts";

// ANARRES_DRIVER=sandbox runs the scenarios against a real repository in the GitHub sandbox.
const sandbox = process.env.ANARRES_DRIVER === "sandbox";
if (sandbox) {
  // Local runs keep the token in a git-ignored .env; CI provides it from the sandbox environment.
  try {
    process.loadEnvFile();
  } catch {}
  // Generous: a step may wait out one of GitHub's rate limits, or two Divlab runs (a claim, then
  // the work), each as long as the driver allows one.
  setDefaultTimeout(900_000);
}

// In the sandbox, a run's scenarios share one repository for each worker (creating one per
// scenario trips GitHub's rate limits); aliased module names keep them apart. Runs are told apart
// by time, and a run's parallel workers, each a process of its own, by their number.
const run = `${Date.now().toString(36)}${process.env.CUCUMBER_WORKER_ID ?? ""}`;
let scenarioCount = 0;

export class AnarresWorld extends World {
  readonly driver: Driver;
  readonly anarres: Anarres;

  constructor(options: IWorldOptions) {
    super(options);
    scenarioCount += 1;
    const aliases = new Aliases(`s${scenarioCount}`);
    this.driver = sandbox ? new SandboxDriver() : new InProcessDriver();
    const project = sandbox ? runRepository(run) : aliases.of("ledger");
    this.anarres = new Anarres(this.driver, aliases, project);
  }
}

setWorldConstructor(AnarresWorld);

// In the sandbox, trust levels and linked accounts belong to accounts that every worker's
// scenarios share: a scenario that sets them runs alone.
setParallelCanAssign(mayStart);

// Repositories an interrupted run left behind go first.
BeforeAll(async () => {
  if (!sandbox) return;
  await SandboxDriver.sweep();
});

// Each scenario starts only if GitHub's allowance, and Divlab's App's, has room for it, however
// many the run has.
Before(async () => {
  if (!sandbox) return;
  await SandboxDriver.checkAllowance();
});

// A worker whose scenario failed keeps its repositories, so what Divlab did can be looked at.
// A scenario that set trust levels in the sandbox puts its governance file back, pass or fail,
// and the member's machine is cleared.
let failed = false;
After(async function (this: AnarresWorld, { pickle, result }) {
  if (result?.status === Status.FAILED) {
    failed = true;
    // Said at once, so a run its job's time limit cuts short still says what failed.
    if (sandbox) {
      const why = result.message?.split("\n").find((line) => line.trim() !== "") ?? "";
      console.log(`Failed: ${pickle.name} (${pickle.uri}): ${why}`);
    }
  }
  if (this.driver instanceof SandboxDriver) {
    await this.driver.restoreGovernance();
    this.driver.clearMachine();
  }
});

// ANARRES_SANDBOX_KEEP=1, or a failed scenario, leaves the run's repositories in the sandbox to
// inspect, until a run an hour or more later sweeps them.
AfterAll(async () => {
  if (!sandbox) return;
  if (failed || process.env.ANARRES_SANDBOX_KEEP === "1") {
    console.log(`Kept for inspection: ${runRepository(run)} (swept after an hour)`);
  } else {
    await SandboxDriver.disposeRun();
  }
  // What the run cost, so its budget can be watched: the driver's requests, and the allowance
  // (Divlab's runs say what they cost their App's).
  console.log(SandboxDriver.requestsMade().join("\n"));
  await SandboxDriver.allowance();
});

// ANARRES_SANDBOX_COVERAGE=1 runs the @sandbox scenarios in-process to check they reach every
// path to GitHub the fake stands in for (decision 0018).
AfterAll(() => {
  if (process.env.ANARRES_SANDBOX_COVERAGE !== "1") return;
  const missed = unreached(
    standingIn(GitHubAdapter, FakeGitHub),
    SYSTEM_CALLS,
    SANDBOX_UNREACHABLE,
  );
  if (missed.length > 0) {
    throw new Error(
      `No @sandbox scenario reaches these GitHub adapter methods: ${missed.join(", ")}. Tag a scenario that does @sandbox, or add the method to SANDBOX_UNREACHABLE with its reason.`,
    );
  }
});
