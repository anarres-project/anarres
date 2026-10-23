import assert from "node:assert/strict";
import type { CoordinatorAlert, Driver, RoutingRecord } from "../drivers/driver.ts";
import type { Aliases } from "./aliases.ts";

/** Whoever does the work a scenario does not name a member for: never one it names. */
const DEFAULT_MEMBER = "someone";

type Work = { role: string; module: string };

/**
 * What members, PDC coordinators and Divlab do and observe, in domain terms. Module names are
 * aliased ("parser" becomes "parser-s7"), so scenarios sharing a project never see each other's
 * tasks, alerts or records.
 */
export class Anarres {
  /** The feedback signal of each role's latest work on a module. */
  private readonly feedbackSignals = new Map<string, string>();
  private signalsWritten = 0;
  private readonly modules: string[] = [];

  constructor(
    private readonly driver: Driver,
    private readonly aliases: Aliases,
    private project: string,
  ) {}

  async projectWithModules(...modules: string[]): Promise<void> {
    this.modules.push(...modules.map((module) => this.aliases.of(module)));
    await this.driver.createProject(this.project, this.modules);
  }

  /** A project of its own, whose main branch was left unprotected: a misconfiguration. */
  async projectLeftUnprotected(module: string): Promise<void> {
    this.project = `${this.project}-unprotected`;
    this.modules.push(this.aliases.of(module));
    await this.driver.createProject(this.project, this.modules, { unprotected: true });
  }

  async workReachesMainWithoutDivlab(work: Work & { verdict: string }) {
    this.signalsWritten += 1;
    const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
    this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
    await this.driver.mergeDirectly({
      impediments: [],
      ...this.aliased(work),
      project: this.project,
      member: this.aliases.of(DEFAULT_MEMBER),
      feedbackSignal,
    });
  }

  async divlabInterruptedAfterMerging(work: Work & { verdict: string }) {
    this.signalsWritten += 1;
    const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
    this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
    await this.driver.interruptAfterMerging({
      impediments: [],
      ...this.aliased(work),
      project: this.project,
      member: this.aliases.of(DEFAULT_MEMBER),
      feedbackSignal,
    });
  }

  async divlabInterruptedAfterRecording(work: Work & { verdict: string }) {
    this.signalsWritten += 1;
    const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
    this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
    await this.driver.interruptAfterRecording({
      impediments: [],
      ...this.aliased(work),
      project: this.project,
      member: this.aliases.of(DEFAULT_MEMBER),
      feedbackSignal,
    });
  }

  async divlabActsAgain() {
    await this.driver.divlabActsAgain(this.project);
  }

  async onlyDivlabChecksPullRequests() {
    assert.deepEqual(
      await this.driver.pullRequestChecks(this.project),
      ["Divlab"],
      "expected the project to let Divlab, and nothing else, act on members' pull requests",
    );
  }

  async coordinatorsAlertedOnceOfUnprotectedMain() {
    assert.equal(
      await this.driver.unprotectedMainAlerts(this.project),
      1,
      "expected one alert that the project's main branch is not protected",
    );
  }

  async noCoordinatorAlertedOfUnmergedWork() {
    assert.deepEqual(
      await this.driver.unmergedWorkAlerts(this.project),
      [],
      "expected no alert that work reached main without Divlab",
    );
  }

  async coordinatorsAlertedOfUnmergedWork(work: Work) {
    const feedbackSignal = this.feedbackSignals.get(workOn(this.aliased(work)));
    assert.deepEqual(
      await this.driver.unmergedWorkAlerts(this.project),
      [feedbackSignal],
      `expected one alert that the ${work.role} work on ${work.module} reached main without Divlab`,
    );
  }

  async memberHasWorkAccepted(
    work: Work & { verdict: string; impediments?: string[] },
    member = DEFAULT_MEMBER,
  ) {
    // Every piece of work has a feedback signal of its own.
    this.signalsWritten += 1;
    const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
    this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
    await this.driver.acceptWork({
      impediments: [],
      ...this.aliased(work),
      project: this.project,
      member: this.member(member),
      feedbackSignal,
    });
  }

  /** Several members open pull requests together, before Divlab has decided on any of them. */
  async membersSubmitWorkAtOnce(works: (Work & { verdict: string })[]) {
    await this.driver.submitWorkAtOnce(
      works.map((work) => {
        this.signalsWritten += 1;
        const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
        this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
        return {
          impediments: [],
          ...this.aliased(work),
          project: this.project,
          member: this.aliases.of(DEFAULT_MEMBER),
          feedbackSignal,
        };
      }),
    );
  }

