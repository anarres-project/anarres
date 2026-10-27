import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  askForWork,
  claim,
  contributions,
  gitSteps,
  memberStatus,
  preparation,
  restoreDraft,
  resumption,
  submit,
  TASK_RECORD,
  taskFolder,
  taskRecord,
} from "@anarres/cli";
import { TRUST_LEVELS, trustAllows } from "@anarres/core";
import {
  type LogEvent,
  type RoutingEvent,
  routingDecisions,
  setUpProject,
  signalOf,
  startModule,
} from "@anarres/divlab";
import { GitHubAdapter, requestGitHub } from "@anarres/github";
import type {
  AcceptedWork,
  ClaimedTask,
  CoordinatorAlert,
  Driver,
  ReadyTask,
  RoutingRecord,
} from "../driver.ts";
import { HarnessNotYetBuilt } from "../errors.ts";
import {
  feedbackSignalFile,
  inScenarioWords,
  otherFiles,
  roleId,
  roleNameOf,
  signalName,
  workFiles,
} from "../scenario-words.ts";
import { shortfall } from "./allowance.ts";
import { GitHubApi } from "./github-api.ts";
import { countedRequest, summary, tally } from "./request-tally.ts";
import { leftBehind, sweptBy } from "./sweep.ts";

/**
 * The two sandbox organisations and their tokens, from `.env` locally or the CI environment, and
 * the accounts that play a second and a third member, if there are any.
 */
function sandboxSettings() {
  const {
    ANARRES_SANDBOX_ORG: org,
    ANARRES_SANDBOX_TOKEN: token,
    ANARRES_SANDBOX_MEMBERS_ORG: membersOrg,
    ANARRES_SANDBOX_MEMBERS_TOKEN: membersToken,
    ANARRES_SANDBOX_SECOND_MEMBER_TOKEN: secondMemberToken,
    ANARRES_SANDBOX_THIRD_MEMBER_TOKEN: thirdMemberToken,
  } = process.env;
  if (!org || !token || !membersOrg || !membersToken) {
    throw new Error(
      "The sandbox driver needs ANARRES_SANDBOX_ORG, ANARRES_SANDBOX_TOKEN, " +
        "ANARRES_SANDBOX_MEMBERS_ORG and ANARRES_SANDBOX_MEMBERS_TOKEN",
    );
  }
  return { org, token, membersOrg, membersToken, secondMemberToken, thirdMemberToken };
}

type Issue = {
  number: number;
  labels: { name: string }[];
  body: string | null;
  pull_request?: unknown;
  assignees?: { login: string }[];
  /** How many comments the issue has. */
  comments?: number;
};

/**
 * Runs scenarios against real repositories in the GitHub sandbox organisation. It observes
 * GitHub directly, as a member would, not through Divlab's own adapter.
 */
export class SandboxDriver implements Driver {
  private readonly github: GitHubApi;
  private readonly divlab: GitHubAdapter;
  /** GitHub as Divlab's App acts on it, for what Divlab does outside its runs. */
  private readonly asDivlab: GitHubAdapter;
  private readonly org: string;
  private readonly token: string;
  /** The second sandbox organisation, playing the members: their forks live there. */
  private readonly members: GitHubApi;
  private readonly membersOrg: string;
  /** The scenario member each of this scenario's claims was made for, by the account that made it. */
  private readonly claimants = new Map<string, string>();
  /** The project this scenario works in. */
  private projectOfScenario: string | undefined;
  /** The account playing each of the scenario's members: the sandbox's, then the second's. */
  private readonly played = new Map<string, GitHubApi>();

  constructor() {
    const { org, token, membersOrg, membersToken } = sandboxSettings();
    this.org = org;
    this.token = token;
    this.github = new GitHubApi(token);
    this.divlab = new GitHubAdapter({ owner: org, token, request: countedRequest });
    this.asDivlab = new GitHubAdapter({
      owner: org,
      token,
      app: DIVLAB_APP_ID,
      request: countedRequest,
    });
    this.membersOrg = membersOrg;
    this.members = new GitHubApi(membersToken);
  }

  /**
   * Creates the run's repository the first time a scenario asks for it. Public, so Divlab's
   * Action runs in it cost nothing (decision 0004); it holds only synthetic data.
   */
  async createProject(
    project: string,
    modules: string[],
    options: { unprotected?: boolean } = {},
  ): Promise<void> {
    this.projectOfScenario = project;
    if (!run.expected.has(project)) await this.makeProject(project, options);
    // The worker's scenarios share its project, and each starts modules of its own there.
    for (const module of modules) await startModule(project, module, this.asDivlab);
    this.expectedFor(project).ready += modules.length;
  }

  private async makeProject(project: string, options: { unprotected?: boolean }): Promise<void> {
    await this.github.call("POST", `orgs/${this.org}/repos`, {
      name: project,
      private: false,
      auto_init: true,
    });
    run.created.push({ github: this.github, path: `repos/${this.org}/${project}` });
    for (const workflow of TEMPLATE_WORKFLOWS) {
      await this.github.call(
        "PUT",
        `repos/${this.org}/${project}/contents/.github/workflows/${workflow}`,
        {
          message: "Install Divlab from the project template",
          content: Buffer.from(divlabWorkflow(workflow)).toString("base64"),
        },
      );
    }
    // Set up as a project is, once the workflows are in: from now on only Divlab changes main.
    if (!options.unprotected) await setUpProject(project, this.asDivlab);
    run.expected.set(project, {
      ready: 0,
      claimed: 0,
      escalation: 0,
      done: 0,
      notAccepted: 0,
      claimedWithoutClaim: 0,
    });
  }

  /** The member submits the work and Divlab merges it: accepted work has been merged. */
  async acceptWork(work: AcceptedWork): Promise<void> {
    await this.submitWork(work);
    const submitted = run.submitted.at(-1);
    if (!submitted?.merged) {
      throw new Error(`Divlab did not merge the ${work.role} work on ${work.module}`);
    }
  }

  /**
   * The member's work goes on a branch of their fork, as a real member's does, and a pull request
   * asks the project to merge it. The fork is only ever behind main by other members' feedback
   * signals, each in a file of its own, so the branch needs no updating first.
   */
  async submitWork(work: AcceptedWork): Promise<void> {
    const opened = await this.openPullRequest(work);
    await this.awaitDecision(
      work,
      opened,
      await this.divlabHasDecidedOn(work.project, opened.number),
    );
  }

  /**
   * All the pull requests are opened before Divlab decides on any. A Divlab run GitHub drops or
   * fails leaves its pull request unmerged, for the scenario to find.
   */
  async submitWorkAtOnce(works: AcceptedWork[]): Promise<void> {
    const opened = [];
    for (const work of works) opened.push({ work, ...(await this.openPullRequest(work)) });
    for (const { work, ...pullRequest } of opened) {
      const merged = await this.divlabHasDecidedOn(work.project, pullRequest.number).catch(
        (error: Error) => {
          console.log(`Pull request ${pullRequest.number} in ${work.project}: ${error.message}`);
          return false;
        },
      );
      await this.awaitDecision(work, pullRequest, merged);
    }
  }

