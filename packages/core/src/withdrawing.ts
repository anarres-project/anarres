import type { Role } from "./roles.ts";
import { INTEGRATION_PIPELINE, type RoutingDecision, type Task } from "./routing.ts";

/** A task the board shows ready, nobody holding it. */
export type ReadyTask = { task: string; role: Role; module: string };

/**
 * The ready integration tasks a decision withdraws: those still unclaimed when it sends work to a
 * module that was done, since integration waits until every module is done again (decision 0017).
 * Claimed integration work is left to finish.
 */
export function withdrawnOnReopening(
  decision: RoutingDecision,
  done: ReadonlySet<string>,
  ready: readonly ReadyTask[],
): string[] {
  // A decision that has tasks lists them: it never holds an empty slot for them.
  const tasks = "tasks" in decision ? (decision.tasks as Task[]) : [];
  if (!tasks.some((task) => done.has(task.module))) return [];
  const integrating: readonly Role[] = INTEGRATION_PIPELINE;
  return ready.filter(({ role }) => integrating.includes(role)).map(({ task }) => task);
}
