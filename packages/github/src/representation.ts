import { ROLE_NAMES, type Role } from "@anarres/core";
import type { PostedTask, RoutingEvent } from "@anarres/divlab";

/** What GitHub needs to open an issue. */
export type NewIssue = { title: string; labels: string[]; body: string };

export function issueForTask(task: PostedTask): NewIssue {
  return {
    title: `${ROLE_NAMES[task.role]} task for ${task.module}`,
    labels: [
      `role:${task.role}`,
      `module:${task.module}`,
      "state:ready",
      ...(task.researchFor === undefined ? [] : [`research-for:${task.researchFor}`]),
    ],
    body: task.feedbackSignal === undefined ? "" : `Feedback signal: ${task.feedbackSignal}`,
  };
}

/** One file per event, so concurrent writers never touch the same file (concept §7). */
export function eventFile(
  event: RoutingEvent,
  sequence: number,
): { path: string; content: string } {
  return {
    path: `events/${String(sequence).padStart(6, "0")}.json`,
    content: `${JSON.stringify(event, null, 2)}\n`,
  };
}

/** Event files can be edited by people, so what is read back is checked, never assumed. */
export function eventFromFile(content: string): RoutingEvent {
  const event: unknown = JSON.parse(content);
  if (
    !isObject(event) ||
    !isObject(event.work) ||
    !isObject(event.decision) ||
    !isObject(event.reason)
  ) {
    throw new Error("The event file is not a routing record");
  }
  return event as RoutingEvent;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function issueForAlert(alert: RoutingEvent): NewIssue {
  const { module } = alert.work;
  const work = `the ${roleName(alert.work.fromRole)} work on ${module}`;
  const reported =
    alert.work.impediments.map((impediment) => impediment.type).join(", ") || "no problem";
  const [title, why] =
    alert.reason.rule === "re_run_limit"
      ? [
          `${roleName(alert.reason.role)} has been re-run more than three times on ${module}`,
          `${roleName(alert.reason.role)} has already been re-run three times for this module, so Divlab has not sent it back again.`,
        ]
      : [`no rule covers ${work}`, "No routing rule covers that."];
  return {
    title: `Escalation: ${title}`,
    labels: ["escalation", `module:${module}`],
    body: [
      `${capitalised(work)} ${alert.work.verdict === "blocked" ? "was blocked" : "failed"}, reporting ${reported}. ${why}`,
      "",
      "The routing record:",
      "",
      "```json",
      JSON.stringify(alert, null, 2),
      "```",
    ].join("\n"),
  };
}

/** The role's name as members know it, or the id as the work gave it if no role has that id. */
function roleName(id: string): string {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => role === id);
  return role ? ROLE_NAMES[role] : id;
}

const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Opened and closed at once, so the issue list shows when the module finished. */
export function issueForModuleDone(module: string): NewIssue {
  return {
    title: `Module ${module} is done`,
    labels: [`module:${module}`, "state:done"],
    body: "",
  };
}

/**
 * The event log from the files listed and the texts read, oldest first; undefined while any
 * listed file is unread, since a decision must never rest on a log missing its latest events.
 */
export function logFrom(listed: string[], texts: Map<string, string>): RoutingEvent[] | undefined {
  if (!listed.every((name) => texts.has(name))) return undefined;
  return listed
    .filter((name) => /^\d{6}\.json$/.test(name))
    .sort()
    .map((name) => eventFromFile(texts.get(name) ?? ""));
}
