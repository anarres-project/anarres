import type { AcceptedWork, Driver, ReadyTask } from "./driver.ts";
import { NotYetImplemented } from "./errors.ts";

/** Feeds events straight into Divlab, with an in-memory fake of GitHub. */
export class InProcessDriver implements Driver {
  private readonly projects = new Map<string, string[]>();

  async createProject(project: string, modules: string[]): Promise<void> {
    this.projects.set(project, modules);
  }

  async acceptWork(_work: AcceptedWork): Promise<void> {
    throw new NotYetImplemented("Divlab routing accepted work");
  }

  async readyTasks(_project: string): Promise<ReadyTask[]> {
    throw new NotYetImplemented("listing ready tasks");
  }
}
