import {
  type FeedbackSignal,
  isRole,
  leaseHasRunOut,
  mayTake,
  memberFor,
  outsideScope,
  type Part,
  ROLE_NAMES,
  type Role,
  type RoutingRecord,
  readFeedbackSignal,
  readSignalFile,
  routingRecord,
  trustLevelOf,
  type Unreadable,
} from "@anarres/core";
import { isClaim } from "./event.ts";

export { CLAIM } from "./event.ts";

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
  /** Who did the work: the member whose pull request Divlab merged. */
  member?: string;
  /** The commit Divlab's merge made on main. */
  mergedAs?: string;
};

export type PostedTask = {
  project: string;
  role: Role;
  module: string;
  feedbackSignal?: string;
  researchFor?: string;
  /** The feedback signal whose routing decision posted the task; none for a module's first. */
  decidedOn?: string;
  /** The commit the task's inputs are read at: the merge that decided it. */
  inputsAt?: string;
  /** A continuation of partial work, which also reads its role's own place (decision 0008). */
  continuation?: true;
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
  /** Who did the work, for the conflict-of-interest rules (decision 0007). */
  member?: string;
  /** The commit Divlab's merge made on main, so it knows its merges from anyone else's. */
  mergedAs?: string;
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
  ): Promise<
    | (Pick<PostedTask, "role" | "module" | "researchFor"> & {
        claimedBy?: string;
        /** Marked claimed by Divlab, whoever is assigned now. */
        claimed?: true;
      })
    | undefined
  >;
  /** The task is done: nobody can claim it any more. */
  close(project: string, task: string): Promise<void>;
  /** The feedback signals whose routing decisions the board shows Divlab acted on. */
  actedOn(project: string): Promise<string[]>;
  markClaimed(claim: ClaimedTask): Promise<void>;
  /** The comments on a task's issue, earliest first, and who made each. */
  comments(project: string, task: string): Promise<{ member: string; text: string; at?: string }[]>;
  /** PDC coordinators are told of a change on main that Divlab did not make. */
  alertChangeNotByDivlab(change: ChangeNotByDivlab): Promise<void>;
  /** The member is told, on the task, that their lease on it ran out. */
  tellLeaseRanOut(ranOut: ClaimedTask): Promise<void>;
  /** The task's claim is over: it is ready again, held by nobody. */
  releaseClaim(project: string, task: string): Promise<void>;
  /** The open tasks the board shows as claimed, whoever marked them, and whom each shows. */
  claimedTasks(
    project: string,
  ): Promise<{ task: string; role: Role; module: string; claimedBy?: string }[]>;
  /** PDC coordinators are told a task was shown as claimed with no claim in Divlab's log. */
  alertClaimedWithoutClaim(alert: ClaimedWithoutClaim): Promise<void>;
  /** Divlab did not do as the member asked, such as giving them the task: they are told why. */
  refuseMember(refusal: Refused): Promise<void>;
}

/** A task shown as claimed, for `shownAs` if anyone, that Divlab's log has no claim for. */
export type ClaimedWithoutClaim = {
  project: string;
  task: string;
  role: Role;
  module: string;
  shownAs?: string;
};

/** Divlab found a task shown as claimed with no claim in its log: recorded before it frees it. */
export type FoundClaimedWithoutClaim = {
  project: string;
  decidedAt: string;
  claimedWithoutClaim: { task: string; shownAs?: string };
};

/** Divlab gave a member a task: recorded before the board shows it. */
export type Claimed = {
  project: string;
  decidedAt: string;
  /** The role and module the task is for (absent from claims recorded before Divlab kept them). */
  claimed: { task: string; member: string; role?: Role; module?: string };
};

/** A member's lease on a task ran out, with no activity on it: the task is ready again. */
export type LeaseRanOut = {
  project: string;
  decidedAt: string;
  leaseRanOut: { task: string; member: string };
};

