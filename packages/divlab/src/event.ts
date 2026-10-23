/** What a Divlab run is for, from the event that started it. */
export type Run =
  | { merge: true }
  | { pullRequest: string }
  | { claim: { task: string; member: string } }
  | { nothing: true };

/** A number GitHub could have given an issue or pull request. */
const numberedByGitHub = (number: unknown): number is number =>
  Number.isSafeInteger(number) && (number as number) >= 1;

/** The event is data from GitHub about a member's pull request or comment: nothing in it is trusted. */
export function whatToActOn(name: string, event: unknown): Run {
  if (name === "pull_request_target") {
    const number = (event as { pull_request?: { number?: unknown } }).pull_request?.number;
    if (!numberedByGitHub(number)) {
      throw new Error("The pull request event does not say which pull request it is about");
    }
    return { pullRequest: String(number) };
  }
  if (name === "push") return { merge: true };
  if (name === "issue_comment") {
    const { issue, comment } = event as {
      issue: { number: unknown; pull_request?: unknown };
      comment: { body: string; user?: { login?: unknown } };
    };
    // GitHub sends comments on pull requests as issue comments too: those are not tasks.
    if (comment.body !== "/claim" || issue.pull_request !== undefined) return { nothing: true };
    if (!numberedByGitHub(issue.number)) {
      throw new Error("The comment event does not say which task it is about");
    }
    const member = comment.user?.login;
    if (typeof member !== "string") throw new Error("The comment event does not say who commented");
    return { claim: { task: String(issue.number), member } };
  }
  throw new Error(`Divlab does not act on ${name} events`);
}
