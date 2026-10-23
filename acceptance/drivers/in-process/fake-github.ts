import type {
  ClaimedTask,
  CoordinatorAlert,
  EventLog,
  FinishedModule,
  LogEvent,
  NotAccepted,
  PostedTask,
  ProjectRepositories,
  PullRequests,
  Repository,
  TaskBoard,
} from "@anarres/divlab";

/** A task as posted, with the identifier GitHub would give its issue, and who holds it. */
type OpenTask = PostedTask & { id: string; claimedBy?: string };

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
  /** Each issue's decision, kept when the task is closed, as an issue on GitHub keeps it. */
  private readonly decisions: { project: string; feedbackSignal: string }[] = [];

  async actedOn(project: string): Promise<string[]> {
    return this.decisions.filter((d) => d.project === project).map((d) => d.feedbackSignal);
  }

  async post(task: PostedTask): Promise<void> {
    this.decisions.push({ project: task.project, feedbackSignal: task.decidedOn });
    this.tasksPosted += 1;
    this.openTasks.push({ ...task, id: String(this.tasksPosted) });
  }

  async alertCoordinators(alert: CoordinatorAlert): Promise<void> {
    this.decisions.push({ project: alert.project, feedbackSignal: alert.work.feedbackSignal });
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

  /** Divlab stops just after recording its next routing decision, before acting on it. */
  interruptAfterNextDecision = false;

  async append(event: LogEvent): Promise<void> {
    this.events.push(event);
    if (this.interruptAfterNextDecision && "work" in event) {
      this.interruptAfterNextDecision = false;
      throw new Interrupted();
    }
  }

  async read(project: string): Promise<LogEvent[]> {
    return this.events.filter((event) => event.project === project);
  }

  async markModuleDone(module: FinishedModule): Promise<void> {
    this.decisions.push({ project: module.project, feedbackSignal: module.decidedOn });
    this.finished.push(module);
  }

  doneModules(project: string): string[] {
    return this.finished.filter((done) => done.project === project).map((done) => done.module);
  }

  coordinatorAlerts(project: string): CoordinatorAlert[] {
    return this.alerts.filter((alert) => alert.project === project);
  }

  private readonly checkedPullRequests = new Set<string>();

  async allowDivlabChecks(project: string): Promise<void> {
    this.checkedPullRequests.add(project);
  }

  pullRequestChecks(project: string): string[] {
    return this.checkedPullRequests.has(project) ? ["Divlab"] : [];
  }

  private readonly protectedMains = new Set<string>();

  async protectMain(project: string): Promise<void> {
    this.protectedMains.add(project);
  }

  async mainIsProtected(project: string): Promise<boolean> {
    return this.protectedMains.has(project);
  }

  /** Alerts that main is unprotected, as issues: open until a coordinator closes them. */
  private readonly unprotectedAlerts: { project: string; open: boolean }[] = [];

  async alertUnprotectedMain(project: string): Promise<void> {
    this.unprotectedAlerts.push({ project, open: true });
  }

  async unprotectedMainAlertOpen(project: string): Promise<boolean> {
    return this.unprotectedAlerts.some((alert) => alert.project === project && alert.open);
  }

  unprotectedMainAlerts(project: string): number {
    return this.unprotectedAlerts.filter((alert) => alert.project === project).length;
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

  /** The next merge succeeds, and then Divlab's run stops dead, as if its runner were lost. */
  interruptAfterNextMerge = false;

  async merge(project: string, pullRequest: string): Promise<void> {
    for (const { path, text } of this.pullRequest(pullRequest).files)
      this.mergeFile(project, path, text);
    this.mergedPullRequests.push(pullRequest);
    if (this.interruptAfterNextMerge) {
      this.interruptAfterNextMerge = false;
      throw new Interrupted();
    }
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

  async markClaimed(claim: ClaimedTask): Promise<void> {
    const task = this.openTasks.find((t) => t.project === claim.project && t.id === claim.task);
    if (task) task.claimedBy = claim.member;
  }

  readyTasks(project: string): OpenTask[] {
    return this.openTasks.filter((task) => task.project === project && !task.claimedBy);
  }

  claimedTasks(project: string): (OpenTask & { claimedBy: string })[] {
    return this.openTasks.filter(
      (task): task is OpenTask & { claimedBy: string } =>
        task.project === project && task.claimedBy !== undefined,
    );
  }
}

/** Divlab's run stopped part way, as a lost runner or a cancelled job would stop it. */
export class Interrupted extends Error {
  override name = "Interrupted";
}
