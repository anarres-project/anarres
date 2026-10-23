import { readFileSync } from "node:fs";
import { GitHubAdapter } from "@anarres/github";
import { whatToActOn } from "./event.ts";
import {
  checkMain,
  checkProtection,
  onClaim,
  onLeaseCheck,
  onMerge,
  onPullRequest,
  onRelease,
} from "./index.ts";

/**
 * The GitHub Action: a member's pull request, a push to a project's main branch, a comment, or the
 * hourly lease check. It wires Divlab to GitHub and nothing more; what Divlab does is decided in
 * `onPullRequest`, `onMerge`, `onClaim`, `onRelease` and `onLeaseCheck`.
 */
const [owner, project] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const token = process.env.INPUT_TOKEN;
if (!owner || !project || !token) {
  console.log("::error::Divlab needs GITHUB_REPOSITORY and a token");
  process.exit(1);
}
const github = new GitHubAdapter({ owner, token, governance: process.env.INPUT_GOVERNANCE ?? "" });
try {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8"));
  const run = whatToActOn(process.env.GITHUB_EVENT_NAME ?? "", event);
  // The edge of the system: the only place Divlab's clock is the wall clock.
  const clock = () => new Date();
  if ("nothing" in run) process.exit(0);
  if ("pullRequest" in run) {
    await onPullRequest(project, run.pullRequest, github, github, github, clock);
  } else if ("claim" in run) {
    await onClaim(project, run.claim, github, github, clock, github);
  } else if ("release" in run) {
    await onRelease(project, run.release, github, github, clock);
  } else if ("leases" in run) {
    await onLeaseCheck(project, github, github, clock);
  } else {
    await onMerge(project, github, github, github, clock);
  }
  await checkProtection(project, github, github);
  // Every run looks at main's changes since the last look: Divlab's own carry its App's name.
  const app = process.env.INPUT_APP;
  if (!app) throw new Error("Divlab needs its App's name (the app input) to check main's changes");
  await checkMain(project, github, github, github, clock, `${app}[bot]`);
} catch (error) {
  console.log(`::error::${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
