import {
  contractsOfModule,
  isPlainName,
  isRole,
  leaseRunsOutAt,
  mayRead,
  outsideScope,
  ROLE_NAMES,
  type Role,
  readFeedbackSignal,
  readModules,
  readScope,
} from "@anarres/core";
import { eligibility, type LogEvent, leasesFrom, routingDecisions } from "@anarres/divlab";

/** Anarres's projects, as a member's CLI reads them from GitHub with the member's own login. */
export interface Projects {
  names(): Promise<string[]>;
  /** The project's tasks anyone eligible may claim. */
  readyTasks(project: string): Promise<{ id: string; role: string; module: string }[]>;
  /** The project's event log: who has done what, for the conflict-of-interest rules. */
  log(project: string): Promise<LogEvent[]>;
  /** The governance file: members' trust levels and linked accounts. */
  governanceFile(): Promise<unknown>;
}

/** A ready task a member may take, and where it is. */
export type Offer = { project: string; task: string; role: Role; module: string };

/** The member asks for work: the ready tasks across Anarres's projects they may take. */
export async function askForWork(member: string, projects: Projects): Promise<Offer[]> {
  const governance = await projects.governanceFile();
  const offers: Offer[] = [];
  for (const project of await projects.names()) {
    const mayTake = eligibility(governance, await projects.log(project));
    for (const task of await projects.readyTasks(project)) {
      // What is offered is shown in the member's session: only plain names, as Divlab writes them.
      if (
        isRole(task.role) &&
        isPlainName(task.module) &&
        mayTake(member, { role: task.role, module: task.module }) === "allowed"
      ) {
        offers.push({ project, task: task.id, role: task.role, module: task.module });
      }
    }
  }
  return offers;
}

/** The offers as the member sees them, one to a line. */
export function describeOffers(offers: readonly Offer[]): string {
  if (offers.length === 0) return "No tasks you may take are ready just now.";
  return offers
    .map(
      (offer) =>
        `${offer.project}#${offer.task}  ${ROLE_NAMES[offer.role]} task for ${offer.module}`,
    )
    .join("\n");
}

/** The task a member names, as the offers name it: project#number. */
export function taskNamed(named: string): { project: string; task: string } | undefined {
  // Checked before use: the name comes from offers made of other people's data.
  const match = named.match(TASK_NAME);
  return match?.[1] && match[2] ? { project: match[1], task: match[2] } : undefined;
}