  private async openPullRequest(work: AcceptedWork) {
    const member = await this.playAs(work.member);
    const repository = `repos/${this.org}/${work.project}`;
    const fromRole = roleId(work.role);
    const forWork = (issue: Issue) =>
      labelValue(issue, "role:") === fromRole && labelValue(issue, "module:") === work.module;
    // The task the work is for: ready, or claimed by the member doing it.
    const ready = (await this.settled(work.project, "ready")).find(forWork);
    const claimed =
      ready ??
      (this.expectedFor(work.project).claimed > 0
        ? (await this.settled(work.project, "claimed")).find(forWork)
        : undefined);
    const task = work.forFinishedTask ? await this.finishedTask(work) : (ready ?? claimed);
    const listing: Listing = ready ? "ready" : "claimed";
    let fork = await this.forkOf(work.project);
    let reference = await this.mainOf(fork);
    if (reference.status === 409) {
      // A fork can stay empty for good, broken while GitHub answers errors (seen 2026-10-23,
      // failing all its worker's later scenarios): fork the project again, once.
      fork = await this.forkAgain(work.project, fork);
      reference = await this.mainOf(fork);
    }
    if (reference.status !== 200) {
      throw new Error(`GitHub GET repos/${fork}/git/ref/heads/main answered ${reference.status}`);
    }
    const main = reference.data.object;
    const branch = `work/${work.feedbackSignal}`;
    // The branch is the scenario's own, so if asking again finds it there, the first ask made it.
    const made = await this.members.request(
      "POST",
      `repos/${fork}/git/refs`,
      { ref: `refs/heads/${branch}`, sha: main.sha },
      { repeatable: true },
    );
    if (made.status >= 300 && made.status !== 422) {
      throw new Error(`GitHub could not make branch ${branch} in ${fork}: ${made.status}`);
    }
    const signal = feedbackSignalFile(work, task && String(task.number));
    for (const { path, text } of [...otherFiles(work), signal]) {
      const where = `repos/${fork}/contents/${path}`;
      const content = Buffer.from(text).toString("base64");
      const message = `The ${work.role} work on ${work.module}`;
      // Asked again after a server error, GitHub refuses a file the first ask made: check it is.
      // A branch just made can be missing for a moment (seen 2026-10-26): wait for it.
      const madeBy = Date.now() + LISTS_CATCH_UP_LIMIT;
      let put = await this.putFile(where, { message, content, branch });
      while (put.status === 404 && /^Branch .* not found$/.test(messageOf(put.data))) {
        if (Date.now() > madeBy) break;
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        put = await this.putFile(where, { message, content, branch });
      }
      if (put.status === 422) {
        const there = await this.members.call<{ content: string }>(
          "GET",
          `${where}?ref=${encodeURIComponent(branch)}`,
        );
        if (Buffer.from(there.content, "base64").toString("utf8") === text) continue;
      }
      if (put.status < 200 || put.status >= 300) {
        throw new Error(`GitHub PUT ${where} answered ${put.status}: ${JSON.stringify(put.data)}`);
      }
    }
    const { path } = signal;
    const { number } = await member.call<{ number: number }>("POST", `${repository}/pulls`, {
      title: `The ${work.role} work on ${work.module}`,
      head: `${this.membersOrg}:${branch}`,
      base: "main",
    });
    return { number, path, task, listing };
  }

  private async awaitDecision(
    work: AcceptedWork,
    {
      number,
      path,
      task,
      listing,
    }: { number: number; path: string; task: Issue | undefined; listing: Listing },
    merged: boolean,
  ): Promise<void> {
    run.submitted.push({
      project: work.project,
      number,
      feedbackSignal: work.feedbackSignal,
      merged,
    });
    if (merged) await this.expectWhatDivlabDecided(work.project, path, task, listing);
  }

  /** The fork's main branch: a new fork can answer "Git Repository is empty" for a while. */
  private async mainOf(fork: string) {
    const deadline = Date.now() + LISTS_CATCH_UP_LIMIT;
    let reference = await this.members.request<{ object: { sha: string } }>(
      "GET",
      `repos/${fork}/git/ref/heads/main`,
    );
    while (reference.status === 409 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      reference = await this.members.request("GET", `repos/${fork}/git/ref/heads/main`);
    }
    return reference;
  }

  /** The broken fork is deleted and the project forked afresh, for this run's later scenarios. */
  private async forkAgain(project: string, broken: string): Promise<string> {
    console.log(`The fork ${broken} stayed empty: forking ${project} again`);
    await this.members.request("DELETE", `repos/${broken}`);
    run.forks.delete(project);
    return this.forkOf(project);
  }