/** Activity on a task by the member holding it, such as draft work: it renews their lease. */
export type Activity = {
  project: string;
  decidedAt: string;
  activity: { task: string; member: string };
};

/** The member holding a task gave it back before its lease ran out: it is ready again. */
export type Released = {
  project: string;
  decidedAt: string;
  released: { task: string; member: string };
};

/** What a member asked of a task that Divlab did not do, and why, in words they would recognise. */
export type Refused = ClaimedTask & { reason: string };

/** A member holds a task. */
export type ClaimedTask = { project: string; task: string; member: string };

/**
 * Each member's part in each module, as the log shows: the work of theirs Divlab merged, and the
 * tasks they hold, whose latest claim is theirs and was neither given back nor ran out.
 */
const parts = (events: readonly LogEvent[]): Part[] => [
  ...mergedParts(events),
  ...heldParts(events),
];

const heldParts = (events: readonly LogEvent[]): Part[] => {
  const held = new Map<string, Part>();
  for (const event of events) {
    if ("claimed" in event) {
      const { task, member, role, module } = event.claimed;
      if (role !== undefined && module !== undefined) held.set(task, { member, role, module });
    }
    if ("released" in event) held.delete(event.released.task);
    if ("leaseRanOut" in event) held.delete(event.leaseRanOut.task);
  }
  return [...held.values()];
};

const mergedParts = (events: readonly LogEvent[]): Part[] =>
  routingDecisions(events).flatMap((decision) =>
    decision.member === undefined
      ? []
      : [
          {
            member: decision.member,
            // Routed work's role is one Divlab knows (an unknown one is on the test list).
            role: decision.work.fromRole as Role,
            module: decision.work.module,
          },
        ],
  );

/** Who the members are: the governance file PDC coordinators keep (decision 0007). */
export interface Members {
  /** The governance file's contents, as read: data to check, never trusted as it stands. */
  governanceFile(): Promise<unknown>;
}

/**
 * Who may take which of a project's tasks: the trust levels and linked accounts in the governance
 * file, and each member's part in the project as its log shows (concept §6, decision 0007). The
 * one statement of it Divlab and the member's CLI both use.
 */
export function eligibility(governance: unknown, events: readonly LogEvent[]) {
  // Accounts a PDC coordinator linked are one member, for every rule (concept §6).
  const memberOf = (account: string) => memberFor(governance, account);
  const history = parts(events).map((part) => ({ ...part, member: memberOf(part.member) }));
  return (account: string, task: { role: Role; module: string }) =>
    mayTake(
      { member: memberOf(account), role: task.role, module: task.module },
      history,
      trustLevelOf(governance, memberOf(account)),
    );
}

