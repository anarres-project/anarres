import { retryAfter, ruleTimedOut } from "./rate-limits.ts";

const ATTEMPTS = 4;
const BLIP = 2_000;

/**
 * One call to the GitHub REST API, tried up to four times. A rate-limit refusal, or a repository
 * rule that timed out, means GitHub did nothing, so any request waits and tries again. A failing gateway or a
 * dropped connection may come after GitHub acted, so only requests that are safe to repeat (reads
 * and deletes) try again after those; repeating a create could post a task twice.
 */
export async function requestGitHub<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  /**
   * A read sent as a POST, such as a GraphQL query, is safe to repeat too. A caller that would
   * rather stop than wait out a spent hourly allowance says so.
   */
  options: { repeatable?: boolean; waitForAllowance?: boolean } = {},
): Promise<{ status: number; data: T }> {
  const repeatable = options.repeatable ?? (method === "GET" || method === "DELETE");
  for (let attempt = 1; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(`https://api.github.com/${path}`, {
        method,
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      if (!repeatable || attempt === ATTEMPTS) throw error;
      await pause(BLIP);
      continue;
    }
    const text = await response.text();
    const data = parsed(text) as T;
    const message = String((data as { message?: unknown } | undefined)?.message ?? "");
    const wait = retryAfter(
      { status: response.status, headers: response.headers, message },
      Date.now(),
      options,
    );
    // Refused undone, so any request may ask again.
    const undone =
      response.status === 403 ||
      response.status === 429 ||
      ruleTimedOut({ status: response.status, message });
    if (wait === undefined || (!undone && !repeatable) || attempt === ATTEMPTS) {
      return { status: response.status, data };
    }
    // Said in the run's log, so a run that waits a long time says why; on standard error, apart
    // from what a command prints.
    console.error(
      `GitHub answered ${method} ${path} with ${response.status} (${message}): asking again in ${wait / 1000} s`,
    );
    await pause(wait);
  }
}

/** GitHub answers in JSON, except a failing gateway, which may send a page of HTML. */
function parsed(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One file downloaded from the GitHub REST API, as bytes. GitHub answers with a redirect to where
 * the file is kept, which is followed; `fetch` sends the token to GitHub only, not on to there.
 */
export async function downloadGitHub(token: string, path: string): Promise<Uint8Array> {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: { authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" },
  });
  if (!response.ok) throw new Error(`GitHub GET ${path} answered ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export type Download = typeof downloadGitHub;
