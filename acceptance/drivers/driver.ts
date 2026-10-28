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
  /** The member's feedback signal file is named in more than a plain name. */
  fileNameNotPlain?: boolean;
  /** The member's feedback signal leaves out its verdict. */
  withoutVerdict?: boolean;
  /** The member's work also changes the module's tests. */
  changesTests?: boolean;
  /** The member hands over partial work, having run out of allowance. */
  partial?: boolean;
  /** The member's feedback signal does not say which task the work was for. */
  withoutTask?: boolean;
  /** The member's feedback signal names the role's task on the module that is already done. */
  forFinishedTask?: boolean;
  /** The member's feedback signal names the role's task on this module, not the work's own. */
  forTaskOn?: string;
  /** The project's tests fail on the member's work. */
  testsFail?: boolean;
  /** The project's tests are still running on the member's work. */
  testsRunning?: boolean;
  /** The new tests in the member's Test work pass before any code exists: they test nothing. */
  newTestsPass?: boolean;
};

export type ReadyTask = {
  role: string;
  module: string;
  feedbackSignal?: string;
  /** A continuation of partial work (decision 0008). */
  continuation?: boolean;
};

/** A task a member holds. */
export type ClaimedTask = {
  role: string;
  module: string;
  member: string;
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
  /** When Divlab decided, as it recorded it. */
  decidedAt?: string;
};

