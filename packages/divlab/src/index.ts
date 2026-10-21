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

/** Where Divlab posts tasks and alerts: GitHub issues in production, a fake in fast tests. */
export interface TaskBoard {
  post(task: PostedTask): Promise<void>;
  alertCoordinators(alert: CoordinatorAlert): Promise<void>;
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
  readFile(project: string, path: string): Promise<string>;
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

/** Where Divlab records its decisions: one file per event in the project repository. */
export interface EventLog {
  append(event: RoutingEvent): Promise<void>;
  /** The project's events, oldest first. */
  read(project: string): Promise<RoutingEvent[]>;
}

async function onWorkAccepted(event: WorkAccepted, board: TaskBoard, log: EventLog): Promise<void> {
  const { project, task, ...work } = event;
  const history = await log.read(project);
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
  // Each signal is routed once: any merged since Divlab last ran have no event yet.
  const routed = new Set((await log.read(project)).map((event) => event.work.feedbackSignal));
  for (const path of await repository.feedbackSignals(project)) {
    if (routed.has(path)) continue;
    const signal = readFeedbackSignal(await repository.readFile(project, path));
    if ("unreadable" in signal) {
      throw new Error(cannotRead(path, signal));
    }
    await acceptSignal(project, path, signal, board, log);
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
  if (feedback === undefined) return;
  const signal = readFeedbackSignal(feedback.text);
  if ("unreadable" in signal) {
    await pullRequests.refuse(project, pullRequest, cannotRead(feedback.path, signal));
    return;
  }
  await pullRequests.merge(project, pullRequest, head);
  await acceptSignal(project, feedback.path, signal, board, log);
}
