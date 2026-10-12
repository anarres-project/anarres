import { Given, Then, When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

Given("a project with a module {string}", function (this: AnarresWorld, module: string) {
  return this.anarres.projectWithModule(module);
});

When(
  "a member's {word} work on {string} is accepted with a {word} verdict",
  function (this: AnarresWorld, role: string, module: string, verdict: string) {
    return this.anarres.memberHasWorkAccepted({ role, module, verdict });
  },
);

Then(
  "a {word} task for {string} is ready to claim",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabHasPostedReadyTask({ role, module });
  },
);
