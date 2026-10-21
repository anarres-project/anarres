import { defineParameterType, Given, Then, When } from "@cucumber/cucumber";
import type { AnarresWorld } from "../support/world.ts";

defineParameterType({ name: "role", regexp: /[A-Z][a-z]+(?:(?: &)? [A-Z][a-z]+)*/ });
defineParameterType({ name: "verdict", regexp: /pass|conditional pass|fail|blocked/ });
defineParameterType({
  name: "impediment",
  regexp:
    /(?:an? )?(upstream ambiguity|architecture impediment|interface impediment|implementation impediment|knowledge gap|scope gap|test failures)/,
  transformer: (impediment: string) => impediment,
});

Given("a project with a module {string}", function (this: AnarresWorld, module: string) {
  return this.anarres.projectWithModules(module);
});

Given(
  "a project with modules {string} and {string}",
  function (this: AnarresWorld, first: string, second: string) {
    return this.anarres.projectWithModules(first, second);
  },
);

When(
  "a member's {role} work on {string} is accepted with a {verdict} verdict",
  function (this: AnarresWorld, role: string, module: string, verdict: string) {
    return this.anarres.memberHasWorkAccepted({ role, module, verdict });
  },
);

Given(
  "a member's {role} work on {string} was accepted with a {verdict} verdict",
  function (this: AnarresWorld, role: string, module: string, verdict: string) {
    return this.anarres.memberHasWorkAccepted({ role, module, verdict });
  },
);

When(
  "a member submits {role} work on {string} with a {verdict} verdict",
  function (this: AnarresWorld, role: string, module: string, verdict: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict });
  },
);

When(
  "a member submits {role} work on {string} without a feedback signal",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({
      role,
      module,
      verdict: "pass",
      withoutFeedbackSignal: true,
    });
  },
);

When(
  "a member submits {role} work on {string} whose feedback signal names its module in more than a plain name",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", moduleNotPlain: true });
  },
);

Then(
  "the member is told their feedback signal must use plain names",
  function (this: AnarresWorld) {
    return this.anarres.memberIsToldWhy("is not a plain name");
  },
);

Then(
  "Divlab has not merged the member's {role} work on {string}",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabHasNotMerged({ role, module });
  },
);

Then("the member is told their work has no feedback signal", function (this: AnarresWorld) {
  return this.anarres.memberIsToldWhy("has no feedback signal");
});

Then(
  "Divlab has merged the member's {role} work on {string}",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabHasMerged({ role, module });
  },
);

Given(
  "a member's {role} work on {string} has been sent back for {impediment} {int} times",
  function (this: AnarresWorld, role: string, module: string, impediment: string, times: number) {
    return this.anarres.memberHasWorkSentBack({ role, module, impediment }, times);
  },
);

Given(
  "a member's {role} work on {string} was accepted with a {verdict} verdict, reporting {impediment}",
  function (this: AnarresWorld, role: string, module: string, verdict: string, impediment: string) {
    return this.anarres.memberHasWorkAccepted({ role, module, verdict, impediments: [impediment] });
  },
);

When(
  "a member's {role} work on {string} is accepted with a {verdict} verdict, reporting {impediment}",
  function (this: AnarresWorld, role: string, module: string, verdict: string, impediment: string) {
    return this.anarres.memberHasWorkAccepted({ role, module, verdict, impediments: [impediment] });
  },
);

When(
  "a member's {role} work on {string} is accepted with a {verdict} verdict, reporting {impediment} and {impediment}",
  function (
    this: AnarresWorld,
    role: string,
    module: string,
    verdict: string,
    first: string,
    second: string,
  ) {
    return this.anarres.memberHasWorkAccepted({
      role,
      module,
      verdict,
      impediments: [first, second],
    });
  },
);

Then(
  "the only task ready for {string} is a(n) {role} task",
  function (this: AnarresWorld, module: string, role: string) {
    return this.anarres.divlabHasPostedOnlyReadyTask({ role, module });
  },
);

Then(
  "a {role} task for {string} is ready to claim",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabHasPostedReadyTask({ role, module });
  },
);

Then(
  "the {role} task for {string} carries the feedback signal from the {role} work",
  function (this: AnarresWorld, role: string, module: string, fromRole: string) {
    return this.anarres.taskCarriesFeedbackFrom({ role, module }, fromRole);
  },
);

Then(
  "the {role} task for {string} carries no feedback signal",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.taskCarriesNoFeedback({ role, module });
  },
);

