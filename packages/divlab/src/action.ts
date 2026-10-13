import { GitHubAdapter } from "@anarres/github";
import { onMerge } from "./index.ts";

/**
 * The GitHub Action: work has been merged to a project's main branch. It wires Divlab to GitHub
 * and nothing more; what Divlab does is decided in `onMerge`.
 */
const [owner, project] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const token = process.env.INPUT_TOKEN;
if (!owner || !project || !token) {
  console.log("::error::Divlab needs GITHUB_REPOSITORY and a token");
  process.exit(1);
}
const github = new GitHubAdapter({ owner, token });
try {
  await onMerge(project, github, github, github);
} catch (error) {
  console.log(`::error::${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