/** A member asks to claim a task. */
export async function onClaim(
  project: string,
  claim: { task: string; member: string },
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
  members: Members,
): Promise<void> {
  const task = await board.task(project, claim.task);
  if (task === undefined) {
    await board.refuseMember({
      project,
      ...claim,
      reason: "Divlab did not give you this task: it is not a task anyone can claim",
    });
    return;
  }
  // A member the conflict-of-interest rules bar from the task is told why (decision 0007).
  const events = await log.read(project);
  const mayClaim = eligibility(await members.governanceFile(), events);
  const allowed = (account: string) => mayClaim(account, task);
  const asker = allowed(claim.member);
  if (asker !== "allowed") {
    await board.refuseMember({
      project,
      ...claim,
      reason: `Divlab did not give you this task: ${asker.refused}`,
    });
    return;
  }
  // Marked claimed with nobody assigned now: still the member Divlab gave it to, as its log says.
  let holder =
    task.claimedBy ?? (task.claimed ? leasesFrom(events).get(claim.task)?.member : undefined);
  // Claims count only if made since the task was last free: earlier ones were for another time.
  const freed = lastFreed(events, claim.task);
  let madeSinceFree = (at: string | undefined) =>
    freed === undefined || at === undefined || Date.parse(at) > Date.parse(freed);
  const lease = leasesFrom(events).get(claim.task);
  if (holder !== undefined && lease?.member === holder && leaseHasRunOut(lease.since, clock())) {
    // A lease that ran out is ended here too, so no task waits on the hourly check: a quiet
    // project's schedule can stop.
    await endLease({ project, task: claim.task, member: holder }, board, log, clock);
    holder = undefined;
    madeSinceFree = (at) => at === undefined || leaseHasRunOut(lease.since, new Date(at));
  }
  if (holder === undefined) {
    // The first claim made that is allowed wins, whichever claim's run Divlab hears of first.
    const comments = await board.comments(project, claim.task);
    holder =
      comments.find(
        (comment) =>
          isClaim(comment.text) &&
          madeSinceFree(comment.at) &&
          allowed(comment.member) === "allowed",
      )?.member ?? claim.member;
    const claimed: Claimed = {
      project,
      decidedAt: clock().toISOString(),
      claimed: { task: claim.task, member: holder, role: task.role, module: task.module },
    };
    await log.append(claimed);
    await board.markClaimed({ project, task: claim.task, member: holder });
  }
  // Each member whose claim lost is told by their own claim's run, however the runs were ordered.
  if (holder !== claim.member) {
    await board.refuseMember({
      project,
      ...claim,
      reason: "Divlab did not give you this task: it has already been claimed",
    });
  }
}

/** A member asks to give a task back before its lease runs out. */
export async function onRelease(
  project: string,
  release: { task: string; member: string },
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
): Promise<void> {
  if ((await board.task(project, release.task))?.claimedBy !== release.member) {
    await board.refuseMember({
      project,
      ...release,
      reason:
        "Divlab did not release this task: only the member holding a task can give it back, and you do not hold it",
    });
    return;
  }
  const released: Released = { project, decidedAt: clock().toISOString(), released: release };
  await log.append(released);
  await board.releaseClaim(project, release.task);
}

/** Divlab's scheduled run: every claim whose lease has run out is given up. */
export async function onLeaseCheck(
  project: string,
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
): Promise<void> {
  const events = await log.read(project);
  const leases = leasesFrom(events);
  for (const { task, role, module, claimedBy } of await board.claimedTasks(project)) {
    if (leases.has(task)) continue;
    const shownAs = claimedBy === undefined ? {} : { shownAs: claimedBy };
    await log.append({
      project,
      decidedAt: clock().toISOString(),
      claimedWithoutClaim: { task, ...shownAs },
    });
    await board.releaseClaim(project, task);
    await board.alertClaimedWithoutClaim({
      project,
      task,
      role,
      module,
      ...shownAs,
    });
  }
  for (const { task, member, since } of leases.values()) {
    const shown = await board.task(project, task);
    const freed = lastFreed(events, task);
    if (freed !== undefined && Date.parse(freed) >= Date.parse(since)) {
      // Freed in the log but still shown claimed: a run stopped before the board showed it.
      if (shown?.claimedBy === member) await board.releaseClaim(project, task);
      continue;
    }
    if (!leaseHasRunOut(since, clock())) {
      // Recorded but not shown, or shown with nobody assigned: the board is put right from the
      // log (a run stopped part way, or the assignee was taken off).
      if (shown !== undefined && shown.claimedBy === undefined) {
        await board.markClaimed({ project, task, member });
      }
      continue;
    }
    if (shown?.claimedBy !== member) continue;
    await endLease({ project, task, member }, board, log, clock);
  }
}

/**
 * Each task's latest claim is the one that holds it now, if any does, and its lease runs from
 * the last activity on the task by that claim's member: the claim, or work since.
 */
