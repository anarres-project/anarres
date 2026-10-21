import { onMerge, onPullRequest, routingDecisions, setUpProject } from "@anarres/divlab";
import type {
  AcceptedWork,
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
import { FakeGitHub } from "./fake-github.ts";

/** Submits work to an in-memory fake of GitHub as pull requests, for Divlab to merge. */
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
    await onMerge(work.project, this.github, this.github, this.github);
  }

  async unmergedWorkAlerts(project: string): Promise<string[]> {
    return this.github.unmergedWorkAlerts(project).map(signalName);
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
    await onPullRequest(work.project, pullRequest, this.github, this.github, this.github);
  }

  async mergedWork(project: string): Promise<string[]> {
    return this.github
      .mergedFiles(project)
      .filter((path) => path.startsWith("feedback/"))
      .map(signalName);
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    return this.github.readyTasks(project).map(({ role, module, feedbackSignal }) => ({
      role: roleName(role),
      module,
      ...(feedbackSignal === undefined ? {} : { feedbackSignal: signalName(feedbackSignal) }),
    }));
  }
}
