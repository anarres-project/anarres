import {
  type FeedbackSignal,
  type Role,
  type RoutingRecord,
  readFeedbackSignal,
  routingRecord,
  type Unreadable,
} from "@anarres/core";

export type WorkAccepted = {
  project: string;
  module: string;
  fromRole: string;
  verdict: string;
  impediments: { type: string }[];
  feedbackSignal: string;
  /** For Research work: the role its task was for, as recorded on the task. */
  researchFor?: string;
  /** The task the work was done for, as the member's pull request names it. */
  task?: string;
};

export type PostedTask = {
  project: string;
  role: Role;
  module: string;
  feedbackSignal?: string;
  researchFor?: string;
};

/** A routing decision as recorded in a project's event log. */
export type RoutingEvent = { project: string } & RoutingRecord;

/** An alert carries the whole decision: what the work reported, and why routing stopped. */
export type CoordinatorAlert = RoutingEvent;

/** Something reached main without Divlab merging it: never routed, recorded once (0005). */
export type NotAccepted = {
  project: string;
  notAccepted: { feedbackSignal: string; reason: string };
};

/** Where Divlab posts tasks and alerts: GitHub issues in production, a fake in fast tests. */
export interface TaskBoard {
  post(task: PostedTask): Promise<void>;
  alertCoordinators(alert: CoordinatorAlert): Promise<void>;
  /** PDC coordinators are told of something on main that Divlab did not accept. */
  alertNotAccepted(record: NotAccepted): Promise<void>;
  /** PDC coordinators are told that a project's main branch is not protected as it must be. */
  alertUnprotectedMain(project: string): Promise<void>;
  /** Whether such an alert is still open: coordinators close it once main is protected again. */
  unprotectedMainAlertOpen(project: string): Promise<boolean>;
  markModuleDone(module: { project: string; module: string }): Promise<void>;
  /** What Divlab recorded on a task it posted; undefined if there is no such task. */
  task(project: string, task: string): Promise<Pick<PostedTask, "researchFor"> | undefined>;
  /** The task is done: nobody can claim it any more. */
  close(project: string, task: string): Promise<void>;
}

/** The files merged to a project's main branch. */
export interface Repository {
  /** Where each feedback signal merged so far can be found, in no particular order. */
  feedbackSignals(project: string): Promise<string[]>;
}

/** Members' pull requests: what each would change, read as data, and merging it. */
export interface PullRequests {
  /** The commit the pull request is at now. */
  head(project: string, pullRequest: string): Promise<string>;
  changedFiles(project: string, pullRequest: string): Promise<{ path: string; text: string }[]>;
  /** Merges the pull request only if it is still at `head`. */
  merge(project: string, pullRequest: string, head: string): Promise<void>;
  /** Divlab will not merge it: the member is told why. */
  refuse(project: string, pullRequest: string, reason: string): Promise<void>;
}

/**
 * Divlab is about to merge a pull request, whose work it has read and checked. Written before the
 * merge, so a run that stops after merging can be finished from it, never from Git history.
 */
export type AboutToMerge = {
  project: string;
  aboutToMerge: { pullRequest: string; head: string; feedbackSignal: string; work: FeedbackSignal };
};

/** What the event log holds: routing decisions, merges begun, and what Divlab did not accept. */
export type LogEvent = RoutingEvent | AboutToMerge | NotAccepted;

/** The routing decisions in a log, which are all its history routing depends on. */
export const routingDecisions = (log: readonly LogEvent[]): RoutingEvent[] =>
  log.filter((event): event is RoutingEvent => "work" in event);

/** The feedback signal an event is about, whichever kind of event it is. */
export const signalOf = (event: LogEvent): string => {
  if ("work" in event) return event.work.feedbackSignal;
  if ("aboutToMerge" in event) return event.aboutToMerge.feedbackSignal;
  return event.notAccepted.feedbackSignal;
};

/** Where Divlab records its decisions: one file per event in the project repository. */
export interface EventLog {
  append(event: LogEvent): Promise<void>;
  /** The project's events, oldest first. */
  read(project: string): Promise<LogEvent[]>;
}