/** A repository's name (never `.` or `..`), then an issue number GitHub could have given. */
const TASK_NAME = /^(?!\.{1,2}#)([A-Za-z0-9_.-]{1,100})#([1-9][0-9]{0,9})$/;

/** Where the member's CLI asks Divlab for a task: a comment, as the member, on its issue. */
export interface Claiming {
  askToClaim(project: string, task: string): Promise<void>;
}

/** The member asks to claim a task by its name in the offers; Divlab decides. */
export async function claim(named: string, claiming: Claiming): Promise<string> {
  const task = taskNamed(named);
  if (task === undefined) {
    return `Name the task as the offers do, project#number: ${named} is not one.`;
  }
  await claiming.askToClaim(task.project, task.task);
  return `Asked for ${named}. Divlab answers on the task's issue: run next to see what is still offered.`;
}

/** What preparing a task fetches: the places its role may read, at its pinned commit. */
export type Preparation =
  | { repository: string; commit: string; paths: string[]; contracts: string[] }
  | { refused: string };

/**
 * How to prepare a task for the member, or why not. The project's modules.yaml at the task's
 * pinned commit, if it has one there, says which contracts its module provides and uses.
 */
export function preparation(
  owner: string,
  project: string,
  task:
    | {
        role: Role;
        module: string;
        claimedBy?: string;
        inputsAt?: string;
        continuation?: true;
        staleRevision?: true;
        afterResearch?: true;
      }
    | undefined,
  member: string,
  modulesFile?: string,
): Preparation {
  const refused = (why: string) => ({ refused: `Nothing fetched for ${project}: ${why}.` });
  if (task === undefined) return refused("it is not a task");
  if (task.claimedBy !== member) return refused("you do not hold it: claim it first");
  if (task.inputsAt === undefined) {
    return refused("it does not say which commit its inputs are read at");
  }
  const listed = modulesFile === undefined ? undefined : readModules(modulesFile);
  if (listed !== undefined && "unreadable" in listed) {
    return refused(`its modules.yaml cannot be read: ${listed.unreadable}`);
  }
  const contracts = listed === undefined ? [] : contractsOfModule(listed.contracts, task.module);
  return {
    repository: `${owner}/${project}`,
    commit: task.inputsAt,
    paths: readScope(task.role, task.module, { ...task, contracts }),
    contracts,
  };
}

/** The git commands, each its arguments, that fetch a prepared task into a folder. */
export function gitSteps(
  fetch: { repository: string; commit: string; paths: string[] },
  into: string,
): string[][] {
  // Each place anchored at the repository's root, so the checkout holds it and nothing else.
  const places = fetch.paths.map((path) => `/${path}`);
  return [
    ["init", "--quiet", into],
    ["-C", into, "sparse-checkout", "set", "--no-cone", ...places],
    [
      "-C",
      into,
      "fetch",
      "--quiet",
      "--depth=1",
      "--filter=blob:none",
      `https://github.com/${fetch.repository}.git`,
      fetch.commit,
    ],
    ["-C", into, "checkout", "--quiet", "--detach", "FETCH_HEAD"],
  ];
}

/** Whether the member's session may read or write a file while doing a task, and if not why. */
export function scopeDecision(
  task: RecordedTask,
  root: string,
  path: string,
  access: "read" | "write",
): "allowed" | { refused: string } {
  // Only the task's own folder: not the member's files, nor a folder whose name starts the same.
  if (!path.startsWith(`${root}/`)) {
    return {
      refused: `${path} is outside this task's folder: Anarres keeps a task's session to it`,
    };
  }
  const inFolder = path.slice(root.length + 1);
  const role = ROLE_NAMES[task.role];
  // Where the role's work writes, its feedback signal included (concept §6). In the task's folder
  // that is the member's own work, which the session may read back too: prepare fetches nothing
  // of anyone else's there, but for a continuation, which reads it anyway (Bernard, 2026-10-24).
  const ownPlace = outsideScope(task.role, task.module, [inFolder]).length === 0;
  if (access === "write") {
    if (ownPlace) return "allowed";
    return {
      refused: `${inFolder} is outside what ${role} may write for this task: Anarres keeps each role to its own place`,
    };
  }
  // What prepare fetched for the task, and the session's own work, may be read.
  if (ownPlace || mayRead(task.role, task.module, inFolder, task)) return "allowed";
  return {
    refused: `${inFolder} is outside what ${role} may read for this task: Anarres keeps each role to its own inputs`,
  };
}

/** A tool call as Claude Code gives it to a PreToolUse hook: only what the hook reads. */
export type ToolCall = { tool_name: string; tool_input: Record<string, unknown>; cwd: string };

/** Claude Code's tools that read a file, those that change one, and those that search a folder. */
const READING_TOOLS = ["Read"];
const WRITING_TOOLS = ["Write", "Edit", "NotebookEdit"];
const SEARCHING_TOOLS = ["Glob", "Grep"];

/**
 * A search may go ahead within the task's folder: its sparse checkout holds only what the role may
 * read. Anywhere else is the member's own files.
 */
const searchDecision = (root: string, folder: string): "allowed" | { refused: string } =>
  folder === root || folder.startsWith(`${root}/`)
    ? "allowed"
    : { refused: `${folder} is outside this task's folder: Anarres keeps a task's session to it` };

/** What the read-scope hook tells Claude Code about a tool call: nothing when it may go ahead. */
export function hookAnswer(call: ToolCall, task: RecordedTask | undefined, root: string): unknown {
  const decision = toolDecision(call, task, root);
  if (decision === "allowed") return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: decision.refused,
    },
  };
}

/** Whether a tool call may go ahead in a task's folder, judged by what the tool touches. */
function toolDecision(
  call: ToolCall,
  task: RecordedTask | undefined,
  root: string,
): "allowed" | { refused: string } {
  if (!task) {
    return {
      refused: "This task's record cannot be read, so its scope is unknown: prepare the task again",
    };
  }
  if (SEARCHING_TOOLS.includes(call.tool_name)) {
    return searchDecision(root, String(call.tool_input.path ?? call.cwd));
  }
  // A notebook's tool names its file differently.
  const path = String(call.tool_input.file_path ?? call.tool_input.notebook_path);
  if (READING_TOOLS.includes(call.tool_name)) return scopeDecision(task, root, path, "read");
  if (WRITING_TOOLS.includes(call.tool_name)) return scopeDecision(task, root, path, "write");
  return {
    refused: `Anarres does not yet know what ${call.tool_name} touches, so it is not used in a task's folder`,
  };
}

