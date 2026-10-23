/** How long a claim holds its task without activity (concept document, §8). */
const LEASE_HOURS = 24;

/** Whether a claim's lease has run out, given the last activity on its task. */
export function leaseHasRunOut(lastActivity: string, now: Date): boolean {
  return now.getTime() - Date.parse(lastActivity) >= LEASE_HOURS * 60 * 60 * 1000;
}
