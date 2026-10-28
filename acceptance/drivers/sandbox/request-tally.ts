import { kindOf, requestGitHub } from "@anarres/github";

/** Every request the sandbox driver has made to GitHub in this run, by kind. */
export const tally = new Map<string, number>();

/**
 * Sends a request to GitHub, counting it in the run's tally. A spent hourly allowance stops the
 * scenario at once, saying so, rather than waiting out the reset until a step times out.
 */
export const countedRequest: typeof requestGitHub = (token, method, path, body, options) => {
  const kind = kindOf(method, path);
  tally.set(kind, (tally.get(kind) ?? 0) + 1);
  return requestGitHub(token, method, path, body, { ...options, waitForAllowance: false });
};

export { kindOf, summary } from "@anarres/github";