export function leasesFrom(
  events: readonly LogEvent[],
): Map<string, { task: string; member: string; since: string }> {
  const leases = new Map<string, { task: string; member: string; since: string }>();
  for (const event of events) {
    if ("claimed" in event) {
      leases.set(event.claimed.task, { ...event.claimed, since: event.decidedAt });
    }
    if ("activity" in event) {
      const lease = leases.get(event.activity.task);
      if (lease?.member === event.activity.member) lease.since = event.decidedAt;
    }
  }
  return leases;
}

/** When a task last became free again, given back or its lease run out, as the log records. */
function lastFreed(events: readonly LogEvent[], task: string): string | undefined {
  let freed: string | undefined;
  for (const event of events) {
    if ("released" in event && event.released.task === task) freed = event.decidedAt;
    if ("leaseRanOut" in event && event.leaseRanOut.task === task) freed = event.decidedAt;
  }
  return freed;
}

/** A lease that ran out: recorded, the task ready again, and its member told. */
async function endLease(ranOut: ClaimedTask, board: TaskBoard, log: EventLog, clock: Clock) {
  const { project, task, member } = ranOut;
  const record: LeaseRanOut = {
    project,
    decidedAt: clock().toISOString(),
    leaseRanOut: { task, member },
  };
  await log.append(record);
  await board.releaseClaim(project, task);
  await board.tellLeaseRanOut(ranOut);
}

/** The files merged to a project's main branch. */
export interface Repository {
  /** Where each feedback signal merged so far can be found, in no particular order. */
  feedbackSignals(project: string): Promise<string[]>;
  /** The commit a merged pull request's merge made on main. */
  mergeCommitOf(project: string, pullRequest: string): Promise<string>;
  /** Main's commits after `since`, oldest first. */
  commitsSince(project: string, since: string): Promise<MainCommit[]>;
  /** The commit main is at now. */
  head(project: string): Promise<string>;
}

/** A commit on main, as GitHub vouches for it: its author's account, and whether GitHub signed it. */
export type MainCommit = { sha: string; author: string | undefined; signedByGitHub: boolean };

/** How far Divlab has checked main's commits: the next run checks those after this one. */
export type MainChecked = { project: string; decidedAt: string; mainChecked: { upTo: string } };

/** A change reached main that Divlab did not make: recorded once, and PDC coordinators alerted. */
export type ChangeNotByDivlab = {
  project: string;
  decidedAt: string;
  changeNotByDivlab: { commit: string; author: string | undefined };
};

/** Members' pull requests: what each would change, read as data, and merging it. */
export interface PullRequests {
  /**
   * The pull request as it is now: the commit it is at, whether its member marked it a draft (work
   * under way, not finished), and who opened it, by GitHub's account name.
   */
  pullRequest(
    project: string,
    pullRequest: string,
  ): Promise<{ head: string; draft: boolean; author: string }>;
  changedFiles(project: string, pullRequest: string): Promise<{ path: string; text: string }[]>;
  /** Merges the pull request only if it is still at `head`, giving the commit the merge made. */
  merge(project: string, pullRequest: string, head: string): Promise<string>;
  /** Divlab will not merge it: the member is told why. */
  refuse(project: string, pullRequest: string, reason: string): Promise<void>;
  /** What the project's own check found on the commit, and where it can be seen (decision 0010). */
  check(project: string, head: string): Promise<{ state: "passed" | "failed"; url: string }>;
}

/**
 * Divlab is about to merge a pull request, whose work it has read and checked. Written before the
 * merge, so a run that stops after merging can be finished from it, never from Git history.
 */
export type AboutToMerge = {
  project: string;
  /** When Divlab decided to merge, in UTC (absent from events recorded before it kept the time). */
  decidedAt?: string;
  aboutToMerge: {
    pullRequest: string;
    head: string;
    feedbackSignal: string;
    work: FeedbackSignal;
    /** Who opened the pull request (absent from events recorded before Divlab kept it). */
    member?: string;
  };
};

/** Divlab has done what a routing decision called for on the board: written just after it. */
export type ActedOn = { project: string; actedOn: { feedbackSignal: string } };

