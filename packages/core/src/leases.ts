/** How long a claim holds its task without activity (concept document, §8). */
export const LEASE_HOURS = 24;

/**
 * When a claim's lease runs out, given the last activity on its task; none when that time cannot
 * be read, as then the lease is taken to have run out long ago.
 */
export function leaseRunsOutAt(lastActivity: string): Date | undefined {
  // Read from a log people can edit: a time that cannot be read is taken to be long past.
  const since = Date.parse(lastActivity);
  if (Number.isNaN(since)) return undefined;
  return new Date(since + LEASE_HOURS * 60 * 60 * 1000);
}

/** Whether a claim's lease has run out, given the last activity on its task. */
export function leaseHasRunOut(lastActivity: string, now: Date): boolean {
  const runsOut = leaseRunsOutAt(lastActivity);
  return runsOut === undefined || now >= runsOut;
}
