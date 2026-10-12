export type AcceptedWork = {
  project: string;
  module: string;
  role: string;
  member: string;
  feedbackSignal: string;
  verdict: string;
  impediments: string[];
};

export type ReadyTask = {
  role: string;
  module: string;
  feedbackSignal?: string;
};

export type CoordinatorAlert = {
  module: string;
};

/** What Divlab decided about a piece of accepted work, and which rule decided it. */
export type RoutingRecord = {
  work: {
    role: string;
    module: string;
    verdict: string;
    impediments: string[];
    feedbackSignal: string;
  };
  outcome: { tasksFor: string[] } | { alert: true } | { moduleDone: true };
  reason: { rule: string; impediment?: string };
};

/** How the DSL reaches Anarres. Each driver invokes the system its own way. */
export interface Driver {
  createProject(project: string, modules: string[]): Promise<void>;
  acceptWork(work: AcceptedWork): Promise<void>;
  readyTasks(project: string): Promise<ReadyTask[]>;
  coordinatorAlerts(project: string): Promise<CoordinatorAlert[]>;
  doneModules(project: string): Promise<string[]>;
  routingRecords(project: string): Promise<RoutingRecord[]>;
}
