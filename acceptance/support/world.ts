import {
  After,
  AfterAll,
  BeforeAll,
  type IWorldOptions,
  Status,
  setDefaultTimeout,
  setWorldConstructor,
  World,
} from "@cucumber/cucumber";
import type { Driver } from "../drivers/driver.ts";
import { InProcessDriver } from "../drivers/in-process/driver.ts";
import { SandboxDriver } from "../drivers/sandbox/driver.ts";
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
  // Generous: a step may wait out one of GitHub's rate limits.
  setDefaultTimeout(300_000);
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

// A run starts only if GitHub's allowance has room for it; then repositories an interrupted run
// left behind go.
BeforeAll(async () => {
  if (!sandbox) return;
  await SandboxDriver.checkAllowance();
  await SandboxDriver.sweep();
});

// A worker whose scenario failed keeps its repositories, so what Divlab did can be looked at.
let failed = false;
After(({ result }) => {
  if (result?.status === Status.FAILED) failed = true;
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
  // What the run cost, so its budget can be watched (the driver's requests; Divlab's runs act as
  // its App, which has an allowance of its own).
  console.log(SandboxDriver.requestsMade().join("\n"));
  await SandboxDriver.allowance();
});
