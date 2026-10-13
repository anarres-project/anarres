import {
  After,
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

// ANARRES_DRIVER=sandbox runs the scenarios against real repositories in the GitHub sandbox.
const sandbox = process.env.ANARRES_DRIVER === "sandbox";
if (sandbox) {
  // Local runs keep the token in a git-ignored .env; CI provides it from the sandbox environment.
  try {
    process.loadEnvFile();
  } catch {}
  setDefaultTimeout(120_000);
}

// Runs share the sandbox, so each run's names are unique too.
const run = sandbox ? `-${Date.now().toString(36)}` : "";
let scenarioCount = 0;

export class AnarresWorld extends World {
  readonly driver: Driver;
  readonly anarres: Anarres;

  constructor(options: IWorldOptions) {
    super(options);
    scenarioCount += 1;
    this.driver = sandbox ? new SandboxDriver() : new InProcessDriver();
    this.anarres = new Anarres(this.driver, new Aliases(`s${scenarioCount}${run}`));
  }
}

setWorldConstructor(AnarresWorld);

After(async function (this: AnarresWorld) {
  await this.driver.dispose?.();
});
