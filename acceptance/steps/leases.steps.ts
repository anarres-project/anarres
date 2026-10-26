import { Then, When } from "@cucumber/cucumber";
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

Then("{word} is told the lease on the task ran out", function (this: AnarresWorld, member: string) {
  return this.anarres.memberIsToldLeaseRanOut(member);
});

When(
  "the {role} task for {string} is shown as claimed by {word}, though Divlab never gave it to them",
  function (this: AnarresWorld, role: string, module: string, member: string) {
    return this.anarres.taskShownClaimedWithoutDivlab({ role, module }, member);
  },
);

Then(
  "a PDC coordinator is alerted that the {role} task for {string} was shown as claimed without a claim",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.coordinatorsAlertedOfClaimWithoutClaim({ role, module });
  },
);
