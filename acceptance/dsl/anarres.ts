import assert from "node:assert/strict";
import type { Driver } from "../drivers/driver.ts";
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
