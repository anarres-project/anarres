import { When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

When("{int} hours pass without activity on the task", function (this: AnarresWorld, hours: number) {
  return this.anarres.timePasses(hours);
});

When("Divlab checks the project's leases", function (this: AnarresWorld) {
  return this.anarres.divlabChecksLeases();
});
