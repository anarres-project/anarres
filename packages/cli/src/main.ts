#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { GitHubAdapter } from "@anarres/github";
import { askForWork, describeOffers } from "./index.ts";

/**
 * The `anarres` command the plugin calls. It wires the CLI to GitHub, with the member's own
 * GitHub CLI login, and nothing more; what it offers is decided in `askForWork`.
 */
const [command] = process.argv.slice(2);
if (command !== "next") {
  console.error("Usage: anarres next");
  process.exit(2);
}
try {
  // The member's own login, never a token of Anarres's: the CLI acts only as the member.
  const token =
    process.env.GITHUB_TOKEN ?? execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  const github = new GitHubAdapter({
    owner: process.env.ANARRES_ORG ?? "anarres-project",
    token,
    governance: process.env.ANARRES_GOVERNANCE ?? "",
  });
  const offers = await askForWork(await github.account(), {
    names: () => github.names(),
    readyTasks: (project) => github.readyTasks(project),
    log: (project) => github.read(project),
    governanceFile: () => github.governanceFile(),
  });
  console.log(describeOffers(offers));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
