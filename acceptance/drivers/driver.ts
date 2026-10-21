export type AcceptedWork = {
  project: string;
  module: string;
  role: string;
  member: string;
  feedbackSignal: string;
  verdict: string;
  impediments: string[];
  /** The member's work leaves its feedback signal out. */
  withoutFeedbackSignal?: boolean;
  /** The member's feedback signal names its module in more than a plain name. */
  moduleNotPlain?: boolean;
};

export type ReadyTask = {
  role: string;
  module: string;
  feedbackSignal?: string;
};

export type CoordinatorAlert = {
  module: string;
  work: RoutingRecord["work"];
  reason: RoutingRecord["reason"];
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
  reason: { rule: string; impediment?: string; role?: string };
};

/** How the DSL reaches Anarres. Each driver invokes the system its own way. */
export interface Driver {
  /** `unprotected`: set up without protecting main, as a misconfigured project would be. */
  createProject(
    project: string,
    modules: string[],
    options?: { unprotected?: boolean },
  ): Promise<void>;
  /** The member's work lands on main without going through Divlab. */
  mergeDirectly(work: AcceptedWork): Promise<void>;
  /** The feedback signals PDC coordinators were alerted had reached main without Divlab. */
  unmergedWorkAlerts(project: string): Promise<string[]>;
  acceptWork(work: AcceptedWork): Promise<void>;
  /** The member opens a pull request with their work, for Divlab to validate and merge. */
  submitWork(work: AcceptedWork): Promise<void>;
  /** The feedback signals of the submitted work Divlab has merged. */
  mergedWork(project: string): Promise<string[]>;
  /** An administrator, not Divlab, writes to the project's main branch; true if it took. */
  changeMainDirectly(project: string): Promise<boolean>;
  /** What Divlab told members whose work it did not merge. */
  refusals(project: string): Promise<string[]>;
  readyTasks(project: string): Promise<ReadyTask[]>;
  coordinatorAlerts(project: string): Promise<CoordinatorAlert[]>;
  doneModules(project: string): Promise<string[]>;
  routingRecords(project: string): Promise<RoutingRecord[]>;
}
