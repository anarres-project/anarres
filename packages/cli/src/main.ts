#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { GitHubAdapter } from "@anarres/github";
import {
  askForWork,
  claim,
  claimOutcome,
  contributions,
  describeContributions,
  describeOffers,
  describeStatus,
  gitSteps,
  hookAnswer,
  memberStatus,
  preparation,
  restoreDraft,
  resumption,
  submit,
  TASK_RECORD,
  type ToolCall,
  taskFolder,
  taskNamed,
  taskOfRecord,
  taskRecord,
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
const TAKES_A_TASK = ["claim", "prepare", "resume", "submit"];
if (
  command !== "next" &&
  command !== "status" &&
  !(command && TAKES_A_TASK.includes(command) && named)
) {
  console.error(
    "Usage: anarres next | anarres status | anarres claim|prepare|resume|submit project#number (submit: --draft too)",
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
    const pinned = await github.task(task.project, task.task);
    // Which contracts the task's module provides and uses, as modules.yaml said at the pinned
    // commit: a commit only Divlab merged, never the issue's text (decision 0014).
    const modules =
      pinned?.inputsAt === undefined
        ? undefined
        : await github.modulesAt(task.project, pinned.inputsAt);
    const plan = preparation(owner, task.project, pinned, await github.account(), modules);
    if ("refused" in plan) {
      console.log(plan.refused);
      process.exit(1);
    }
    // Each step runs git with its arguments as given: no shell reads them.
    const into = taskFolder(task);
    for (const step of gitSteps(plan, into)) execFileSync("git", step, { stdio: "inherit" });
    // The record the read-scope hook keeps the task's session to.
    const held = await github.task(task.project, task.task);
    writeFileSync(join(into, TASK_RECORD), taskRecord({ ...held, contracts: plan.contracts }));
    // The member's work so far, from their open pull request, where it is not here already: work
    // on this machine may be newer, so it is never overwritten.
    const member = await github.account();
    const restored =
      held === undefined
        ? 0
        : await restoreDraft(task, held, member, github, (path, text) => {
            const file = join(into, path);
            if (existsSync(file)) return;
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, text);
          });
    console.log(`Fetched into ${into}, as at ${plan.commit}: ${plan.paths.join(", ")}`);
    if (restored > 0) console.log(`Brought back ${restored} files of your work so far.`);
    process.exit(0);
  }
  if (command === "status") {
    const member = await github.account();
    console.log(
      describeStatus(
        await memberStatus(member, {
          names: () => github.namesHeldBy(member),
          heldTasks: (project, member) => github.heldTasks(project, member),
          log: (project) => github.read(project),
          pullRequestsOpenBy: (project, holder) => github.pullRequestsOpenBy(project, holder),
        }),
      ),
    );
    console.log(
      describeContributions(
        await contributions(member, {
          names: () => github.namesContributedToBy(member),
          log: (project) => github.read(project),
        }),
      ),
    );
    process.exit(0);
  }
  if (command === "resume" && named) {
    const task = taskNamed(named);
    if (task === undefined) {
      console.log(`Name the task as the offers do, project#number: ${named} is not one.`);
      process.exit(1);
    }
    const folder = taskFolder(task);
    const resumed = resumption(
      task,
      await github.task(task.project, task.task),
      await github.account(),
      {
        prepared: existsSync(join(folder, TASK_RECORD)),
      },
    );
    console.log(
      "refused" in resumed
        ? resumed.refused
        : `Carry on with ${named} in ${resumed.folder}: its inputs and your work so far are there.`,
    );
    process.exit("refused" in resumed ? 1 : 0);
  }
  if (command === "submit" && named) {
    const task = taskNamed(named);
    const folder = task && taskFolder(task);
    const held = folder && existsSync(join(folder, TASK_RECORD));
    const record = held ? taskOfRecord(readFileSync(join(folder, TASK_RECORD), "utf8")) : undefined;
    if (task === undefined || folder === undefined || record === undefined) {
      console.log(`Not submitted: ${named} has no prepared folder here; prepare it first.`);
      process.exit(1);
    }
    // The work: what changed in the task's folder, as git sees it, but the folder's own record.
    const changed = execFileSync(
      "git",
      ["-C", folder, "status", "--porcelain", "--untracked-files=all", "--no-renames"],
      { encoding: "utf8" },
    )
      .split("\n")
      .map((line) => line.slice(3))
      .filter((path) => path !== "" && path !== TASK_RECORD)
      .map((path) => ({ path, text: readFileSync(join(folder, path), "utf8") }));
    const draft = process.argv.includes("--draft");
    console.log(
      await submit(
        { project: task.project, ...record, task: task.task },
        changed,
        { draft },
        github,
      ),
    );
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
