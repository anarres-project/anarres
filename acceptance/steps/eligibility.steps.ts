import { Given, Then } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

Given(
  "{word}'s {role} work on {string} was accepted with a {verdict} verdict",
  function (this: AnarresWorld, member: string, role: string, module: string, verdict: string) {
    return this.anarres.memberHasWorkAccepted({ role, module, verdict }, member);
  },
);

Given(
  "{word}'s {role} work on {string} was accepted with a {verdict} verdict, reporting {impediment}",
  function (
    this: AnarresWorld,
    member: string,
    role: string,
    module: string,
    verdict: string,
    impediment: string,
  ) {
    return this.anarres.memberHasWorkAccepted(
      { role, module, verdict, impediments: [impediment] },
      member,
    );
  },
);

Then(
  "{word} is told a member takes only one role in a module",
  function (this: AnarresWorld, member: string) {
    return this.anarres.memberIsToldOneRolePerModule(member);
  },
);