  /** The member opens a pull request with their work; Divlab decides whether to merge it. */
  async memberSubmitsWork(
    work: Work & {
      verdict: string;
      impediments?: string[];
      withoutFeedbackSignal?: boolean;
      moduleNotPlain?: boolean;
      fileNameNotPlain?: boolean;
    },
  ) {
    this.signalsWritten += 1;
    const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
    this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
    await this.driver.submitWork({
      impediments: [],
      ...this.aliased(work),
      project: this.project,
      member: this.aliases.of(DEFAULT_MEMBER),
      feedbackSignal,
    });
  }

  private directChangeTook: boolean | undefined;

  async someoneChangesMainDirectly() {
    this.directChangeTook = await this.driver.changeMainDirectly(this.project);
  }

  async theChangeIsRefused() {
    assert.equal(this.directChangeTook, false, "expected the change to main to be refused");
  }

  async divlabHasNotMerged(work: Work) {
    const feedbackSignal = this.feedbackSignals.get(workOn(this.aliased(work)));
    assert.ok(
      !(await this.driver.mergedWork(this.project)).includes(feedbackSignal ?? ""),
      `expected Divlab not to have merged the ${work.role} work on ${work.module}`,
    );
  }

  /** Divlab's message to the member says why, in words they would recognise. */
  async memberIsToldWhy(why: string) {
    const refusals = await this.driver.refusals(this.project);
    assert.ok(
      refusals.some((refusal) => refusal.includes(why)),
      `expected the member to be told their work ${why}; Divlab said: ${JSON.stringify(refusals)}`,
    );
  }

  async divlabHasMerged(work: Work) {
    const feedbackSignal = this.feedbackSignals.get(workOn(this.aliased(work)));
    assert.ok(
      (await this.driver.mergedWork(this.project)).includes(feedbackSignal ?? ""),
      `expected Divlab to have merged the ${work.role} work on ${work.module}`,
    );
  }

  async memberHasWorkSentBack(work: Work & { impediment: string }, times: number) {
    for (let i = 0; i < times; i++) {
      await this.memberHasWorkAccepted({
        role: work.role,
        module: work.module,
        verdict: "fail",
        impediments: [work.impediment],
      });
    }
  }

  async taskCarriesFeedbackFrom(task: Work, fromRole: string) {
    const expected = this.aliased(task);
    const feedbackSignal = this.feedbackSignals.get(workOn({ ...expected, role: fromRole }));
    assert.deepEqual(
      await this.readyTasks((t) => t.role === expected.role && t.module === expected.module),
      [{ ...expected, feedbackSignal }],
      `expected the ${task.role} task for ${task.module} to carry the ${fromRole} work's feedback signal`,
    );
  }

  async divlabHasPostedReadyTask(task: Work) {
    const expected = this.aliased(task);
    const ready = await this.readyTasks(
      (t) => t.role === expected.role && t.module === expected.module,
    );
    assert.deepEqual(
      ready.map(roleAndModule),
      [expected],
      `expected one ready ${task.role} task for ${task.module}`,
    );
  }

  async divlabHasPostedOnlyReadyTask(task: Work) {
    const expected = this.aliased(task);
    const ready = await this.readyTasks((t) => t.module === expected.module);
    assert.deepEqual(
      ready.map(roleAndModule),
      [expected],
      `expected the only ready task for ${task.module} to be a ${task.role} task`,
    );
  }

  async taskCarriesNoFeedback(task: Work) {
    const expected = this.aliased(task);
    assert.deepEqual(
      await this.readyTasks((t) => t.role === expected.role && t.module === expected.module),
      [expected],
      `expected the ${task.role} task for ${task.module} to carry no feedback signal`,
    );
  }

  /** A claim a scenario relies on: it must have taken, or the scenario proves nothing. */
  async memberHasClaimed(member: string, task: Work) {
    await this.memberClaims(member, task);
    await this.taskIsClaimedBy(task, member);
  }

  async memberClaims(member: string, task: Work) {
    await this.driver.claim({ ...this.aliased(task), project: this.project }, this.member(member));
  }

