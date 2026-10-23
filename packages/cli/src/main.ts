#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { GitHubAdapter } from "@anarres/github";
import {
  askForWork,
  claim,
  claimOutcome,
  describeOffers,
  gitSteps,
  hookAnswer,
  preparation,
  TASK_RECORD,
  type ToolCall,
  taskNamed,
  taskOfRecord,
} from "./index.ts";

/** The task folder the session works in, from its working folder upwards, and its task. */
function taskFolderOf(cwd: string) {
  for (let folder = resolve(cwd); ; folder = dirname(folder)) {
    const record = join(folder, TASK_RECORD);
    // A record that cannot be read gives no task, and the hook then refuses everything.
    if (existsSync(record))
      return { root: folder, task: taskOfRecord(readFileSync(record, "utf8")) };
    if (dirname(folder) === folder) return undefined;
  }
}

/**
 * The `anarres` command the plugin calls. It wires the CLI to GitHub, with the member's own
 * GitHub CLI login, and nothing more; what it offers is decided in `askForWork`, and claiming in
 * `claim`.
 */
const [command, named] = process.argv.slice(2);
// The read-scope hook: Claude Code gives it each file tool call on stdin, before the call runs.
if (command === "hook") {
  const call = JSON.parse(readFileSync(0, "utf8")) as ToolCall;
  const found = taskFolderOf(call.cwd);
  const answer = found && hookAnswer(call, found.task, found.root);
  if (answer) console.log(JSON.stringify(answer));
  process.exit(0);
}
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
    const asked = await claim(named, github);
    const task = taskNamed(named);
    if (task === undefined) {
      console.log(asked);
      process.exit(1);
    }
    // Divlab's run takes a moment: watch what it sets on the task, for a minute and a half.
    const member = await github.account();
    let held = await github.task(task.project, task.task);
    for (let check = 0; held?.claimedBy === undefined && check < 18; check++) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      held = await github.task(task.project, task.task);
    }
    console.log(claimOutcome(named, held, member));
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
    // The record the read-scope hook keeps the task's session to.
    const held = await github.task(task.project, task.task);
    writeFileSync(
      join(into, TASK_RECORD),
      JSON.stringify({ role: held?.role, module: held?.module }),
    );
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
