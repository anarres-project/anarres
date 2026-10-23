import { isPlainName, isRole, ROLE_NAMES, type Role, readScope } from "@anarres/core";
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