  /** The members claim in the order given; Divlab hears of `heardFirst`'s claim before the rest. */
  async membersClaimTogether(members: string[], task: Work, heardFirst: string) {
    await this.driver.claimTogether(
      { ...this.aliased(task), project: this.project },
      members.map((member) => this.member(member)),
      this.member(heardFirst),
    );
  }

  async divlabRecordedClaim(member: string, task: Work) {
    const expected = this.aliased(task);
    const records = (await this.driver.claimRecords(this.project)).filter(
      (record) => record.role === expected.role && record.module === expected.module,
    );
    assert.deepEqual(
      records.map(({ role, module, member }) => ({ role, module, member })),
      [{ ...expected, member: this.member(member) }],
      `expected one record of ${member}'s claim on the ${task.role} task for ${task.module}`,
    );
    assert.match(
      records[0]?.claimedAt ?? "no time recorded",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
      "expected the record to say when Divlab granted the claim, as a UTC time",
    );
  }

  /** The member opens their work as a draft: not finished, but under way. */
  async memberSubmitsDraftWork(member: string, work: Work) {
    this.signalsWritten += 1;
    const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
    this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
    await this.driver.submitDraftWork({
      impediments: [],
      verdict: "pass",
      ...this.aliased(work),
      project: this.project,
      member: this.member(member),
      feedbackSignal,
    });
  }

  async timePasses(hours: number) {
    await this.driver.timePasses(hours);
  }

  async divlabChecksLeases() {
    await this.driver.divlabChecksLeases(this.project);
  }

  async memberIsToldLeaseRanOut(member: string) {
    assert.deepEqual(
      await this.driver.leaseNotices(this.project),
      [this.member(member)],
      `expected ${member} to be told the lease ran out`,
    );
  }

  async memberIsToldTheyDoNotHoldTask(member: string) {
    const told = await this.driver.claimRefusals(this.project);
    assert.ok(
      told.some(
        (refusal) =>
          refusal.member === this.member(member) && refusal.reason.includes("you do not hold it"),
      ),
      `expected ${member} to be told they do not hold the task; Divlab said: ${JSON.stringify(told)}`,
    );
  }

  /** PDC coordinators have recorded the member at this trust level. */
  async memberIsTrusted(member: string, level: string) {
    await this.driver.setTrustLevel(this.member(member), level);
  }

  /** PDC coordinators record that the member's second account is theirs: one member, not two. */
  async secondAccountIsLinked(member: string) {
    await this.driver.linkAccount(this.member(member), this.member(`${member}-second-account`));
  }

  async memberIsToldTaskNeedsMoreTrust(member: string, role: string, level: string) {
    const told = await this.driver.claimRefusals(this.project);
    const needed = `a ${role} task needs an ${level} member`;
    assert.ok(
      told.some(
        (refusal) => refusal.member === this.member(member) && refusal.reason.includes(needed),
      ),
      `expected ${member} to be told ${needed}; Divlab said: ${JSON.stringify(told)}`,
    );
  }

  async memberIsToldOneRolePerModule(member: string) {
    const told = await this.driver.claimRefusals(this.project);
    assert.ok(
      told.some(
        (refusal) =>
          refusal.member === this.member(member) &&
          refusal.reason.includes("a member takes only one role in a module"),
      ),
      `expected ${member} to be told a member takes only one role in a module; Divlab said: ${JSON.stringify(told)}`,
    );
  }

  async memberIsToldTaskIsTaken(member: string) {
    const told = await this.driver.claimRefusals(this.project);
    assert.ok(
      told.some(
        (refusal) =>
          refusal.member === this.member(member) && refusal.reason.includes("already been claimed"),
      ),
      `expected ${member} to be told the task has already been claimed; Divlab said: ${JSON.stringify(told)}`,
    );
  }

  async memberReleases(member: string, task: Work) {
    await this.driver.release(
      { ...this.aliased(task), project: this.project },
      this.member(member),
    );
  }

  async taskIsClaimedBy(task: Work, member: string) {
    const expected = this.aliased(task);
    const claims = await this.driver.claimedTasks(this.project);
    assert.deepEqual(
      claims.filter((t) => t.role === expected.role && t.module === expected.module),
      [{ ...expected, member: this.member(member) }],
      `expected the ${task.role} task for ${task.module} to be claimed by ${member}`,
    );
  }

