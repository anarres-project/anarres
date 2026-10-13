import { ROLE_NAMES, type Role } from "@anarres/core";
import type { RoutingEvent, WorkAccepted } from "@anarres/divlab";
import type { AcceptedWork, RoutingRecord } from "./driver.ts";

/**
 * Translation between the scenarios' words and Divlab's ids, shared by every driver. Scenarios
 * say "Security & Quality" and "upstream ambiguity"; Divlab says "security-and-quality" and
 * "upstream_ambiguity".
 */

/** The event Divlab receives when a member's work is merged. */
export function workAccepted(work: AcceptedWork, researchFor?: string): WorkAccepted {
  return {
    project: work.project,
    module: work.module,
    fromRole: roleId(work.role),
    verdict: ids(work.verdict),
    impediments: work.impediments.map((name) => ({ type: ids(name) })),
    feedbackSignal: work.feedbackSignal,
    ...(researchFor === undefined ? {} : { researchFor }),
  };
}

/** A routing record as the scenarios speak of it: role names and plain words, not ids. */
export function inScenarioWords({ work, decision, reason }: RoutingEvent): RoutingRecord {
  return {
    work: {
      role: roleNameOf(work.fromRole),
      module: work.module,
      verdict: words(work.verdict),
      impediments: work.impediments.map((impediment) => words(impediment.type)),
      feedbackSignal: work.feedbackSignal,
    },
    outcome:
      "tasks" in decision
        ? { tasksFor: decision.tasks.map((task) => roleName(task.role)) }
        : "alert" in decision
          ? { alert: true }
          : { moduleDone: true },
    reason:
      "impediment" in reason
        ? { ...reason, impediment: words(reason.impediment) }
        : "role" in reason
          ? { ...reason, role: roleName(reason.role) }
          : reason,
  };
}

export const roleName = (role: Role) => ROLE_NAMES[role];

export function roleId(name: string): Role {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => ROLE_NAMES[role] === name);
  if (!role) throw new Error(`No role is called "${name}"`);
  return role;
}

// Divlab records the role as the work gave it, which need not be a role Divlab knows.
export function roleNameOf(id: string): string {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => role === id);
  return role ? ROLE_NAMES[role] : id;
}

const words = (id: string) => id.replaceAll("_", " ");
const ids = (words: string) => words.replaceAll(" ", "_");
