import { type Role, type RoutingRecord, routingRecord } from "@anarres/core";

export type WorkAccepted = {
  project: string;
  module: string;
  fromRole: string;
  verdict: string;
  impediments: { type: string }[];
  feedbackSignal: string;
  /** For Research work: the role its task was for, as recorded on the task. */
  researchFor?: string;
};

export type PostedTask = {
  project: string;
  role: Role;
  module: string;
  feedbackSignal?: string;
  researchFor?: string;
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
  markModuleDone(module: { project: string; module: string }): Promise<void>;
}

/** A routing decision as recorded in a project's event log. */
export type RoutingEvent = { project: string } & RoutingRecord;

/** Where Divlab records its decisions: one file per event in the project repository. */
export interface EventLog {
  append(event: RoutingEvent): Promise<void>;
}

export async function onWorkAccepted(
  event: WorkAccepted,
  board: TaskBoard,
  log: EventLog,
): Promise<void> {
  const { project, ...work } = event;
  const record = routingRecord(work);
  await log.append({ project, ...record });
  const { decision } = record;
  if ("alert" in decision) {
    await board.alertCoordinators({
      project: event.project,
      module: event.module,
      reason: decision.alert.reason,
    });
    return;
  }
  if ("moduleDone" in decision) {
    await board.markModuleDone({ project: event.project, module: event.module });
    return;
  }
  for (const task of decision.tasks) {
    await board.post({ project: event.project, ...task });
  }
}