/** The record prepare leaves in a task's folder, naming its role and module. */
export const TASK_RECORD = ".anarres-task.json";

/** The record prepare leaves in a task's folder. */
export function taskRecord(task: Partial<RecordedTask>): string {
  const { role, module, continuation, staleRevision, afterResearch, contracts } = task;
  return JSON.stringify({ role, module, continuation, staleRevision, afterResearch, contracts });
}

/** A task as its folder's record gives it: what the hook judges its session's files by. */
export type RecordedTask = {
  role: Role;
  module: string;
  continuation?: true;
  /** A revision of work whose inputs changed, which reads the work done (decision 0015). */
  staleRevision?: true;
  /** A revision after research, which reads the module's research briefs. */
  afterResearch?: true;
  /** The contracts prepare fetched for the task's module (decision 0014). */
  contracts?: string[];
};

/** The task a folder's record names, read as data: its role and module, if they are plain. */
export function taskOfRecord(text: string): RecordedTask | undefined {
  let record: { [key in keyof RecordedTask]?: unknown };
  try {
    record = JSON.parse(text) as { [key in keyof RecordedTask]?: unknown };
  } catch {
    return undefined;
  }
  const { role, module, contracts } = record;
  if (!isRole(role) || typeof module !== "string" || !isPlainName(module)) return undefined;
  const plainNames = (names: unknown) =>
    Array.isArray(names) && names.every((name) => typeof name === "string" && isPlainName(name));
  if (contracts !== undefined && !plainNames(contracts)) return undefined;
  return {
    role,
    module,
    ...(record.continuation === true ? { continuation: true as const } : {}),
    ...(record.staleRevision === true ? { staleRevision: true as const } : {}),
    ...(record.afterResearch === true ? { afterResearch: true as const } : {}),
    ...(contracts === undefined ? {} : { contracts: contracts as string[] }),
  };
}

/**
 * How a member's claim went, from what Divlab sets on the task (its claimed label and assignee),
 * never from the text of replies, which anyone could write.
 */
export function claimOutcome(
  named: string,
  task: { claimedBy?: string } | undefined,
  member: string,
): string {
  if (task === undefined) return `${named} is not a task anyone can claim now: run next again.`;
  if (task.claimedBy === member) return `You hold ${named}: prepare it to begin.`;
  if (task.claimedBy !== undefined) {
    return `Someone else holds ${named}: see the task's issue, and run next again.`;
  }
  return `Divlab has not given ${named} to you yet: see the task's issue, and run next again.`;
}

/** Whether a member's work is ready to submit for their task, checked as Divlab will check it. */
export function submission(
  task: { role: Role; module: string; task: string },
  changed: readonly { path: string; text: string }[],
): "ready" | { refused: string } {
  const refused = (why: string) => ({ refused: `Not submitted: ${why}.` });
  const feedback = changed.find((file) => file.path.startsWith("feedback/"));
  if (feedback === undefined) {
    return refused(
      "it has no feedback signal: write one in feedback/, saying what it was for and how it went",
    );
  }
  const signal = readFeedbackSignal(feedback.text);
  if ("unreadable" in signal)
    return refused(`its feedback signal cannot be read: ${signal.unreadable}`);
  if (signal.task !== task.task) {
    return refused(`its feedback signal names task ${signal.task}, not task ${task.task}`);
  }
  if (signal.fromRole !== task.role || signal.module !== task.module) {
    return refused(
      `its feedback signal is from ${signal.fromRole} and module ${signal.module}, not ${task.role} and ${task.module}`,
    );
  }
  const outside = outsideScope(
    task.role,
    task.module,
    changed.map((file) => file.path),
  );
  if (outside.length > 0) {
    return refused(
      `it changes files outside what ${ROLE_NAMES[task.role]} may change: ${outside.join(", ")}`,
    );
  }
  return "ready";
}