/** What the event log holds: routing decisions and acting on them, merges begun, and what Divlab
 * did not accept. */
export type LogEvent =
  | RoutingEvent
  | ActedOn
  | AboutToMerge
  | NotAccepted
  | Claimed
  | LeaseRanOut
  | Activity
  | Released
  | ChangeNotByDivlab
  | MainChecked
  | FoundClaimedWithoutClaim;

/** The routing decisions in a log, which are all its history routing depends on. */
export const routingDecisions = (log: readonly LogEvent[]): RoutingEvent[] =>
  log.filter((event): event is RoutingEvent => "work" in event);

/** The feedback signal an event is about, if any: claims, leases and activity are about none. */
export const signalOf = (event: LogEvent): string | undefined => {
  if ("work" in event) return event.work.feedbackSignal;
  if ("aboutToMerge" in event) return event.aboutToMerge.feedbackSignal;
  if ("actedOn" in event) return event.actedOn.feedbackSignal;
  if ("notAccepted" in event) return event.notAccepted.feedbackSignal;
  return undefined;
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
  const { project, task, member, mergedAs, ...work } = event;
  const record = routingRecord(work, routingDecisions(events));
  const decided: RoutingEvent = {
    project,
    decidedAt: clock().toISOString(),
    ...(task === undefined ? {} : { task }),
    ...(member === undefined ? {} : { member }),
    ...(mergedAs === undefined ? {} : { mergedAs }),
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
    // A task's inputs are read as they were at the merge that decided it.
    const inputsAt = event.mergedAs === undefined ? {} : { inputsAt: event.mergedAs };
    for (const task of decision.tasks) {
      await board.post({ project, ...task, decidedOn, ...inputsAt });
    }
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
  merged: { member?: string; mergedAs?: string },
): Promise<void> {
  const { member, mergedAs } = merged;
  const { task, ...work } = signal;
  // Only an issue Divlab posted as a task, still open, is the work's task: nothing else is closed.
  const posted = task === undefined ? undefined : await board.task(project, task);
  // Research work goes back to the role its task was for, as Divlab recorded on the task.
  const researchFor = posted?.researchFor;
  await onWorkAccepted(
    {
      project,
      ...work,
      feedbackSignal: path,
      ...(researchFor === undefined ? {} : { researchFor }),
      ...(task === undefined || posted === undefined ? {} : { task }),
      ...(member === undefined ? {} : { member }),
      ...(mergedAs === undefined ? {} : { mergedAs }),
    },
    board,
    log,
    clock,
    events,
  );
}

/** Whether the board shows the member holding the task: none holds an issue that is not one. */
const holds = async (board: TaskBoard, project: string, task: string, member: string) =>
  (await board.task(project, task))?.claimedBy === member;

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
    const { work, member, pullRequest } = merge.aboutToMerge;
    // The run that merged it stopped before recording the merge's commit: GitHub has it.
    const mergedAs = await repository.mergeCommitOf(project, pullRequest);
    await acceptSignal(project, path, work, board, log, clock, events, {
      ...(member === undefined ? {} : { member }),
      mergedAs,
    });
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
  const { head, draft, author } = await pullRequests.pullRequest(project, pullRequest);
  const files = await pullRequests.changedFiles(project, pullRequest);
  const feedback = files.find((file) => file.path.startsWith("feedback/"));
  if (draft) {
    // Work under way: never merged, but activity on the task it is for.
    const signal = readFeedbackSignal(feedback?.text ?? "");
    if ("unreadable" in signal || signal.task === undefined) return;
    // Only the member holding the task renews its lease: nobody else can keep a task held.
    if (!(await holds(board, project, signal.task, author))) return;
    await log.append({
      project,
      decidedAt: clock().toISOString(),
      activity: { task: signal.task, member: author },
    });
    return;
  }
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
  if (signal.task === undefined) {
    await pullRequests.refuse(
      project,
      pullRequest,
      `The feedback signal ${feedback.path} does not say which task the work was for: work is merged only for a task its member holds`,
    );
    return;
  }
  // Only the holder's work, so the checks made when the task was claimed hold for the work too.
  if (!(await holds(board, project, signal.task, author))) {
    await pullRequests.refuse(
      project,
      pullRequest,
      `The work is for task ${signal.task}, and only the member holding it can submit its work: claim a task before doing it`,
    );
    return;
  }
  const role = signal.fromRole;
  if (!isRole(role)) {
    await pullRequests.refuse(
      project,
      pullRequest,
      `The feedback signal ${feedback.path} names a role Anarres does not have: ${role}`,
    );
    return;
  }
  // Each role writes only its own place (concept §6): nothing else, such as Divlab's own workflows.
  const outside = outsideScope(
    role,
    signal.module,
    files.map((changed) => changed.path),
  );
  if (outside.length > 0) {
    await pullRequests.refuse(
      project,
      pullRequest,
      `The work changes files outside what ${ROLE_NAMES[role]} may change: ${outside.join(", ")}`,
    );
    return;
  }
  // Coding work is merged only once the project's own tests pass on it (decision 0010).
  if (role === "coding") {
    const check = await pullRequests.check(project, head);
    if (check.state === "failed") {
      await pullRequests.refuse(
        project,
        pullRequest,
        `The project's tests failed on this work, so it is not merged: ${check.url}`,
      );
      return;
    }
  }
  const events = await log.read(project);
  await log.append({
    project,
    decidedAt: clock().toISOString(),
    aboutToMerge: {
      pullRequest,
      head,
      feedbackSignal: feedback.path,
      member: author,
      work: signal,
    },
  });
  const mergedAs = await pullRequests.merge(project, pullRequest, head);
  await acceptSignal(project, feedback.path, signal, board, log, clock, events, {
    member: author,
    mergedAs,
  });
}

