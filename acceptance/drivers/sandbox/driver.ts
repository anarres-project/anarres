import { onWorkAccepted, type RoutingEvent } from "@anarres/divlab";
import { GitHubAdapter } from "@anarres/github";
import type {
  AcceptedWork,
  CoordinatorAlert,
  Driver,
  ReadyTask,
  RoutingRecord,
} from "../driver.ts";
import { inScenarioWords, roleId, roleNameOf, workAccepted } from "../scenario-words.ts";
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

  constructor() {
    const { ANARRES_SANDBOX_ORG: org, ANARRES_SANDBOX_TOKEN: token } = process.env;
    if (!org || !token) {
      throw new Error("The sandbox driver needs ANARRES_SANDBOX_ORG and ANARRES_SANDBOX_TOKEN");
    }
    this.org = org;
    this.github = new GitHubApi(token);
    this.divlab = new GitHubAdapter({ owner: org, token });
  }

  /** Creates the run's repository the first time a scenario asks for it. */
  async createProject(project: string, _modules: string[]): Promise<void> {
    if (run.expected.has(project)) return;
    await this.github.call("POST", `orgs/${this.org}/repos`, {
      name: project,
      private: true,
      auto_init: true,
    });
    run.created.push({ github: this.github, path: `repos/${this.org}/${project}` });
    run.expected.set(project, { ready: 0, escalation: 0, done: 0 });
  }

  async acceptWork(work: AcceptedWork): Promise<void> {
    // Merging the member's pull request closes the task it names, then Divlab acts on the merge.
    const fromRole = roleId(work.role);
    const task = (await this.settled(work.project, "ready")).find(
      (issue) =>
        labelValue(issue, "role:") === fromRole && labelValue(issue, "module:") === work.module,
    );
    if (task) {
      await this.github.call("PATCH", `repos/${this.org}/${work.project}/issues/${task.number}`, {
        state: "closed",
      });
    }
    const researchFor = task && labelValue(task, "research-for:");
    await onWorkAccepted(workAccepted(work, researchFor), this.divlab, this.divlab);
    // The event log is consistent at once and says what Divlab did; the issue lists lag behind.
    const expected = this.expectedFor(work.project);
    const { decision } = (await this.divlab.read(work.project)).at(-1) as RoutingEvent;
    if (task) expected.ready -= 1;
    if ("tasks" in decision) expected.ready += decision.tasks.length;
    if ("alert" in decision) expected.escalation += 1;
    if ("moduleDone" in decision) expected.done += 1;
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    const issues = await this.settled(project, "ready");
    return issues.flatMap((issue) => {
      const role = labelValue(issue, "role:");
      const module = labelValue(issue, "module:");
      if (role === undefined || module === undefined) return [];
      const feedbackSignal = issue.body?.match(/^Feedback signal: (.+)$/m)?.[1];
      return [{ role: roleNameOf(role), module, ...(feedbackSignal ? { feedbackSignal } : {}) }];
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
        return names.map((name) =>
          inScenarioWords(JSON.parse(texts.get(name) ?? "null") as RoutingEvent),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  /** Deletes the repositories this run created. */
  static async disposeRun(): Promise<void> {
    for (const { github, path } of run.created.splice(0)) await github.request("DELETE", path);
  }

  /** The issues in a listing, once GitHub shows as many as Divlab's event log says it should. */
  private async settled(project: string, listing: Listing): Promise<Issue[]> {
    const [label, state] = LISTINGS[listing];
    const deadline = Date.now() + 30_000;
    for (;;) {
      const issues = await this.issues(project, label, state);
      if (issues.length === this.expectedFor(project)[listing] || Date.now() > deadline) {
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
    return issues.filter((issue) => issue.pull_request === undefined);
  }
}

type Listing = "ready" | "escalation" | "done";

/** Shared by every scenario in a run: they all use the run's one repository, one at a time. */
const run = {
  created: [] as { github: GitHubApi; path: string }[],
  /** What GitHub should show once its issue lists catch up with Divlab's writes. */
  expected: new Map<string, Record<Listing, number>>(),
};

const LISTINGS: Record<Listing, [label: string, state: "open" | "all"]> = {
  ready: ["state:ready", "open"],
  escalation: ["escalation", "all"],
  done: ["state:done", "all"],
};

const labelValue = (issue: Issue, prefix: string) =>
  issue.labels.find((label) => label.name.startsWith(prefix))?.name.slice(prefix.length);
