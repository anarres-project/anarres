import { type Role, route } from "@anarres/core";

export type WorkAccepted = {
  project: string;
  module: string;
  fromRole: string;
  verdict: string;
  impediments: { type: string }[];
};

export type PostedTask = {
  project: string;
  role: Role;
  module: string;
};

/** Where Divlab posts tasks: GitHub issues in production, a fake in fast tests. */
export interface TaskBoard {
  post(task: PostedTask): Promise<void>;
}

export async function onWorkAccepted(event: WorkAccepted, board: TaskBoard): Promise<void> {
  const decision = route(event);
  if ("alert" in decision) return;
  for (const task of decision.tasks) {
    await board.post({ project: event.project, ...task });
  }
}
