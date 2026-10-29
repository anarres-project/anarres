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
  "a project with modules {string}, {string} and {string}",
  function (this: AnarresWorld, first: string, second: string, third: string) {
    return this.anarres.projectWithModules(first, second, third);
  },
);

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
  "members submit {role} work on {string}, {string} and {string} at once, each with a {verdict} verdict",
  function (
    this: AnarresWorld,
    role: string,
    first: string,
    second: string,
    third: string,
    verdict: string,
  ) {
    return this.anarres.membersSubmitWorkAtOnce(
      [first, second, third].map((module) => ({ role, module, verdict })),
    );
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

When(
  "a member submits {role} work on {string} whose feedback signal's file is named in more than a plain name",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({
      role,
      module,
      verdict: "pass",
      fileNameNotPlain: true,
    });
  },
);

When(
  "a member submits {role} work on {string} whose feedback signal gives no verdict",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", withoutVerdict: true });
  },
);

Then(
  "the member is told their feedback signal does not give its verdict",
  function (this: AnarresWorld) {
    return this.anarres.memberIsToldWhy("does not give its verdict");
  },
);

Then(
  "the member is told their feedback signal's file must have a plain name",
  function (this: AnarresWorld) {
    return this.anarres.memberIsToldWhy("file name is not a plain name");
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

When(
  "a member submits {role} work on {string} without saying which task it was for",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", withoutTask: true });
  },
);

When(
  "{word} submits {role} work on {string} with a {verdict} verdict",
  function (this: AnarresWorld, member: string, role: string, module: string, verdict: string) {
    return this.anarres.namedMemberSubmitsWork(member, { role, module, verdict });
  },
);

When(
  "{word} submits {role} work on {string} for its finished task, with a {verdict} verdict",
  function (this: AnarresWorld, member: string, role: string, module: string, verdict: string) {
    return this.anarres.namedMemberSubmitsWork(member, {
      role,
      module,
      verdict,
      forFinishedTask: true,
    });
  },
);

Then(
  "{word} is told only the member holding the task can submit its work",
  function (this: AnarresWorld, _member: string) {
    return this.anarres.memberIsToldWhy("only the member holding it can submit its work");
  },
);

Then("the member is told their work must say which task it was for", function (this: AnarresWorld) {
  return this.anarres.memberIsToldWhy("does not say which task the work was for");
});

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

Then("only Divlab may check members' pull requests to the project", function (this: AnarresWorld) {
  return this.anarres.onlyDivlabChecksPullRequests();
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

Given(
  "Divlab was interrupted just after recording its decision on a member's {role} work on {string}",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabInterruptedAfterRecording({ role, module, verdict: "pass" });
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

Then(
  "Divlab's record of the {role} work on {string} says when Divlab decided, in UTC",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.divlabRecordSaysWhenItDecided({ role, module });
  },
);

When(
  "a member submits {role} work on {string} that also changes the module's tests",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", changesTests: true });
  },
);

Then(
  "the member is told their work changes files outside what {role} may change",
  function (this: AnarresWorld, role: string) {
    return this.anarres.memberIsToldWhy(`changes files outside what ${role} may change`);
  },
);

Then(
  "a PDC coordinator is alerted that a change reached main without Divlab",
  function (this: AnarresWorld) {
    return this.anarres.coordinatorsAlertedOfChangeNotByDivlab();
  },
);

Then(
  "no PDC coordinator is alerted that a change reached main without Divlab",
  function (this: AnarresWorld) {
    return this.anarres.noCoordinatorAlertedOfChangeNotByDivlab();
  },
);

When(
  "a member hands over partial {role} work on {string}",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", partial: true });
  },
);

Then(
  "the only task ready for {string} is a(n) {role} task continuing the partial work",
  function (this: AnarresWorld, module: string, role: string) {
    return this.anarres.divlabHasPostedOnlyContinuation({ role, module });
  },
);

When(
  "a member submits {role} work on {string} whose tests fail",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", testsFail: true });
  },
);

Then("the member is told the project's tests failed on their work", function (this: AnarresWorld) {
  return this.anarres.memberIsToldWhy("project's tests failed on this work");
});

