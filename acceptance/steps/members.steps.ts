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

When(
  "{word} submits {role} work on {string} through the plugin, with a {verdict} verdict",
  function (this: AnarresWorld, member: string, role: string, module: string, verdict: string) {
    return this.anarres.memberSubmitsThroughPlugin(member, { role, module, verdict });
  },
);

When("{word} asks for the status of their work", function (this: AnarresWorld, member: string) {
  return this.anarres.memberAsksForStatus(member);
});

Then(
  "{word} is shown that they hold the {role} task for {string}, with when its lease runs out",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberIsShownHeld(member, { role, module });
  },
);
