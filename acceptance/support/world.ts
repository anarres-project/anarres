import { type IWorldOptions, setWorldConstructor, World } from "@cucumber/cucumber";
import { InProcessDriver } from "../drivers/in-process/driver.ts";
import { Aliases } from "../dsl/aliases.ts";
import { Anarres } from "../dsl/anarres.ts";

let scenarioCount = 0;

export class AnarresWorld extends World {
  readonly anarres: Anarres;

  constructor(options: IWorldOptions) {
    super(options);
    scenarioCount += 1;
    this.anarres = new Anarres(new InProcessDriver(), new Aliases(`s${scenarioCount}`));
  }
}

setWorldConstructor(AnarresWorld);
