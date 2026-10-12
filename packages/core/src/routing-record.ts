import type { Role } from "./roles.ts";
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
