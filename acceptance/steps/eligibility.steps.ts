import { Given, Then, When } from "@cucumber/cucumber";
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

Given("{word} is an established member", function (this: AnarresWorld, member: string) {
  return this.anarres.memberIsTrusted(member, "established");
});

Then(
  "{word} is told a {role} task needs an established member",
  function (this: AnarresWorld, member: string, role: string) {
    return this.anarres.memberIsToldTaskNeedsMoreTrust(member, role, "established");
  },
);

Given(
  "a PDC coordinator has linked a second account to {word}",
  function (this: AnarresWorld, member: string) {
    return this.anarres.secondAccountIsLinked(member);
  },
);

When(
  "{word}'s second account claims the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberClaims(secondAccount(member), { role, module });
  },
);

Then(
  "{word}'s second account is told a member takes only one role in a module",
  function (this: AnarresWorld, member: string) {
    return this.anarres.memberIsToldOneRolePerModule(secondAccount(member));
  },
);

/** A member's second account, by the name the scenarios give it. */
const secondAccount = (member: string) => `${member}-second-account`;
