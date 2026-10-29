import { MODULES_FILE } from "@anarres/core";
import type {
  ChangedOnMain,
  ChangeNotByDivlab,
  ClaimedTask,
  ClaimedWithoutClaim,
  CoordinatorAlert,
  EventLog,
  FinishedModule,
  LogEvent,
  MainCommit,
  Members,
  NotAccepted,
  PostedTask,
  ProjectRepositories,
  PullRequests,
  Refused,
  Repository,
  TaskBoard,
} from "@anarres/divlab";
import { FAILS_ON_PURPOSE, PASSES_ON_PURPOSE } from "../scenario-words.ts";

/** Divlab's account in the fake: the name its log writes are made under. */
export const DIVLAB_ACCOUNT = "divlab[bot]";

/** A task as posted, with the identifier GitHub would give its issue, and who holds it. */
type OpenTask = PostedTask & { id: string; claimedBy?: string; posted: string };

/** An in-memory stand-in for the GitHub repositories and issues Divlab works with. */
export class FakeGitHub
  implements TaskBoard, EventLog, Repository, PullRequests, ProjectRepositories, Members
{
  readonly repositories = new Map<string, string[]>();
  private readonly files = new Map<string, Map<string, string>>();
  private readonly openTasks: OpenTask[] = [];
  /** Issues opened, tasks and alerts alike, which GitHub numbers in one sequence. */
  private issuesOpened = 0;
  private readonly alerts: CoordinatorAlert[] = [];
  private readonly finished: { project: string; module: string }[] = [];
  private readonly events: LogEvent[] = [];
  /** Each issue's decision, kept when the task is closed, as an issue on GitHub keeps it. */
  private readonly decisions: { project: string; feedbackSignal: string }[] = [];

  async actedOn(project: string): Promise<string[]> {
    return this.decisions.filter((d) => d.project === project).map((d) => d.feedbackSignal);
  }

  async post(task: PostedTask): Promise<void> {
    if (task.decidedOn !== undefined) {
      this.decisions.push({ project: task.project, feedbackSignal: task.decidedOn });
    }
    this.issuesOpened += 1;
    this.openTasks.push({
      ...task,
      id: String(this.issuesOpened),
      posted: postedAt(this.issuesOpened),
    });
  }

  async alertCoordinators(alert: CoordinatorAlert): Promise<void> {
    this.decisions.push({ project: alert.project, feedbackSignal: alert.work.feedbackSignal });
    this.alerts.push(alert);
    this.issuesOpened += 1;
    this.alertIssues.push({
      project: alert.project,
      module: alert.work.module,
      id: String(this.issuesOpened),
    });
  }

  /** Issues members opened of their own: not tasks, which only Divlab posts. */
  private readonly memberIssues: { project: string; member: string; id: string }[] = [];

  openIssueAs(project: string, member: string): void {
    this.issuesOpened += 1;
    this.memberIssues.push({ project, member, id: String(this.issuesOpened) });
  }

  issueOpenedBy(project: string, member: string): string | undefined {
    return this.memberIssues.find((i) => i.project === project && i.member === member)?.id;
  }

  /** The issue each alert to PDC coordinators was opened as. */
  private readonly alertIssues: { project: string; module: string; id: string }[] = [];

  alertIssueAbout(project: string, module: string): string | undefined {
    return this.alertIssues.find((a) => a.project === project && a.module === module)?.id;
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
    // Divlab's log writes are its own commits, which GitHub signs.
    this.commitTo(event.project, { author: DIVLAB_ACCOUNT, signedByGitHub: true });
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
    this.issuesOpened += 1;
    this.finishedIssues.push({ ...module, id: String(this.issuesOpened) });
  }

  /** The issue each finished module was marked done with. */
  private readonly finishedIssues: (FinishedModule & { id: string })[] = [];

  finishedModuleIssue(project: string, module: string): string | undefined {
    return this.finishedIssues.find((f) => f.project === project && f.module === module)?.id;
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
    if (this.protectedMains.has(project)) return false;
    this.commitTo(project, { author: "someone-else", signedByGitHub: false });
    return true;
  }

  /**
   * A file reaches the project's main branch as one commit: by someone other than Divlab, unless
   * `by` says whose it is and whether GitHub signed it.
   */
  mergeFile(
    project: string,
    path: string,
    text: string,
    by: Omit<MainCommit, "sha"> = { author: "someone-else", signedByGitHub: false },
  ): void {
    this.writeFile(project, path, text);
    this.commitTo(project, by);
  }

  private writeFile(project: string, path: string, text: string): void {
    const files = this.files.get(project) ?? new Map<string, string>();
    files.set(path, text);
    this.files.set(project, files);
  }

  /** Main's commits, oldest first, as GitHub records who made each. */
  private readonly mainCommits = new Map<string, MainCommit[]>();

  /** Main's files as each commit left them. */
  private readonly filesAtCommit = new Map<string, Map<string, string>>();

  private commitTo(project: string, by: Omit<MainCommit, "sha">): void {
    const commits = this.mainCommits.get(project) ?? [];
    const sha = `${project}-commit-${commits.length + 1}`;
    commits.push({ sha, ...by });
    this.mainCommits.set(project, commits);
    this.filesAtCommit.set(sha, new Map(this.files.get(project)));
  }

  async head(project: string): Promise<string> {
    return this.mainCommits.get(project)?.at(-1)?.sha ?? `${project}-commit-0`;
  }

  async commitsSince(project: string, since: string): Promise<MainCommit[]> {
    const commits = this.mainCommits.get(project) ?? [];
    return commits.slice(commits.findIndex((commit) => commit.sha === since) + 1);
  }

  private readonly changeAlerts: ChangeNotByDivlab[] = [];

  async alertChangeNotByDivlab(change: ChangeNotByDivlab): Promise<void> {
    this.changeAlerts.push(change);
  }

  /** The commits PDC coordinators were alerted Divlab did not make. */
  changesNotByDivlab(project: string): string[] {
    return this.changeAlerts
      .filter((alert) => alert.project === project)
      .map((alert) => alert.changeNotByDivlab.commit);
  }

  private readonly pullRequests: {
    project: string;
    files: { path: string; text: string }[];
    author: string;
    draft: boolean;
    testsFail: boolean;
    testsRunning: boolean;
    task?: string;
  }[] = [];
  private readonly mergedPullRequests: string[] = [];

  /**
   * A member opens a pull request; it is identified by its number, as on GitHub. One opened by a
   * member's CLI is from its task's branch, so names the task.
   */
  openPullRequest(
    project: string,
    files: { path: string; text: string }[],
    {
      author,
      draft = false,
      task,
      testsFail = false,
      testsRunning = false,
    }: {
      author: string;
      draft?: boolean;
      task?: string;
      testsFail?: boolean;
      testsRunning?: boolean;
    },
  ): string {
    this.pullRequests.push({
      project,
      files,
      author,
      draft,
      testsFail,
      testsRunning,
      ...(task ? { task } : {}),
    });
    return String(this.pullRequests.length);
  }

  /** Projects whose repository declares no toolchain: every other declares one. */
  private readonly withoutToolchain = new Set<string>();

  declareNoToolchain(project: string): void {
    this.withoutToolchain.add(project);
  }

  async toolchain(project: string) {
    return this.withoutToolchain.has(project)
      ? undefined
      : { image: "node:24", test: "npm test", report: "junit.xml" };
  }

  /** The project's open pull requests whose head is the commit. */
  async openAt(project: string, commit: string): Promise<string[]> {
    return this.pullRequests.flatMap(({ project: of }, index) => {
      const number = String(index + 1);
      return of === project &&
        `head-of-${number}` === commit &&
        !this.mergedPullRequests.includes(number)
        ? [number]
        : [];
    });
  }

  /** The pull request that carries the feedback signal. */
  pullRequestFor(project: string, feedbackSignal: string): string {
    const index = this.pullRequests.findIndex(
      (opened) =>
        opened.project === project &&
        opened.files.some((file) => file.path === `feedback/${feedbackSignal}.md`),
    );
    if (index === -1) throw new Error(`No pull request carries ${feedbackSignal}`);
    return String(index + 1);
  }

  /**
   * The report the project's check wrote on a pull request's commit: a test case for each test
   * file on main or in the pull request, passing once its module has code that does not fail on
   * purpose, failing before, as new tests do, unless it passes on purpose.
   */
  async testReport(project: string, head: string) {
    const number = head.replace(/^head-of-/, "");
    const files = new Map(this.files.get(project));
    for (const { path, text } of this.opened(number).files) files.set(path, text);
    const hasCode = (module: string) =>
      [...files].some(
        ([path, text]) =>
          path.startsWith(`modules/${module}/src/`) && !text.includes(FAILS_ON_PURPOSE),
      );
    const cases = [...files]
      .filter(([path]) => /^modules\/[^/]+\/tests\//.test(path))
      .map(([path, text]) => ({
        name: path,
        outcome:
          text.includes(PASSES_ON_PURPOSE) || hasCode(path.split("/")[1] ?? "")
            ? ("passed" as const)
            : ("failed" as const),
      }));
    return {
      state: "finished" as const,
      url: `https://github.test/checks/${number}`,
      report: { cases },
    };
  }

  /** The project's tests finish on the pull request's commit, passing or failing. */
  finishTests(pullRequest: string, passed: boolean): string {
    const opened = this.opened(pullRequest);
    opened.testsRunning = false;
    opened.testsFail = !passed;
    return `head-of-${pullRequest}`;
  }

  /** The project's own check on a pull request's commit: its tests pass unless a scenario says. */
  async check(_project: string, head: string) {
    const number = head.replace(/^head-of-/, "");
    const { testsFail, testsRunning } = this.opened(number);
    const state: "passed" | "failed" | "running" = testsRunning
      ? "running"
      : testsFail
        ? "failed"
        : "passed";
    return { state, url: `https://github.test/checks/${number}` };
  }

  /** The member's open pull requests from a task's branch: not yet merged, nor closed. */
  pullRequestsOpenBy(project: string, member: string) {
    return this.pullRequests.flatMap(({ project: of, author, draft, task }, index) =>
      of === project &&
      author === member &&
      task !== undefined &&
      !this.mergedPullRequests.includes(String(index + 1))
        ? [{ number: String(index + 1), task, draft }]
        : [],
    );
  }

  async pullRequest(_project: string, number: string) {
    const { author, draft } = this.opened(number);
    return { head: `head-of-${number}`, draft, author };
  }

  /** As GitHub lists them: the pull request's files that differ from main's. */
  async changedFiles(project: string, pullRequest: string) {
    const main = this.files.get(project);
    return this.opened(pullRequest).files.filter(({ path, text }) => main?.get(path) !== text);
  }

  /** The next merge succeeds, and then Divlab's run stops dead, as if its runner were lost. */
  interruptAfterNextMerge = false;

  /** The commit each merged pull request's merge made. */
  private readonly mergeShas = new Map<string, string>();

  async mergeCommitOf(project: string, pullRequest: string): Promise<string> {
    return this.mergeShas.get(`${project}#${pullRequest}`) ?? "";
  }

  /** Divlab merges: the commit carries the pull request's author, and GitHub signs it. */
  async merge(project: string, pullRequest: string): Promise<string> {
    const { files, author } = this.opened(pullRequest);
    for (const { path, text } of files) this.writeFile(project, path, text);
    this.commitTo(project, { author, signedByGitHub: true });
    const sha = await this.head(project);
    this.mergeShas.set(`${project}#${pullRequest}`, sha);
    this.mergedPullRequests.push(pullRequest);
    if (this.interruptAfterNextMerge) {
      this.interruptAfterNextMerge = false;
      throw new Interrupted();
    }
    return sha;
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
      .map((number) => this.opened(number))
      .filter((pullRequest) => pullRequest.project === project)
      .flatMap((pullRequest) => pullRequest.files.map((file) => file.path));
  }

  /** The member's latest draft from a task's branch, and the files a push adds to it. */
  pushToDraft(project: string, member: string, files: { path: string; text: string }[]): string {
    const number = this.pullRequestsOpenBy(project, member)
      .filter((pullRequest) => pullRequest.draft)
      .at(-1)?.number;
    if (number === undefined) throw new Error(`${member} has no draft open in ${project}`);
    this.opened(number).files.push(...files);
    return number;
  }

  private opened(number: string) {
    const pullRequest = this.pullRequests[Number(number) - 1];
    if (!pullRequest) throw new Error(`There is no pull request ${number}`);
    return pullRequest;
  }

  /** The project's modules.yaml on main now. */
  async modulesOnMain(project: string): Promise<string | undefined> {
    return this.files.get(project)?.get(MODULES_FILE);
  }

  /** The project's modules.yaml as the commit left it. */
  async modulesAt(_project: string, commit: string): Promise<string | undefined> {
    return this.filesAtCommit.get(commit)?.get(MODULES_FILE);
  }

  /**
   * The paths whose text differs between the commit and main now, added or removed too; too many
   * to list from 300, the most GitHub lists of a comparison.
   */
  async changedOnMainSince(project: string, commit: string): Promise<ChangedOnMain> {
    const then = this.filesAtCommit.get(commit) ?? new Map<string, string>();
    const now = this.files.get(project) ?? new Map<string, string>();
    const changed = [...new Set([...then.keys(), ...now.keys()])].filter(
      (path) => then.get(path) !== now.get(path),
    );
    return changed.length >= 300 ? { tooMany: true } : changed;
  }

  /** The paths of the files on a project's main branch as the commit left them. */
  filesAt(_project: string, commit: string): string[] {
    return [...(this.filesAtCommit.get(commit)?.keys() ?? [])];
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
    if (index !== -1) this.closedTasks.push(...this.openTasks.splice(index, 1));
  }

  /** Tasks closed once their work was done: their issues remain, as on GitHub. */
  private readonly closedTasks: OpenTask[] = [];

  closedTasksOf(project: string): OpenTask[] {
    return this.closedTasks.filter((task) => task.project === project);
  }

  /** The tasks PDC coordinators were told were shown as claimed with no claim. */
  private readonly claimAlerts: { project: string; role: PostedTask["role"]; module: string }[] =
    [];

  claimedWithoutClaimAlerts(project: string) {
    return this.claimAlerts.filter((alert) => alert.project === project);
  }

  async alertClaimedWithoutClaim(alert: ClaimedWithoutClaim): Promise<void> {
    this.claimAlerts.push(alert);
  }

  async claimedTasks(project: string) {
    return this.tasksHeld(project).map(({ id, role, module, claimedBy }) => ({
      task: id,
      role,
      module,
      claimedBy,
    }));
  }

  async markClaimed(claim: ClaimedTask): Promise<void> {
    const task = this.openTasks.find((t) => t.project === claim.project && t.id === claim.task);
    if (task) task.claimedBy = claim.member;
  }

  private readonly issueComments: {
    project: string;
    task: string;
    member: string;
    text: string;
    at: string;
  }[] = [];

  /** Someone comments on a task's issue, at a time GitHub records. */
  comment(project: string, task: string, member: string, text: string, at: string): void {
    this.issueComments.push({ project, task, member, text, at });
  }

  async comments(
    project: string,
    task: string,
  ): Promise<{ member: string; text: string; at: string }[]> {
    return this.issueComments
      .filter((comment) => comment.project === project && comment.task === task)
      .map(({ member, text, at }) => ({ member, text, at }));
  }

  private readonly refusedMembers: Refused[] = [];

  async refuseMember(refusal: Refused): Promise<void> {
    this.refusedMembers.push(refusal);
  }

  claimRefusals(project: string): Refused[] {
    return this.refusedMembers.filter((refusal) => refusal.project === project);
  }

  /** The governance file as PDC coordinators keep it: trust levels and linked accounts. */
  private readonly trustLevels: Record<string, { level?: string; linked?: string[] }> = {};

  setTrustLevel(member: string, level: string): void {
    this.trustLevels[member] = { ...this.trustLevels[member], level };
  }

  linkAccount(member: string, account: string): void {
    const record = this.trustLevels[member] ?? {};
    this.trustLevels[member] = { ...record, linked: [...(record.linked ?? []), account] };
  }

  async governanceFile(): Promise<unknown> {
    return { members: this.trustLevels };
  }

  /** Every open task, whether ready or claimed. */
  openTasksOf(project: string): OpenTask[] {
    return this.openTasks.filter((task) => task.project === project);
  }

  /** Divlab's messages to members whose lease ran out: written when it tells them. */
  private readonly leaseMessages: ClaimedTask[] = [];

  async tellLeaseRanOut(ranOut: ClaimedTask): Promise<void> {
    this.leaseMessages.push(ranOut);
  }

  leaseNotices(project: string): string[] {
    return this.leaseMessages.filter((m) => m.project === project).map((m) => m.member);
  }

  async releaseClaim(project: string, id: string): Promise<void> {
    const task = this.openTasks.find((t) => t.project === project && t.id === id);
    if (task) delete task.claimedBy;
  }

  readyTasks(project: string): OpenTask[] {
    return this.openTasks.filter((task) => task.project === project && !task.claimedBy);
  }

  tasksHeld(project: string): (OpenTask & { claimedBy: string })[] {
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

/**
 * When GitHub would say the fake's nth issue was opened: one second after the last, as GitHub
 * gives it (UTC, to the second), so the fake needs no clock.
 */
const postedAt = (n: number): string =>
  new Date(Date.UTC(2026, 9, 29, 9, 0, n)).toISOString().replace(".000Z", "Z");
