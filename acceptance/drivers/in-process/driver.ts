import { ROLE_NAMES, type Role } from "@anarres/core";
import { onWorkAccepted } from "@anarres/divlab";
import type { AcceptedWork, CoordinatorAlert, Driver, ReadyTask } from "../driver.ts";
import { FakeGitHub } from "./fake-github.ts";

/** Feeds events straight into Divlab, with an in-memory fake of GitHub. */
export class InProcessDriver implements Driver {
  private readonly github = new FakeGitHub();

  async createProject(project: string, modules: string[]): Promise<void> {
    this.github.repositories.set(project, modules);
  }

  async acceptWork(work: AcceptedWork): Promise<void> {
    await onWorkAccepted(
      {
        project: work.project,
        module: work.module,
        fromRole: roleId(work.role),
        // Scenarios say "conditional pass"; feedback signals carry "conditional_pass".
        verdict: work.verdict.replace(" ", "_"),
        impediments: work.impediments.map((name) => ({ type: name.replace(" ", "_") })),
        feedbackSignal: work.feedbackSignal,
      },
      this.github,
    );
  }

  async coordinatorAlerts(project: string): Promise<CoordinatorAlert[]> {
    return this.github.coordinatorAlerts(project).map((alert) => ({ module: alert.module }));
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    return this.github.readyTasks(project).map(({ role, module, feedbackSignal }) => ({
      role: roleName(role),
      module,
      ...(feedbackSignal === undefined ? {} : { feedbackSignal }),
    }));
  }
}

// Scenarios speak of roles by name ("Security & Quality"); Divlab by id ("security-and-quality").
const roleName = (role: Role) => ROLE_NAMES[role];

function roleId(name: string): Role {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => ROLE_NAMES[role] === name);
  if (!role) throw new Error(`No role is called "${name}"`);
  return role;
}
