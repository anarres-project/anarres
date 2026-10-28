import {
  askForWork,
  claim,
  contributions,
  memberStatus,
  preparation,
  restoreDraft,
  resumption,
  submit,
  taskFolder,
} from "@anarres/cli";
import { TRUST_LEVELS, trustAllows, trustLevelOf } from "@anarres/core";
import {
  CLAIM,
  checkMain,
  checkProtection,
  onChecked,
  onClaim,
  onLeaseCheck,
  onMerge,
  onPullRequest,
  onRelease,
  routingDecisions,
  setUpProject,
  startModule,
} from "@anarres/divlab";
import type {
  AcceptedWork,
  ClaimedTask,
  CoordinatorAlert,
  Driver,
  ReadyTask,
  RoutingRecord,
} from "../driver.ts";
import {
  feedbackSignalFile,
  inScenarioWords,
  otherFiles,
  roleId,
  roleName,
  signalName,
  workFiles,
} from "../scenario-words.ts";
import { DIVLAB_ACCOUNT, FakeGitHub, Interrupted } from "./fake-github.ts";

/** Submits work to an in-memory fake of GitHub as pull requests, for Divlab to merge. */
/** Divlab's clock in-process starts at a fixed time, so no scenario reads the wall clock. */
const START = "2026-10-22T09:00:00Z";

export class InProcessDriver implements Driver {
  private readonly github = new FakeGitHub();
  /** Divlab's clock: it moves only when a scenario says time passes. */
  private now = new Date(START);
  private readonly clock = () => this.now;

  async createProject(
    project: string,
    modules: string[],
    options: { unprotected?: boolean } = {},
  ): Promise<void> {
    this.github.repositories.set(project, modules);
    if (!options.unprotected) await setUpProject(project, this.github);
    for (const module of modules) await startModule(project, module, this.github);
  }

