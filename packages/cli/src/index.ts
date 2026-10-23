import {
  isPlainName,
  isRole,
  mayRead,
  outsideScope,
  ROLE_NAMES,
  type Role,
  readScope,
} from "@anarres/core";
import { eligibility, type LogEvent } from "@anarres/divlab";

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
  | { repository: string; commit: string; paths: string[] }
  | { refused: string };

/** How to prepare a task for the member, or why not. */
export function preparation(
  owner: string,
  project: string,
  task: { role: Role; module: string; claimedBy?: string; inputsAt?: string } | undefined,
  member: string,
): Preparation {
  const refused = (why: string) => ({ refused: `Nothing fetched for ${project}: ${why}.` });
  if (task === undefined) return refused("it is not a task");
  if (task.claimedBy !== member) return refused("you do not hold it: claim it first");
  if (task.inputsAt === undefined) {
    return refused("it does not say which commit its inputs are read at");
  }
  return {
    repository: `${owner}/${project}`,
    commit: task.inputsAt,
    paths: readScope(task.role, task.module),
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
  task: { role: Role; module: string },
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
  if (access === "write") {
    // Where the role's work writes, its feedback signal included (concept §6).
    if (outsideScope(task.role, task.module, [inFolder]).length === 0) return "allowed";
    return {
      refused: `${inFolder} is outside what ${role} may write for this task: Anarres keeps each role to its own place`,
    };
  }
  if (mayRead(task.role, task.module, inFolder)) return "allowed";
  return {
    refused: `${inFolder} is outside what ${role} may read for this task: Anarres keeps each role to its own inputs`,
  };
}

/** A tool call as Claude Code gives it to a PreToolUse hook: only what the hook reads. */
export type ToolCall = { tool_name: string; tool_input: Record<string, unknown>; cwd: string };

/** Claude Code's tools that change a file, and those that search a folder. */
const WRITING_TOOLS = ["Write", "Edit"];
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
export function hookAnswer(
  call: ToolCall,
  task: { role: Role; module: string } | undefined,
  root: string,
): unknown {
  const decision = !task
    ? {
        refused:
          "This task's record cannot be read, so its scope is unknown: prepare the task again",
      }
    : SEARCHING_TOOLS.includes(call.tool_name)
      ? searchDecision(root, String(call.tool_input.path ?? call.cwd))
      : scopeDecision(
          task,
          root,
          String(call.tool_input.file_path),
          WRITING_TOOLS.includes(call.tool_name) ? "write" : "read",
        );
  if (decision === "allowed") return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: decision.refused,
    },
  };
}

/** The record prepare leaves in a task's folder, naming its role and module. */
export const TASK_RECORD = ".anarres-task.json";

/** The task a folder's record names, read as data: its role and module, if they are plain. */
export function taskOfRecord(text: string): { role: Role; module: string } | undefined {
  let record: { role?: unknown; module?: unknown };
  try {
    record = JSON.parse(text) as { role?: unknown; module?: unknown };
  } catch {
    return undefined;
  }
  const { role, module } = record;
  return isRole(role) && typeof module === "string" && isPlainName(module)
    ? { role, module }
    : undefined;
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