  /**
   * The members' fork of the project, made the first time a member submits work to it. GitHub
   * makes forks in the background, so this waits until the fork has its main branch.
   */
  private async forkOf(project: string): Promise<string> {
    const known = run.forks.get(project);
    if (known) return known;
    const { full_name: fork } = await this.members.call<{ full_name: string }>(
      "POST",
      `repos/${this.org}/${project}/forks`,
      { organization: this.membersOrg, default_branch_only: true },
    );
    run.created.push({ github: this.members, path: `repos/${fork}` });
    const deadline = Date.now() + 60_000;
    while ((await this.members.request("GET", `repos/${fork}/branches/main`)).status !== 200) {
      if (Date.now() > deadline) throw new Error(`GitHub did not finish forking ${project}`);
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    run.forks.set(project, fork);
    return fork;
  }

  /** As GitHub showed each pull request once Divlab had decided on it. */
  async mergedWork(project: string): Promise<string[]> {
    return run.submitted
      .filter((submitted) => submitted.project === project && submitted.merged)
      .map((submitted) => submitted.feedbackSignal);
  }

  /** Divlab's comments on the pull requests it did not merge. */
  /** The sandbox token is an administrator's: if main refuses it, it refuses every person. */
  /**
   * The commits PDC coordinators were told reached main without Divlab, from their alerts, once
   * GitHub's list shows one for each direct change that took.
   */
  async changesNotByDivlab(project: string): Promise<string[]> {
    const deadline = Date.now() + LISTS_CATCH_UP_LIMIT;
    let issues = await this.issues(project, "change-not-by-divlab", "all");
    while (issues.length < (this.directChanges.get(project) ?? 0) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      issues = await this.issues(project, "change-not-by-divlab", "all");
    }
    return issues.flatMap((issue) => {
      const commit = issue.body?.match(/\n`{3,}\n\S+ (\S+)\n`{3,}$/)?.[1];
      return commit ? [commit] : [];
    });
  }

  async changeMainDirectly(project: string): Promise<boolean> {
    const { status } = await this.github.request(
      "PUT",
      `repos/${this.org}/${project}/contents/not-through-divlab.md`,
      { message: "A change that skips Divlab", content: Buffer.from("No.\n").toString("base64") },
    );
    const took = status >= 200 && status < 300;
    if (took) this.directChanges.set(project, (this.directChanges.get(project) ?? 0) + 1);
    return took;
  }

  /** How many changes someone made to each project's main directly, which Divlab will alert. */
  private readonly directChanges = new Map<string, number>();

  /** The workflows the project's active Actions policies allow to run on pull requests. */
  async pullRequestChecks(project: string): Promise<string[]> {
    const { policies } = await this.github.call<{ policies: { id: number }[] }>(
      "GET",
      `repos/${this.org}/${project}/actions/policies`,
    );
    const allowed: string[] = [];
    for (const { id } of policies) {
      const policy = await this.github.call<ActionsPolicy>(
        "GET",
        `repos/${this.org}/${project}/actions/policies/${id}`,
      );
      const events = policy.rules.find((rule) => rule.type === "restrict_action_events");
      if (policy.enforcement !== "active") continue;
      if (!events?.parameters.allowed_events?.includes("pull_request_target")) continue;
      for (const path of policy.conditions?.workflow_path?.include ?? ["~ALL"]) {
        allowed.push(path === DIVLAB_PULL_REQUEST_WORKFLOW ? "Divlab" : path);
      }
    }
    return allowed;
  }

  /** Written straight to main, which only an unprotected project allows; the push wakes Divlab. */
  async mergeDirectly(work: AcceptedWork): Promise<void> {
    const { path, text } = feedbackSignalFile(work);
    await this.github.call("PUT", `repos/${this.org}/${work.project}/contents/${path}`, {
      message: `The ${work.role} work on ${work.module}, not through Divlab`,
      content: Buffer.from(text).toString("base64"),
    });
    await this.eventFor(work.project, path, "notAccepted");
    this.expectedFor(work.project).notAccepted += 1;
  }

  async unmergedWorkAlerts(project: string): Promise<string[]> {
    const issues = await this.settled(project, "notAccepted");
    return issues.flatMap((issue) => {
      const path = issue.body?.match(/\n`{3,}\n(.+)\n`{3,}$/)?.[1];
      return path ? [signalName(path)] : [];
    });
  }

  async interruptAfterRecording(_work: AcceptedWork): Promise<void> {
    throw new HarnessNotYetBuilt("interrupting the real Action between recording and acting");
  }

  async interruptAfterMerging(_work: AcceptedWork): Promise<void> {
    throw new HarnessNotYetBuilt("interrupting the real Action between merging and recording");
  }

  async divlabActsAgain(_project: string): Promise<void> {
    throw new HarnessNotYetBuilt("interrupting the real Action between merging and recording");
  }

  /** Divlab runs after the work it acted on, so give the last run time to look and alert. */
  async unprotectedMainAlerts(project: string): Promise<number> {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const alerts = await this.issues(project, "unprotected-main", "all");
      if (alerts.length > 0 || Date.now() > deadline) return alerts.length;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  async refusals(project: string): Promise<string[]> {
    const said: string[] = [];
    for (const submitted of run.submitted.filter((pr) => pr.project === project && !pr.merged)) {
      const comments = await this.github.call<{ body: string }[]>(
        "GET",
        `repos/${this.org}/${project}/issues/${submitted.number}/comments`,
      );
      said.push(...comments.map((comment) => comment.body));
    }
    return said;
  }

  /** What GitHub's lists should show once they catch up with what Divlab recorded for the work. */
  private async expectWhatDivlabDecided(
    project: string,
    path: string,
    task: Issue | undefined,
    listing: Listing,
  ) {
    // The event log is consistent at once and says what Divlab did; the issue lists lag behind.
    const expected = this.expectedFor(project);
    const event = await this.eventFor(project, path, "routed");
    if (!("work" in event))
      throw new Error(`Divlab recorded no decision for ${path} in ${project}`);
    if (task) {
      expected[listing] -= 1;
      run.closed.add(issueKey(project, task.number));
    }
    const { decision } = event;
    if ("tasks" in decision) expected.ready += decision.tasks.length;
    if ("alert" in decision) expected.escalation += 1;
    if ("moduleDone" in decision) expected.done += 1;
    await this.runFinished(project, path);
  }

  /**
   * Waits for Divlab's run on the work to finish, not just decide: every run ends by checking
   * main and recording how far it checked, so that record after the decision marks the end. A
   * step that changes the project while Divlab is still writing would race it.
   */
  private async runFinished(project: string, path: string): Promise<void> {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const events = await this.divlab.read(project);
      const decided = events.findIndex((e) => signalOf(e) === path && "work" in e);
      if (events.slice(decided + 1).some((e) => "mainChecked" in e)) return;
      if (Date.now() > deadline) {
        throw new Error(`Divlab's run on ${path} in ${project} did not finish`);
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }

  /** Divlab's record of the work, which it writes just after it merges. */
  /** Divlab's record of the given kind for the work: a merge begun is not yet a decision. */
  private async eventFor(
    project: string,
    path: string,
    kind: "routed" | "notAccepted",
  ): Promise<LogEvent> {
    const deadline = Date.now() + 60_000;
    for (;;) {
      const event = (await this.divlab.read(project)).find(
        (e) => signalOf(e) === path && (kind === "routed" ? "work" in e : "notAccepted" in e),
      );
      if (event) return event;
      if (Date.now() > deadline)
        throw new Error(`Divlab recorded nothing for ${path} in ${project}`);
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }

  /**
   * Waits for Divlab to merge a pull request or refuse it, and says which (true if merged). A
   * failed Divlab run fails the step with GitHub's reason.
   */
  private async divlabHasDecidedOn(project: string, number: number): Promise<boolean> {
    const repository = `repos/${this.org}/${project}`;
    const started = Date.now();
    for (let check = 1; ; check++) {
      const pullRequest = await this.github.call<{ merged: boolean }>(
        "GET",
        `${repository}/pulls/${number}`,
      );
      if (pullRequest.merged) return true;
      // A refusal or a failed run is rare: look for them less often, to spare the request budget.
      if (check % 3 !== 0) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }
      const comments = await this.github.call<unknown[]>(
        "GET",
        `${repository}/issues/${number}/comments`,
      );
      if (comments.length > 0) return false;
      const { workflow_runs: runs } = await this.github.call<{ workflow_runs: WorkflowRun[] }>(
        "GET",
        `${repository}/actions/runs?event=pull_request_target&status=completed`,
      );
      const failed = runs.find(
        (r) => r.conclusion !== "success" && Date.parse(r.created_at) >= started - 5_000,
      );
      if (failed) {
        throw new Error(
          `Divlab's run for pull request ${number} ended ${failed.conclusion}: ${await this.whyRunFailed(repository, failed)} (${failed.html_url})`,
        );
      }
      if (Date.now() - started > RUN_FINISH_LIMIT) {
        // Say what Divlab's runs were doing, since the repository is gone by the time anyone looks.
        const { workflow_runs: all } = await this.github.call<{ workflow_runs: WorkflowRun[] }>(
          "GET",
          `${repository}/actions/runs?per_page=20`,
        );
        const states = all
          .map(
            (r) =>
              `${r.event} ${r.status}${r.conclusion ? ` ${r.conclusion}` : ""} (${r.created_at})`,
          )
          .join("; ");
        throw new Error(
          `Divlab neither merged nor refused pull request ${number} in ${project}; its runs: ${states || "none"}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }

  /** The member comments to claim the finished module's issue, and waits for the reply. */
  async claimFinishedModule(
    done: { project: string; module: string },
    member: string,
  ): Promise<void> {
    const issue = (await this.settled(done.project, "done")).find(
      (i) => labelValue(i, "module:") === done.module,
    );
    if (!issue) throw new Error(`The module ${done.module} is not done`);
    await this.claimIssue(done.project, issue, member);
  }

  /** The member opens an issue with their own account, as anyone may in a public project. */
  async openIssueAs(project: string, member: string): Promise<void> {
    const account = await this.playAs(member);
    const issue = await account.call<Issue>("POST", `repos/${this.org}/${project}/issues`, {
      title: "A question about the project",
      body: "Opened by a member: not a task.",
    });
    this.issuesOpened.set(member, issue);
  }

  /** Issues the scenario's members opened of their own. */
  private readonly issuesOpened = new Map<string, Issue>();

  async claimIssueOf(project: string, owner: string, member: string): Promise<void> {
    const issue = this.issuesOpened.get(owner);
    if (!issue) throw new Error(`${owner} has opened no issue in ${project}`);
    await this.claimIssue(project, issue, member);
  }

  private putFile(where: string, body: { message: string; content: string; branch: string }) {
    return this.members.request("PUT", where, body, { repeatable: true });
  }

  /** The member comments to claim PDC coordinators' alert about the module, as if a task. */
  async claimAlert(alert: { project: string; module: string }, member: string): Promise<void> {
    const issue = (await this.settled(alert.project, "escalation")).find((i) => {
      const json = i.body?.match(/```json\n([\s\S]*)\n```$/)?.[1];
      return (JSON.parse(json ?? "null") as RoutingEvent | null)?.work.module === alert.module;
    });
    if (!issue) throw new Error(`No PDC coordinators' alert about ${alert.module} was opened`);
    await this.claimIssue(alert.project, issue, member);
  }

  /** The member comments to claim the closed task's issue, and waits for Divlab's reply. */
  async claimFinished(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<void> {
    const labels = `role:${roleId(task.role)},module:${task.module}`;
    const [issue] = await this.github.call<Issue[]>(
      "GET",
      `repos/${this.org}/${task.project}/issues?labels=${encodeURIComponent(labels)}&state=closed&per_page=100`,
    );
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is done`);
    await this.claimIssue(task.project, issue, member);
  }

  /** The role's task on the module that is already done: closed, as its issue stays. */
  private async finishedTask(task: { project: string; role: string; module: string }) {
    const labels = `role:${roleId(task.role)},module:${task.module}`;
    const [issue] = await this.github.call<Issue[]>(
      "GET",
      `repos/${this.org}/${task.project}/issues?labels=${encodeURIComponent(labels)}&state=closed&per_page=100`,
    );
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is done`);
    return issue;
  }

  /** The member comments to claim an issue that is not an open task, and waits for the reply. */
  private async claimIssue(project: string, issue: Issue, member: string): Promise<void> {
    const repository = `repos/${this.org}/${project}`;
    const account = await this.playAs(member);
    const before = issue.comments ?? 0;
    const started = Date.now();
    await account.call("POST", `${repository}/issues/${issue.number}/comments`, { body: "/claim" });
    // Done when Divlab has replied to the claim.
    for (let check = 1; ; check++) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const now = await this.github.call<Issue>("GET", `${repository}/issues/${issue.number}`);
      if ((now.comments ?? 0) > before + 1) break;
      if (check % 3 === 0) await this.failIfRunFailed(repository, "issue_comment", started);
      if (Date.now() - started > RUN_FINISH_LIMIT) {
        throw new Error(`Divlab did not answer the claim of issue ${issue.number} in ${project}`);
      }
    }
    this.notTasksClaimed.push(issue.number);
  }

  /** Issues other than open tasks this scenario claimed, whose replies are refusals to read too. */
  private readonly notTasksClaimed: number[] = [];

  /**
   * The member comments to claim the task, as their plugin will, and Divlab's run for the comment
   * marks it claimed. The sandbox has one account playing every member, so the driver remembers
   * which member each claim was for.
   */
  async claim(task: { project: string; role: string; module: string }, member: string) {
    const repository = `repos/${this.org}/${task.project}`;
    const issue = await this.openTask(task);
    const wasReady = issue.labels.some((l) => l.name === "state:ready");
    const account = await this.playAs(member);
    const login = await loginOf(account);
    const started = Date.now();
    // Divlab either gives the member the task or replies saying why not: a comment after theirs.
    const before = issue.comments ?? 0;
    // The member claims through their CLI, as the plugin does, with their own account.
    await claim(`${task.project}#${issue.number}`, this.asMember(account));
    for (let check = 1; ; check++) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const now = await this.github.call<Issue>("GET", `${repository}/issues/${issue.number}`);
      const claimant = now.assignees?.[0]?.login;
      if (now.labels.some((l) => l.name === "state:claimed") && claimant === login) break;
      if ((now.comments ?? 0) > before + 1) return;
      if (check % 3 === 0) await this.failIfRunFailed(repository, "issue_comment", started);
      if (Date.now() - started > RUN_FINISH_LIMIT) {
        throw new Error(
          `Divlab did not act on the claim of task ${issue.number} in ${task.project}`,
        );
      }
    }
    if (!wasReady) return;
    const expected = this.expectedFor(task.project);
    expected.ready -= 1;
    expected.claimed += 1;
    run.closed.add(issueKey(task.project, issue.number));
  }

  /** The project's open task for that role and module, ready or claimed. */
  private async openTask(task: { project: string; role: string; module: string }) {
    const fromRole = roleId(task.role);
    const forTask = (i: Issue) =>
      labelValue(i, "role:") === fromRole && labelValue(i, "module:") === task.module;
    const issue =
      (await this.settled(task.project, "ready")).find(forTask) ??
      (await this.settled(task.project, "claimed")).find(forTask);
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is open`);
    return issue;
  }

  /** Divlab's replies on the project's open tasks, each to the member its account plays. */
  async claimRefusals(project: string): Promise<{ member: string; reason: string }[]> {
    const repository = `repos/${this.org}/${project}`;
    const tasks = [
      ...(await this.settled(project, "ready")),
      ...(await this.settled(project, "claimed")),
      ...this.notTasksClaimed.map((number) => ({ number })),
    ];
    const refusals = [];
    for (const task of tasks) {
      const comments = await this.github.call<{ body: string }[]>(
        "GET",
        `${repository}/issues/${task.number}/comments`,
      );
      for (const { body } of comments) {
        const reply = body.match(/^@([\w-]+), (.*)\.$/s);
        const member = reply?.[1] && this.claimants.get(reply[1]);
        if (member && reply?.[2]) refusals.push({ member, reason: reply[2] });
      }
    }
    return refusals;
  }

  /**
   * The account that plays a member: the sandbox's own for the scenario's first member, the
   * second account for its second. Divlab would see two members played by one account as one
   * person, and rightly refuse what one person may not do twice.
   */
  private async playAs(member: string, { unnamed = false } = {}): Promise<GitHubApi> {
    const playing = this.played.get(member);
    if (playing) return playing;
    const { secondMemberToken, thirdMemberToken } = sandboxSettings();
    const others = [
      ...(secondMemberToken ? [secondMemberToken] : []),
      ...(secondMemberToken && thirdMemberToken ? [thirdMemberToken] : []),
    ];
    // The sandbox's own account is kept for unnamed members: named ones are new unless told.
    const tokens = unnamed ? [this.token, ...others] : [...others, this.token];
    const taken = [...this.played.values()].map((account) => account.token);
    const token = tokens.find((token) => !taken.includes(token));
    const account = token === this.token ? this.github : token && new GitHubApi(token);
    if (!account) {
      throw new HarnessNotYetBuilt(
        `an account for the scenario's member number ${this.played.size + 1}`,
      );
    }
    this.played.set(member, account);
    this.claimants.set(await loginOf(account), member);
    return account;
  }

  /**
   * The members comment to claim the task one after another, before Divlab acts on any. GitHub,
   * not the driver, decides which comment's run starts first, so `heardFirst` cannot be forced
   * here; what the sandbox shows is that the first claim made wins with real GitHub's ordering.
   */
  async claimTogether(
    task: { project: string; role: string; module: string },
    members: string[],
  ): Promise<void> {
    const repository = `repos/${this.org}/${task.project}`;
    const fromRole = roleId(task.role);
    const issue = (await this.settled(task.project, "ready")).find(
      (i) => labelValue(i, "role:") === fromRole && labelValue(i, "module:") === task.module,
    );
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is ready to claim`);
    const before = issue.comments ?? 0;
    const started = Date.now();
    for (const member of members) {
      const account = await this.playAs(member);
      await account.call("POST", `${repository}/issues/${issue.number}/comments`, {
        body: "/claim",
      });
    }
    // Done when the task is claimed and every member it did not go to has been told.
    const settledAt = before + members.length + (members.length - 1);
    for (let check = 1; ; check++) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const now = await this.github.call<Issue>("GET", `${repository}/issues/${issue.number}`);
      const claimed = now.labels.some((l) => l.name === "state:claimed");
      if (claimed && (now.comments ?? 0) >= settledAt) break;
      if (check % 3 === 0) await this.failIfRunFailed(repository, "issue_comment", started);
      if (Date.now() - started > RUN_FINISH_LIMIT) {
        throw new Error(
          `Divlab did not settle the claims of task ${issue.number} in ${task.project}`,
        );
      }
    }
    const expected = this.expectedFor(task.project);
    expected.ready -= 1;
    expected.claimed += 1;
    run.closed.add(issueKey(task.project, issue.number));
  }

  /** The log's claims, each with the role and module of the task issue it names. */
  async claimRecords(project: string): Promise<(ClaimedTask & { claimedAt: string })[]> {
    const records = [];
    for (const event of await this.divlab.read(project)) {
      if (!("claimed" in event)) continue;
      const issue = await this.github.call<Issue>(
        "GET",
        `repos/${this.org}/${project}/issues/${event.claimed.task}`,
      );
      const role = labelValue(issue, "role:");
      const module = labelValue(issue, "module:");
      if (role === undefined || module === undefined) continue;
      records.push({
        role: roleNameOf(role),
        module,
        member: this.claimants.get(event.claimed.member) ?? event.claimed.member,
        claimedAt: event.decidedAt,
      });
    }
    return records;
  }

  async leaseNotices(): Promise<string[]> {
    throw new HarnessNotYetBuilt("moving GitHub's clock on");
  }

  /**
   * Labels the ready task claimed and assigns it to the account playing the member, as only
   * Divlab should, with the sandbox's own token, which can: Divlab's log has no claim for it.
   */
  async markClaimedWithoutDivlab(
    task: { project: string; role: string; module: string },
    member: string,
  ): Promise<void> {
    const fromRole = roleId(task.role);
    const issue = (await this.settled(task.project, "ready")).find(
      (i) => labelValue(i, "role:") === fromRole && labelValue(i, "module:") === task.module,
    );
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is ready to claim`);
    const account = await this.playAs(member);
    const login = await loginOf(account);
    // GitHub lets an issue be assigned to anyone who has commented on it; this is no claim.
    await account.call(
      "POST",
      `repos/${this.org}/${task.project}/issues/${issue.number}/comments`,
      {
        body: "Looking at this.",
      },
    );
    await this.github.call("PATCH", `repos/${this.org}/${task.project}/issues/${issue.number}`, {
      labels: issue.labels.map((l) => (l.name === "state:ready" ? "state:claimed" : l.name)),
      assignees: [login],
    });
    const expected = this.expectedFor(task.project);
    expected.ready -= 1;
    expected.claimed += 1;
    run.closed.add(issueKey(task.project, issue.number));
    this.claimedBehindDivlab.push(issue.number);
  }

  /** Tasks this scenario marked claimed behind Divlab's back, which its lease check frees. */
  private readonly claimedBehindDivlab: number[] = [];

  async claimedWithoutClaimAlerts(project: string): Promise<{ role: string; module: string }[]> {
    const issues = await this.settled(project, "claimedWithoutClaim");
    return issues.flatMap((issue) => {
      const named = issue.body?.match(/^Task #\d+, (.+?) task for (\S+), was shown as claimed/);
      return named ? [{ role: named[1] ?? "", module: named[2] ?? "" }] : [];
    });
  }

  /**
   * The sandbox's governance file records the level for the account playing the member. Trust
   * belongs to the account, which other workers' scenarios share, so scenarios that set it run one
   * at a time (`@governance`), and each puts the file back afterwards.
   */
  async setTrustLevel(member: string, level: string): Promise<void> {
    const login = await loginOf(await this.playAs(member));
    await this.changeGovernance((members) => {
      this.found(members, login);
      members[login] = { ...members[login], level };
    });
  }

  /**
   * An unnamed member plays the sandbox's own account, which its governance file records as
   * trusted (docs/SANDBOX.md). A second plays another account, new unless recorded otherwise:
   * for a role a new member may not take, it is recorded at the level needed, so its scenario
   * changes the governance file and runs alone (`@governance`).
   */
  async trustFor(member: string, role: string): Promise<void> {
    const account = await this.playAs(member, { unnamed: true });
    if (account === this.github || trustAllows("new", roleId(role))) return;
    const level = TRUST_LEVELS.find((level) => trustAllows(level, roleId(role)));
    if (level) await this.setTrustLevel(member, level);
  }

  /** Divlab's App closes the module's open tasks and posts the role's, as its runs would. */
  async setUpModuleAt(task: { project: string; role: string; module: string }): Promise<void> {
    const expected = this.expectedFor(task.project);
    const inModule = (issue: Issue) => labelValue(issue, "module:") === task.module;
    for (const listing of ["ready", "claimed"] as const) {
      for (const issue of (await this.settled(task.project, listing)).filter(inModule)) {
        await this.asDivlab.close(task.project, String(issue.number));
        expected[listing] -= 1;
        run.closed.add(issueKey(task.project, issue.number));
      }
    }
    await this.asDivlab.post({
      project: task.project,
      role: roleId(task.role),
      module: task.module,
      decidedOn: `feedback/${task.module}-earlier-work.md`,
    });
    expected.ready += 1;
  }

  /** The sandbox's governance file links the account playing `account` to the member's. */
  async linkAccount(member: string, account: string): Promise<void> {
    const owner = await loginOf(await this.playAs(member));
    const linked = await loginOf(await this.playAs(account));
    await this.changeGovernance((members) => {
      this.found(members, owner);
      const record = members[owner] ?? {};
      members[owner] = { ...record, linked: [...(record.linked ?? []), linked] };
    });
  }

  /**
   * The governance file as this scenario found it: each account it changed is put back as it was,
   * so the standing record of the sandbox's own account (docs/SANDBOX.md) survives.
   */
  async restoreGovernance(): Promise<void> {
    if (this.governanceFound.size === 0) return;
    await this.changeGovernance((members) => {
      for (const [login, record] of this.governanceFound) {
        if (record === undefined) delete members[login];
        else members[login] = record;
      }
    });
  }

  /** Each account's record as this scenario first found it, before changing it. */
  private readonly governanceFound = new Map<
    string,
    { level?: string; linked?: string[] } | undefined
  >();

  private found(members: Record<string, { level?: string; linked?: string[] }>, login: string) {
    if (this.governanceFound.has(login)) return;
    const record = members[login];
    this.governanceFound.set(login, record && { ...record });
  }

  private async changeGovernance(
    change: (members: Record<string, { level?: string; linked?: string[] }>) => void,
  ): Promise<void> {
    const where = `repos/${this.org}/${SANDBOX_GOVERNANCE}/contents/governance/members.json`;
    const { content, sha } = await this.github.call<{ content: string; sha: string }>("GET", where);
    const file = JSON.parse(Buffer.from(content, "base64").toString("utf8")) as {
      members: Record<string, { level?: string; linked?: string[] }>;
    };
    change(file.members);
    await this.github.call("PUT", where, {
      message: "Set members for a sandbox scenario",
      content: Buffer.from(`${JSON.stringify(file, null, 2)}\n`).toString("base64"),
      sha,
    });
  }

  /**
   * The member asks for work through the CLI, which reads GitHub with the member's own login.
   * GitHub's search lags behind new issues, so the driver waits until it sees this project.
   */
  async offeredTasks(member: string): Promise<{ role: string; module: string }[]> {
    const account = await this.playAs(member);
    const asMember = this.asMember(account);
    const deadline = Date.now() + LISTS_CATCH_UP_LIMIT;
    while (
      !(await asMember.names()).includes(this.projectOfScenario ?? "") &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    // And until the project's ready list shows every task the log says Divlab posted.
    const project = this.projectOfScenario ?? "";
    const expected = this.expectedFor(project).ready;
    while ((await asMember.readyTasks(project)).length < expected && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    const offers = await askForWork(await loginOf(account), {
      names: async () => (this.projectOfScenario ? [this.projectOfScenario] : []),
      readyTasks: (project) => asMember.readyTasks(project),
      log: (project) => asMember.read(project),
      governanceFile: () => asMember.governanceFile(),
    });
    return offers.map(({ role, module }) => ({ role: roleNameOf(role), module }));
  }

  /** The member asks for their status through the CLI, reading GitHub with their own login. */
  async heldTasks(
    member: string,
  ): Promise<{ role: string; module: string; leaseRunsOut?: string }[]> {
    const account = await this.playAs(member);
    const asMember = this.asMember(account);
    const held = await memberStatus(await loginOf(account), {
      names: async () => (this.projectOfScenario ? [this.projectOfScenario] : []),
      heldTasks: (project, holder) => asMember.heldTasks(project, holder),
      log: (project) => asMember.read(project),
      pullRequestsOpenBy: (project, holder) => asMember.pullRequestsOpenBy(project, holder),
    });
    return held.map(({ role, module, leaseRunsOut, pullRequest }) => ({
      role: roleNameOf(role),
      module,
      ...(leaseRunsOut === undefined ? {} : { leaseRunsOut }),
      ...(pullRequest === undefined ? {} : { draft: pullRequest.draft }),
    }));
  }

  /** The member's machine: a folder of its own, made when a scenario first needs one. */
  private machine: string | undefined;
  /** The issue of each task prepared on the member's machine, by `member role module`. */
  private readonly preparedIssues = new Map<string, string>();

  /**
   * The member's plugin prepares a task they hold through the CLI, as `anarres prepare` does:
   * git fetches the role's inputs from the project on GitHub into the task's folder.
   */
  async prepare(task: { project: string; role: string; module: string }, member: string) {
    const account = await this.playAs(member);
    const fromRole = roleId(task.role);
    const issue = (await this.settled(task.project, "claimed")).find(
      (i) => labelValue(i, "role:") === fromRole && labelValue(i, "module:") === task.module,
    );
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is claimed`);
    const id = String(issue.number);
    const held = await this.asMember(account).task(task.project, id);
    const plan = preparation(this.org, task.project, held, await loginOf(account));
    if ("refused" in plan) throw new Error(plan.refused);
    this.machine ??= mkdtempSync(join(tmpdir(), "anarres-member-"));
    const folder = taskFolder({ project: task.project, task: id });
    const into = join(this.machine, folder);
    for (const step of gitSteps(plan, into)) execFileSync("git", step, { stdio: "pipe" });
    writeFileSync(join(into, TASK_RECORD), taskRecord(held ?? {}));
    if (held !== undefined) {
      await restoreDraft(
        { project: task.project, task: id },
        held,
        await loginOf(account),
        this.asMember(account),
        (path, text) => {
          const file = join(into, path);
          if (existsSync(file)) return;
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, text);
        },
      );
    }
    this.preparedIssues.set(`${member} ${task.role} ${task.module}`, id);
    return folder;
  }

  /** The member's plugin resumes a task through the CLI, in a new session on the same machine. */
  async resume(task: { project: string; role: string; module: string }, member: string) {
    const id = this.preparedIssues.get(`${member} ${task.role} ${task.module}`);
    if (id === undefined || this.machine === undefined) {
      throw new Error(`${member} has not prepared the ${task.role} task for ${task.module}`);
    }
    const account = await this.playAs(member);
    const folder = taskFolder({ project: task.project, task: id });
    const resumed = resumption(
      { project: task.project, task: id },
      await this.asMember(account).task(task.project, id),
      await loginOf(account),
      { prepared: existsSync(join(this.machine, folder, TASK_RECORD)) },
    );
    return "folder" in resumed ? { workIn: resumed.folder } : resumed;
  }

  async workInFolder(task: { project: string; role: string; module: string }, member: string) {
    const id = this.preparedIssues.get(`${member} ${task.role} ${task.module}`);
    if (id === undefined || this.machine === undefined) return [];
    const signals = join(this.machine, taskFolder({ project: task.project, task: id }), "feedback");
    if (!existsSync(signals)) return [];
    return readdirSync(signals).map((name) => signalName(`feedback/${name}`));
  }

  /** The member's machine is cleared away after each scenario. */
  clearMachine(): void {
    if (this.machine) rmSync(this.machine, { recursive: true, force: true });
    this.machine = undefined;
  }

  /** The member's merged work, as their CLI's status reads it, with their own login. */
  async contributionHistory(member: string): Promise<{ role: string; module: string }[]> {
    const account = await this.playAs(member);
    const asMember = this.asMember(account);
    const done = await contributions(await loginOf(account), {
      names: async () => (this.projectOfScenario ? [this.projectOfScenario] : []),
      log: (project) => asMember.read(project),
    });
    return done.map(({ role, module }) => ({ role: roleNameOf(role), module }));
  }

  async timePasses(): Promise<void> {
    throw new HarnessNotYetBuilt("moving GitHub's clock on");
  }

  /**
   * Runs Divlab's lease check by hand, as a PDC coordinator may, and waits for it. Only a task this
   * scenario marked claimed behind Divlab's back is expected to change: the sandbox cannot move
   * GitHub's clock, so no lease here has run out.
   */
  async divlabChecksLeases(project: string): Promise<void> {
    const repository = `repos/${this.org}/${project}`;
    const workflow = `${repository}/actions/workflows/divlab-leases.yml`;
    const started = Date.now();
    await this.github.call("POST", `${workflow}/dispatches`, { ref: "main" });
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      const { workflow_runs: runs } = await this.github.call<{ workflow_runs: WorkflowRun[] }>(
        "GET",
        `${workflow}/runs?event=workflow_dispatch&per_page=10`,
      );
      const check = runs.find((r) => Date.parse(r.created_at) >= started - 5_000);
      if (check?.status === "completed") {
        if (check.conclusion !== "success") {
          throw new Error(
            `Divlab's lease check ended ${check.conclusion}: ${await this.whyRunFailed(repository, check)} (${check.html_url})`,
          );
        }
        break;
      }
      if (Date.now() - started > RUN_FINISH_LIMIT) {
        throw new Error(`Divlab's lease check in ${project} did not finish`);
      }
    }
    const expected = this.expectedFor(project);
    for (const number of this.claimedBehindDivlab.splice(0)) {
      expected.claimed -= 1;
      expected.ready += 1;
      expected.claimedWithoutClaim += 1;
      run.closed.delete(issueKey(project, number));
    }
  }