/** GitHub as the member's CLI uses it to submit work, with the member's own login. */
export interface Submitting {
  /** The member's fork of the project, made if they have none. */
  forkOf(project: string): Promise<string>;
  /** A branch of the fork, from its main. */
  branch(fork: string, name: string): Promise<void>;
  putFile(fork: string, branch: string, path: string, text: string): Promise<void>;
  /** The project is asked to merge `head` (fork:branch); gives the pull request's number. */
  openPullRequest(project: string, head: string, title: string, draft: boolean): Promise<string>;
}

/** The member submits their work for a task they hold, checked first as Divlab will check it. */
export async function submit(
  task: { project: string; role: Role; module: string; task: string },
  changed: readonly { path: string; text: string }[],
  options: { draft: boolean },
  github: Submitting,
): Promise<string> {
  // Checked here first, so the member hears at once, not after Divlab refuses a pull request.
  const ready = submission(task, changed);
  if (ready !== "ready") return ready.refused;
  const fork = await github.forkOf(task.project);
  const branch = `anarres/task-${task.task}`;
  await github.branch(fork, branch);
  for (const { path, text } of changed) await github.putFile(fork, branch, path, text);
  const number = await github.openPullRequest(
    task.project,
    // GitHub names a fork's branch by its owner: owner:branch.
    `${fork.split("/")[0]}:${branch}`,
    `${ROLE_NAMES[task.role]} work on ${task.module} (task ${task.task})`,
    options.draft,
  );
  return `Submitted ${task.project}#${task.task} as pull request ${number}: Divlab checks it and answers there.`;
}

/** Anarres's projects, as a member's CLI reads the tasks a member holds. */
export interface Holdings {
  names(): Promise<string[]>;
  /** The project's tasks the member holds, as Divlab has marked them. */
  heldTasks(
    project: string,
    member: string,
  ): Promise<{ id: string; role: string; module: string }[]>;
  /** The project's event log: when each claim was made, and the work since. */
  log(project: string): Promise<LogEvent[]>;
  /** The member's open pull requests in the project, each with the task it is for. */
  pullRequestsOpenBy(
    project: string,
    member: string,
  ): Promise<{ number: string; task: string; draft: boolean }[]>;
}

/**
 * A task a member holds, and when its lease runs out: no time when Divlab cannot tell when the
 * lease began, as it then takes the lease to have run out.
 */
export type Held = Offer & {
  leaseRunsOut?: string;
  /** The member's open pull request for the task, if they have one. */
  pullRequest?: { number: string; draft: boolean };
};

/** The tasks a member holds, across Anarres's projects, and when each lease runs out. */
export async function memberStatus(member: string, holdings: Holdings): Promise<Held[]> {
  const held: Held[] = [];
  for (const project of await holdings.names()) {
    const events = await holdings.log(project);
    const pullRequests = await holdings.pullRequestsOpenBy(project, member);
    for (const task of await holdings.heldTasks(project, member)) {
      // Shown in the member's session: only plain names, as Divlab writes them.
      if (!isRole(task.role) || !isPlainName(task.module)) continue;
      const pullRequest = pullRequests.find((open) => open.task === task.id);
      const runsOut = leaseRunsOutAt(leasesFrom(events).get(task.id)?.since ?? "");
      held.push({
        project,
        task: task.id,
        role: task.role,
        module: task.module,
        ...(runsOut === undefined ? {} : { leaseRunsOut: runsOut.toISOString() }),
        ...(pullRequest === undefined
          ? {}
          : { pullRequest: { number: pullRequest.number, draft: pullRequest.draft } }),
      });
    }
  }
  return held;
}

/** A member's status as they see it. */
export function describeStatus(held: readonly Held[]): string {
  if (held.length === 0) return "You hold no tasks just now: run next to find one.";
  return held
    .map(({ project, task, role, module, leaseRunsOut, pullRequest }) => {
      const lease =
        leaseRunsOut === undefined
          ? "its lease has run out, and Divlab frees it at its next check"
          : `its lease runs out at ${leaseRunsOut.slice(0, 10)} ${leaseRunsOut.slice(11, 16)} UTC unless you work on it`;
      const open =
        pullRequest === undefined
          ? ""
          : pullRequest.draft
            ? `; your draft is pull request ${pullRequest.number}: submit the finished work to make it ready`
            : `; Divlab has not merged pull request ${pullRequest.number}: see its answer there`;
      return `${project}#${task}  ${ROLE_NAMES[role]} task for ${module}, held: ${lease}${open}`;
    })
    .join("\n");
}

