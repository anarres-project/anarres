import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { askForWork, claim, submit } from "@anarres/cli";
import {
  type LogEvent,
  type RoutingEvent,
  routingDecisions,
  setUpProject,
  signalOf,
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
 * the second account that plays a second member, if there is one.
 */
function sandboxSettings() {
  const {
    ANARRES_SANDBOX_ORG: org,
    ANARRES_SANDBOX_TOKEN: token,
    ANARRES_SANDBOX_MEMBERS_ORG: membersOrg,
    ANARRES_SANDBOX_MEMBERS_TOKEN: membersToken,
    ANARRES_SANDBOX_SECOND_MEMBER_TOKEN: secondMemberToken,
  } = process.env;
  if (!org || !token || !membersOrg || !membersToken) {
    throw new Error(
      "The sandbox driver needs ANARRES_SANDBOX_ORG, ANARRES_SANDBOX_TOKEN, " +
        "ANARRES_SANDBOX_MEMBERS_ORG and ANARRES_SANDBOX_MEMBERS_TOKEN",
    );
  }
  return { org, token, membersOrg, membersToken, secondMemberToken };
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
    this.membersOrg = membersOrg;
    this.members = new GitHubApi(membersToken);
  }

  /**
   * Creates the run's repository the first time a scenario asks for it. Public, so Divlab's
   * Action runs in it cost nothing (decision 0004); it holds only synthetic data.
   */
  async createProject(
    project: string,
    _modules: string[],
    options: { unprotected?: boolean } = {},
  ): Promise<void> {
    this.projectOfScenario = project;
    if (run.expected.has(project)) return;
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
    const divlab = new GitHubAdapter({
      owner: this.org,
      token: this.token,
      app: DIVLAB_APP_ID,
      request: countedRequest,
    });
    if (!options.unprotected) await setUpProject(project, divlab);
    run.expected.set(project, { ready: 0, claimed: 0, escalation: 0, done: 0, notAccepted: 0 });
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

  private async openPullRequest(work: AcceptedWork, { draft = false } = {}) {
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
    const task = ready ?? claimed;
    const listing: Listing = ready ? "ready" : "claimed";
    const fork = await this.forkOf(work.project);
    // A new fork can answer "Git Repository is empty" for a while after GitHub says it exists.
    const deadline = Date.now() + LISTS_CATCH_UP_LIMIT;
    let reference = await this.members.request<{ object: { sha: string } }>(
      "GET",
      `repos/${fork}/git/ref/heads/main`,
    );
    while (reference.status === 409 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      reference = await this.members.request("GET", `repos/${fork}/git/ref/heads/main`);
    }
    if (reference.status !== 200) {
      throw new Error(`GitHub GET repos/${fork}/git/ref/heads/main answered ${reference.status}`);
    }
    const main = reference.data.object;
    const branch = `work/${work.feedbackSignal}`;
    await this.members.call("POST", `repos/${fork}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: main.sha,
    });
    const signal = feedbackSignalFile(work, task && String(task.number));
    for (const { path, text } of [...otherFiles(work), signal]) {
      await this.members.call("PUT", `repos/${fork}/contents/${path}`, {
        message: `The ${work.role} work on ${work.module}`,
        content: Buffer.from(text).toString("base64"),
        branch,
      });
    }
    const { path } = signal;
    const { number } = await member.call<{ number: number }>("POST", `${repository}/pulls`, {
      title: `The ${work.role} work on ${work.module}`,
      head: `${this.membersOrg}:${branch}`,
      base: "main",
      draft,
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
      await new Promise((resolve) => setTimeout(resolve, 3_000));
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
      await new Promise((resolve) => setTimeout(resolve, 1_000));
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
        await new Promise((resolve) => setTimeout(resolve, 2_000));
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
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  /**
   * The member comments to claim the task, as their plugin will, and Divlab's run for the comment
   * marks it claimed. The sandbox has one account playing every member, so the driver remembers
   * which member each claim was for.
   */
  async claim(task: { project: string; role: string; module: string }, member: string) {
    const repository = `repos/${this.org}/${task.project}`;
    const fromRole = roleId(task.role);
    const issue = (await this.settled(task.project, "ready")).find(
      (i) => labelValue(i, "role:") === fromRole && labelValue(i, "module:") === task.module,
    );
    if (!issue) throw new Error(`No ${task.role} task for ${task.module} is ready to claim`);
    const account = await this.playAs(member);
    const started = Date.now();
    // Divlab either gives the member the task or replies saying why not: a comment after theirs.
    const before = issue.comments ?? 0;
    // The member claims through their CLI, as the plugin does, with their own account.
    await claim(`${task.project}#${issue.number}`, this.asMember(account));
    for (let check = 1; ; check++) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const now = await this.github.call<Issue>("GET", `${repository}/issues/${issue.number}`);
      const claimant = now.assignees?.[0]?.login;
      if (now.labels.some((l) => l.name === "state:claimed") && claimant) break;
      if ((now.comments ?? 0) > before + 1) return;
      if (check % 3 === 0) await this.failIfRunFailed(repository, "issue_comment", started);
      if (Date.now() - started > RUN_FINISH_LIMIT) {
        throw new Error(
          `Divlab did not act on the claim of task ${issue.number} in ${task.project}`,
        );
      }
    }
    const expected = this.expectedFor(task.project);
    expected.ready -= 1;
    expected.claimed += 1;
    run.closed.add(issueKey(task.project, issue.number));
  }

  /** Divlab's replies on the project's open tasks, each to the member its account plays. */
  async claimRefusals(project: string): Promise<{ member: string; reason: string }[]> {
    const repository = `repos/${this.org}/${project}`;
    const tasks = [
      ...(await this.settled(project, "ready")),
      ...(await this.settled(project, "claimed")),
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
  private async playAs(member: string): Promise<GitHubApi> {
    const playing = this.played.get(member);
    if (playing) return playing;
    const { secondMemberToken } = sandboxSettings();
    const accounts = [
      this.github,
      ...(secondMemberToken ? [new GitHubApi(secondMemberToken)] : []),
    ];
    const account = accounts[this.played.size];
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
   * The sandbox's governance file records the level for the account playing the member. Trust
   * belongs to the account, which other workers' scenarios share, so scenarios that set it run one
   * at a time (`@governance`), and each puts the file back afterwards.
   */
  async setTrustLevel(member: string, level: string): Promise<void> {
    const login = await loginOf(await this.playAs(member));
    await this.changeGovernance((members) => {
      members[login] = { ...members[login], level };
    });
    this.governanceTouched.add(login);
  }

  /** The sandbox's governance file links the account playing `account` to the member's. */
  async linkAccount(member: string, account: string): Promise<void> {
    const owner = await loginOf(await this.playAs(member));
    const linked = await loginOf(await this.playAs(account));
    await this.changeGovernance((members) => {
      const record = members[owner] ?? {};
      members[owner] = { ...record, linked: [...(record.linked ?? []), linked] };
    });
    this.governanceTouched.add(owner);
  }

  /** The governance file as this scenario found it: the accounts it recorded are taken out. */
  async restoreGovernance(): Promise<void> {
    if (this.governanceTouched.size === 0) return;
    await this.changeGovernance((members) => {
      for (const login of this.governanceTouched) delete members[login];
    });
  }

  private readonly governanceTouched = new Set<string>();

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

  async timePasses(): Promise<void> {
    throw new HarnessNotYetBuilt("moving GitHub's clock on");
  }

  async divlabChecksLeases(): Promise<void> {
    throw new HarnessNotYetBuilt("moving GitHub's clock on");
  }

  /**
   * The member opens a draft for the task they hold, as their plugin will, early in the work.
   * Divlab never merges a draft; the driver waits for its record of the activity.
   */
  /**
   * The member's plugin submits through the CLI's submit, against real GitHub. The sandbox's
   * accounts cannot fork into a personal account, so the fork is the members' organisation's, as
   * for every scenario; the pull request is opened as the member's own account.
   */
  async submitThroughPlugin(work: AcceptedWork): Promise<void> {
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
      { draft: false },
      {
        forkOf: (project) => this.forkOf(project),
        branch: (fork, name) => asMembersOrg.branch(fork, name),
        putFile: (fork, branch, path, text) => asMembersOrg.putFile(fork, branch, path, text),
        openPullRequest: async (project, head, title, draft) => {
          const opened = await member.openPullRequest(project, head, title, draft);
          number = Number(opened);
          return opened;
        },
      },
    );
    if (said.startsWith("Not submitted")) throw new Error(said);
    const { path } = feedbackSignalFile(work, String(task.number));
    await this.awaitDecision(
      work,
      { number, path, task, listing: "claimed" },
      await this.divlabHasDecidedOn(work.project, number),
    );
  }

  async submitDraftWork(work: AcceptedWork): Promise<void> {
    const opened = await this.openPullRequest(work, { draft: true });
    run.submitted.push({
      project: work.project,
      number: opened.number,
      feedbackSignal: work.feedbackSignal,
      merged: false,
    });
    const task = String(opened.task?.number);
    const deadline = Date.now() + RUN_FINISH_LIMIT;
    for (;;) {
      const events = await this.divlab.read(work.project);
      if (events.some((e) => "activity" in e && e.activity.task === task)) return;
      if (Date.now() > deadline) {
        throw new Error(
          `Divlab recorded no activity for draft ${opened.number} in ${work.project}`,
        );
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
    await account.call("POST", `${repository}/issues/${issue.number}/comments`, {
      body: "/release",
    });
    for (let check = 1; ; check++) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const now = await this.github.call<Issue>("GET", `${repository}/issues/${issue.number}`);
      if (now.labels.some((l) => l.name === "state:ready") && !now.assignees?.length) break;
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
        if (!sweptBy(status)) {
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
      issue.labels.some((l) => l.name === "not-accepted" || l.name === "unprotected-main");
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

type Listing = "ready" | "claimed" | "escalation" | "done" | "notAccepted";

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

/** How long Divlab may take to decide on a pull request, within a step's timeout. */
const RUN_FINISH_LIMIT = 240_000;

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
