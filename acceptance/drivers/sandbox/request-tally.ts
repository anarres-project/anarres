import { countingRequests, requestGitHub } from "@anarres/github";

/**
 * Sends a request to GitHub, counting it in the run's tally of every request the sandbox driver
 * has made, by kind. A spent hourly allowance stops the scenario at once, saying so, rather than
 * waiting out the reset until a step times out.
 */
const counted = countingRequests((token, method, path, body, options) =>
  requestGitHub(token, method, path, body, { ...options, waitForAllowance: false }),
);
export const tally = counted.tally;
export const countedRequest = counted.request;

export { summary } from "@anarres/github";
