/** What a Divlab run is for, from the event that started it. */
export type Run =
  | { merge: true }
  | { pullRequest: string }
  | { claim: { task: string; member: string } }
  | { release: { task: string; member: string } }
  | { leases: true }
  | { checked: string }
  | { nothing: true };

/** Whether a comment is a claim: exactly the claim command, nothing more. */
export const isClaim = (text: unknown): boolean => text === CLAIM;

/** A member's GitHub account name: letters, digits and single hyphens, at most 39, no ends. */
const ACCOUNT_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/** The comment a member makes to claim a task, exactly: their CLI writes it, Divlab reads it. */
export const CLAIM = "/claim";

/** The comment a member makes to give a task back, exactly: their CLI writes it, Divlab reads it. */
export const RELEASE = "/release";

/** Whether a comment is a release: exactly the release command, nothing more. */
const isRelease = (text: unknown): boolean => text === RELEASE;

/** A commit as GitHub names one: 40 lower-case hexadecimal digits. */
const COMMIT = /^[0-9a-f]{40}$/;

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
  // The hourly check, or the same check run by hand by someone who may run the project's workflows.
  if (name === "schedule" || name === "workflow_dispatch") return { leases: true };
  if (name === "issue_comment") {
    const { issue, comment } = event as {
      issue: { number: unknown; pull_request?: unknown };
      comment: { body: string; user?: { login?: unknown } };
    };
    // GitHub sends comments on pull requests as issue comments too: those are not tasks.
    const command = isClaim(comment.body)
      ? "claim"
      : isRelease(comment.body)
        ? "release"
        : undefined;
    if (command === undefined || issue.pull_request !== undefined) return { nothing: true };
    if (!numberedByGitHub(issue.number)) {
      throw new Error("The comment event does not say which task it is about");
    }
    const member = comment.user?.login;
    if (typeof member !== "string") throw new Error("The comment event does not say who commented");
    // Divlab writes the name into what it posts: only a name GitHub gives a member's account.
    if (!ACCOUNT_NAME.test(member)) {
      throw new Error(
        "The comment event's commenter is not named as GitHub names a member's account",
      );
    }
    const asked = { task: String(issue.number), member };
    return command === "claim" ? { claim: asked } : { release: asked };
  }
  // The project's checks finished on a commit: the pull requests at it may be ready (decision 0010).
  if (name === "workflow_run") {
    const commit = (event as { workflow_run?: { head_sha?: unknown } }).workflow_run?.head_sha;
    if (typeof commit !== "string" || !COMMIT.test(commit)) {
      throw new Error("The checks event does not say which commit it is about");
    }
    return { checked: commit };
  }
  throw new Error(`Divlab does not act on ${name} events`);
}

/**
 * Whether the run checks that main is still protected: the hourly lease check, and each run that
 * may merge work, so an unprotected main is noticed within the hour (Bernard, 2026-10-29). Main's
 * commits are checked on every run.
 */
export const checksProtection = (run: Run): boolean =>
  "leases" in run || "pullRequest" in run || "checked" in run;