  async taskIsNoLongerReady(task: Work) {
    const expected = this.aliased(task);
    assert.deepEqual(
      await this.readyTasks((t) => t.role === expected.role && t.module === expected.module),
      [],
      `expected the ${task.role} task for ${task.module} to be closed`,
    );
  }

  async noTaskIsReady(module: string) {
    const aliased = this.aliases.of(module);
    assert.deepEqual(
      await this.readyTasks((t) => t.module === aliased),
      [],
      `expected no ready task for ${module}`,
    );
  }

  async moduleIsDone(module: string) {
    const done = await this.driver.doneModules(this.project);
    assert.ok(done.includes(this.aliases.of(module)), `expected ${module} to be done`);
  }

  async moduleIsNotDone(module: string) {
    const done = await this.driver.doneModules(this.project);
    assert.ok(!done.includes(this.aliases.of(module)), `expected ${module} not to be done`);
  }

  async divlabRecorded(
    work: Work,
    outcome: RoutingRecord["outcome"],
    reason: RoutingRecord["reason"],
    which: { latest?: boolean } = {},
  ) {
    const all = await this.recordsOf(work);
    const records = which.latest ? all.slice(-1) : all;
    assert.deepEqual(
      records.map((record) => ({ outcome: record.outcome, reason: record.reason })),
      [{ outcome, reason }],
      `expected one record of the ${work.role} work on ${work.module}`,
    );
  }

  async divlabRecordKeepsWork(work: Work, reported: { verdict: string; impediments: string[] }) {
    const expected = this.aliased(work);
    const records = await this.recordsOf(work);
    assert.deepEqual(
      records.map((record) => record.work),
      [{ ...expected, ...reported, feedbackSignal: this.feedbackSignals.get(workOn(expected)) }],
      `expected the record of the ${work.role} work on ${work.module} to keep what it reported`,
    );
  }

  async divlabRecordSaysWhenItDecided(work: Work) {
    const records = await this.recordsOf(work);
    assert.equal(
      records.length,
      1,
      `expected one record of the ${work.role} work on ${work.module}`,
    );
    assert.match(
      records[0]?.decidedAt ?? "no time recorded",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
      "expected the record to say when Divlab decided, as a UTC time",
    );
  }

  async pdcCoordinatorIsAlerted() {
    const alerts = await this.alerts();
    assert.equal(alerts.length, 1, "expected one alert to the PDC coordinators");
  }

  async pdcCoordinatorIsAlertedThatNoRuleCovers(
    work: Work,
    reported: { verdict: string; impediments: string[] },
  ) {
    const expected = this.aliased(work);
    const feedbackSignal = this.feedbackSignals.get(workOn(expected));
    assert.deepEqual(
      await this.alerts(),
      [
        {
          module: expected.module,
          work: { ...expected, ...reported, feedbackSignal },
          reason: { rule: "no_matching_rule" },
        },
      ],
      "expected one alert saying what was reported and that no rule covers it",
    );
  }

  async pdcCoordinatorIsAlertedThatRoleIsStuck(role: string, module: string) {
    const alerts = await this.alerts();
    assert.deepEqual(
      alerts.map((alert) => ({ module: alert.module, reason: alert.reason })),
      [{ module: this.aliases.of(module), reason: { rule: "re_run_limit", role } }],
      `expected one alert saying ${role} is stuck on ${module}`,
    );
  }

  /** Members are named in scenarios ("Alice"); each scenario has members of its own. */
  private member(name: string): string {
    return this.aliases.of(name.toLowerCase());
  }

  private aliased<T extends Work>(work: T): T {
    return { ...work, module: this.aliases.of(work.module) };
  }

  private async readyTasks(which: (task: Work) => boolean) {
    return (await this.driver.readyTasks(this.project)).filter(which);
  }

  /** The alerts about this scenario's modules. */
  private async alerts(): Promise<CoordinatorAlert[]> {
    const alerts = await this.driver.coordinatorAlerts(this.project);
    return alerts.filter((alert) => this.modules.includes(alert.module));
  }

  private async recordsOf(work: Work) {
    const expected = this.aliased(work);
    const records = await this.driver.routingRecords(this.project);
    return records.filter(
      (record) => record.work.role === expected.role && record.work.module === expected.module,
    );
  }
}

const workOn = (work: Work) => `${work.role} on ${work.module}`;
const roleAndModule = ({ role, module }: Work) => ({ role, module });