When(
  "a member submits {role} work on {string} whose tests are still running",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", testsRunning: true });
  },
);

Then("the member has been told nothing about their work yet", function (this: AnarresWorld) {
  return this.anarres.memberIsToldNothing();
});

When(
  "the project's tests pass on the member's {role} work on {string}",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.testsFinish({ role, module }, true);
  },
);

When(
  "a project with a module {string} is started without declaring its toolchain",
  function (this: AnarresWorld, module: string) {
    return this.anarres.projectWithoutToolchain(module);
  },
);

Then(
  "the project is not started, and whoever started it is told it declares no toolchain, so no task for {string} is ready",
  function (this: AnarresWorld, module: string) {
    return this.anarres.projectNotStartedForWantOfToolchain(module);
  },
);

When(
  "a member submits {role} work on {string} whose new tests pass before any code exists",
  function (this: AnarresWorld, role: string, module: string) {
    return this.anarres.memberSubmitsWork({ role, module, verdict: "pass", newTestsPass: true });
  },
);

Then(
  "the member is told their new tests must run and fail before the code exists",
  function (this: AnarresWorld) {
    return this.anarres.memberIsToldWhy("Each new test must run and fail before its code exists");
  },
);

Given("a project of its own with a module {string}", function (this: AnarresWorld, module: string) {
  return this.anarres.projectOfItsOwn(module);
});

Then(
  "Divlab's records show the project's test failing after the Test work, and passing after the Coding work",
  function (this: AnarresWorld) {
    return this.anarres.divlabRecordsTestCounts([
      { total: 1, passed: 0, failed: 1 },
      { total: 1, passed: 1, failed: 0 },
    ]);
  },
);

When(
  "{word} submits {role} work on {string}, naming the task for {string}, with a {verdict} verdict",
  function (
    this: AnarresWorld,
    member: string,
    role: string,
    module: string,
    forTaskOn: string,
    verdict: string,
  ) {
    return this.anarres.namedMemberSubmitsWork(member, { role, module, verdict, forTaskOn });
  },
);

Then(
  "{word} is told the work is not for the module and role its task is for",
  function (this: AnarresWorld, _member: string) {
    return this.anarres.memberIsToldWhy("is not for the module and role its task is for");
  },
);

Given("a new project is started", function (this: AnarresWorld) {
  return this.anarres.newProjectStarted();
});

Then(
  "the only task ready is a(n) {role} task for the programme",
  function (this: AnarresWorld, role: string) {
    return this.anarres.onlyTaskReadyForTheProgramme(role);
  },
);

Given(
  "a member's Programme Architect work for the programme was accepted, listing the modules {string} and {string}",
  function (this: AnarresWorld, first: string, second: string) {
    return this.anarres.memberHasWorkAccepted({
      role: "Programme Architect",
      module: "programme",
      verdict: "pass",
      modulesListed: [first, second],
    });
  },
);

Given(
  "a member's Programme Architect work for the programme was accepted, listing the modules {string}, {string} and {string}, with a contract {string} that {string} provides and {string} uses, and a contract {string} that {string} provides",
  function (
    this: AnarresWorld,
    first: string,
    second: string,
    third: string,
    used: string,
    provider: string,
    user: string,
    unused: string,
    otherProvider: string,
  ) {
    return this.anarres.memberHasWorkAccepted({
      role: "Programme Architect",
      module: "programme",
      verdict: "pass",
      modulesListed: [first, second, third],
      contracts: [
        { name: used, providedBy: provider, usedBy: [user] },
        { name: unused, providedBy: otherProvider, usedBy: [] },
      ],
    });
  },
);

Given(
  "the Programme Architect's work was revised since, so that {string} uses the contract {string} too",
  function (this: AnarresWorld, module: string, contract: string) {
    return this.anarres.programmeRevisedSoThatUses(module, contract);
  },
);

Given(
  "the Programme Architect's work was revised since, changing the requirement slice for {string}",
  function (this: AnarresWorld, module: string) {
    return this.anarres.programmeRevisedChangingSliceFor(module);
  },
);
