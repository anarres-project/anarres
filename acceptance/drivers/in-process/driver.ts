import { askForWork, claim } from "@anarres/cli";
import {
  CLAIM,
  checkMain,
  checkProtection,
  onClaim,
  onLeaseCheck,
  onMerge,
  onPullRequest,
  onRelease,
  routingDecisions,
  setUpProject,
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
    const task = this.github
      .openTasksOf(work.project)
      .find((task) => task.role === fromRole && task.module === work.module);
    const pullRequest = this.github.openPullRequest(work.project, workFiles(work, task?.id), {
      author: work.member,
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

  /** The member comments to claim the task, and the comment's run wakes Divlab, as on GitHub. */
  async claim(task: { project: string; role: string; module: string }, member: string) {
    const id = this.openTaskId(task);
    // The member claims through their CLI, as the plugin does: it comments on the task's issue.
    await claim(`${task.project}#${id}`, {
      askToClaim: async (project, issue) =>
        this.github.comment(project, issue, member, CLAIM, this.clock().toISOString()),
    });
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

  async timePasses(hours: number): Promise<void> {
    this.now = new Date(this.now.getTime() + hours * 60 * 60 * 1000);
  }

  async divlabChecksLeases(project: string): Promise<void> {
    await onLeaseCheck(project, this.github, this.github, this.clock);
    await this.afterRun(project);
  }

  /** The member opens a draft for the task they hold, as their plugin will, early in the work. */
  async submitDraftWork(work: AcceptedWork): Promise<void> {
    const id = this.openTaskId(work);
    const { path, text } = feedbackSignalFile(work, id);
    const pullRequest = this.github.openPullRequest(work.project, [{ path, text }], {
      author: work.member,
      draft: true,
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

  /** The member comments to give the task back, and the comment's run wakes Divlab. */
  async release(task: { project: string; role: string; module: string }, member: string) {
    const id = this.openTaskId(task);
    this.github.comment(task.project, id, member, "/release", this.clock().toISOString());
    await onRelease(task.project, { task: id, member }, this.github, this.github, this.clock);
    await this.afterRun(task.project);
  }

  async claimedTasks(project: string): Promise<ClaimedTask[]> {
    return this.github.claimedTasks(project).map(({ role, module, claimedBy }) => ({
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
