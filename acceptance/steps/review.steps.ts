import { Given, Then, When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

Given(
  "PDC coordinators require a reviewer's approval for work on {string}",
  function (this: AnarresWorld, module: string) {
    return this.anarres.coordinatorsRequireReview(module);
  },
);

Given(
  "the list of modules PDC coordinators require reviewed cannot be read",
  function (this: AnarresWorld) {
    return this.anarres.reviewListCannotBeRead();
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

When(
  "{word} asks for changes to the member's {role} work on {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberAsksForChanges(member, { role, module });
  },
);

Then(
  "the member is told their work waits for a reviewer's approval",
  function (this: AnarresWorld) {
    return this.anarres.memberIsToldWhy("waits for a reviewer's approval");
  },
);

Then(
  "PDC coordinators have been alerted once that the list of modules needing review cannot be read",
  function (this: AnarresWorld) {
    return this.anarres.coordinatorsAlertedOnceOfUnreadableReviewList();
  },
);
