/**
 * A ready task as offers are ranked: whether its work is under way, and when it was posted, as
 * GitHub gives the time (UTC, to the second, so the texts sort as the times do).
 */
export type Rankable = { underWay: boolean; posted: string };

/**
 * The order a member is offered tasks in (concept §8, Bernard, 2026-10-29): work already under
 * way first, as it unblocks a module that is moving, then the longest waiting.
 */
export function rankOffers<T extends Rankable>(tasks: readonly T[]): T[] {
  return [...tasks].sort(
    (a, b) => Number(b.underWay) - Number(a.underWay) || a.posted.localeCompare(b.posted),
  );
}

/**
 * A task's work is under way when Divlab posted it for a feedback signal: a revision, a
 * continuation or research. A module's next task, for work that passed, names none.
 */
export const underWay = (task: { feedbackSignal?: string }): boolean =>
  task.feedbackSignal !== undefined;
