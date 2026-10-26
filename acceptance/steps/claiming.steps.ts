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
    return this.anarres.memberHasClaimed(member, { role, module });
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

Then(
  "Divlab's record shows {word} claimed the {role} task for {string}, saying when, in UTC",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.divlabRecordedClaim(member, { role, module });
  },
);

When(
  "{word} releases the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberReleases(member, { role, module });
  },
);

Then(
  "{word} is told only the member holding the task can give it back",
  function (this: AnarresWorld, member: string) {
    return this.anarres.memberIsToldTheyDoNotHoldTask(member);
  },
);

When(
  "{word} claims the finished {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberClaimsFinished(member, { role, module });
  },
);

Then(
  "{word} is told it is not a task anyone can claim",
  function (this: AnarresWorld, member: string) {
    return this.anarres.memberIsToldNotATask(member);
  },
);

When(
  "{word} claims the PDC coordinators' alert about {string}",
  function (this: AnarresWorld, member: string, module: string) {
    return this.anarres.memberClaimsAlert(member, module);
  },
);

Given("{word} has opened an issue in the project", function (this: AnarresWorld, member: string) {
  return this.anarres.memberOpensIssue(member);
});

When("{word} claims {word}'s issue", function (this: AnarresWorld, member: string, owner: string) {
  return this.anarres.memberClaimsIssueOf(member, owner);
});
