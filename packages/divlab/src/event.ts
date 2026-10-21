/** What a Divlab run is for, from the event that started it. */
export type Run = { merge: true } | { pullRequest: string };

/** The event is data from GitHub about a member's pull request: nothing in it is trusted. */
export function whatToActOn(name: string, event: unknown): Run {
  if (name === "pull_request_target") {
    const number = (event as { pull_request?: { number?: unknown } }).pull_request?.number;
    if (!Number.isSafeInteger(number) || (number as number) < 1) {
      throw new Error("The pull request event does not say which pull request it is about");
    }
    return { pullRequest: String(number) };
  }
  if (name === "push") return { merge: true };
  throw new Error(`Divlab does not act on ${name} events`);
}
