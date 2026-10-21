import type {
  EventLog,
  PostedTask,
  PullRequests,
  Repository,
  RoutingEvent,
  TaskBoard,
} from "@anarres/divlab";
import {
  commentForRefusal,
  eventFile,
  issueForAlert,
  issueForModuleDone,
  issueForTask,
  issueNumber,
  type ListedIssue,
  logFrom,
  type NewIssue,
  taskFromIssue,
} from "./representation.ts";
import { requestGitHub } from "./request.ts";

/**
 * Divlab's task board, event log, merged files and members' pull requests on GitHub: each project is a repository owned
 * by `owner`. The only code that calls the GitHub API on Divlab's behalf.
 */
export class GitHubAdapter implements TaskBoard, EventLog, Repository, PullRequests {
  constructor(private readonly options: { owner: string; token: string }) {}

  async post(task: PostedTask): Promise<void> {
    await this.openIssue(task.project, issueForTask(task));
  }

  async alertCoordinators(alert: RoutingEvent): Promise<void> {
    await this.openIssue(alert.project, issueForAlert(alert));
  }

  async markModuleDone({ project, module }: { project: string; module: string }): Promise<void> {
    const { number } = await this.openIssue(project, issueForModuleDone(module));
    await this.call("PATCH", `${this.repo(project)}/issues/${number}`, { state: "closed" });
  }

  async task(project: string, task: string): Promise<{ researchFor?: string } | undefined> {
    const number = issueNumber(task);
    if (number === undefined) return undefined;
    const { status, data } = await this.request<ListedIssue>(
      "GET",
      `${this.repo(project)}/issues/${number}`,
    );
    if (status === 404) return undefined;
    if (status !== 200) throw new GitHubError("GET", `issue ${number}`, status, data);
    return taskFromIssue(data);
  }

  async close(project: string, task: string): Promise<void> {
    const number = issueNumber(task);
    if (number === undefined) return;
    await this.call("PATCH", `${this.repo(project)}/issues/${number}`, { state: "closed" });
  }

  async feedbackSignals(project: string): Promise<string[]> {
    const { status, data } = await this.request<{ path: string; type: string }[]>(
      "GET",
      `${this.repo(project)}/contents/feedback`,
    );
    if (status === 404) return [];
    if (status !== 200) throw new GitHubError("GET", "feedback", status, data);
    return data.filter((entry) => entry.type === "file").map((entry) => entry.path);
  }

  async readFile(project: string, path: string): Promise<string> {
    const { content } = await this.call<{ content: string }>(
      "GET",
      `${this.repo(project)}/contents/${path}`,
    );
    return Buffer.from(content, "base64").toString("utf8");
  }

  async append(event: RoutingEvent): Promise<void> {
    const sequence = (await this.eventPaths(event.project)).length + 1;
    const { path, content } = eventFile(event, sequence);
    // Creating a file that already exists fails, so two runs cannot both take this number.
    await this.call("PUT", `${this.repo(event.project)}/contents/${path}`, {
      message: `Divlab: routing event ${sequence}`,
      content: Buffer.from(content).toString("base64"),
    });
  }