/** The folder a task is prepared in, on the member's machine. */
export const taskFolder = (task: { project: string; task: string }): string =>
  `anarres-work/${task.project}-${task.task}`;

/** Where a member resumes a task in a new session, or why they cannot. */
export function resumption(
  named: { project: string; task: string },
  task: { role: Role; module: string; claimedBy?: string } | undefined,
  member: string,
  folder: { prepared: boolean },
): { folder: string } | { refused: string } {
  if (task?.claimedBy !== member) {
    return {
      refused: `Not resumed: you no longer hold ${named.project}#${named.task}, so its work is no longer yours to do: run next for another task.`,
    };
  }
  if (!folder.prepared) {
    return {
      refused: `Not resumed: ${named.project}#${named.task} has not been prepared here: prepare it, then carry on.`,
    };
  }
  return { folder: taskFolder(named) };
}

/** Anarres's projects, as a member's CLI reads the work they have done in them. */
export interface Contributed {
  /** The projects where the member's work has been merged. */
  names(): Promise<string[]>;
  /** The project's event log: whose work Divlab merged, and when. */
  log(project: string): Promise<LogEvent[]>;
}

/** A piece of a member's work Divlab merged: where, for which role and module, and on which day. */
export type Contribution = { project: string; role: Role; module: string; mergedOn?: string };

/** The member's contribution history: each piece of their work Divlab merged, per project. */
export async function contributions(member: string, sources: Contributed): Promise<Contribution[]> {
  const done: Contribution[] = [];
  for (const project of await sources.names()) {
    for (const event of routingDecisions(await sources.log(project))) {
      const { fromRole, module } = event.work;
      // Shown in the member's session: only plain names, as Divlab writes them.
      if (event.member !== member || !isRole(fromRole) || !isPlainName(module)) continue;
      const at = Date.parse(event.decidedAt ?? "");
      done.push({
        project,
        role: fromRole,
        module,
        // Read from a log people can edit: only a time that reads as one gives a day.
        ...(Number.isNaN(at) ? {} : { mergedOn: new Date(at).toISOString().slice(0, 10) }),
      });
    }
  }
  return done;
}

/** A member's contribution history as they see it. */
export function describeContributions(done: readonly Contribution[]): string {
  if (done.length === 0) return "None of your work has been merged yet.";
  return [
    "Your merged work:",
    ...done.map(
      ({ project, role, module, mergedOn }) =>
        `${project}  ${ROLE_NAMES[role]} work on ${module}, merged${mergedOn ? ` ${mergedOn}` : ""}`,
    ),
  ].join("\n");
}

/** The files of a member's draft to bring back into the task's folder when preparing it again. */
export function draftToRestore(
  task: { role: Role; module: string },
  draft: readonly { path: string; text: string }[],
): { path: string; text: string }[] {
  // Only the member's own work: where the role writes, its feedback signal included (0009).
  const outside = outsideScope(
    task.role,
    task.module,
    draft.map((file) => file.path),
  );
  return draft.filter((file) => !outside.includes(file.path));
}

/** GitHub as the member's CLI reads their open pull request for a task, with their own login. */
export interface Drafts {
  pullRequestsOpenBy(
    project: string,
    member: string,
  ): Promise<{ number: string; task: string; draft: boolean }[]>;
  changedFiles(project: string, pullRequest: string): Promise<{ path: string; text: string }[]>;
}

/**
 * Brings back the member's work so far into a task's folder they prepare again, from their open
 * pull request for the task: only its files in the role's own place. Gives how many.
 */
export async function restoreDraft(
  named: { project: string; task: string },
  task: { role: Role; module: string },
  member: string,
  github: Drafts,
  write: (path: string, text: string) => void,
): Promise<number> {
  const open = (await github.pullRequestsOpenBy(named.project, member)).find(
    (pullRequest) => pullRequest.task === named.task,
  );
  if (open === undefined) return 0;
  const files = draftToRestore(task, await github.changedFiles(named.project, open.number));
  for (const { path, text } of files) write(path, text);
  return files.length;
}
