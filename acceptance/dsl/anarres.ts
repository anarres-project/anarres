import assert from "node:assert/strict";
import type { Driver, RoutingRecord } from "../drivers/driver.ts";
import type { Aliases } from "./aliases.ts";

const DEFAULT_PROJECT = "ledger";
const DEFAULT_MEMBER = "alice";

/** What members, PDC coordinators and Divlab do and observe, in domain terms. */
export class Anarres {
  private readonly feedbackSignals = new Map<string, string>();

  constructor(
    private readonly driver: Driver,
    private readonly aliases: Aliases,
  ) {}

  private get project(): string {
    return this.aliases.of(DEFAULT_PROJECT);
  }

  async projectWithModules(...modules: string[]): Promise<void> {
    await this.driver.createProject(this.project, modules);
  }

  async memberHasWorkAccepted(work: {
    role: string;
    module: string;
    verdict: string;
    impediments?: string[];
  }) {
    const feedbackSignal = this.aliases.of(`feedback-${this.feedbackSignals.size + 1}`);
    this.feedbackSignals.set(workOn(work), feedbackSignal);
    await this.driver.acceptWork({
      impediments: [],
      ...work,
      project: this.project,
      member: this.aliases.of(DEFAULT_MEMBER),
      feedbackSignal,
    });
  }

  async taskCarriesFeedbackFrom(task: { role: string; module: string }, fromRole: string) {
    const ready = await this.driver.readyTasks(this.project);
    assert.deepEqual(
      ready.filter((t) => t.role === task.role && t.module === task.module),
      [{ ...task, feedbackSignal: this.feedbackSignals.get(workOn({ ...task, role: fromRole })) }],
      `expected the ${task.role} task for ${task.module} to carry the ${fromRole} work's feedback signal`,
    );
  }

  async memberHasWorkSentBack(
    work: { role: string; module: string; impediment: string },
    times: number,
  ) {
    for (let i = 0; i < times; i++) {
      await this.memberHasWorkAccepted({
        role: work.role,
        module: work.module,
        verdict: "fail",
        impediments: [work.impediment],
      });
    }
  }

  async divlabHasPostedReadyTask(task: { role: string; module: string }) {
    const ready = await this.driver.readyTasks(this.project);
    assert.deepEqual(
      ready.filter((t) => t.role === task.role && t.module === task.module).map(roleAndModule),
      [task],
      `expected one ready ${task.role} task for ${task.module}`,
    );
  }

  async divlabHasPostedOnlyReadyTask(task: { role: string; module: string }) {
    const ready = await this.driver.readyTasks(this.project);
    assert.deepEqual(
      ready.filter((t) => t.module === task.module).map(roleAndModule),
      [task],
      `expected the only ready task for ${task.module} to be a ${task.role} task`,
    );
  }

  async taskCarriesNoFeedback(task: { role: string; module: string }) {
    const ready = await this.driver.readyTasks(this.project);
    assert.deepEqual(
      ready.filter((t) => t.role === task.role && t.module === task.module),
      [task],
      `expected the ${task.role} task for ${task.module} to carry no feedback signal`,
    );
  }

  async moduleIsDone(module: string) {
    const done = await this.driver.doneModules(this.project);
    assert.ok(done.includes(module), `expected ${module} to be done`);
  }

  async moduleIsNotDone(module: string) {
    const done = await this.driver.doneModules(this.project);
    assert.ok(!done.includes(module), `expected ${module} not to be done`);
  }

  async divlabRecorded(
    work: { role: string; module: string },
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

  async divlabRecordKeepsWork(
    work: { role: string; module: string },
    reported: { verdict: string; impediments: string[] },
  ) {
    const records = await this.recordsOf(work);
    assert.deepEqual(
      records.map((record) => record.work),
      [{ ...work, ...reported, feedbackSignal: this.feedbackSignals.get(workOn(work)) }],
      `expected the record of the ${work.role} work on ${work.module} to keep what it reported`,
    );
  }

  private async recordsOf(work: { role: string; module: string }) {
    const records = await this.driver.routingRecords(this.project);
    return records.filter(
      (record) => record.work.role === work.role && record.work.module === work.module,
    );
  }

  async pdcCoordinatorIsAlertedThatNoRuleCovers(
    work: { role: string; module: string },
    reported: { verdict: string; impediments: string[] },
  ) {
    const alerts = await this.driver.coordinatorAlerts(this.project);
    assert.deepEqual(
      alerts,
      [
        {
          module: work.module,
          work: { ...work, ...reported, feedbackSignal: this.feedbackSignals.get(workOn(work)) },
          reason: { rule: "no_matching_rule" },
        },
      ],
      "expected one alert saying what was reported and that no rule covers it",
    );
  }

  async pdcCoordinatorIsAlertedThatRoleIsStuck(role: string, module: string) {
    const alerts = await this.driver.coordinatorAlerts(this.project);
    assert.deepEqual(
      alerts.map((alert) => ({ module: alert.module, reason: alert.reason })),
      [{ module, reason: { rule: "re_run_limit", role } }],
      `expected one alert saying ${role} is stuck on ${module}`,
    );
  }

  async pdcCoordinatorIsAlerted() {
    const alerts = await this.driver.coordinatorAlerts(this.project);
    assert.equal(alerts.length, 1, "expected one alert to the PDC coordinators");
  }

  async noTaskIsReady(module: string) {
    const ready = await this.driver.readyTasks(this.project);
    assert.deepEqual(
      ready.filter((t) => t.module === module),
      [],
      `expected no ready task for ${module}`,
    );
  }
}

const workOn = (work: { role: string; module: string }) => `${work.role} on ${work.module}`;
const roleAndModule = ({ role, module }: { role: string; module: string }) => ({ role, module });
