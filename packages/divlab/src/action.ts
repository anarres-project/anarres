import { readFileSync } from "node:fs";
import { countingRequests, GitHubAdapter, requestGitHub, summary } from "@anarres/github";
import { whatToActOn } from "./event.ts";
import {
  checkMain,
  checkProtection,
  onChecked,
  onClaim,
  onLeaseCheck,
  onMerge,
  onPullRequest,
  onRelease,
} from "./index.ts";

/**
 * The GitHub Action: a member's pull request, a push to a project's main branch, a comment, or the
 * hourly lease check, or the project's checks finishing. It wires Divlab to GitHub and nothing
 * more; what Divlab does is decided in `onPullRequest`, `onMerge`, `onClaim`, `onRelease`,
 * `onLeaseCheck` and `onChecked`.
 */
const [owner, project] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const token = process.env.INPUT_TOKEN;
if (!owner || !project || !token) {
  console.log("::error::Divlab needs GITHUB_REPOSITORY and a token");
  process.exit(1);
}
// Each run says how many requests it made, and of what kinds: the App's hourly allowance is
// shared by every project in the organisation.
const counted = countingRequests(requestGitHub);
const github = new GitHubAdapter({
  owner,
  token,
  governance: process.env.INPUT_GOVERNANCE ?? "",
  request: counted.request,
  oneRun: true,
});
const sayRequests = async () => {
  for (const line of summary(counted.tally)) console.log(line);
  try {
    const { used, limit, reset } = await github.allowance();
    const resets = new Date(reset * 1000).toISOString().slice(11, 16);
    console.log(`The App's allowance: ${used} of ${limit} used (resets ${resets} UTC)`);
  } catch {
    // Saying how much is left must never fail a run.
  }
};
try {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8"));
  const run = whatToActOn(process.env.GITHUB_EVENT_NAME ?? "", event);
  // The edge of the system: the only place Divlab's clock is the wall clock.
  const clock = () => new Date();
  if ("nothing" in run) {
    await sayRequests();
    process.exit(0);
  }
  if ("pullRequest" in run) {
    await onPullRequest(project, run.pullRequest, github, github, github, clock);
  } else if ("claim" in run) {
    await onClaim(project, run.claim, github, github, clock, github);
  } else if ("release" in run) {
    await onRelease(project, run.release, github, github, clock);
  } else if ("leases" in run) {
    await onLeaseCheck(project, github, github, clock);
  } else if ("checked" in run) {
    await onChecked(project, run.checked, github, github, github, clock);
  } else {
    await onMerge(project, github, github, github, clock);
  }
  await checkProtection(project, github, github);
  // Every run looks at main's changes since the last look: Divlab's own carry its App's name.
  const app = process.env.INPUT_APP;
  if (!app) throw new Error("Divlab needs its App's name (the app input) to check main's changes");
  await checkMain(project, github, github, github, clock, `${app}[bot]`);
  await sayRequests();
} catch (error) {
  await sayRequests();
  console.log(`::error::${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
