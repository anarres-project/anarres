import type {
  AcceptedWork,
  CoordinatorAlert,
  Driver,
  ReadyTask,
  RoutingRecord,
} from "../driver.ts";
import { NotYetImplemented } from "../errors.ts";
import { roleNameOf } from "../scenario-words.ts";
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
  private readonly org: string;
  private readonly created: string[] = [];

  constructor() {
    const { ANARRES_SANDBOX_ORG: org, ANARRES_SANDBOX_TOKEN: token } = process.env;
    if (!org || !token) {
      throw new Error("The sandbox driver needs ANARRES_SANDBOX_ORG and ANARRES_SANDBOX_TOKEN");
    }
    this.org = org;
    this.github = new GitHubApi(token);
  }

  async createProject(project: string, _modules: string[]): Promise<void> {
    await this.github.call("POST", `orgs/${this.org}/repos`, {
      name: project,
      private: true,
      auto_init: true,
    });
    this.created.push(project);
  }

  async acceptWork(_work: AcceptedWork): Promise<void> {
    throw new NotYetImplemented("Divlab acting on GitHub");
  }

  async readyTasks(project: string): Promise<ReadyTask[]> {
    const issues = await this.issues(project, "state:ready", "open");
    return issues.flatMap((issue) => {
      const role = labelValue(issue, "role:");
      const module = labelValue(issue, "module:");
      if (role === undefined || module === undefined) return [];
      const feedbackSignal = issue.body?.match(/^Feedback signal: (.+)$/m)?.[1];
      return [{ role: roleNameOf(role), module, ...(feedbackSignal ? { feedbackSignal } : {}) }];
    });
  }

  async coordinatorAlerts(project: string): Promise<CoordinatorAlert[]> {
    throw new NotYetImplemented(`reading ${project}'s escalation issues`);
  }

  async doneModules(project: string): Promise<string[]> {
    throw new NotYetImplemented(`reading ${project}'s finished modules`);
  }

  async routingRecords(project: string): Promise<RoutingRecord[]> {
    throw new NotYetImplemented(`reading ${project}'s event log`);
  }

  /** Deletes the repositories this scenario created. */
  async dispose(): Promise<void> {
    for (const project of this.created.splice(0)) {
      await this.github.request("DELETE", `repos/${this.org}/${project}`);
    }
  }

  private async issues(project: string, label: string, state: "open" | "all"): Promise<Issue[]> {
    const issues = await this.github.call<Issue[]>(
      "GET",
      `repos/${this.org}/${project}/issues?labels=${encodeURIComponent(label)}&state=${state}&per_page=100`,
    );
    return issues.filter((issue) => issue.pull_request === undefined);
  }
}

const labelValue = (issue: Issue, prefix: string) =>
  issue.labels.find((label) => label.name.startsWith(prefix))?.name.slice(prefix.length);
