import { Then, When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

When("{word} asks for work", function (this: AnarresWorld, member: string) {
  return this.anarres.memberAsksForWork(member);
});

Then(
  "{word} is offered the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberIsOffered(member, { role, module });
  },
);

Then(
  "{word} is not offered the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberIsNotOffered(member, { role, module });
  },
);