/** How the DSL reaches Anarres. Each driver invokes the system its own way. */
export interface Driver {
  /** `unprotected`: set up without protecting main, as a misconfigured project would be. */
  createProject(
    project: string,
    modules: string[],
    options?: { unprotected?: boolean },
  ): Promise<void>;
  /** A new project is set up and started, as whoever starts a project does (decision 0013). */
  startProject(project: string): Promise<void>;
  /**
   * A project whose repository declares no toolchain is set up: what whoever started it is told,
   * or nothing if it was set up all the same.
   */
  startProjectWithoutToolchain(project: string, modules: string[]): Promise<string>;
  /** Divlab merges the member's work but stops before it records and routes it. */
  interruptAfterMerging(work: AcceptedWork): Promise<void>;
  /** Divlab merges the member's work and records its decision, but stops before acting on it. */
  interruptAfterRecording(work: AcceptedWork): Promise<void>;
  /** Divlab acts on the project again, as the next push to main would make it. */
  divlabActsAgain(project: string): Promise<void>;
  /** The member's work lands on main without going through Divlab. */
  mergeDirectly(work: AcceptedWork): Promise<void>;
  /** The feedback signals PDC coordinators were alerted had reached main without Divlab. */
  unmergedWorkAlerts(project: string): Promise<string[]>;
  acceptWork(work: AcceptedWork): Promise<void>;
  /** The member opens a pull request with their work, for Divlab to validate and merge. */
  submitWork(work: AcceptedWork): Promise<void>;
  /** The member's plugin submits their work for the task they hold, through the CLI's submit. */
  submitThroughPlugin(work: AcceptedWork): Promise<void>;
  /** The member opens a draft pull request with their work so far. */
  submitDraftWork(work: AcceptedWork): Promise<void>;
  /** The project's tests finish on the member's work, and the check's completion wakes Divlab. */
  testsFinish(work: AcceptedWork, passed: boolean): Promise<void>;
  /** The member pushes more work to their draft for the task, which wakes Divlab again. */
  pushToDraft(work: AcceptedWork): Promise<void>;
  /** Members open pull requests together, before Divlab has decided on any of them. */
  submitWorkAtOnce(works: AcceptedWork[]): Promise<void>;
  /** The feedback signals of the submitted work Divlab has merged. */
  mergedWork(project: string): Promise<string[]>;
  /** The commits PDC coordinators were alerted reached main without Divlab. */
  changesNotByDivlab(project: string): Promise<string[]>;
  /** An administrator, not Divlab, writes to the project's main branch; true if it took. */
  changeMainDirectly(project: string): Promise<boolean>;
  /** What the project lets act on members' pull requests: "Divlab" for Divlab's checks. */
  pullRequestChecks(project: string): Promise<string[]>;
  /** How many times PDC coordinators were alerted that the project's main is unprotected. */
  unprotectedMainAlerts(project: string): Promise<number>;
  /** What Divlab told members whose work it did not merge. */
  refusals(project: string): Promise<string[]>;
  readyTasks(project: string): Promise<ReadyTask[]>;
  /** The member asks to claim the project's ready task for that role and module. */
  claim(task: { project: string; role: string; module: string }, member: string): Promise<void>;
  /** The member claims the issue that says the module is done, as if it were a task. */
  claimFinishedModule(module: { project: string; module: string }, member: string): Promise<void>;
  /** The member opens an issue of their own in the project. */
  openIssueAs(project: string, member: string): Promise<void>;
  /** The member claims the issue `owner` opened, as if it were a task. */
  claimIssueOf(project: string, owner: string, member: string): Promise<void>;
  /** The member claims PDC coordinators' alert about the module, as if it were a task. */
  claimAlert(alert: { project: string; module: string }, member: string): Promise<void>;
  /** The member claims the task for that role and module once its work is done and it is closed. */
  claimFinished(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<void>;
  /**
   * The members comment to claim the task one after another, in the order given, before Divlab
   * acts on any; Divlab then hears of `heardFirst`'s claim before the others.
   */
  claimTogether(
    task: { project: string; role: string; module: string },
    members: string[],
    heardFirst: string,
  ): Promise<void>;
  claimedTasks(project: string): Promise<ClaimedTask[]>;
  /** The member asks to give the task back, before its lease runs out. */
  release(task: { project: string; role: string; module: string }, member: string): Promise<void>;
  /** The tasks a member is offered when they ask for work, as their plugin shows them. */
  offeredTasks(member: string): Promise<{ role: string; module: string }[]>;
  /** The member's work Divlab has merged, as their plugin's status shows it. */
  contributionHistory(member: string): Promise<{ role: string; module: string }[]>;
  /** The member's plugin prepares a task they hold, on their machine; gives where its work is. */
  prepare(task: { project: string; role: string; module: string }, member: string): Promise<string>;
  /**
   * The member's plugin resumes a task in a new session: where its work is, or why not.
   */
  resume(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<{ workIn: string } | { refused: string }>;
  /** The feedback signals in the task's folder on the member's machine: their work there. */
  workInFolder(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<string[]>;
  /**
   * The tasks a member holds, when each lease runs out, and whether their open pull request for
   * it is a draft, as their plugin shows them.
   */
  heldTasks(
    member: string,
  ): Promise<{ role: string; module: string; leaseRunsOut?: string; draft?: boolean }[]>;
  /** PDC coordinators record the member at a trust level, as the governance file does. */
  setTrustLevel(member: string, level: string): Promise<void>;
  /** The member is trusted as far as the role needs, as a member a scenario does not name is. */
  trustFor(member: string, role: string): Promise<void>;
  /**
   * The module as it stands when the role's work is next: its open tasks done and a ready task
   * for the role, as Divlab would have left them, for a scenario that begins partway along.
   */
  setUpModuleAt(task: { project: string; role: string; module: string }): Promise<void>;
  /** PDC coordinators link a second account to a member in the governance file. */
  linkAccount(member: string, account: string): Promise<void>;
  /** Divlab's clock moves on, as time passes for a project. */
  timePasses(hours: number): Promise<void>;
  /** Divlab's scheduled run checks the project's leases, as it does every hour. */
  divlabChecksLeases(project: string): Promise<void>;
  /** Someone other than Divlab marks the task claimed for the member: Divlab records no claim. */
  markClaimedWithoutDivlab(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<void>;
  /** The tasks PDC coordinators were alerted were shown as claimed with no claim in the log. */
  claimedWithoutClaimAlerts(project: string): Promise<{ role: string; module: string }[]>;
  /** The members Divlab told that their lease ran out. */
  leaseNotices(project: string): Promise<string[]>;
  /** The claims Divlab's log records it granted, each with when. */
  claimRecords(project: string): Promise<(ClaimedTask & { claimedAt: string })[]>;
  /** What Divlab told members whose claims it refused. */
  claimRefusals(project: string): Promise<{ member: string; reason: string }[]>;
  coordinatorAlerts(project: string): Promise<CoordinatorAlert[]>;
  doneModules(project: string): Promise<string[]>;
  routingRecords(project: string): Promise<RoutingRecord[]>;
  /** The project's test counts Divlab recorded, merge by merge, oldest first (decision 0012). */
  testCounts(project: string): Promise<{ total: number; passed: number; failed: number }[]>;
}
