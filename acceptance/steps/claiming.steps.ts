import { Given, Then, When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

When(
  "{word} claims the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberClaims(member, { role, module });
  },
);

Then(
  "the {role} task for {string} is claimed by {word}",
  function (this: AnarresWorld, role: string, module: string, member: string) {
    return this.anarres.taskIsClaimedBy({ role, module }, member);
  },
);

Given(
  "{word} has claimed the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberClaims(member, { role, module });
  },
);

Then(
  "{word} is told the task has already been claimed",
  function (this: AnarresWorld, member: string) {
    return this.anarres.memberIsToldTaskIsTaken(member);
  },
);

When(
  "{word} and then {word} claim the {role} task for {string}, and Divlab hears of {word}'s claim first",
  function (
    this: AnarresWorld,
    first: string,
    second: string,
    role: string,
    module: string,
    heardFirst: string,
  ) {
    return this.anarres.membersClaimTogether([first, second], { role, module }, heardFirst);
  },
);
