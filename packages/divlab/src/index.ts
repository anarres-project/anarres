import {
  type FeedbackSignal,
  type Role,
  type RoutingRecord,
  readFeedbackSignal,
  readSignalFile,
  routingRecord,
  type Unreadable,
} from "@anarres/core";
import { isClaim } from "./event.ts";

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
  /** The feedback signal whose routing decision posted the task. */
  decidedOn: string;
};

/** A module Divlab marks done, and the feedback signal whose routing decision finished it. */
export type FinishedModule = { project: string; module: string; decidedOn: string };

/** A routing decision as recorded in a project's event log. */
/** `decidedAt`: when Divlab decided, in UTC; events recorded before it kept the time have none. */
export type RoutingEvent = {
  project: string;
  decidedAt?: string;
  /** The task the work was for, closed when the decision is acted on. */
  task?: string;
} & RoutingRecord;

/** Divlab's clock: the time is always given to it, never read from the wall. */
export type Clock = () => Date;

/** An alert carries the whole decision: what the work reported, and why routing stopped. */
export type CoordinatorAlert = RoutingEvent;

/** Something reached main without Divlab merging it: never routed, recorded once (0005). */
export type NotAccepted = {
  project: string;
  /** When Divlab found it, in UTC (absent from events recorded before it kept the time). */
  decidedAt?: string;
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
  markModuleDone(module: FinishedModule): Promise<void>;
  /** What Divlab recorded on a task it posted; undefined if there is no such task. */
  task(
    project: string,
    task: string,
  ): Promise<(Pick<PostedTask, "researchFor"> & { claimedBy?: string }) | undefined>;
  /** The task is done: nobody can claim it any more. */
  close(project: string, task: string): Promise<void>;
  /** The feedback signals whose routing decisions the board shows Divlab acted on. */
  actedOn(project: string): Promise<string[]>;
  markClaimed(claim: ClaimedTask): Promise<void>;
  /** The comments on a task's issue, earliest first, and who made each. */
  comments(project: string, task: string): Promise<{ member: string; text: string }[]>;
  /** Divlab will not let the member claim the task: they are told why. */
  refuseClaim(refusal: ClaimRefused): Promise<void>;
}

/** A claim Divlab refused, and why, in words the member would recognise. */
export type ClaimRefused = ClaimedTask & { reason: string };

/** A member holds a task. */
export type ClaimedTask = { project: string; task: string; member: string };

/** A member asks to claim a task. */
export async function onClaim(
  project: string,
  claim: { task: string; member: string },
  board: TaskBoard,
): Promise<void> {
  const task = await board.task(project, claim.task);
  let holder = task?.claimedBy;
  if (holder === undefined) {
    // The first claim made wins, whichever claim's run Divlab hears of first.
    const comments = await board.comments(project, claim.task);
    holder = comments.find((comment) => isClaim(comment.text))?.member ?? claim.member;
    await board.markClaimed({ project, task: claim.task, member: holder });
  }
  // Each member whose claim lost is told by their own claim's run, however the runs were ordered.
  if (holder !== claim.member) {
    await board.refuseClaim({ project, ...claim, reason: "it has already been claimed" });
  }
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
  /** When Divlab decided to merge, in UTC (absent from events recorded before it kept the time). */
  decidedAt?: string;
  aboutToMerge: { pullRequest: string; head: string; feedbackSignal: string; work: FeedbackSignal };
};

/** Divlab has done what a routing decision called for on the board: written just after it. */
export type ActedOn = { project: string; actedOn: { feedbackSignal: string } };

/** What the event log holds: routing decisions and acting on them, merges begun, and what Divlab
 * did not accept. */
export type LogEvent = RoutingEvent | ActedOn | AboutToMerge | NotAccepted;

/** The routing decisions in a log, which are all its history routing depends on. */
export const routingDecisions = (log: readonly LogEvent[]): RoutingEvent[] =>
  log.filter((event): event is RoutingEvent => "work" in event);

/** The feedback signal an event is about, whichever kind of event it is. */
export const signalOf = (event: LogEvent): string => {
  if ("work" in event) return event.work.feedbackSignal;
  if ("aboutToMerge" in event) return event.aboutToMerge.feedbackSignal;
  if ("actedOn" in event) return event.actedOn.feedbackSignal;
  return event.notAccepted.feedbackSignal;
};

/** Where Divlab records its decisions: one file per event in the project repository. */
export interface EventLog {
  append(event: LogEvent): Promise<void>;
  /** The project's events, oldest first. */
  read(project: string): Promise<LogEvent[]>;
}

/**
 * `events`: the project's log as this run read it. Runs for a project go one at a time, so only
 * this run writes to it meanwhile; what it records is added, for any work it routes next.
 */
