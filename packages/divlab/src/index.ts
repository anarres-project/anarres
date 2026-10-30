import {
  approvalCounts,
  CONTRACTS,
  changedInputs,
  contractsOfModule,
  contractsRevised,
  type FeedbackSignal,
  FIRST_ROLE,
  failed,
  isRole,
  leaseHasRunOut,
  MODULES_FILE,
  mayTake,
  memberFor,
  needsReview,
  outsideScope,
  type Part,
  PROGRAMME,
  ROLE_NAMES,
  type Role,
  type RoutingRecord,
  readFeedbackSignal,
  readModules,
  readSignalFile,
  reviewListUnreadable,
  routingRecord,
  type TestCounts,
  type TestReport,
  type Toolchain,
  testCounts,
  trustLevelOf,
  type Unreadable,
  writeScope,
} from "@anarres/core";
import { isClaim } from "./event.ts";

export { CLAIM, checksProtection, RELEASE, type Run } from "./event.ts";

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
  /** A revision of work whose inputs changed, which reads the work done too (decision 0015). */
  staleRevision?: true;
  /** A revision after research, which reads the module's research briefs too. */
  afterResearch?: true;
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
  /** PDC coordinators are told that the governance file's list of modules needing review cannot be read. */
  alertUnreadableReviewList(project: string): Promise<void>;
  /** Whether such an alert is still open: coordinators close it once the list is fixed. */
  unreadableReviewListAlertOpen(project: string): Promise<boolean>;
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