  /**
   * The member's plugin submits through the CLI's submit, against real GitHub. The sandbox's
   * accounts cannot fork into a personal account, so the fork is the members' organisation's, as
   * for every scenario; the pull request is opened as the member's own account.
   */
  async submitThroughPlugin(work: AcceptedWork): Promise<void> {
    const { number, task } = await this.submitThroughCli(work, { draft: false });
    const { path } = feedbackSignalFile(work, String(task.number));
    await this.awaitDecision(
      work,
      { number, path, task, listing: "claimed" },
      await this.divlabHasDecidedOn(work.project, number),
    );
  }

  /**
   * The member's CLI submits their work for the task they hold, as `anarres submit` does, from
   * the task's branch of their fork; the sandbox's members organisation holds the forks.
   */
  private async submitThroughCli(work: AcceptedWork, { draft }: { draft: boolean }) {
    const fromRole = roleId(work.role);
    const task = (await this.settled(work.project, "claimed")).find(
      (i) => labelValue(i, "role:") === fromRole && labelValue(i, "module:") === work.module,
    );
    if (!task) throw new Error(`No ${work.role} task for ${work.module} is claimed`);
    const member = this.asMember(await this.playAs(work.member));
    const asMembersOrg = new GitHubAdapter({
      owner: this.membersOrg,
      token: sandboxSettings().membersToken,
      request: countedRequest,
    });
    let number = 0;
    const said = await submit(
      { project: work.project, role: fromRole, module: work.module, task: String(task.number) },
      workFiles(work, String(task.number)),
      { draft },
      {
        forkOf: (project) => this.forkOf(project),
        branch: (fork, name) => asMembersOrg.branch(fork, name),
        putFile: (fork, branch, path, text) => asMembersOrg.putFile(fork, branch, path, text),
        openPullRequest: async (project, head, title, asDraft) => {
          const opened = await member.openPullRequest(project, head, title, asDraft);
          number = Number(opened);
          return opened;
        },
      },
    );
    if (said.startsWith("Not submitted")) throw new Error(said);
    return { number, task };
  }

