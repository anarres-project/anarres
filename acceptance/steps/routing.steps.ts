import { defineParameterType, Given, Then, When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

defineParameterType({ name: "role", regexp: /[A-Z][a-z]+(?: & [A-Z][a-z]+)?/ });
defineParameterType({ name: "verdict", regexp: /pass|conditional pass|fail|blocked/ });

Given("a project with a module {string}", function (this: AnarresWorld, module: string) {
  return this.anarres.projectWithModule(module);
});

When(
  "a member's {role} work on {string} is accepted with a {verdict} verdict",
  function (this: AnarresWorld, role: string, module: string, verdict: string) {
    return this.anarres.memberHasWorkAccepted({ role, module, verdict });
  },
);

Then(
  "a {role} task for {string} is ready to claim",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabHasPostedReadyTask({ role, module });
  },
);