async function onWorkAccepted(event: WorkAccepted, board: TaskBoard, log: EventLog): Promise<void> {
  const { project, task, ...work } = event;
  const history = routingDecisions(await log.read(project));
  const record = routingRecord(work, history);
  await log.append({ project, ...record });
  if (task !== undefined) await board.close(project, task);
  const { decision } = record;
  if ("alert" in decision) {
    await board.alertCoordinators({ project, ...record });
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

/** Accepted work, as its feedback signal reports it: routed, and the task it names closed. */
async function acceptSignal(
  project: string,
  path: string,
  signal: FeedbackSignal,
  board: TaskBoard,
  log: EventLog,
): Promise<void> {
  const { task, ...work } = signal;
  // Research work goes back to the role its task was for, as Divlab recorded on the task.
  const researchFor =
    task === undefined ? undefined : (await board.task(project, task))?.researchFor;
  await onWorkAccepted(
    {
      project,
      ...work,
      feedbackSignal: path,
      ...(researchFor === undefined ? {} : { researchFor }),
      ...(task === undefined ? {} : { task }),
    },
    board,
    log,
  );
}

const cannotRead = (path: string, { unreadable }: Unreadable) =>
  `The feedback signal ${path} cannot be read: ${unreadable}`;

/** Work has been merged to the project's main branch. */
export async function onMerge(
  project: string,
  repository: Repository,
  board: TaskBoard,
  log: EventLog,
): Promise<void> {
  // Divlab records every merge it makes, so a signal with no event reached main some other way.
  const events = await log.read(project);
  const finished = new Set(events.filter((e) => !("aboutToMerge" in e)).map(signalOf));
  const begun = new Map(
    events.flatMap((e) =>
      "aboutToMerge" in e ? [[e.aboutToMerge.feedbackSignal, e] as const] : [],
    ),
  );
  for (const path of await repository.feedbackSignals(project)) {
    if (finished.has(path)) continue;
    // Merged by Divlab, whose run stopped before routing it: finish from what Divlab recorded.
    const merge = begun.get(path);
    if (merge) {
      await acceptSignal(project, path, merge.aboutToMerge.work, board, log);
      continue;
    }
    // Never read, let alone routed: whatever it says, it did not come through Divlab.
    const record: NotAccepted = {
      project,
      notAccepted: { feedbackSignal: path, reason: "it reached main without Divlab merging it" },
    };
    await log.append(record);
    await board.alertNotAccepted(record);
  }
}

/** A member has submitted work as a pull request. */
export async function onPullRequest(
  project: string,
  pullRequest: string,
  pullRequests: PullRequests,
  board: TaskBoard,
  log: EventLog,
): Promise<void> {
  // Read at one commit and merge only that commit: anything pushed since has not been checked.
  const head = await pullRequests.head(project, pullRequest);
  const files = await pullRequests.changedFiles(project, pullRequest);
  const feedback = files.find((file) => file.path.startsWith("feedback/"));
  if (feedback === undefined) {
    await pullRequests.refuse(
      project,
      pullRequest,
      "The pull request has no feedback signal: work needs one, in feedback/, saying what it was for and how it went",
    );
    return;
  }
  const signal = readFeedbackSignal(feedback.text);
  if ("unreadable" in signal) {
    await pullRequests.refuse(project, pullRequest, cannotRead(feedback.path, signal));
    return;
  }
  await log.append({
    project,
    aboutToMerge: { pullRequest, head, feedbackSignal: feedback.path, work: signal },
  });
  await pullRequests.merge(project, pullRequest, head);
  await acceptSignal(project, feedback.path, signal, board, log);
}

/** Project repositories as Divlab sets them up. */
export interface ProjectRepositories {
  /** Only Divlab may change the main branch: no person is exempt (decision 0006). */
  protectMain(project: string): Promise<void>;
  /** Whether main has the protection `protectMain` gives it, still in force. */
  mainIsProtected(project: string): Promise<boolean>;
}

/** A project's repository has been created, and Divlab prepares it. */
export async function setUpProject(
  project: string,
  repositories: ProjectRepositories,
): Promise<void> {
  await repositories.protectMain(project);
}

/** On every run: is the project's main branch still protected as decision 0006 requires? */
export async function checkProtection(
  project: string,
  repositories: ProjectRepositories,
  board: TaskBoard,
): Promise<void> {
  if (await repositories.mainIsProtected(project)) return;
  // Alerted once: the open alert is the record, and closing it re-arms the check.
  if (await board.unprotectedMainAlertOpen(project)) return;
  await board.alertUnprotectedMain(project);
}
