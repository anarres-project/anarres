import {
  AfterAll,
  type IWorldOptions,
  setDefaultTimeout,
  setWorldConstructor,
  World,
} from "@cucumber/cucumber";
import type { Driver } from "../drivers/driver.ts";
import { InProcessDriver } from "../drivers/in-process/driver.ts";
import { SandboxDriver } from "../drivers/sandbox/driver.ts";
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

// In the sandbox, a run's scenarios share one repository (creating one per scenario trips
// GitHub's rate limits); aliased module names keep them apart. Runs are told apart by time.
const run = Date.now().toString(36);
let scenarioCount = 0;

export class AnarresWorld extends World {
  readonly driver: Driver;
  readonly anarres: Anarres;

  constructor(options: IWorldOptions) {
    super(options);
    scenarioCount += 1;
    const aliases = new Aliases(`s${scenarioCount}`);
    this.driver = sandbox ? new SandboxDriver() : new InProcessDriver();
    const project = sandbox ? `ledger-${run}` : aliases.of("ledger");
    this.anarres = new Anarres(this.driver, aliases, project);
  }
}

setWorldConstructor(AnarresWorld);

// ANARRES_SANDBOX_KEEP=1 leaves the run's repository in the sandbox to inspect; delete it after.
AfterAll(async () => {
  if (sandbox && process.env.ANARRES_SANDBOX_KEEP !== "1") await SandboxDriver.disposeRun();
});
