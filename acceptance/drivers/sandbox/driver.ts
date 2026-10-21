import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  type LogEvent,
  type RoutingEvent,
  routingDecisions,
  setUpProject,
  signalOf,
} from "@anarres/divlab";
import { GitHubAdapter } from "@anarres/github";
import type {
  AcceptedWork,
  CoordinatorAlert,
  Driver,
  ReadyTask,
  RoutingRecord,
} from "../driver.ts";
import { HarnessNotYetBuilt } from "../errors.ts";
import {
  feedbackSignalFile,
  inScenarioWords,
  roleId,
  roleNameOf,
  signalName,
} from "../scenario-words.ts";
import { GitHubApi } from "./github-api.ts";

type Issue = {
  number: number;
  labels: { name: string }[];
  body: string | null;
  pull_request?: unknown;
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

  constructor() {
    const { ANARRES_SANDBOX_ORG: org, ANARRES_SANDBOX_TOKEN: token } = process.env;
    if (!org || !token) {
      throw new Error("The sandbox driver needs ANARRES_SANDBOX_ORG and ANARRES_SANDBOX_TOKEN");
    }
    this.org = org;
    this.token = token;
    this.github = new GitHubApi(token);
    this.divlab = new GitHubAdapter({ owner: org, token });
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
    const divlab = new GitHubAdapter({ owner: this.org, token: this.token, app: DIVLAB_APP_ID });
    if (!options.unprotected) await setUpProject(project, divlab);
    run.expected.set(project, { ready: 0, escalation: 0, done: 0, notAccepted: 0 });
  }

  /** The member submits the work and Divlab merges it: accepted work has been merged. */
  async acceptWork(work: AcceptedWork): Promise<void> {
    await this.submitWork(work);
    const submitted = run.submitted.at(-1);
    if (!submitted?.merged) {
      throw new Error(`Divlab did not merge the ${work.role} work on ${work.module}`);
    }
  }

  /** The member's work goes on a branch of its own, and a pull request asks to merge it. */
  async submitWork(work: AcceptedWork): Promise<void> {
    const repository = `repos/${this.org}/${work.project}`;
    const fromRole = roleId(work.role);
    const task = (await this.settled(work.project, "ready")).find(
      (issue) =>
        labelValue(issue, "role:") === fromRole && labelValue(issue, "module:") === work.module,
    );
    const { object: main } = await this.github.call<{ object: { sha: string } }>(
      "GET",
      `${repository}/git/ref/heads/main`,
    );
    const branch = `work/${work.feedbackSignal}`;
    await this.github.call("POST", `${repository}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: main.sha,
    });
    const { path, text } = feedbackSignalFile(work, task && String(task.number));
    await this.github.call("PUT", `${repository}/contents/${path}`, {
      message: `The ${work.role} work on ${work.module}`,
      content: Buffer.from(text).toString("base64"),
      branch,
    });
    const { number } = await this.github.call<{ number: number }>("POST", `${repository}/pulls`, {
      title: `The ${work.role} work on ${work.module}`,
      head: branch,
      base: "main",
    });
    const merged = await this.divlabHasDecidedOn(work.project, number);
    run.submitted.push({
      project: work.project,
      number,
      feedbackSignal: work.feedbackSignal,
      merged,
    });
    if (merged) await this.expectWhatDivlabDecided(work.project, path, task);
  }

  /** As GitHub showed each pull request once Divlab had decided on it. */
  async mergedWork(project: string): Promise<string[]> {
    return run.submitted
      .filter((submitted) => submitted.project === project && submitted.merged)
      .map((submitted) => submitted.feedbackSignal);
  }

  /** Divlab's comments on the pull requests it did not merge. */
  /** The sandbox token is an administrator's: if main refuses it, it refuses every person. */
  async changeMainDirectly(project: string): Promise<boolean> {
    const { status } = await this.github.request(
      "PUT",
      `repos/${this.org}/${project}/contents/not-through-divlab.md`,
      { message: "A change that skips Divlab", content: Buffer.from("No.\n").toString("base64") },
    );
    return status >= 200 && status < 300;
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
  private async expectWhatDivlabDecided(project: string, path: string, task?: Issue) {
    // The event log is consistent at once and says what Divlab did; the issue lists lag behind.
    const expected = this.expectedFor(project);
    const event = await this.eventFor(project, path, "routed");
    if (!("work" in event))
      throw new Error(`Divlab recorded no decision for ${path} in ${project}`);
    if (task) {
      expected.ready -= 1;
      run.closed.add(issueKey(project, task.number));
    }
    const { decision } = event;
    if ("tasks" in decision) expected.ready += decision.tasks.length;
    if ("alert" in decision) expected.escalation += 1;
    if ("moduleDone" in decision) expected.done += 1;
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
        throw new Error(`Divlab neither merged nor refused pull request ${number} in ${project}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    const issues = await this.settled(project, "ready");
    return issues.flatMap((issue) => {
      const role = labelValue(issue, "role:");
      const module = labelValue(issue, "module:");
      if (role === undefined || module === undefined) return [];
      const feedbackSignal = issue.body?.match(/^Feedback signal: (.+)$/m)?.[1];
      return [
        {
          role: roleNameOf(role),
          module,
          ...(feedbackSignal ? { feedbackSignal: signalName(feedbackSignal) } : {}),
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
    const deadline = Date.now() + 30_000;
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
      await new Promise((resolve) => setTimeout(resolve, 500));
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
    return issues.filter(
      (issue) => issue.pull_request === undefined && (label !== "escalation" || !notRouting(issue)),
    );
  }
}

type Listing = "ready" | "escalation" | "done" | "notAccepted";

/** The App ID of Divlab Sandbox, the sandbox's GitHub App (CONTRIBUTING.md). Not a secret. */
const DIVLAB_APP_ID = 5414648;

/** The project template's workflows: one for members' pull requests, one for pushes to main. */
const TEMPLATE_WORKFLOWS = ["anarres.yml", "divlab-pull-request.yml"];

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
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
};

/** How long Divlab may take to decide on a pull request, within a step's timeout. */
const RUN_FINISH_LIMIT = 240_000;

/** Shared by every scenario in a run: they all use the run's one repository, one at a time. */
const run = {
  created: [] as { github: GitHubApi; path: string }[],
  /** What GitHub should show once its issue lists catch up with Divlab's writes. */
  expected: new Map<string, Record<Listing, number>>(),
  /** The tasks merged work has closed, which a lagging list may still show as ready. */
  closed: new Set<string>(),
  /** The pull requests members' work was submitted in. */
  submitted: [] as { project: string; number: number; feedbackSignal: string; merged: boolean }[],
};

const issueKey = (project: string, number: number) => `${project}#${number}`;

const LISTINGS: Record<Listing, [label: string, state: "open" | "all"]> = {
  ready: ["state:ready", "open"],
  escalation: ["escalation", "all"],
  done: ["state:done", "all"],
  notAccepted: ["not-accepted", "all"],
};

const labelValue = (issue: Issue, prefix: string) =>
  issue.labels.find((label) => label.name.startsWith(prefix))?.name.slice(prefix.length);