/** Everyone's parts in the project, by member: accounts a PDC coordinator linked are one (§6). */
const membersParts = (governance: unknown, events: readonly LogEvent[]): Part[] =>
  parts(events).map((part) => ({ ...part, member: memberFor(governance, part.member) }));

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
  const memberOf = (account: string) => memberFor(governance, account);
  const history = membersParts(governance, events);
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
  repository: Repository,
): Promise<void> {
  const events = await log.read(project);
  // The hourly check comes round even when nothing else happens in the project.
  await finishWhatDivlabBegan(project, events, repository, board, log, clock);
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
  /** Merges the pull request at `head`, and only there, giving the merge's commit. */
  merge(project: string, pullRequest: string, head: string): Promise<string>;
  /** The commit an open pull request is at; nothing once it is closed. */
  openHead(project: string, pullRequest: string): Promise<string | undefined>;
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
/** The paths changed on main since a commit, or more than GitHub lists (decision 0015). */
export type ChangedOnMain = string[] | { tooMany: true };

export interface PullRequests extends Members {
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
  /** What Divlab has already told the member on the pull request, as it told them. */
  refusalsGiven(project: string, pullRequest: string): Promise<string[]>;
  /**
   * What the project's own check found on the commit, or that it has not finished, and where it
   * can be seen (decision 0010).
   */
  check(
    project: string,
    head: string,
  ): Promise<{ state: "passed" | "failed" | "running"; url: string }>;
  /** The project's open pull requests whose head is the commit. */
  openAt(project: string, commit: string): Promise<string[]>;
  /** The paths changed on main since the commit, or too many to list (decision 0015). */
  changedOnMainSince(project: string, commit: string): Promise<ChangedOnMain>;
  /** The project's modules.yaml on main, if it has one. */
  modulesOnMain(project: string): Promise<string | undefined>;
  /** The project's modules.yaml at the commit, if it had one. */
  modulesAt(project: string, commit: string): Promise<string | undefined>;
  /** Who approved the pull request with GitHub's own review, and the commit each approved. */
  approvals(project: string, pullRequest: string): Promise<{ reviewer: string; commit: string }[]>;
  /** The test report the project's check wrote on the commit, once it has finished (0011). */
  testReport(
    project: string,
    head: string,
  ): Promise<
    | { state: "running"; url: string }
    | { state: "finished"; url: string; report: TestReport | Unreadable }
  >;
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
    /** The tests Test work added to the module, by name: main has them once it merges (0011). */
    testsAdded?: string[];
    /** The project's tests as the work's report counts them: part of the state vector (0012). */
    tests?: TestCounts;
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
  signal: RoutedWork,
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

/** The module's tests on main: those each piece of Test work Divlab merged added (0011). */
const testsOnMain = (events: LogEvent[], module: string) =>
  new Set(
    events.flatMap((event) =>
      "aboutToMerge" in event && event.aboutToMerge.work.module === module
        ? (event.aboutToMerge.testsAdded ?? [])
        : [],
    ),
  );

/** Work on the task by the member holding it: it renews their lease. */
const recordActivity = (
  project: string,
  task: string,
  member: string,
  log: EventLog,
  clock: Clock,
) => log.append({ project, decidedAt: clock().toISOString(), activity: { task, member } });

/** Whether the board shows the member holding the task: none holds an issue that is not one. */
const holds = async (board: TaskBoard, project: string, task: string, member: string) =>
  (await board.task(project, task))?.claimedBy === member;

const cannotRead = (path: string, { unreadable }: Unreadable) =>
  `The feedback signal ${path} cannot be read: ${unreadable}`;

/** The project's checks finished on a commit: its open pull requests may now be decided. */
export async function onChecked(
  project: string,
  commit: string,
  pullRequests: PullRequests,
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
): Promise<void> {
  for (const pullRequest of await pullRequests.openAt(project, commit)) {
    await onPullRequest(project, pullRequest, pullRequests, board, log, clock);
  }
}

/**
 * Merges Divlab began, recorded but never routed, finished from what it recorded, in the order it
 * began them. Gives where main's feedback signals are.
 */
async function finishWhatDivlabBegan(
  project: string,
  events: LogEvent[],
  repository: Repository,
  board: TaskBoard,
  log: EventLog,
  clock: Clock,
): Promise<string[]> {
  const finished = new Set(events.filter((e) => !("aboutToMerge" in e)).map(signalOf));
  const begun = new Map(
    events.flatMap((e) =>
      "aboutToMerge" in e ? [[e.aboutToMerge.feedbackSignal, e] as const] : [],
    ),
  );
  const onMain = await repository.feedbackSignals(project);
  // Begun by Divlab, whose run stopped before routing it: finish from what Divlab recorded, in
  // the order it began them.
  for (const [path, merge] of begun) {
    if (finished.has(path)) continue;
    const { work, member, pullRequest, head } = merge.aboutToMerge;
    // Closed since, or pushed to and so decided afresh: there is nothing left to merge.
    if (!onMain.includes(path) && (await repository.openHead(project, pullRequest)) !== head) {
      continue;
    }
    // The run that merged it stopped before recording the merge's commit: GitHub has it. Not on
    // main, GitHub put the merge off: it is asked for again, at the commit Divlab read.
    const mergedAs = onMain.includes(path)
      ? await repository.mergeCommitOf(project, pullRequest)
      : await repository.merge(project, pullRequest, head);
    await acceptSignal(project, path, work, board, log, clock, events, {
      ...(member === undefined ? {} : { member }),
      mergedAs,
    });
  }
  return onMain;
}

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
  const onMain = await finishWhatDivlabBegan(project, events, repository, board, log, clock);
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
    await recordActivity(project, signal.task, author, log, clock);
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
  const task = await board.task(project, signal.task);
  if (task?.claimedBy !== author) {
    await pullRequests.refuse(
      project,
      pullRequest,
      `The work is for task ${signal.task}, and only the member holding it can submit its work: claim a task before doing it`,
    );
    return;
  }
  // A module the project does not have has no task, so no work for one is merged (decision 0013).
  if (task.role !== signal.fromRole || task.module !== signal.module) {
    await pullRequests.refuse(
      project,
      pullRequest,
      `The work is for task ${signal.task}, and is not for the module and role its task is for: ${ROLE_NAMES[task.role]} on ${task.module}`,
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
  // The project's tests as the report counts them, recorded with the merge (decision 0012).
  let tests: TestCounts | undefined;
  // Coding work saying it passed is merged only once the project's own tests pass on it; work
  // reporting a failure, or handed over partial, advances nothing, and its tests may well fail
  // (decision 0010).
  if (role === "coding" && !failed(signal) && !signal.partial) {
    // The project's checks run only on code, so work changing none would wait for ever.
    const code = writeScope("coding", signal.module);
    if (!files.some((file) => file.path.startsWith(code))) {
      await pullRequests.refuse(
        project,
        pullRequest,
        `Coding work that says it passed changes the module's code, in ${code}, and this changes none: the project's tests run only on code`,
      );
      return;
    }
    const check = await pullRequests.check(project, head);
    // Not merged yet, the holder's work is activity on their task, draft or not: still being
    // checked, or to be fixed (decision 0010).
    if (check.state !== "passed") await recordActivity(project, signal.task, author, log, clock);
    // Not finished: Divlab acts again when it does.
    if (check.state === "running") return;
    if (check.state === "failed") {
      await pullRequests.refuse(
        project,
        pullRequest,
        `The project's tests failed on this work, so it is not merged: ${check.url}`,
      );
      return;
    }
    const run = await pullRequests.testReport(project, head);
    if (run.state === "finished" && !("unreadable" in run.report)) tests = testCounts(run.report);
  }
  const events = await log.read(project);
  // Test work saying it passed is merged only once each new test runs and fails (decision 0011).
  let testsAdded: string[] | undefined;
  if (role === "test" && !failed(signal) && !signal.partial) {
    const run = await pullRequests.testReport(project, head);
    // Not finished: the holder's work is activity on their task, and Divlab acts again after.
    if (run.state === "running") {
      await recordActivity(project, signal.task, author, log, clock);
      return;
    }
    if ("unreadable" in run.report) {
      await pullRequests.refuse(
        project,
        pullRequest,
        `The project's test report on this work cannot be read: ${run.report.unreadable}. See ${run.url}`,
      );
      return;
    }
    const onMain = testsOnMain(events, signal.module);
    const added = run.report.cases.filter((test) => !onMain.has(test.name));
    if (added.length === 0) {
      await pullRequests.refuse(
        project,
        pullRequest,
        `Test work that says it passed adds tests, and the project's tests show none new. See ${run.url}`,
      );
      return;
    }
    const notFailing = added.filter((test) => test.outcome !== "failed");
    if (notFailing.length > 0) {
      const named = notFailing.map((test) => `${test.name} (${test.outcome})`).join(", ");
      await pullRequests.refuse(
        project,
        pullRequest,
        `Each new test must run and fail before its code exists, and these do not: ${named}. See ${run.url}`,
      );
      return;
    }
    testsAdded = added.map((test) => test.name);
    tests = testCounts(run.report);
  }
  // The programme's Programme Architect work starts the modules its modules.yaml lists (0013).
  let work: RoutedWork = signal;
  // Work revising only a contract leaves modules.yaml as main has it, so it is read from there.
  const programmeWork = role === "programme-architect" && signal.module === PROGRAMME;
  const listing =
    files.find((file) => file.path === MODULES_FILE)?.text ??
    (programmeWork && files.some((file) => file.path.startsWith(CONTRACTS))
      ? await pullRequests.modulesOnMain(project)
      : undefined);
  if (programmeWork && listing !== undefined) {
    const listed = readModules(listing);
    if ("unreadable" in listed) {
      await pullRequests.refuse(
        project,
        pullRequest,
        `The work's modules.yaml cannot be read: ${listed.unreadable}`,
      );
      return;
    }
    const started = modulesStarted(events);
    work = { ...signal, modulesToStart: listed.modules.filter((module) => !started.has(module)) };
    // A revised contract sends each module providing or using it back to Architecture: now, if
    // it has no task open; otherwise when that task's work is merged (decision 0015).
    const revised = [
      ...new Set(
        files
          .filter((file) => file.path.startsWith(CONTRACTS))
          .map((file) => file.path.slice(CONTRACTS.length).split("/")[0] ?? ""),
      ),
    ];
    // A module the revision stops listing with a contract is affected too: main's listing,
    // which the work replaces, says so, read only when a contract changed.
    const before =
      revised.length > 0 && files.some((file) => file.path === MODULES_FILE)
        ? contractsListed(await pullRequests.modulesOnMain(project))
        : [];
    const toRevise = [
      ...new Set(
        [...listed.contracts, ...before]
          .filter((contract) => revised.includes(contract.name))
          .flatMap((contract) => [contract.providedBy, ...contract.usedBy]),
      ),
    ].filter((module) => started.has(module) && !hasTaskOpen(events, module));
    if (toRevise.length > 0) {
      work = { ...work, contractRevision: { contracts: revised, modules: toRevise } };
    }
  }
  // Work whose inputs changed after its task was posted goes back to its role (decision 0015).
  const pinned = pinnedCommit(events, role, signal.module);
  if (pinned !== undefined) {
    const compared = await pullRequests.changedOnMainSince(project, pinned);
    // Too much changed to tell whether the inputs did: counted as stale, and each of the module's
    // contracts as revised (Bernard, 2026-10-29).
    const unchecked = "tooMany" in compared;
    if (unchecked) work = { ...work, inputsUnchecked: true };
    const changed = unchecked ? [] : compared;
    const inputsChanged = changedInputs(role, signal.module, {}, changed);
    if (inputsChanged.length > 0) work = { ...work, inputsChanged };
    // A revised contract sends the module back to Architecture: which module provides and uses
    // it, modules.yaml says, on main and at the pinned commit, so a module the revision stops
    // listing goes back too. Read only when a contract changed, or may have.
    if (unchecked || changed.some((path) => path.startsWith(CONTRACTS))) {
      const contracts = [
        await pullRequests.modulesOnMain(project),
        await pullRequests.modulesAt(project, pinned),
      ].flatMap(contractsListed);
      const revised = [
        ...new Set(
          unchecked
            ? contractsOfModule(contracts, signal.module)
            : contractsRevised(contracts, signal.module, changed),
        ),
      ];
      if (revised.length > 0) work = { ...work, contractsRevised: revised };
    }
  }
  // Work on a module PDC coordinators name is merged only once a person approves it (0016).
  const governance = await pullRequests.governanceFile();
  const history = membersParts(governance, events);
  // An approval is of the commit reviewed: only one of the commit Divlab merges counts.
  const approved = (await pullRequests.approvals(project, pullRequest)).some(
    ({ reviewer, commit }) =>
      commit === head &&
      approvalCounts(governance, reviewer, { author, module: signal.module }, history),
  );
  // Held for want of a list that can be read, until a coordinator fixes it: they are told.
  if (reviewListUnreadable(governance) && !(await board.unreadableReviewListAlertOpen(project))) {
    await board.alertUnreadableReviewList(project);
  }
  if (needsReview(governance, project, signal.module) && !approved) {
    const waiting = `The work waits for a reviewer's approval: PDC coordinators require a person to approve work on ${signal.module} before it is merged, a trusted member or a PDC coordinator with no part in the module`;
    // Said once: each run that finds no approval yet, after a review or a push, says nothing more.
    if (!(await pullRequests.refusalsGiven(project, pullRequest)).includes(waiting)) {
      await pullRequests.refuse(project, pullRequest, waiting);
    }
    return;
  }
  await log.append({
    project,
    decidedAt: clock().toISOString(),
    aboutToMerge: {
      pullRequest,
      head,
      feedbackSignal: feedback.path,
      member: author,
      work,
      ...(testsAdded === undefined ? {} : { testsAdded }),
      ...(tests === undefined ? {} : { tests }),
    },
  });
  const mergedAs = await pullRequests.merge(project, pullRequest, head);
  await acceptSignal(project, feedback.path, work, board, log, clock, events, {
    member: author,
    mergedAs,
  });
}

/**
 * The commit a task's inputs are pinned at, from Divlab's own record rather than the task's issue,
 * whose text others can edit: the merge of the latest decision that posted a task for the role and
 * module, as a module has one such task open at a time.
 */
/** The contracts a modules.yaml lists: none if there is none, or it cannot be read. */
const contractsListed = (text: string | undefined) => {
  const listed = readModules(text ?? "");
  return "unreadable" in listed ? [] : listed.contracts;
};

const pinnedCommit = (events: LogEvent[], role: Role, module: string) =>
  routingDecisions(events)
    .filter(
      (event) =>
        "tasks" in event.decision &&
        event.decision.tasks.some((task) => task.role === role && task.module === module),
    )
    .at(-1)?.mergedAs;

/**
 * Whether a module has a task open, as Divlab's routing records say: the latest decision about it
 * posted one, rather than finishing the module or alerting PDC coordinators.
 */
function hasTaskOpen(events: LogEvent[], module: string): boolean {
  const postsFor = (event: RoutingEvent) =>
    "tasks" in event.decision && event.decision.tasks.some((task) => task.module === module);
  const latest = routingDecisions(events)
    .filter((event) => event.work.module === module || postsFor(event))
    .at(-1);
  return latest !== undefined && postsFor(latest);
}

/**
 * A feedback signal with what Divlab found on validating it: the modules a Programme Architect's
 * modules.yaml starts (0013) or sends back, and the inputs and contracts revised since its task
 * was posted (0015).
 */
type RoutedWork = FeedbackSignal & {
  modulesToStart?: string[];
  inputsChanged?: string[];
  inputsUnchecked?: true;
  contractsRevised?: string[];
  contractRevision?: { contracts: string[]; modules: string[] };
};

/** The modules earlier modules.yaml started, as Divlab's routing records say. */
const modulesStarted = (events: LogEvent[]) =>
  new Set(routingDecisions(events).flatMap((event) => event.work.modulesToStart ?? []));

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
  let found = false;
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
    found = true;
  }
  // How far main was checked is recorded only when the check found something, or once enough has
  // gone by that the next check would page: each record is a write (Bernard, 2026-10-29).
  const last = commits.at(-1);
  if (last !== undefined && (found || commits.length >= RECORD_CHECK_AFTER)) {
    const checked: MainChecked = {
      project,
      decidedAt: clock().toISOString(),
      mainChecked: { upTo: last.sha },
    };
    await log.append(checked);
  }
}

/** The most commits main's check goes over before it records how far it checked. */
const RECORD_CHECK_AFTER = 50;

/** Project repositories as Divlab sets them up. */
export interface ProjectRepositories {
  /** Only Divlab may change the main branch: no person is exempt (decision 0006). */
  protectMain(project: string): Promise<void>;
  /** Whether main has the protection `protectMain` gives it, still in force. */
  mainIsProtected(project: string): Promise<boolean>;
  /** Divlab's checks, and nothing else, may act on members' pull requests. */
  allowDivlabChecks(project: string): Promise<void>;
  /** The toolchain the project declares on main, if it declares one (decision 0010). */
  toolchain(project: string): Promise<Toolchain | undefined>;
}

/** A project's repository has been created, and Divlab prepares it. */
export async function setUpProject(
  project: string,
  repositories: ProjectRepositories,
): Promise<void> {
  // Its own tests run in the toolchain it declares: without one, none of its work could be checked.
  if ((await repositories.toolchain(project)) === undefined) {
    throw new Error(
      `The project ${project} cannot be started: it declares no toolchain (the image its tests run in, and the command that runs them) in anarres.yaml`,
    );
  }
  await repositories.protectMain(project);
  await repositories.allowDivlabChecks(project);
}

/** A project begins: Divlab posts its first task. */
export async function startProject(project: string, board: TaskBoard): Promise<void> {
  // The Programme Architect decides the project's modules, in modules.yaml (decision 0013).
  await board.post({ project, role: "programme-architect", module: PROGRAMME });
}

/** A module begins: Divlab posts its first task. */
export async function startModule(
  project: string,
  module: string,
  board: TaskBoard,
): Promise<void> {
  await board.post({ project, role: FIRST_ROLE, module });
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