  /**
   * The member's CLI submits a draft, as `anarres submit --draft` does, early in the work.
   * Divlab never merges a draft; the driver waits for its record of the activity.
   */
  async testsFinish(_work: AcceptedWork, _passed: boolean): Promise<void> {
    throw new HarnessNotYetBuilt("a project whose tests pass or fail on cue");
  }

  async pushToDraft(_work: AcceptedWork): Promise<void> {
    throw new HarnessNotYetBuilt("a push to a member's draft, waited on until Divlab records it");
  }

  async submitDraftWork(work: AcceptedWork): Promise<void> {
    const { number, task: issue } = await this.submitThroughCli(work, { draft: true });
    run.submitted.push({
      project: work.project,
      number,
      feedbackSignal: work.feedbackSignal,
      merged: false,
    });
    const task = String(issue.number);
    const deadline = Date.now() + RUN_FINISH_LIMIT;
    for (;;) {
      const events = await this.divlab.read(work.project);
      if (events.some((e) => "activity" in e && e.activity.task === task)) return;
      if (Date.now() > deadline) {
        throw new Error(`Divlab recorded no activity for draft ${number} in ${work.project}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }

  /** The member comments to give the task back, and Divlab's run makes it ready again. */
  async release(task: { project: string; role: string; module: string }, member: string) {
    const account = await this.playAs(member);
    const repository = `repos/${this.org}/${task.project}`;
    const fromRole = roleId(task.role);
    const issue = (await this.settled(task.project, "claimed")).find(
      (i) => labelValue(i, "role:") === fromRole && labelValue(i, "module:") === task.module,
    );
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is claimed`);
    const started = Date.now();
    // Divlab either makes the task ready again or replies saying why not: a comment after theirs.
    const before = issue.comments ?? 0;
    await account.call("POST", `${repository}/issues/${issue.number}/comments`, {
      body: "/release",
    });
    for (let check = 1; ; check++) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const now = await this.github.call<Issue>("GET", `${repository}/issues/${issue.number}`);
      if (now.labels.some((l) => l.name === "state:ready") && !now.assignees?.length) break;
      if ((now.comments ?? 0) > before + 1) return;
      if (check % 3 === 0) await this.failIfRunFailed(repository, "issue_comment", started);
      if (Date.now() - started > RUN_FINISH_LIMIT) {
        throw new Error(
          `Divlab did not act on the release of task ${issue.number} in ${task.project}`,
        );
      }
    }
    const expected = this.expectedFor(task.project);
    expected.claimed -= 1;
    expected.ready += 1;
    run.closed.delete(issueKey(task.project, issue.number));
  }

  async claimedTasks(project: string): Promise<ClaimedTask[]> {
    const issues = await this.settled(project, "claimed");
    return issues.flatMap((issue) => {
      const role = labelValue(issue, "role:");
      const module = labelValue(issue, "module:");
      const login = issue.assignees?.[0]?.login;
      if (role === undefined || module === undefined || login === undefined) return [];
      return [{ role: roleNameOf(role), module, member: this.claimants.get(login) ?? login }];
    });
  }

  /** GitHub as a member's CLI reads and writes it, with the member's own account. */
  private asMember(account: GitHubApi): GitHubAdapter {
    return new GitHubAdapter({
      owner: this.org,
      token: account.token,
      request: countedRequest,
      // The sandbox's members are judged by its own governance file, as its Divlab judges them.
      governance: `${this.org}/${SANDBOX_GOVERNANCE}`,
    });
  }

  /** A failed Divlab run for the event, started since the step began, fails the step. */
  private async failIfRunFailed(repository: string, event: string, since: number) {
    const { workflow_runs: runs } = await this.github.call<{ workflow_runs: WorkflowRun[] }>(
      "GET",
      `${repository}/actions/runs?event=${event}&status=completed`,
    );
    const failed = runs.find(
      (r) => r.conclusion !== "success" && Date.parse(r.created_at) >= since - 5_000,
    );
    if (failed) {
      throw new Error(
        `Divlab's ${event} run ended ${failed.conclusion}: ${await this.whyRunFailed(repository, failed)} (${failed.html_url})`,
      );
    }
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    const issues = await this.settled(project, "ready");
    return issues.flatMap((issue) => {
      const role = labelValue(issue, "role:");
      const module = labelValue(issue, "module:");
      if (role === undefined || module === undefined) return [];
      const feedbackSignal = issue.body?.match(/^Feedback signal: (.+)$/m)?.[1];
      const continuation = issue.labels.some((label) => label.name === "continuation");
      return [
        {
          role: roleNameOf(role),
          module,
          ...(feedbackSignal ? { feedbackSignal: signalName(feedbackSignal) } : {}),
          ...(continuation ? { continuation } : {}),
        },
      ];
    });
  }

  async coordinatorAlerts(project: string): Promise<CoordinatorAlert[]> {
    const issues = await this.settled(project, "escalation");
    return issues.map((issue) => {
      const json = issue.body?.match(/```json\n([\s\S]*)\n```$/)?.[1];
      const { work, reason } = inScenarioWords(JSON.parse(json ?? "null") as RoutingEvent);
      return { module: work.module, work, reason };
    });
  }

  async doneModules(project: string): Promise<string[]> {
    const issues = await this.settled(project, "done");
    return issues.flatMap((issue) => labelValue(issue, "module:") ?? []);
  }

  /** The event log, once GraphQL (which lags) holds every file the REST listing shows. */
  async routingRecords(project: string): Promise<RoutingRecord[]> {
    const { status, data: files } = await this.github.request<{ name: string }[]>(
      "GET",
      `repos/${this.org}/${project}/contents/events`,
    );
    if (status === 404) return [];
    const names = files.map((file) => file.name).sort();
    const deadline = Date.now() + 30_000;
    for (;;) {
      const answer = await this.github.call<{
        data?: {
          repository?: { object?: { entries?: { name: string; object?: { text?: string } }[] } };
        };
        errors?: unknown[];
      }>(
        "POST",
        "graphql",
        {
          query: `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) {
            object(expression: "HEAD:events") { ... on Tree { entries { name object { ... on Blob { text } } } } } } }`,
          variables: { owner: this.org, name: project },
        },
        { repeatable: true },
      );
      if (answer.errors?.length)
        throw new Error(`Reading ${project}'s events: ${JSON.stringify(answer.errors)}`);
      const texts = new Map(
        (answer.data?.repository?.object?.entries ?? []).map((entry) => [
          entry.name,
          entry.object?.text,
        ]),
      );
      if (names.every((name) => texts.has(name)) || Date.now() > deadline) {
        // Only the routing decisions: merges begun and work not accepted are records too.
        const events = names.map((name) => JSON.parse(texts.get(name) ?? "null") as LogEvent);
        return routingDecisions(events).map(inScenarioWords);
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  /** The errors a failed run reported, as GitHub annotates its jobs. */
  private async whyRunFailed(repository: string, failed: WorkflowRun): Promise<string> {
    const { jobs } = await this.github.call<{ jobs: { id: number }[] }>(
      "GET",
      `${repository}/actions/runs/${failed.id}/jobs`,
    );
    const messages: string[] = [];
    for (const job of jobs) {
      const { status, data } = await this.github.request<{ message: string }[]>(
        "GET",
        `${repository}/check-runs/${job.id}/annotations`,
      );
      if (status === 200) messages.push(...data.map((annotation) => annotation.message));
    }
    return messages.join("; ") || "GitHub gave no reason";
  }

  /**
   * Deletes what interrupted runs left behind in both sandbox organisations, before a run starts,
   * so leftovers never build up (nor collide with this run's names).
   */
  /**
   * The sandbox's governance file as it stands between runs: only the sandbox token's account,
   * trusted, as it plays unnamed members. A run its job's time limit cut off never puts back what
   * its scenarios recorded, so each run starts from this (seen 2026-10-27).
   */
  static async resetGovernance(): Promise<void> {
    const { org, token } = sandboxSettings();
    const github = new GitHubApi(token);
    const where = `repos/${org}/${SANDBOX_GOVERNANCE}/contents/governance/members.json`;
    const { sha } = await github.call<{ sha: string }>("GET", where);
    const standing = { members: { [await loginOf(github)]: { level: "trusted" } } };
    await github.call("PUT", where, {
      message: "Put the sandbox's members back as they stand between runs",
      content: Buffer.from(`${JSON.stringify(standing, null, 2)}\n`).toString("base64"),
      sha,
    });
  }

  static async sweep(): Promise<void> {
    const { org, token, membersOrg, membersToken } = sandboxSettings();
    for (const [owner, github] of [
      [org, new GitHubApi(token)],
      [membersOrg, new GitHubApi(membersToken)],
    ] as const) {
      const repositories: { name: string; created_at: string }[] = [];
      for (let page = 1; ; page++) {
        const listed = await github.call<{ name: string; created_at: string }[]>(
          "GET",
          `orgs/${owner}/repos?per_page=100&page=${page}`,
        );
        repositories.push(...listed);
        if (listed.length < 100) break;
      }
      // Every worker sweeps as the run starts, so others may be deleting the same repositories.
      for (const name of leftBehind(repositories, Date.now())) {
        const { status, data } = await github.request("DELETE", `repos/${owner}/${name}`);
        // GitHub may refuse a delete another worker's is part way through: look again first.
        if (
          !sweptBy(status) &&
          !sweptBy((await github.request("GET", `repos/${owner}/${name}`)).status)
        ) {
          throw new Error(
            `GitHub DELETE repos/${owner}/${name} answered ${status}: ${JSON.stringify(data)}`,
          );
        }
        console.log(`Swept ${owner}/${name}, left behind by an interrupted run`);
      }
    }
  }

  /**
   * How much of the hourly allowance the sandbox has used. GitHub counts it per person, not per
   * token: the sandbox's two tokens, and anything else acting as the same person, share it.
   * Asking costs nothing.
   */
  static async allowance(): Promise<{ used: number; limit: number; reset: number }> {
    const { token } = sandboxSettings();
    const { data } = await requestGitHub<{
      resources: Record<"core" | "graphql", { used: number; limit: number; reset: number }>;
    }>(token, "GET", "rate_limit");
    const { core, graphql } = data.resources;
    const resets = new Date(core.reset * 1000).toISOString().slice(11, 16);
    console.log(
      `GitHub allowance: REST ${core.used} of ${core.limit} used (resets ${resets} UTC); ` +
        `GraphQL ${graphql.used} of ${graphql.limit}`,
    );
    return core;
  }

  /** Stops the run before it starts if GitHub's allowance has no room for it. */
  static async checkAllowance(): Promise<void> {
    const why = shortfall(await SandboxDriver.allowance(), REQUESTS_A_SCENARIO_NEEDS, Date.now());
    if (why) throw new Error(why);
  }

  /** What this run asked of GitHub, as the driver counted it. */
  static requestsMade(): string[] {
    return summary(tally);
  }

  /** Deletes the repositories this run created. */
  static async disposeRun(): Promise<void> {
    for (const { github, path } of run.created.splice(0)) await github.request("DELETE", path);
  }

  /**
   * The issues in a listing, once GitHub shows as many as Divlab's event log says it should and,
   * for ready tasks, none Divlab has closed. A count alone is not enough: a lagging list can show
   * a closed task in place of the one that replaced it.
   */
  private async settled(project: string, listing: Listing): Promise<Issue[]> {
    const [label, state] = LISTINGS[listing];
    const deadline = Date.now() + LISTS_CATCH_UP_LIMIT;
    for (;;) {
      const issues = await this.issues(project, label, state);
      const stale =
        listing === "ready" &&
        issues.some((issue) => run.closed.has(issueKey(project, issue.number)));
      if (
        (issues.length === this.expectedFor(project)[listing] && !stale) ||
        Date.now() > deadline
      ) {
        return issues;
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  private expectedFor(project: string): Record<Listing, number> {
    const expected = run.expected.get(project);
    if (!expected) throw new Error(`No project ${project} was created in this scenario`);
    return expected;
  }

  private async issues(project: string, label: string, state: "open" | "all"): Promise<Issue[]> {
    const issues = await this.github.call<Issue[]>(
      "GET",
      `repos/${this.org}/${project}/issues?labels=${encodeURIComponent(label)}&state=${state}&per_page=100`,
    );
    // Alerts of work not accepted, or of an unprotected main, are escalations too, but not
    // routing alerts.
    const notRouting = (issue: Issue) =>
      issue.labels.some(
        (l) =>
          l.name === "not-accepted" ||
          l.name === "unprotected-main" ||
          l.name === "claimed-without-claim",
      );
    // Alerts of a change Divlab did not make are not accepted too, but no feedback signal's.
    const aChange = (issue: Issue) => issue.labels.some((l) => l.name === "change-not-by-divlab");
    return issues.filter(
      (issue) =>
        issue.pull_request === undefined &&
        (label !== "escalation" || !notRouting(issue)) &&
        (label !== "not-accepted" || !aChange(issue)),
    );
  }
}

type Listing = "ready" | "claimed" | "escalation" | "done" | "notAccepted" | "claimedWithoutClaim";

/**
 * The sandbox organisation's repository holding its governance file, as its `ANARRES_GOVERNANCE`
 * variable names it (decision 0007).
 */
const SANDBOX_GOVERNANCE = "governance";

/** The App ID of Divlab Sandbox, the sandbox's GitHub App (CONTRIBUTING.md). Not a secret. */
const DIVLAB_APP_ID = 5414648;

/** The project template's workflows: members' pull requests, pushes to main, claims, leases. */
const TEMPLATE_WORKFLOWS = [
  "anarres.yml",
  "divlab-pull-request.yml",
  "divlab-claim.yml",
  "divlab-leases.yml",
];

/** Where Divlab's pull request workflow lives in a project repository. */
const DIVLAB_PULL_REQUEST_WORKFLOW = ".github/workflows/divlab-pull-request.yml";

/** A repository's Actions policy, as GitHub describes it. */
type ActionsPolicy = {
  enforcement: string;
  conditions?: { workflow_path?: { include?: string[] } };
  rules: { type: string; parameters: { allowed_events?: string[] } }[];
};

/**
 * One of the project template's workflows, using Divlab as it is at the commit under test (decision 0004):
 * CI's commit, or locally the checked-out one, which must have been pushed.
 */
function divlabWorkflow(name: string): string {
  const template = readFileSync(
    new URL(`../../../template/.github/workflows/${name}`, import.meta.url),
    "utf8",
  );
  const divlab = "anarres-project/anarres/packages/divlab@main";
  if (!template.includes(divlab))
    throw new Error(`The template's ${name} no longer uses ${divlab}`);
  const commit =
    process.env.GITHUB_SHA ??
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  return template.replace(divlab, divlab.replace("@main", `@${commit}`));
}

type WorkflowRun = {
  id: number;
  event: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
};

/**
 * The requests a sandbox scenario needs, with room to spare: a full run averaged about 36 a
 * scenario (2,400 for 67, in CI on 2026-10-22), more for one that merges several times in a row.
 */
const REQUESTS_A_SCENARIO_NEEDS = 200;

/**
 * How long GitHub's issue lists may take to show what the event log says Divlab did. Usually a
 * few seconds; on 2026-10-23 they lagged past the 30 seconds this was, failing three scenarios
 * in two runs though Divlab had posted every task.
 */
const LISTS_CATCH_UP_LIMIT = 120_000;

/** GitHub's message in an answer's body, if it gives one. */
const messageOf = (data: unknown): string =>
  String((data as { message?: unknown } | undefined)?.message ?? "");

/**
 * How long Divlab may take to decide, within a step's timeout. A run can queue behind the
 * project's last for a minute or two, then wait as long again for one of GitHub's runners (seen
 * 2026-10-27: four minutes in all, for a run of 13 seconds).
 */
const RUN_FINISH_LIMIT = 360_000;

/** Shared by every scenario a worker runs: they use its one repository, one at a time. */
const run = {
  created: [] as { github: GitHubApi; path: string }[],
  /** The members' fork of each project, by project. */
  forks: new Map<string, string>(),
  /** What GitHub should show once its issue lists catch up with Divlab's writes. */
  expected: new Map<string, Record<Listing, number>>(),
  /** The tasks merged work has closed or members have claimed, which a lagging list may still show as ready. */
  closed: new Set<string>(),
  /** Each sandbox account's login, by its token. */
  logins: new Map<string, string>(),
  /** The pull requests members' work was submitted in. */
  submitted: [] as { project: string; number: number; feedbackSignal: string; merged: boolean }[],
};

const issueKey = (project: string, number: number) => `${project}#${number}`;

const LISTINGS: Record<Listing, [label: string, state: "open" | "all"]> = {
  ready: ["state:ready", "open"],
  claimed: ["state:claimed", "open"],
  escalation: ["escalation", "all"],
  done: ["state:done", "all"],
  notAccepted: ["not-accepted", "all"],
  claimedWithoutClaim: ["claimed-without-claim", "all"],
};

const labelValue = (issue: Issue, prefix: string) =>
  issue.labels.find((label) => label.name.startsWith(prefix))?.name.slice(prefix.length);

/** The GitHub account a sandbox token acts as, asked once per account in a run. */
async function loginOf(account: GitHubApi): Promise<string> {
  const known = run.logins.get(account.token);
  if (known) return known;
  const { login } = await account.call<{ login: string }>("GET", "user");
  run.logins.set(account.token, login);
  return login;
}