  /**
   * The whole event log. The files are listed with the REST API, which reflects writes at once,
   * and their contents fetched in one GraphQL request, which can lag behind writes. Divlab's
   * decisions (re-run counts above all) must never rest on a log missing its latest events, so
   * the read waits for GraphQL to hold every listed file, and fails rather than return less.
   */
  async read(project: string): Promise<RoutingEvent[]> {
    const listed = (await this.eventPaths(project)).map((path) => path.slice("events/".length));
    if (listed.length === 0) return [];
    for (let attempt = 1; ; attempt++) {
      const log = logFrom(listed, await this.eventTexts(project));
      if (log) return log;
      if (attempt === LOG_ATTEMPTS) {
        throw new GitHubError("POST", "graphql (event log)", 200, "the log lags behind its files");
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  /** Every event file's text, by name, in one GraphQL request. */
  private async eventTexts(project: string): Promise<Map<string, string>> {
    const { data, errors } = await this.call<{
      data?: {
        repository?: { object?: { entries?: { name: string; object?: { text?: string } }[] } };
      };
      errors?: unknown[];
    }>(
      "POST",
      "graphql",
      {
        query: `query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: "HEAD:events") { ... on Tree { entries { name object { ... on Blob { text } } } } }
          }
        }`,
        variables: { owner: this.options.owner, name: project },
      },
      { repeatable: true },
    );
    // GraphQL reports failure inside a successful answer; treat it as the failure it is.
    if (errors?.length || !data?.repository) {
      throw new GitHubError("POST", "graphql (event log)", 200, errors ?? "no such repository");
    }
    return new Map(
      (data.repository.object?.entries ?? []).map((entry) => [
        entry.name,
        entry.object?.text ?? "",
      ]),
    );
  }

  async head(project: string, pullRequest: string): Promise<string> {
    const { head } = await this.call<{ head: { sha: string } }>(
      "GET",
      `${this.repo(project)}/pulls/${pullRequest}`,
    );
    return head.sha;
  }

  /**
   * What the pull request changes, as text read through the API; nothing is checked out. Each
   * file is read from the project's own copy of the pull request's commits, never by following a
   * link the pull request supplies.
   */
  async changedFiles(
    project: string,
    pullRequest: string,
  ): Promise<{ path: string; text: string }[]> {
    const files: { path: string; text: string }[] = [];
    for (let page = 1; ; page++) {
      const listed = await this.call<{ filename: string; status: string; sha: string }[]>(
        "GET",
        `${this.repo(project)}/pulls/${pullRequest}/files?per_page=100&page=${page}`,
      );
      for (const file of listed) {
        if (file.status === "removed") continue;
        const { content } = await this.call<{ content: string }>(
          "GET",
          `${this.repo(project)}/git/blobs/${file.sha}`,
        );
        files.push({ path: file.filename, text: Buffer.from(content, "base64").toString("utf8") });
      }
      if (listed.length < 100) return files;
    }
  }

  /** GitHub refuses the merge if the pull request has moved on from `head`. */
  async merge(project: string, pullRequest: string, head: string): Promise<void> {
    await this.call("PUT", `${this.repo(project)}/pulls/${pullRequest}/merge`, {
      sha: head,
      merge_method: "squash",
    });
  }

  async refuse(project: string, pullRequest: string, reason: string): Promise<void> {
    await this.call("POST", `${this.repo(project)}/issues/${pullRequest}/comments`, {
      body: commentForRefusal(reason),
    });
  }

  /** The event files, oldest first. */
  private async eventPaths(project: string): Promise<string[]> {
    const { status, data } = await this.request<{ name: string; path: string }[]>(
      "GET",
      `${this.repo(project)}/contents/events`,
    );
    if (status === 404) return [];
    if (status !== 200) throw new GitHubError("GET", "events", status, data);
    return data
      .filter((file) => EVENT_FILE.test(file.name))
      .map((file) => file.path)
      .sort();
  }

  private openIssue(project: string, issue: NewIssue): Promise<{ number: number }> {
    return this.call("POST", `${this.repo(project)}/issues`, issue);
  }

  private repo(project: string): string {
    return `repos/${this.options.owner}/${project}`;
  }

  private async call<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { repeatable?: boolean },
  ): Promise<T> {
    const { status, data } = await this.request<T>(method, path, body, options);
    if (status < 200 || status >= 300) throw new GitHubError(method, path, status, data);
    return data;
  }

  private request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { repeatable?: boolean },
  ) {
    return requestGitHub<T>(this.options.token, method, path, body, options);
  }
}

const EVENT_FILE = /^\d{6}\.json$/;

/** How many times to ask GraphQL for a log that has caught up with its files, a second apart. */
const LOG_ATTEMPTS = 10;

class GitHubError extends Error {
  constructor(method: string, path: string, status: number, data: unknown) {
    super(`GitHub ${method} ${path} answered ${status}: ${JSON.stringify(data)}`);
  }
}
