/** How long a claim holds its task without activity (concept document, §8). */
export const LEASE_HOURS = 24;

/** Whether a claim's lease has run out, given the last activity on its task. */
export function leaseHasRunOut(lastActivity: string, now: Date): boolean {
  // Read from a log people can edit: a time that cannot be read is taken to be long past.
  const since = Date.parse(lastActivity);
  if (Number.isNaN(since)) return true;
  return now.getTime() - since >= LEASE_HOURS * 60 * 60 * 1000;
}
