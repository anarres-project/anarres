import { readFileSync } from "node:fs";
import { GitHubAdapter } from "@anarres/github";
import { whatToActOn } from "./event.ts";
import { checkProtection, onMerge, onPullRequest } from "./index.ts";

/**
 * The GitHub Action: a member's pull request, or a push to a project's main branch. It wires
 * Divlab to GitHub and nothing more; what Divlab does is decided in `onPullRequest` and `onMerge`.
 */
const [owner, project] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const token = process.env.INPUT_TOKEN;
if (!owner || !project || !token) {
  console.log("::error::Divlab needs GITHUB_REPOSITORY and a token");
  process.exit(1);
}
const github = new GitHubAdapter({ owner, token });
try {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? "", "utf8"));
  const run = whatToActOn(process.env.GITHUB_EVENT_NAME ?? "", event);
  if ("pullRequest" in run) await onPullRequest(project, run.pullRequest, github, github, github);
  else await onMerge(project, github, github, github);
  await checkProtection(project, github, github);
} catch (error) {
  console.log(`::error::${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
