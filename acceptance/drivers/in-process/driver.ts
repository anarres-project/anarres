import {
  checkProtection,
  onClaim,
  onMerge,
  onPullRequest,
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
} from "../scenario-words.ts";
import { FakeGitHub, Interrupted } from "./fake-github.ts";

/** Submits work to an in-memory fake of GitHub as pull requests, for Divlab to merge. */
/** Divlab's clock in-process: a fixed time, so no scenario reads the wall clock. */
const CLOCK = () => new Date("2026-10-22T09:00:00Z");

export class InProcessDriver implements Driver {
  private readonly github = new FakeGitHub();

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

  async changeMainDirectly(project: string): Promise<boolean> {
    return this.github.changeMainDirectly(project);
  }

  /** The work lands on main without a pull request, and the push wakes Divlab, as on GitHub. */
  async mergeDirectly(work: AcceptedWork): Promise<void> {
    const { path, text } = feedbackSignalFile(work);
    this.github.mergeFile(work.project, path, text);
    await onMerge(work.project, this.github, this.github, this.github, CLOCK);
    await checkProtection(work.project, this.github, this.github);
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
    await onMerge(project, this.github, this.github, this.github, CLOCK);
    await checkProtection(project, this.github, this.github);
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
    // The member's feedback signal names the task the work was for.
    const task = this.github
      .readyTasks(work.project)
      .find((task) => task.role === fromRole && task.module === work.module);
    const { path, text } = feedbackSignalFile(work, task?.id);
    const pullRequest = this.github.openPullRequest(work.project, [{ path, text }]);
    await onPullRequest(work.project, pullRequest, this.github, this.github, this.github, CLOCK);
    await checkProtection(work.project, this.github, this.github);
  }

  /** All the pull requests are opened first; then Divlab takes each in turn, as queued runs do. */
  async submitWorkAtOnce(works: AcceptedWork[]): Promise<void> {
    const opened = works.map((work) => {
      const fromRole = roleId(work.role);
      const task = this.github
        .readyTasks(work.project)
        .find((task) => task.role === fromRole && task.module === work.module);
      const { path, text } = feedbackSignalFile(work, task?.id);
      return {
        project: work.project,
        pullRequest: this.github.openPullRequest(work.project, [{ path, text }]),
      };
    });
    for (const { project, pullRequest } of opened) {
      await onPullRequest(project, pullRequest, this.github, this.github, this.github, CLOCK);
      await checkProtection(project, this.github, this.github);
    }
  }

  async mergedWork(project: string): Promise<string[]> {
    return this.github
      .mergedFiles(project)
      .filter((path) => path.startsWith("feedback/"))
      .map(signalName);
  }

  /** The member's claim reaches Divlab as it would from their comment on the task. */
  async claim(task: { project: string; role: string; module: string }, member: string) {
    const fromRole = roleId(task.role);
    // A claimed task's issue is still there to comment on.
    const open = this.github
      .openTasksOf(task.project)
      .find((t) => t.role === fromRole && t.module === task.module);
    if (!open) throw new Error(`No ${task.role} task for ${task.module} is open`);
    await onClaim(task.project, { task: open.id, member }, this.github);
  }

  async claimRefusals(project: string): Promise<{ member: string; reason: string }[]> {
    return this.github.claimRefusals(project).map(({ member, reason }) => ({ member, reason }));
  }

  async claimedTasks(project: string): Promise<ClaimedTask[]> {
    return this.github.claimedTasks(project).map(({ role, module, claimedBy }) => ({
      role: roleName(role),
      module,
      member: claimedBy,
    }));
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    return this.github.readyTasks(project).map(({ role, module, feedbackSignal }) => ({
      role: roleName(role),
      module,
      ...(feedbackSignal === undefined ? {} : { feedbackSignal: signalName(feedbackSignal) }),
    }));
  }
}
