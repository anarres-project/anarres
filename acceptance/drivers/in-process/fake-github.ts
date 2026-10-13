import type {
  CoordinatorAlert,
  EventLog,
  PostedTask,
  Repository,
  RoutingEvent,
  TaskBoard,
} from "@anarres/divlab";

/** A task as posted, with the identifier GitHub would give its issue. */
type OpenTask = PostedTask & { id: string };

/** An in-memory stand-in for the GitHub repositories and issues Divlab works with. */
export class FakeGitHub implements TaskBoard, EventLog, Repository {
  readonly repositories = new Map<string, string[]>();
  private readonly files = new Map<string, Map<string, string>>();
  private readonly openTasks: OpenTask[] = [];
  private tasksPosted = 0;
  private readonly alerts: CoordinatorAlert[] = [];
  private readonly finished: { project: string; module: string }[] = [];
  private readonly events: RoutingEvent[] = [];

  async post(task: PostedTask): Promise<void> {
    this.tasksPosted += 1;
    this.openTasks.push({ ...task, id: String(this.tasksPosted) });
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

  /** A member's pull request is merged, adding a file to the project. */
  merge(project: string, path: string, text: string): void {
    const files = this.files.get(project) ?? new Map<string, string>();
    files.set(path, text);
    this.files.set(project, files);
  }

  async feedbackSignals(project: string): Promise<string[]> {
    return [...(this.files.get(project)?.keys() ?? [])].filter((path) =>
      path.startsWith("feedback/"),
    );
  }

  async readFile(project: string, path: string): Promise<string> {
    const text = this.files.get(project)?.get(path);
    if (text === undefined) throw new Error(`${project} has no file ${path}`);
    return text;
  }

  async task(project: string, id: string): Promise<PostedTask | undefined> {
    return this.openTasks.find((task) => task.project === project && task.id === id);
  }

  async close(project: string, id: string): Promise<void> {
    const index = this.openTasks.findIndex((task) => task.project === project && task.id === id);
    if (index !== -1) this.openTasks.splice(index, 1);
  }

  readyTasks(project: string): OpenTask[] {
    return this.openTasks.filter((task) => task.project === project);
  }
}
