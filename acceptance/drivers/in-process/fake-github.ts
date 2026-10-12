import type { CoordinatorAlert, PostedTask, TaskBoard } from "@anarres/divlab";

/** An in-memory stand-in for the GitHub repositories and issues Divlab works with. */
export class FakeGitHub implements TaskBoard {
  readonly repositories = new Map<string, string[]>();
  private readonly openTasks: PostedTask[] = [];
  private readonly alerts: CoordinatorAlert[] = [];
  private readonly finished: { project: string; module: string }[] = [];

  async post(task: PostedTask): Promise<void> {
    this.openTasks.push(task);
  }

  async alertCoordinators(alert: CoordinatorAlert): Promise<void> {
    this.alerts.push(alert);
  }

  async markModuleDone(module: { project: string; module: string }): Promise<void> {
    this.finished.push(module);
  }

  doneModules(project: string): string[] {
    return this.finished.filter((done) => done.project === project).map((done) => done.module);
  }

  coordinatorAlerts(project: string): CoordinatorAlert[] {
    return this.alerts.filter((alert) => alert.project === project);
  }

  readyTasks(project: string): PostedTask[] {
    return this.openTasks.filter((task) => task.project === project);
  }
}
