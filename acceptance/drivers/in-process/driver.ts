import { ROLE_NAMES, type Role } from "@anarres/core";
import { onWorkAccepted, type RoutingEvent } from "@anarres/divlab";
import type {
  AcceptedWork,
  CoordinatorAlert,
  Driver,
  ReadyTask,
  RoutingRecord,
} from "../driver.ts";
import { FakeGitHub } from "./fake-github.ts";

/** Feeds events straight into Divlab, with an in-memory fake of GitHub. */
export class InProcessDriver implements Driver {
  private readonly github = new FakeGitHub();

  async createProject(project: string, modules: string[]): Promise<void> {
    this.github.repositories.set(project, modules);
  }

  async acceptWork(work: AcceptedWork): Promise<void> {
    const fromRole = roleId(work.role);
    // The member's pull request names the task it is for; Divlab reads what that task recorded.
    const task = this.github
      .readyTasks(work.project)
      .find((task) => task.role === fromRole && task.module === work.module);
    if (task) this.github.close(task);
    await onWorkAccepted(
      {
        project: work.project,
        module: work.module,
        fromRole,
        // Scenarios say "conditional pass"; feedback signals carry "conditional_pass".
        verdict: work.verdict.replace(" ", "_"),
        impediments: work.impediments.map((name) => ({ type: name.replace(" ", "_") })),
        feedbackSignal: work.feedbackSignal,
        ...(task?.researchFor === undefined ? {} : { researchFor: task.researchFor }),
      },
      this.github,
      this.github,
    );
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
      ...(feedbackSignal === undefined ? {} : { feedbackSignal }),
    }));
  }
}

/** A routing record as the scenarios speak of it: role names and plain words, not ids. */
function inScenarioWords({ work, decision, reason }: RoutingEvent): RoutingRecord {
  return {
    work: {
      role: roleNameOf(work.fromRole),
      module: work.module,
      verdict: words(work.verdict),
      impediments: work.impediments.map((impediment) => words(impediment.type)),
      feedbackSignal: work.feedbackSignal,
    },
    outcome:
      "tasks" in decision
        ? { tasksFor: decision.tasks.map((task) => roleName(task.role)) }
        : "alert" in decision
          ? { alert: true }
          : { moduleDone: true },
    reason:
      "impediment" in reason
        ? { ...reason, impediment: words(reason.impediment) }
        : "role" in reason
          ? { ...reason, role: roleName(reason.role) }
          : reason,
  };
}

// Scenarios speak of roles by name ("Security & Quality"); Divlab by id ("security-and-quality").
const roleName = (role: Role) => ROLE_NAMES[role];

// Divlab records the role as the work gave it, which need not be a role Divlab knows.
function roleNameOf(id: string): string {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => role === id);
  return role ? ROLE_NAMES[role] : id;
}

// Feedback signals say "upstream_ambiguity"; scenarios say "upstream ambiguity".
const words = (id: string) => id.replaceAll("_", " ");

function roleId(name: string): Role {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => ROLE_NAMES[role] === name);
  if (!role) throw new Error(`No role is called "${name}"`);
  return role;
}
