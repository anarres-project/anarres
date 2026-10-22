import type { FeedbackSignal, Unreadable } from "./feedback-signal.ts";
import { ROLE_NAMES, type Role } from "./roles.ts";
import { type AcceptedWork, failed, type Reason, type RoutingDecision, rule } from "./routing.ts";

/** A routing decision as Divlab records it: the work it came from, what it decided, and why. */
export type RoutingRecord = {
  work: AcceptedWork;
  decision: RoutingDecision;
  reason: Reason;
};

/** A role may be re-run three times for a module; the fourth goes to a PDC coordinator. */
const RE_RUN_LIMIT = 3;

/** `history`: the records already in the project's event log, oldest first. */
export function routingRecord(
  work: AcceptedWork,
  history: readonly RoutingRecord[],
): RoutingRecord {
  const ruling = rule(work);
  const moduleHistory = history.filter((record) => record.work.module === work.module);
  const stuck = rolesSentBack(ruling.decision).find(
    (role) => reRuns(role, moduleHistory) >= RE_RUN_LIMIT,
  );
  if (stuck) {
    return {
      work,
      decision: { alert: { reason: "re_run_limit" } },
      reason: { rule: "re_run_limit", role: stuck },
    };
  }
  return { work, ...ruling };
}

/** How often a role has been sent work back since its own work last passed. */
function reRuns(role: Role, history: readonly RoutingRecord[]): number {
  const lastPass = history.findLastIndex(
    (record) => record.work.fromRole === role && !failed(record.work),
  );
  return history
    .slice(lastPass + 1)
    .filter((record) => rolesSentBack(record.decision).includes(role)).length;
}

/** The roles a decision sends work back to: only revision tasks carry a feedback signal. */
const rolesSentBack = (decision: RoutingDecision): Role[] =>
  "tasks" in decision
    ? decision.tasks.filter((task) => task.feedbackSignal !== undefined).map((task) => task.role)
    : [];

/** What routing reads from the work in a past record, and what each is called. */
const WORK_FIELDS = [
  ["fromRole", "role"],
  ["module", "module"],
  ["verdict", "verdict"],
] as const;

/** A record read back from the event log, checked before routing relies on it. */
export function readRoutingRecord(value: unknown): RoutingRecord | Unreadable {
  if (
    !isObject(value) ||
    !isObject(value.work) ||
    !isObject(value.decision) ||
    !isObject(value.reason)
  ) {
    return { unreadable: "it is not a routing record" };
  }
  const record = value as RoutingRecord;
  const work = unreadableWork(record.work);
  if (work) return work;
  const decided: unknown = "tasks" in record.decision ? record.decision.tasks : [];
  if (!Array.isArray(decided) || !decided.every(isObject)) {
    return { unreadable: "its decision's tasks are not a list of tasks" };
  }
  if (!decided.every((task) => Object.hasOwn(ROLE_NAMES, task.role as string))) {
    return { unreadable: "its decision names a role Anarres does not have" };
  }
  return record;
}

/** The work Divlab recorded as about to merge, checked before an interrupted merge is routed. */
export function readMergedWork(value: unknown): FeedbackSignal | Unreadable {
  return unreadableWork(value as FeedbackSignal) ?? (value as FeedbackSignal);
}

/** Why the work's own fields cannot be relied on, if they cannot. */
function unreadableWork(
  work: Record<(typeof WORK_FIELDS)[number][0], unknown>,
): Unreadable | undefined {
  for (const [field, named] of WORK_FIELDS) {
    if (typeof work[field] !== "string")
      return { unreadable: `its work does not give its ${named}` };
  }
  return undefined;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
