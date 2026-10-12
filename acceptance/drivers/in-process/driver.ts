import { onWorkAccepted } from "@anarres/divlab";
import type { AcceptedWork, Driver, ReadyTask } from "../driver.ts";
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
        verdict: work.verdict,
      },
      this.github,
    );
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    return this.github
      .readyTasks(project)
      .map((task) => ({ role: roleName(task.role), module: task.module }));
  }
}

// Until core names the roles (see the test list), the driver maps between the scenario's
// role names ("Specification") and the system's role ids ("specification").
const roleId = (name: string) => name.toLowerCase();
const roleName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
