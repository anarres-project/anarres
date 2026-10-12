import type {
  CoordinatorAlert,
  EventLog,
  PostedTask,
  RoutingEvent,
  TaskBoard,
} from "@anarres/divlab";

/** An in-memory stand-in for the GitHub repositories and issues Divlab works with. */
export class FakeGitHub implements TaskBoard, EventLog {
  readonly repositories = new Map<string, string[]>();
  private readonly openTasks: PostedTask[] = [];
  private readonly alerts: CoordinatorAlert[] = [];
  private readonly finished: { project: string; module: string }[] = [];
  private readonly events: RoutingEvent[] = [];

  async post(task: PostedTask): Promise<void> {
    this.openTasks.push(task);
  }

  async alertCoordinators(alert: CoordinatorAlert): Promise<void> {
    this.alerts.push(alert);
  }

  async append(event: RoutingEvent): Promise<void> {
    this.events.push(event);
  }

  async read(project: string): Promise<RoutingEvent[]> {
    return this.events.filter((event) => event.project === project);
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

  /** Merging a pull request that names a task closes it. */
  close(task: PostedTask): void {
    this.openTasks.splice(this.openTasks.indexOf(task), 1);
  }

  readyTasks(project: string): PostedTask[] {
    return this.openTasks.filter((task) => task.project === project);
  }
}
