import type {
  CoordinatorAlert,
  EventLog,
  LogEvent,
  NotAccepted,
  PostedTask,
  ProjectRepositories,
  PullRequests,
  Repository,
  TaskBoard,
} from "@anarres/divlab";

/** A task as posted, with the identifier GitHub would give its issue. */
type OpenTask = PostedTask & { id: string };

/** An in-memory stand-in for the GitHub repositories and issues Divlab works with. */
export class FakeGitHub
  implements TaskBoard, EventLog, Repository, PullRequests, ProjectRepositories
{
  readonly repositories = new Map<string, string[]>();
  private readonly files = new Map<string, Map<string, string>>();
  private readonly openTasks: OpenTask[] = [];
  private tasksPosted = 0;
  private readonly alerts: CoordinatorAlert[] = [];
  private readonly finished: { project: string; module: string }[] = [];
  private readonly events: LogEvent[] = [];

  async post(task: PostedTask): Promise<void> {
    this.tasksPosted += 1;
    this.openTasks.push({ ...task, id: String(this.tasksPosted) });
  }

  async alertCoordinators(alert: CoordinatorAlert): Promise<void> {
    this.alerts.push(alert);
  }

  private readonly notAcceptedAlerts: NotAccepted[] = [];

  async alertNotAccepted(record: NotAccepted): Promise<void> {
    this.notAcceptedAlerts.push(record);
  }

  unmergedWorkAlerts(project: string): string[] {
    return this.notAcceptedAlerts
      .filter((record) => record.project === project)
      .map((record) => record.notAccepted.feedbackSignal);
  }

  async append(event: LogEvent): Promise<void> {
    this.events.push(event);
  }

  async read(project: string): Promise<LogEvent[]> {
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

  private readonly protectedMains = new Set<string>();

  async protectMain(project: string): Promise<void> {
    this.protectedMains.add(project);
  }

  /** Someone other than Divlab writes to main: it takes only if main is unprotected. */
  changeMainDirectly(project: string): boolean {
    return !this.protectedMains.has(project);
  }

  /** A file reaches the project's main branch. */
  mergeFile(project: string, path: string, text: string): void {
    const files = this.files.get(project) ?? new Map<string, string>();
    files.set(path, text);
    this.files.set(project, files);
  }

  private readonly pullRequests: { project: string; files: { path: string; text: string }[] }[] =
    [];
  private readonly mergedPullRequests: string[] = [];

  /** A member opens a pull request; it is identified by its number, as on GitHub. */
  openPullRequest(project: string, files: { path: string; text: string }[]): string {
    this.pullRequests.push({ project, files });
    return String(this.pullRequests.length);
  }

  async head(_project: string, pullRequest: string): Promise<string> {
    return `head-of-${pullRequest}`;
  }

  async changedFiles(_project: string, pullRequest: string) {
    return this.pullRequest(pullRequest).files;
  }

  async merge(project: string, pullRequest: string): Promise<void> {
    for (const { path, text } of this.pullRequest(pullRequest).files)
      this.mergeFile(project, path, text);
    this.mergedPullRequests.push(pullRequest);
  }

  private readonly refused: { project: string; reason: string }[] = [];

  async refuse(project: string, _pullRequest: string, reason: string): Promise<void> {
    this.refused.push({ project, reason });
  }

  refusals(project: string): string[] {
    return this.refused.filter((r) => r.project === project).map((r) => r.reason);
  }

  /** The files of the pull requests merged into a project. */
  mergedFiles(project: string): string[] {
    return this.mergedPullRequests
      .map((number) => this.pullRequest(number))
      .filter((pullRequest) => pullRequest.project === project)
      .flatMap((pullRequest) => pullRequest.files.map((file) => file.path));
  }

  private pullRequest(number: string) {
    const pullRequest = this.pullRequests[Number(number) - 1];
    if (!pullRequest) throw new Error(`There is no pull request ${number}`);
    return pullRequest;
  }

  async feedbackSignals(project: string): Promise<string[]> {
    return [...(this.files.get(project)?.keys() ?? [])].filter((path) =>
      path.startsWith("feedback/"),
    );
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
