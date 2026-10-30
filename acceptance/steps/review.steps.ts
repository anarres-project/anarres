import { Given, Then, When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

Given(
  "PDC coordinators require a reviewer's approval for work on {string}",
  function (this: AnarresWorld, module: string) {
    return this.anarres.coordinatorsRequireReview(module);
  },
);

Given("{word} is a trusted member", function (this: AnarresWorld, member: string) {
  return this.anarres.memberIsTrusted(member, "trusted");
});

When(
  "{word} approves the member's {role} work on {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberApproves(member, { role, module });
  },
);

Then(
  "the member is told their work waits for a reviewer's approval",
  function (this: AnarresWorld) {
    return this.anarres.memberIsToldWhy("waits for a reviewer's approval");
  },
);