Then("the module {string} is done", function (this: AnarresWorld, module: string) {
  return this.anarres.moduleIsDone(module);
});

Then("the module {string} is not done", function (this: AnarresWorld, module: string) {
  return this.anarres.moduleIsNotDone(module);
});

Then(
  "Divlab records that the {role} work on {string} went to {role} because it passed",
  function (this: AnarresWorld, role: string, module: string, to: string) {
    return this.anarres.divlabRecorded({ role, module }, { tasksFor: [to] }, { rule: "passed" });
  },
);

Then(
  "Divlab records that the {role} work on {string} went to {role} because it reported {impediment}",
  function (this: AnarresWorld, role: string, module: string, to: string, impediment: string) {
    return this.anarres.divlabRecorded(
      { role, module },
      { tasksFor: [to] },
      { rule: "reported", impediment },
    );
  },
);

Then(
  "Divlab records that the {role} work on {string} went to a PDC coordinator because no rule covers it",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabRecorded(
      { role, module },
      { alert: true },
      { rule: "no_matching_rule" },
    );
  },
);

Then(
  "Divlab records that the {role} work on {string} went to a PDC coordinator because {role} was re-run more than three times",
  function (this: AnarresWorld, role: string, module: string, rerun: string) {
    return this.anarres.divlabRecorded(
      { role, module },
      { alert: true },
      { rule: "re_run_limit", role: rerun },
      { latest: true },
    );
  },
);

Then(
  "Divlab records that the {role} work on {string} completed the module",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabRecorded(
      { role, module },
      { moduleDone: true },
      { rule: "pipeline_complete" },
    );
  },
);

Then(
  "Divlab's record of the {role} work on {string} keeps its feedback signal, its verdict and both problems it reported",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabRecordKeepsWork(
      { role, module },
      { verdict: "fail", impediments: ["test failures", "architecture impediment"] },
    );
  },
);

Then(
  "a PDC coordinator is alerted that no rule covers the {role} work on {string}, which failed reporting {impediment}",
  function (this: AnarresWorld, role: string, module: string, impediment: string) {
    return this.anarres.pdcCoordinatorIsAlertedThatNoRuleCovers(
      { role, module },
      { verdict: "fail", impediments: [impediment] },
    );
  },
);

Then(
  "a PDC coordinator is alerted that {role} has been re-run more than three times on {string}",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.pdcCoordinatorIsAlertedThatRoleIsStuck(role, module);
  },
);

Then("a PDC coordinator is alerted", function (this: AnarresWorld) {
  return this.anarres.pdcCoordinatorIsAlerted();
});

Then("no task is ready for {string}", function (this: AnarresWorld, module: string) {
  return this.anarres.noTaskIsReady(module);
});

Then(
  "the {role} task for {string} is no longer ready to claim",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.taskIsNoLongerReady({ role, module });
  },
);

When(
  "someone other than Divlab changes the project's main branch directly",
  function (this: AnarresWorld) {
    return this.anarres.someoneChangesMainDirectly();
  },
);

Then("the change is refused", function (this: AnarresWorld) {
  return this.anarres.theChangeIsRefused();
});

Given(
  "a project with a module {string} whose main branch was left unprotected",
  function (this: AnarresWorld, module: string) {
    return this.anarres.projectLeftUnprotected(module);
  },
);

When(
  "a member's {role} work on {string} reaches main without Divlab merging it",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.workReachesMainWithoutDivlab({ role, module, verdict: "pass" });
  },
);

Then(
  "a PDC coordinator is alerted that the {role} work on {string} reached main without Divlab merging it",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.coordinatorsAlertedOfUnmergedWork({ role, module });
  },
);

Given(
  "Divlab was interrupted just after merging a member's {role} work on {string}",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabInterruptedAfterMerging({ role, module, verdict: "pass" });
  },
);

When("Divlab next acts on the project", function (this: AnarresWorld) {
  return this.anarres.divlabActsAgain();
});

Then(
  "no PDC coordinator is alerted that work reached main without Divlab merging it",
  function (this: AnarresWorld) {
    return this.anarres.noCoordinatorAlertedOfUnmergedWork();
  },
);

Then(
  "PDC coordinators have been alerted once that the project's main branch is not protected",
  function (this: AnarresWorld) {
    return this.anarres.coordinatorsAlertedOnceOfUnprotectedMain();
  },
);
