import { type DataTable, Given, Then, When } from "@cucumber/cucumber";
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

Then(
  "{word} is shown that their {role} work on {string} is a draft",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberIsShownDraft(member, { role, module });
  },
);

Given(
  "{word} has prepared the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberPrepares(member, { role, module });
  },
);

When(
  "{word} resumes the {role} task for {string} in a new session",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberResumes(member, { role, module });
  },
);

Then(
  "{word} is told where their work on the {role} task for {string} is",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberIsToldWhereWorkIs(member, { role, module });
  },
);

Then(
  "{word} is told they no longer hold the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberIsToldNoLongerHeld(member, { role, module });
  },
);

Then(
  "{word} is shown their {role} work on {string} among their merged work",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberIsShownMerged(member, { role, module });
  },
);

When(
  "{word} prepares the {role} task for {string} on another machine",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberPrepares(member, { role, module });
  },
);

Then(
  "{word}'s work so far on the {role} task for {string} is back in its folder",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberHasWorkSoFarBack(member, { role, module });
  },
);

When(
  "{word} prepares the {role} task for {string}",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberPrepares(member, { role, module });
  },
);

Then(
  "{word} has the contract {string} to read, and not the contract {string}",
  function (this: AnarresWorld, member: string, contract: string, notContract: string) {
    return this.anarres.memberHasContracts(member, [contract], [notContract]);
  },
);

Then(
  "{word} has the architecture and the specification of {string} to read, and nothing of {string}",
  function (this: AnarresWorld, member: string, module: string, otherModule: string) {
    return this.anarres.memberHasWorkOf(
      member,
      module,
      ["architecture", "specification"],
      otherModule,
    );
  },
);

Then(
  "{word} has the tests of {string} to read",
  function (this: AnarresWorld, member: string, module: string) {
    return this.anarres.memberHasWorkOf(member, module, ["tests"]);
  },
);

Then(
  "{word} has the research brief of {string} to read",
  function (this: AnarresWorld, member: string, module: string) {
    return this.anarres.memberHasWorkOf(member, module, ["research brief"]);
  },
);

Then(
  "{word} is offered these tasks, in this order:",
  function (this: AnarresWorld, member: string, tasks: DataTable) {
    return this.anarres.memberIsOfferedInOrder(
      member,
      tasks.hashes().map((row) => ({ role: row.role ?? "", module: row.module ?? "" })),
    );
  },
);

Then(
  "{word} has the knowledge gap the {role} work on {string} reported to read, and none of the module's work",
  function (this: AnarresWorld, member: string, role: string, module: string) {
    return this.anarres.memberHasKnowledgeGapToRead(member, { role, module });
  },
);
