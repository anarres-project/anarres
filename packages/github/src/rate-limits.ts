/**
 * How long to wait before asking GitHub again, or undefined if waiting would not help. The caller
 * decides whether its request is safe to repeat.
 */
export function retryAfter(
  answer: { status: number; headers: Headers; message: string },
  now: number,
  /** Whether to wait out a spent hourly allowance, up to an hour, or stop at once. */
  { waitForAllowance = true }: { waitForAllowance?: boolean } = {},
): number | undefined {
  // An error of GitHub's own, or a failing gateway, is usually a passing blip.
  if ([500, 502, 503, 504].includes(answer.status)) return 2_000;
  // GitHub signals rate limits with 403 or 429; anything else is not about them.
  if (answer.status !== 403 && answer.status !== 429) return undefined;
  const retry = answer.headers.get("retry-after");
  if (retry !== null) return Number(retry) * 1000;
  // GitHub's guidance for a secondary limit that gives no time: wait at least a minute.
  if (answer.message.includes("secondary rate limit")) return 60_000;
  if (answer.headers.get("x-ratelimit-remaining") === "0" && waitForAllowance) {
    return Number(answer.headers.get("x-ratelimit-reset")) * 1000 - now;
  }
  return undefined;
}
