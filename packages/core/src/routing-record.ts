import { type AcceptedWork, type Reason, type RoutingDecision, rule } from "./routing.ts";

/** A routing decision as Divlab records it: the work it came from, what it decided, and why. */
export type RoutingRecord = {
  work: AcceptedWork;
  decision: RoutingDecision;
  reason: Reason;
};

export function routingRecord(work: AcceptedWork): RoutingRecord {
  return { work, ...rule(work) };
}