/**
 * Every Divlab run checks the commits on main since its last check: each must be Divlab's own, a
 * log write GitHub signed as made by Divlab's account, or a merge Divlab recorded.
 */
export async function checkMain(
  project: string,
  repository: Repository,
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
  divlab: string,
): Promise<void> {
  const events = await log.read(project);
  // A merge's commit carries its member as author: only Divlab's record tells it apart.
  const merges = new Set(routingDecisions(events).flatMap((decision) => decision.mergedAs ?? []));
  const recorded = new Set(
    events.flatMap((event) =>
      "changeNotByDivlab" in event ? [event.changeNotByDivlab.commit] : [],
    ),
  );
  const since = events.findLast((event) => "mainChecked" in event) as MainChecked | undefined;
  if (since === undefined) {
    // Never checked: main as it stands is the project as it was set up, the place to start.
    await log.append({
      project,
      decidedAt: clock().toISOString(),
      mainChecked: { upTo: await repository.head(project) },
    });
    return;
  }
  const commits = await repository.commitsSince(project, since.mainChecked.upTo);
  for (const commit of commits) {
    if (commit.author === divlab && commit.signedByGitHub) continue;
    if (merges.has(commit.sha) || recorded.has(commit.sha)) continue;
    const change: ChangeNotByDivlab = {
      project,
      decidedAt: clock().toISOString(),
      changeNotByDivlab: { commit: commit.sha, author: commit.author },
    };
    await log.append(change);
    await board.alertChangeNotByDivlab(change);
  }
  const last = commits.at(-1);
  if (last !== undefined) {
    const checked: MainChecked = {
      project,
      decidedAt: clock().toISOString(),
      mainChecked: { upTo: last.sha },
    };
    await log.append(checked);
  }
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

/** A module begins: Divlab posts its first task. */
export async function startModule(
  project: string,
  module: string,
  board: TaskBoard,
): Promise<void> {
  await board.post({ project, role: "specification", module });
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
