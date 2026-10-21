import assert from "node:assert/strict";
import type { CoordinatorAlert, Driver, RoutingRecord } from "../drivers/driver.ts";
import type { Aliases } from "./aliases.ts";

const DEFAULT_MEMBER = "alice";

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
    private readonly project: string,
  ) {}

  async projectWithModules(...modules: string[]): Promise<void> {
    this.modules.push(...modules.map((module) => this.aliases.of(module)));
    await this.driver.createProject(this.project, this.modules);
  }

  async memberHasWorkAccepted(work: Work & { verdict: string; impediments?: string[] }) {
    // Every piece of work has a feedback signal of its own.
    this.signalsWritten += 1;
    const feedbackSignal = this.aliases.of(`feedback-${this.signalsWritten}`);
    this.feedbackSignals.set(workOn(this.aliased(work)), feedbackSignal);
    await this.driver.acceptWork({
      impediments: [],
      ...this.aliased(work),
      project: this.project,
      member: this.aliases.of(DEFAULT_MEMBER),
      feedbackSignal,
    });
  }

  /** The member opens a pull request with their work; Divlab decides whether to merge it. */
  async memberSubmitsWork(
    work: Work & { verdict: string; impediments?: string[]; withoutFeedbackSignal?: boolean },
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
