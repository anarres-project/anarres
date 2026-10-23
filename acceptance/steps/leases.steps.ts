import { When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

When("{int} hours pass without activity on the task", function (this: AnarresWorld, hours: number) {
  return this.anarres.timePasses(hours);
});

When("Divlab checks the project's leases", function (this: AnarresWorld) {
  return this.anarres.divlabChecksLeases();
});

When(
  "{word} submits draft {role} work on {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberSubmitsDraftWork(member, { role, module });
  },
);