async function onWorkAccepted(
  event: WorkAccepted,
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
  events: LogEvent[],
): Promise<void> {
  const { project, task, ...work } = event;
  const record = routingRecord(work, routingDecisions(events));
  const decided: RoutingEvent = {
    project,
    decidedAt: clock().toISOString(),
    ...(task === undefined ? {} : { task }),
    ...record,
  };
  await log.append(decided);
  events.push(decided);
  await actOn(decided, board, log);
}

/** What a routing decision does on the board: a task, an alert or a finished module. */
async function actOn(event: RoutingEvent, board: TaskBoard, log: EventLog): Promise<void> {
  const { project, decision } = event;
  const decidedOn = event.work.feedbackSignal;
  if (event.task !== undefined) await board.close(project, event.task);
  if ("alert" in decision) {
    await board.alertCoordinators(event);
  } else if ("moduleDone" in decision) {
    await board.markModuleDone({ project, module: event.work.module, decidedOn });
  } else {
    for (const task of decision.tasks) await board.post({ project, ...task, decidedOn });
  }
  await recordActing(event, log);
}

const recordActing = ({ project, work }: RoutingEvent, log: EventLog) =>
  log.append({ project, actedOn: { feedbackSignal: work.feedbackSignal } });

/** Accepted work, as its feedback signal reports it: routed, and the task it names closed. */
async function acceptSignal(
  project: string,
  path: string,
  signal: FeedbackSignal,
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
  events: LogEvent[],
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
    clock,
    events,
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
  clock: Clock,
): Promise<void> {
  // Divlab records every merge it makes, so a signal with no event reached main some other way.
  const events = await log.read(project);
  const finished = new Set(events.filter((e) => !("aboutToMerge" in e)).map(signalOf));
  const begun = new Map(
    events.flatMap((e) =>
      "aboutToMerge" in e ? [[e.aboutToMerge.feedbackSignal, e] as const] : [],
    ),
  );
  // Recorded, but the run stopped before recording that it acted: rare, so only then is the board
  // asked (its lists lag) whether it acted before stopping.
  const recordedActing = new Set(events.flatMap((e) => ("actedOn" in e ? [signalOf(e)] : [])));
  const unconfirmed = routingDecisions(events).filter(
    (decision) => !recordedActing.has(decision.work.feedbackSignal),
  );
  if (unconfirmed.length > 0) {
    const onTheBoard = new Set(await board.actedOn(project));
    for (const decision of unconfirmed) {
      if (onTheBoard.has(decision.work.feedbackSignal)) await recordActing(decision, log);
      else await actOn(decision, board, log);
    }
  }
  const onMain = await repository.feedbackSignals(project);
  // Merged by Divlab, whose run stopped before routing it: finish from what Divlab recorded, in
  // the order it merged.
  for (const [path, merge] of begun) {
    if (finished.has(path) || !onMain.includes(path)) continue;
    await acceptSignal(project, path, merge.aboutToMerge.work, board, log, clock, events);
  }
  for (const path of onMain) {
    if (finished.has(path) || begun.has(path)) continue;
    // Never read, let alone routed: whatever it says, it did not come through Divlab.
    const record: NotAccepted = {
      project,
      decidedAt: clock().toISOString(),
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
  clock: Clock,
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
  const file = readSignalFile(feedback.path);
  if ("unreadable" in file) {
    await pullRequests.refuse(project, pullRequest, cannotRead(feedback.path, file));
    return;
  }
  const signal = readFeedbackSignal(feedback.text);
  if ("unreadable" in signal) {
    await pullRequests.refuse(project, pullRequest, cannotRead(feedback.path, signal));
    return;
  }
  const events = await log.read(project);
  await log.append({
    project,
    decidedAt: clock().toISOString(),
    aboutToMerge: { pullRequest, head, feedbackSignal: feedback.path, work: signal },
  });
  await pullRequests.merge(project, pullRequest, head);
  await acceptSignal(project, feedback.path, signal, board, log, clock, events);
}

/** Project repositories as Divlab sets them up. */
export interface ProjectRepositories {
  /** Only Divlab may change the main branch: no person is exempt (decision 0006). */
  protectMain(project: string): Promise<void>;
  /** Whether main has the protection `protectMain` gives it, still in force. */
  mainIsProtected(project: string): Promise<boolean>;
  /** Divlab's checks, and nothing else, may act on members' pull requests. */
  allowDivlabChecks(project: string): Promise<void>;
}

/** A project's repository has been created, and Divlab prepares it. */
export async function setUpProject(
  project: string,
  repositories: ProjectRepositories,
): Promise<void> {
  await repositories.protectMain(project);
  await repositories.allowDivlabChecks(project);
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