  async startProjectWithoutToolchain(project: string, modules: string[]): Promise<string> {
    this.github.repositories.set(project, modules);
    this.github.declareNoToolchain(project);
    try {
      await setUpProject(project, this.github);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    for (const module of modules) await startModule(project, module, this.github);
    return "";
  }

  /** The member submits the work and Divlab merges it: accepted work has been merged. */
  async acceptWork(work: AcceptedWork): Promise<void> {
    await this.submitWork(work);
    if (!(await this.mergedWork(work.project)).includes(work.feedbackSignal)) {
      throw new Error(`Divlab did not merge the ${work.role} work on ${work.module}`);
    }
  }

  /** What every Divlab run ends with, as the Action does: main's protection, and its changes. */
  private async afterRun(project: string): Promise<void> {
    await checkProtection(project, this.github, this.github);
    await checkMain(project, this.github, this.github, this.github, this.clock, DIVLAB_ACCOUNT);
  }

  /** The commits PDC coordinators were alerted reached main without Divlab. */
  async changesNotByDivlab(project: string): Promise<string[]> {
    return this.github.changesNotByDivlab(project);
  }

  async changeMainDirectly(project: string): Promise<boolean> {
    return this.github.changeMainDirectly(project);
  }

  /** The work lands on main without a pull request, and the push wakes Divlab, as on GitHub. */
  async mergeDirectly(work: AcceptedWork): Promise<void> {
    const { path, text } = feedbackSignalFile(work);
    this.github.mergeFile(work.project, path, text);
    await onMerge(work.project, this.github, this.github, this.github, this.clock);
    await this.afterRun(work.project);
  }

  async unmergedWorkAlerts(project: string): Promise<string[]> {
    return this.github.unmergedWorkAlerts(project).map(signalName);
  }

  async interruptAfterMerging(work: AcceptedWork): Promise<void> {
    this.github.interruptAfterNextMerge = true;
    try {
      await this.submitWork(work);
    } catch (error) {
      if (!(error instanceof Interrupted)) throw error;
      return;
    }
    throw new Error("Divlab was not interrupted: it never merged the work");
  }

  async interruptAfterRecording(work: AcceptedWork): Promise<void> {
    this.github.interruptAfterNextDecision = true;
    try {
      await this.submitWork(work);
    } catch (error) {
      if (!(error instanceof Interrupted)) throw error;
      return;
    }
    throw new Error("Divlab was not interrupted: it never recorded a decision");
  }

  async divlabActsAgain(project: string): Promise<void> {
    await onMerge(project, this.github, this.github, this.github, this.clock);
    await this.afterRun(project);
  }

  async pullRequestChecks(project: string): Promise<string[]> {
    return this.github.pullRequestChecks(project);
  }

  async unprotectedMainAlerts(project: string): Promise<number> {
    return this.github.unprotectedMainAlerts(project);
  }

  async refusals(project: string): Promise<string[]> {
    return this.github.refusals(project);
  }

  async testCounts(project: string): Promise<{ total: number; passed: number; failed: number }[]> {
    return (await this.github.read(project)).flatMap((event) =>
      "aboutToMerge" in event && event.aboutToMerge.tests ? [event.aboutToMerge.tests] : [],
    );
  }

  async routingRecords(project: string): Promise<RoutingRecord[]> {
    return routingDecisions(await this.github.read(project)).map(inScenarioWords);
  }

  async doneModules(project: string): Promise<string[]> {
    return this.github.doneModules(project);
  }

  async coordinatorAlerts(project: string): Promise<CoordinatorAlert[]> {
    return this.github.coordinatorAlerts(project).map((alert) => {
      const { work, reason } = inScenarioWords(alert);
      return { module: work.module, work, reason };
    });
  }

  async submitWork(work: AcceptedWork): Promise<void> {
    const fromRole = roleId(work.role);
    // The member's feedback signal names the task the work was for, ready or claimed by them.
    const task = (
      work.forFinishedTask
        ? this.github.closedTasksOf(work.project)
        : this.github.openTasksOf(work.project)
    ).find((task) => task.role === fromRole && task.module === work.module);
    const pullRequest = this.github.openPullRequest(work.project, workFiles(work, task?.id), {
      author: work.member,
      ...(work.testsFail ? { testsFail: true } : {}),
      ...(work.testsRunning ? { testsRunning: true } : {}),
    });
    await onPullRequest(
      work.project,
      pullRequest,
      this.github,
      this.github,
      this.github,
      this.clock,
    );
    await this.afterRun(work.project);
  }

  /** All the pull requests are opened first; then Divlab takes each in turn, as queued runs do. */
  async submitWorkAtOnce(works: AcceptedWork[]): Promise<void> {
    const opened = works.map((work) => {
      const fromRole = roleId(work.role);
      const task = this.github
        .openTasksOf(work.project)
        .find((task) => task.role === fromRole && task.module === work.module);
      return {
        project: work.project,
        pullRequest: this.github.openPullRequest(work.project, workFiles(work, task?.id), {
          author: work.member,
        }),
      };
    });
    for (const { project, pullRequest } of opened) {
      await onPullRequest(project, pullRequest, this.github, this.github, this.github, this.clock);
      await this.afterRun(project);
    }
  }

  async mergedWork(project: string): Promise<string[]> {
    return this.github
      .mergedFiles(project)
      .filter((path) => path.startsWith("feedback/"))
      .map(signalName);
  }

  /** The member comments to claim the closed task's issue, which wakes Divlab, as on GitHub. */
  async claimFinished(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<void> {
    const fromRole = roleId(task.role);
    const closed = this.github
      .closedTasksOf(task.project)
      .find((t) => t.role === fromRole && t.module === task.module);
    if (!closed) throw new Error(`No ${task.role} task for ${task.module} is done`);
    await this.claimTask(task.project, closed.id, member);
  }

  /** The member comments to claim the finished module's issue, which wakes Divlab. */
  async claimFinishedModule(
    done: { project: string; module: string },
    member: string,
  ): Promise<void> {
    const id = this.github.finishedModuleIssue(done.project, done.module);
    if (!id) throw new Error(`The module ${done.module} is not done`);
    await this.claimTask(done.project, id, member);
  }

  async openIssueAs(project: string, member: string): Promise<void> {
    this.github.openIssueAs(project, member);
  }

  /** The member comments to claim the issue, which wakes Divlab, as on GitHub. */
  async claimIssueOf(project: string, owner: string, member: string): Promise<void> {
    const id = this.github.issueOpenedBy(project, owner);
    if (!id) throw new Error(`${owner} has opened no issue in ${project}`);
    await this.claimTask(project, id, member);
  }

  /** The member comments to claim the alert's issue, which wakes Divlab, as on GitHub. */
  async claimAlert(alert: { project: string; module: string }, member: string): Promise<void> {
    const id = this.github.alertIssueAbout(alert.project, alert.module);
    if (!id) throw new Error(`No PDC coordinators' alert about ${alert.module} was opened`);
    await this.claimTask(alert.project, id, member);
  }

  /** The member comments to claim the task, and the comment's run wakes Divlab, as on GitHub. */
  async claim(task: { project: string; role: string; module: string }, member: string) {
    await this.claimTask(task.project, this.openTaskId(task), member);
  }

  private async claimTask(project: string, id: string, member: string) {
    // The member claims through their CLI, as the plugin does: it comments on the task's issue.
    await claim(`${project}#${id}`, {
      askToClaim: async (where, issue) =>
        this.github.comment(where, issue, member, CLAIM, this.clock().toISOString()),
    });
    await onClaim(project, { task: id, member }, this.github, this.github, this.clock, this.github);
    await this.afterRun(project);
  }

  /** Every member comments first; then Divlab takes `heardFirst`'s run, then the others in turn. */
  async claimTogether(
    task: { project: string; role: string; module: string },
    members: string[],
    heardFirst: string,
  ): Promise<void> {
    const id = this.openTaskId(task);
    for (const member of members)
      this.github.comment(task.project, id, member, "/claim", this.clock().toISOString());
    for (const member of [heardFirst, ...members.filter((m) => m !== heardFirst)]) {
      await onClaim(
        task.project,
        { task: id, member },
        this.github,
        this.github,
        this.clock,
        this.github,
      );
      await this.afterRun(task.project);
    }
  }

  /** A claimed task's issue is still there to comment on. */
  private openTaskId(task: { project: string; role: string; module: string }): string {
    const fromRole = roleId(task.role);
    const open = this.github
      .openTasksOf(task.project)
      .find((t) => t.role === fromRole && t.module === task.module);
    if (!open) throw new Error(`No ${task.role} task for ${task.module} is open`);
    return open.id;
  }

  async claimRefusals(project: string): Promise<{ member: string; reason: string }[]> {
    return this.github.claimRefusals(project).map(({ member, reason }) => ({ member, reason }));
  }

  /** The log's claims, each with the role and module of the task it names. */
  async claimRecords(project: string): Promise<(ClaimedTask & { claimedAt: string })[]> {
    const tasks = this.github.openTasksOf(project);
    return (await this.github.read(project)).flatMap((event) => {
      if (!("claimed" in event)) return [];
      const task = tasks.find((t) => t.id === event.claimed.task);
      if (!task) return [];
      return [
        {
          role: roleName(task.role),
          module: task.module,
          member: event.claimed.member,
          claimedAt: event.decidedAt,
        },
      ];
    });
  }

  async leaseNotices(project: string): Promise<string[]> {
    return this.github.leaseNotices(project);
  }

  /** As an administrator could: the board shows the task claimed, and Divlab's log has nothing. */
  async markClaimedWithoutDivlab(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<void> {
    await this.github.markClaimed({ project: task.project, task: this.openTaskId(task), member });
  }

  async claimedWithoutClaimAlerts(project: string): Promise<{ role: string; module: string }[]> {
    return this.github
      .claimedWithoutClaimAlerts(project)
      .map(({ role, module }) => ({ role: roleName(role), module }));
  }

  async trustFor(member: string, role: string): Promise<void> {
    const recorded = trustLevelOf(await this.github.governanceFile(), member);
    if (trustAllows(recorded, roleId(role))) return;
    const level = TRUST_LEVELS.find((level) => trustAllows(level, roleId(role)));
    if (level) this.github.setTrustLevel(member, level);
  }

  async setUpModuleAt(task: { project: string; role: string; module: string }): Promise<void> {
    for (const open of this.github.openTasksOf(task.project)) {
      if (open.module === task.module) await this.github.close(task.project, open.id);
    }
    await this.github.post({
      project: task.project,
      role: roleId(task.role),
      module: task.module,
      decidedOn: `feedback/${task.module}-earlier-work.md`,
    });
  }

  async setTrustLevel(member: string, level: string): Promise<void> {
    this.github.setTrustLevel(member, level);
  }

  async linkAccount(member: string, account: string): Promise<void> {
    this.github.linkAccount(member, account);
  }

  /** The member asks for work through the CLI their plugin calls, reading the fake GitHub. */
  async offeredTasks(member: string): Promise<{ role: string; module: string }[]> {
    const offers = await askForWork(member, {
      names: async () => [...this.github.repositories.keys()],
      readyTasks: async (project) =>
        this.github.readyTasks(project).map(({ id, role, module }) => ({ id, role, module })),
      log: (project) => this.github.read(project),
      governanceFile: () => this.github.governanceFile(),
    });
    return offers.map(({ role, module }) => ({ role: roleName(role), module }));
  }

  /** The member asks for their status through the CLI their plugin calls, reading the fake GitHub. */
  async heldTasks(
    member: string,
  ): Promise<{ role: string; module: string; leaseRunsOut?: string }[]> {
    const held = await memberStatus(member, {
      names: async () => [...this.github.repositories.keys()],
      heldTasks: async (project, holder) =>
        this.github
          .tasksHeld(project)
          .filter((task) => task.claimedBy === holder)
          .map(({ id, role, module }) => ({ id, role, module })),
      log: (project) => this.github.read(project),
      pullRequestsOpenBy: async (project, holder) =>
        this.github.pullRequestsOpenBy(project, holder),
    });
    return held.map(({ role, module, leaseRunsOut, pullRequest }) => ({
      role: roleName(role),
      module,
      ...(leaseRunsOut === undefined ? {} : { leaseRunsOut }),
      ...(pullRequest === undefined ? {} : { draft: pullRequest.draft }),
    }));
  }

  /** The tasks each member has prepared on their machine, as `member project#task`. */
  private readonly preparedHere = new Set<string>();
  /** What each task's folder holds on its member's machine, by `member project#task`. */
  private readonly folders = new Map<string, { path: string; text: string }[]>();

  /**
   * The member's plugin prepares a task through the CLI. Fetching the files is git's part, on
   * the member's machine; the driver keeps a record that it was done there, and of the work so
   * far the CLI brings back from the member's open pull request.
   */
  async prepare(task: { project: string; role: string; module: string }, member: string) {
    const id = this.openTaskId(task);
    const held = await this.github.task(task.project, id);
    const plan = preparation("anarres-project", task.project, held, member);
    if ("refused" in plan) throw new Error(plan.refused);
    if (held === undefined) throw new Error(`No task ${id} in ${task.project}`);
    const folder: { path: string; text: string }[] = [];
    await restoreDraft(
      { project: task.project, task: id },
      held,
      member,
      {
        pullRequestsOpenBy: async (project, author) =>
          this.github.pullRequestsOpenBy(project, author),
        changedFiles: (project, pullRequest) => this.github.changedFiles(project, pullRequest),
      },
      (path, text) => folder.push({ path, text }),
    );
    this.preparedHere.add(`${member} ${task.project}#${id}`);
    this.folders.set(`${member} ${task.project}#${id}`, folder);
    return taskFolder({ project: task.project, task: id });
  }

  async workInFolder(task: { project: string; role: string; module: string }, member: string) {
    const files = this.folders.get(`${member} ${task.project}#${this.openTaskId(task)}`) ?? [];
    return files
      .filter(({ path }) => path.startsWith("feedback/"))
      .map(({ path }) => signalName(path));
  }

  /** The member's plugin resumes a task through the CLI, in a new session on the same machine. */
  async resume(task: { project: string; role: string; module: string }, member: string) {
    const id = this.openTaskId(task);
    const resumed = resumption(
      { project: task.project, task: id },
      await this.github.task(task.project, id),
      member,
      { prepared: this.preparedHere.has(`${member} ${task.project}#${id}`) },
    );
    return "folder" in resumed ? { workIn: resumed.folder } : resumed;
  }

  /** The member's merged work, as their CLI's status reads it from the fake GitHub's logs. */
  async contributionHistory(member: string): Promise<{ role: string; module: string }[]> {
    const done = await contributions(member, {
      names: async () => [...this.github.repositories.keys()],
      log: (project) => this.github.read(project),
    });
    return done.map(({ role, module }) => ({ role: roleName(role), module }));
  }

  async timePasses(hours: number): Promise<void> {
    this.now = new Date(this.now.getTime() + hours * 60 * 60 * 1000);
  }

  async divlabChecksLeases(project: string): Promise<void> {
    await onLeaseCheck(project, this.github, this.github, this.clock);
    await this.afterRun(project);
  }

  /** The member's plugin submits through the CLI; the fake GitHub plays the member's fork. */
  async submitThroughPlugin(work: AcceptedWork): Promise<void> {
    const id = this.openTaskId(work);
    const onBranch: { path: string; text: string }[] = [];
    const said = await submit(
      { project: work.project, role: roleId(work.role), module: work.module, task: id },
      workFiles(work, id),
      { draft: false },
      {
        forkOf: async (project) => `${work.member}/${project}`,
        branch: async () => {},
        putFile: async (_fork, _branch, path, text) => void onBranch.push({ path, text }),
        openPullRequest: async (project) => {
          const pullRequest = this.github.openPullRequest(project, onBranch, {
            author: work.member,
            task: id,
          });
          await onPullRequest(
            project,
            pullRequest,
            this.github,
            this.github,
            this.github,
            this.clock,
          );
          await this.afterRun(project);
          return pullRequest;
        },
      },
    );
    if (said.startsWith("Not submitted")) throw new Error(said);
  }

  /** The member opens a draft for the task they hold, as their plugin will, early in the work. */
  async submitDraftWork(work: AcceptedWork): Promise<void> {
    const id = this.openTaskId(work);
    const { path, text } = feedbackSignalFile(work, id);
    const pullRequest = this.github.openPullRequest(work.project, [{ path, text }], {
      author: work.member,
      draft: true,
      task: id,
    });
    await onPullRequest(
      work.project,
      pullRequest,
      this.github,
      this.github,
      this.github,
      this.clock,
    );
    await this.afterRun(work.project);
  }

  /** The checks workflow's completion starts Divlab's run for the commit, as on GitHub. */
  async testsFinish(work: AcceptedWork, passed: boolean): Promise<void> {
    const pullRequest = this.github.pullRequestFor(work.project, work.feedbackSignal);
    const commit = this.github.finishTests(pullRequest, passed);
    await onChecked(work.project, commit, this.github, this.github, this.github, this.clock);
    await this.afterRun(work.project);
  }

  /** The push to the draft's branch starts Divlab's pull request run again, as on GitHub. */
  async pushToDraft(work: AcceptedWork): Promise<void> {
    const pullRequest = this.github.pushToDraft(work.project, work.member, otherFiles(work));
    await onPullRequest(
      work.project,
      pullRequest,
      this.github,
      this.github,
      this.github,
      this.clock,
    );
    await this.afterRun(work.project);
  }

  /** The member comments to give the task back, and the comment's run wakes Divlab. */
  async release(task: { project: string; role: string; module: string }, member: string) {
    const id = this.openTaskId(task);
    this.github.comment(task.project, id, member, "/release", this.clock().toISOString());
    await onRelease(task.project, { task: id, member }, this.github, this.github, this.clock);
    await this.afterRun(task.project);
  }

  async claimedTasks(project: string): Promise<ClaimedTask[]> {
    return this.github.tasksHeld(project).map(({ role, module, claimedBy }) => ({
      role: roleName(role),
      module,
      member: claimedBy,
    }));
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    return this.github
      .readyTasks(project)
      .map(({ role, module, feedbackSignal, continuation }) => ({
        role: roleName(role),
        module,
        ...(feedbackSignal === undefined ? {} : { feedbackSignal: signalName(feedbackSignal) }),
        ...(continuation ? { continuation } : {}),
      }));
  }
}
