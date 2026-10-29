/**
 * Why a sandbox scenario should not start, or undefined if the hourly allowance has room for it.
 * A scenario that starts without room stalls, waiting out the limit, and times out; better to say
 * so at once. `reset` is in seconds since the epoch, as GitHub gives it.
 */
export function shortfall(
  allowance: { used: number; limit: number; reset: number },
  needed: number,
  now: number,
): string | undefined {
  const left = allowance.limit - allowance.used;
  if (left >= needed) return undefined;
  const resets = new Date(allowance.reset * 1000);
  const minutes = Math.ceil((resets.getTime() - now) / 60_000);
  return (
    `GitHub's hourly allowance has ${left} requests left, and a scenario needs about ${needed}: ` +
    `it resets at ${resets.toISOString().slice(11, 16)} UTC, in ${minutes} minutes`
  );
}
