import { INTEGRATION_PIPELINE, type RoutingDecision, type Task } from "./routing.ts";

/** A task the board shows ready, nobody holding it: its role as the board gives it, as data. */
export type UnclaimedTask = { id: string; role: string; module: string };

/**
 * The ready integration tasks a decision withdraws: those still unclaimed when it sends work to a
 * module that was done, since integration waits until every module is done again (decision 0017).
 * Claimed integration work is left to finish.
 */
export function withdrawnOnReopening(
  decision: RoutingDecision,
  done: ReadonlySet<string>,
  ready: readonly UnclaimedTask[],
): string[] {
  if (!reopens(decision, done)) return [];
  const integrating: readonly string[] = INTEGRATION_PIPELINE;
  return ready.filter(({ role }) => integrating.includes(role)).map(({ id }) => id);
}

/** Whether the decision sends work to a module that was done. */
export function reopens(decision: RoutingDecision, done: ReadonlySet<string>): boolean {
  // A decision that has tasks lists them: it never holds an empty slot for them.
  const tasks = "tasks" in decision ? (decision.tasks as Task[]) : [];
  return tasks.some((task) => done.has(task.module));
}
