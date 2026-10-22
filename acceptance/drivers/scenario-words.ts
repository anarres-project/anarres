import { ROLE_NAMES, type Role } from "@anarres/core";
import type { RoutingEvent } from "@anarres/divlab";
import type { AcceptedWork, RoutingRecord } from "./driver.ts";

/**
 * Translation between the scenarios' words and Divlab's ids, shared by every driver. Scenarios
 * say "Security & Quality" and "upstream ambiguity"; Divlab says "security-and-quality" and
 * "upstream_ambiguity".
 */

/**
 * The feedback signal a member's merged work adds to the project, as the plugin will write it:
 * a header naming the task the work was for, the role, module, verdict and any impediments.
 */
export function feedbackSignalFile(work: AcceptedWork, task?: string) {
  // Work without a feedback signal still has an artefact: the module's specification, say.
  if (work.withoutFeedbackSignal) {
    return { path: `modules/${work.module}/${work.feedbackSignal}.md`, text: "# Specification\n" };
  }
  const header = [
    "---",
    "feedback_signal:",
    ...(task === undefined ? [] : [`  task_id: "${task}"`]),
    `  from_role: ${roleId(work.role)}`,
    // Markdown in place of a name: text Divlab must never carry into what it posts.
    `  module: ${work.moduleNotPlain ? `"${work.module} [see](https://example.test)"` : work.module}`,
    `  verdict: ${ids(work.verdict)}`,
    ...(work.impediments.length === 0
      ? []
      : ["  impediments:", ...work.impediments.map((name) => `    - type: ${ids(name)}`)]),
    "---",
  ];
  return { path: `feedback/${work.feedbackSignal}.md`, text: `${header.join("\n")}\n` };
}

/** The scenario's name for a feedback signal, from where Divlab found it. */
export const signalName = (path: string) => path.replace(/^feedback\/(.+)\.md$/, "$1");

/** A routing record as the scenarios speak of it: role names and plain words, not ids. */
export function inScenarioWords(event: RoutingEvent): RoutingRecord {
  const { work, decision, reason } = event;
  const decided = (event as { decidedAt?: string }).decidedAt;
  return {
    ...(decided === undefined ? {} : { decidedAt: decided }),
    work: {
      role: roleNameOf(work.fromRole),
      module: work.module,
      verdict: words(work.verdict),
      impediments: work.impediments.map((impediment) => words(impediment.type)),
      feedbackSignal: signalName(work.feedbackSignal),
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
