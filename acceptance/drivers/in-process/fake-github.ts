import type { PostedTask, TaskBoard } from "@anarres/divlab";

/** An in-memory stand-in for the GitHub repositories and issues Divlab works with. */
export class FakeGitHub implements TaskBoard {
  readonly repositories = new Map<string, string[]>();
  private readonly openTasks: PostedTask[] = [];

  async post(task: PostedTask): Promise<void> {
    this.openTasks.push(task);
  }

  readyTasks(project: string): PostedTask[] {
    return this.openTasks.filter((task) => task.project === project);
  }
}
