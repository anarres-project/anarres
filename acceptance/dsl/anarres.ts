import assert from "node:assert/strict";
import type { Driver } from "../drivers/driver.ts";
import type { Aliases } from "./aliases.ts";

const DEFAULT_PROJECT = "ledger";
const DEFAULT_MEMBER = "alice";

/** What members, PDC coordinators and Divlab do and observe, in domain terms. */
export class Anarres {
  constructor(
    private readonly driver: Driver,
    private readonly aliases: Aliases,
  ) {}

  private get project(): string {
    return this.aliases.of(DEFAULT_PROJECT);
  }

  async projectWithModule(module: string): Promise<void> {
    await this.driver.createProject(this.project, [module]);
  }

  async memberHasWorkAccepted(work: { role: string; module: string; verdict: string }) {
    await this.driver.acceptWork({
      ...work,
      project: this.project,
      member: this.aliases.of(DEFAULT_MEMBER),
    });
  }

  async divlabHasPostedReadyTask(task: { role: string; module: string }) {
    const ready = await this.driver.readyTasks(this.project);
    assert.deepEqual(
      ready.filter((t) => t.role === task.role && t.module === task.module),
      [task],
      `expected one ready ${task.role} task for ${task.module}`,
    );
  }
}
