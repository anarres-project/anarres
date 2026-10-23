#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { GitHubAdapter } from "@anarres/github";
import { askForWork, claim, describeOffers, gitSteps, preparation, taskNamed } from "./index.ts";

/**
 * The `anarres` command the plugin calls. It wires the CLI to GitHub, with the member's own
 * GitHub CLI login, and nothing more; what it offers is decided in `askForWork`, and claiming in
 * `claim`.
 */
const [command, named] = process.argv.slice(2);
if (command !== "next" && !((command === "claim" || command === "prepare") && named)) {
  console.error(
    "Usage: anarres next | anarres claim project#number | anarres prepare project#number",
  );
  process.exit(2);
}
try {
  // The member's own login, never a token of Anarres's: the CLI acts only as the member.
  const token =
    process.env.GITHUB_TOKEN ?? execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  const owner = process.env.ANARRES_ORG ?? "anarres-project";
  const github = new GitHubAdapter({
    owner,
    token,
    governance: process.env.ANARRES_GOVERNANCE ?? "",
  });
  if (command === "claim" && named) {
    console.log(await claim(named, github));
    process.exit(0);
  }
  if (command === "prepare" && named) {
    const task = taskNamed(named);
    if (task === undefined) {
      console.log(`Name the task as the offers do, project#number: ${named} is not one.`);
      process.exit(1);
    }
    const plan = preparation(
      owner,
      task.project,
      await github.task(task.project, task.task),
      await github.account(),
    );
    if ("refused" in plan) {
      console.log(plan.refused);
      process.exit(1);
    }
    // Each step runs git with its arguments as given: no shell reads them.
    const into = `anarres-work/${task.project}-${task.task}`;
    for (const step of gitSteps(plan, into)) execFileSync("git", step, { stdio: "inherit" });
    console.log(`Fetched into ${into}, as at ${plan.commit}: ${plan.paths.join(", ")}`);
    process.exit(0);
  }
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
