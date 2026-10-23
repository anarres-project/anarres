import { isRole, ROLE_NAMES, type Role } from "@anarres/core";
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
      if (
        isRole(task.role) &&
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
