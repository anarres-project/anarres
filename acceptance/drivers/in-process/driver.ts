import { onMerge } from "@anarres/divlab";
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

/** Merges work into an in-memory fake of GitHub and runs Divlab on each merge. */
export class InProcessDriver implements Driver {
  private readonly github = new FakeGitHub();

  async createProject(project: string, modules: string[]): Promise<void> {
    this.github.repositories.set(project, modules);
  }

  async acceptWork(work: AcceptedWork): Promise<void> {
    const fromRole = roleId(work.role);
    // The member's feedback signal names the task the work was for.
    const task = this.github
      .readyTasks(work.project)
      .find((task) => task.role === fromRole && task.module === work.module);
    const { path, text } = feedbackSignalFile(work, task?.id);
    this.github.merge(work.project, path, text);
    await onMerge(work.project, this.github, this.github, this.github);
  }

  async routingRecords(project: string): Promise<RoutingRecord[]> {
    return (await this.github.read(project)).map(inScenarioWords);
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

  async readyTasks(project: string): Promise<ReadyTask[]> {
    return this.github.readyTasks(project).map(({ role, module, feedbackSignal }) => ({
      role: roleName(role),
      module,
      ...(feedbackSignal === undefined ? {} : { feedbackSignal: signalName(feedbackSignal) }),
    }));
  }
}
