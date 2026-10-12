import { type Role, route } from "@anarres/core";

export type WorkAccepted = {
  project: string;
  module: string;
  fromRole: string;
  verdict: string;
  impediments: { type: string }[];
  feedbackSignal: string;
};

export type PostedTask = {
  project: string;
  role: Role;
  module: string;
  feedbackSignal?: string;
};

export type CoordinatorAlert = {
  project: string;
  module: string;
  reason: string;
};

/** Where Divlab posts tasks and alerts: GitHub issues in production, a fake in fast tests. */
export interface TaskBoard {
  post(task: PostedTask): Promise<void>;
  alertCoordinators(alert: CoordinatorAlert): Promise<void>;
}

export async function onWorkAccepted(event: WorkAccepted, board: TaskBoard): Promise<void> {
  const decision = route(event);
  if ("alert" in decision) {
    await board.alertCoordinators({
      project: event.project,
      module: event.module,
      reason: decision.alert.reason,
    });
    return;
  }
  for (const task of decision.tasks) {
    await board.post({ project: event.project, ...task });
  }
}
