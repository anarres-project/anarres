import { ROLE_NAMES, type Role } from "@anarres/core";
import { onWorkAccepted } from "@anarres/divlab";
import type { AcceptedWork, CoordinatorAlert, Driver, ReadyTask } from "../driver.ts";
import { NotYetImplemented } from "../errors.ts";
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
      },
      this.github,
    );
  }

  async coordinatorAlerts(_project: string): Promise<CoordinatorAlert[]> {
    throw new NotYetImplemented("alerting PDC coordinators");
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    return this.github
      .readyTasks(project)
      .map((task) => ({ role: roleName(task.role), module: task.module }));
  }
}

// Scenarios speak of roles by name ("Security & Quality"); Divlab by id ("security-and-quality").
const roleName = (role: Role) => ROLE_NAMES[role];

function roleId(name: string): Role {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => ROLE_NAMES[role] === name);
  if (!role) throw new Error(`No role is called "${name}"`);
  return role;
}
