import type {
  ClaimedTask,
  ClaimRefused,
  EventLog,
  FinishedModule,
  LogEvent,
  NotAccepted,
  PostedTask,
  ProjectRepositories,
  PullRequests,
  Repository,
  RoutingEvent,
  TaskBoard,
} from "@anarres/divlab";
import {
  commentForClaimRefusal,
  commentForRefusal,
  decisionOf,
  eventFile,
  issueForAlert,
  issueForModuleDone,
  issueForNotAccepted,
  issueForTask,
  issueForUnprotectedMain,
  issueNumber,
  isTask,
  type ListedIssue,
  labelsWhenClaimed,
  logFrom,
  type NewIssue,
  policyAllowingDivlabChecks,
  postedByDivlab,
  protectsMain,
  rulesetProtectingMain,
  taskFromIssue,
  UNPROTECTED_MAIN,
} from "./representation.ts";
import { requestGitHub } from "./request.ts";

/**
 * Divlab's task board, event log, merged files and members' pull requests on GitHub: each project is a repository owned
 * by `owner`. The only code that calls the GitHub API on Divlab's behalf.
 */
export class GitHubAdapter
  implements TaskBoard, EventLog, Repository, PullRequests, ProjectRepositories
{
  /**
   * `app`: Divlab's GitHub App, needed only to set projects up. `request`: how requests reach
   * GitHub; the real API unless a test stands in for it.
   */
  constructor(
    private readonly options: { owner: string; token: string; app?: number; request?: Request },
  ) {}

  /** How many events each project's log held when this run last read it. */
  private readonly eventsRead = new Map<string, number>();

  async protectMain(project: string): Promise<void> {
    if (this.options.app === undefined) throw new Error("Protecting main needs Divlab's App");
    await this.call(
      "POST",
      `${this.repo(project)}/rulesets`,
      rulesetProtectingMain(this.options.app),
    );
  }

  async allowDivlabChecks(project: string): Promise<void> {
    await this.call("POST", `${this.repo(project)}/actions/policies`, policyAllowingDivlabChecks());
  }

  async post(task: PostedTask): Promise<void> {
    await this.openIssue(task.project, issueForTask(task));
  }

  async alertCoordinators(alert: RoutingEvent): Promise<void> {
    await this.openIssue(alert.project, issueForAlert(alert));
  }

  async alertNotAccepted(record: NotAccepted): Promise<void> {
    await this.openIssue(record.project, issueForNotAccepted(record));
  }

  async alertUnprotectedMain(project: string): Promise<void> {
    await this.openIssue(project, issueForUnprotectedMain());
  }

  async unprotectedMainAlertOpen(project: string): Promise<boolean> {
    const open = await this.call<unknown[]>(
      "GET",
      `${this.repo(project)}/issues?labels=${UNPROTECTED_MAIN}&state=open&per_page=1`,
    );
    return open.length > 0;
  }

  /** The rules GitHub applies to main now, whoever set them: readable with metadata access. */
  async mainIsProtected(project: string): Promise<boolean> {
    const rules = await this.call<{ type: string }[]>(
      "GET",
      `${this.repo(project)}/rules/branches/main`,
    );
    return protectsMain(rules);
  }

  async markModuleDone(done: FinishedModule): Promise<void> {
    const { project } = done;
    const { number } = await this.openIssue(project, issueForModuleDone(done));
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
    if (!isTask(data)) return undefined;
    return taskFromIssue(data);
  }

  async close(project: string, task: string): Promise<void> {
    const number = issueNumber(task);
    if (number === undefined) return;
    await this.call("PATCH", `${this.repo(project)}/issues/${number}`, { state: "closed" });
  }

  async markClaimed(claim: ClaimedTask): Promise<void> {
    const issue = `${this.repo(claim.project)}/issues/${claim.task}`;
    const listed = await this.call<ListedIssue>("GET", issue);
    await this.call("PATCH", issue, {
      labels: labelsWhenClaimed(listed),
      assignees: [claim.member],
    });
  }

  async comments(project: string, task: string): Promise<{ member: string; text: string }[]> {
    const comments: { member: string; text: string }[] = [];
    for (let page = 1; ; page++) {
      const listed = await this.call<{ user: { login: string }; body: string }[]>(
        "GET",
        `${this.repo(project)}/issues/${task}/comments?per_page=100&page=${page}`,
      );
      comments.push(
        ...listed.map((comment) => ({ member: comment.user.login, text: comment.body })),
      );
      if (listed.length < 100) return comments;
    }
  }

  async refuseClaim(refusal: ClaimRefused): Promise<void> {
    await this.call("POST", `${this.repo(refusal.project)}/issues/${refusal.task}/comments`, {
      body: commentForClaimRefusal(refusal),
    });
  }

  async actedOn(project: string): Promise<string[]> {
    const issues: (ListedIssue & { body: string | null })[] = [];
    for (let page = 1; ; page++) {
      const listed = await this.call<(ListedIssue & { body: string | null })[]>(
        "GET",
        `${this.repo(project)}/issues?state=all&per_page=100&page=${page}`,
      );
      issues.push(...listed);
      if (listed.length < 100) break;
    }
    // Anyone may open an issue, but only those who triage can label one, as Divlab does.
    return issues.filter(postedByDivlab).flatMap((issue) => decisionOf(issue.body ?? "") ?? []);
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

  /**
   * Numbered from the log as this run last saw it, so recording an event is one request. Creating a
   * file that already exists fails, so two runs cannot both take a number: when another run has
   * taken it, the event is numbered from the log as it stands.
   */
  async append(event: LogEvent): Promise<void> {
    const seen = this.eventsRead.get(event.project);
    if (seen !== undefined && (await this.createEvent(event, seen + 1)) === "created") return;
    const sequence = (await this.eventFiles(event.project)).length + 1;
    if ((await this.createEvent(event, sequence)) === "taken") {
      throw new GitHubError(
        "PUT",
        `event ${sequence}`,
        NUMBER_TAKEN,
        "another run took its number",
      );
    }
  }

  /** Creates the event's file, numbered `sequence`: "taken" if that file exists already. */
  private async createEvent(event: LogEvent, sequence: number): Promise<"created" | "taken"> {
    const { path, content } = eventFile(event, sequence);
    const put = `${this.repo(event.project)}/contents/${path}`;
    const { status, data } = await this.request("PUT", put, {
      message: `Divlab: routing event ${sequence}`,
      content: Buffer.from(content).toString("base64"),
    });
    if (status === NUMBER_TAKEN) return "taken";
    if (status < 200 || status >= 300) throw new GitHubError("PUT", put, status, data);
    this.eventsRead.set(event.project, sequence);
    return "created";
  }

  /**
   * The whole event log. The files are listed with the REST API, which reflects writes at once,
   * and their contents fetched with GraphQL, a part at a time, which can lag behind writes.
   * Divlab's decisions (re-run counts above all) must never rest on a log missing its latest
   * events, so the read waits for GraphQL to hold every listed file, and fails rather than return
   * less.
   */
  async read(project: string): Promise<LogEvent[]> {
    const listed = await this.eventFiles(project);
    this.eventsRead.set(project, listed.length);
    if (listed.length === 0) return [];
    for (let attempt = 1; ; attempt++) {
      const texts = new Map<string, string>();
      for (let start = 0; start < listed.length; start += TEXTS_PER_REQUEST) {
        for (const [name, text] of await this.eventTexts(
          project,
          listed.slice(start, start + TEXTS_PER_REQUEST),
        )) {
          texts.set(name, text);
        }
      }
      const log = logFrom(
        listed.map((file) => file.name),
        texts,
      );
      if (log) return log;
      if (attempt === LOG_ATTEMPTS) {
        throw new GitHubError("POST", "graphql (event log)", 200, "the log lags behind its files");
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  /**
   * The text of these event files, by name, in one GraphQL request, asked for by their Git object
   * IDs as variables. A file GraphQL does not hold yet is left out.
   */
  private async eventTexts(project: string, files: EventFile[]): Promise<Map<string, string>> {
    const { data, errors } = await this.call<{
      data?: { repository?: Record<string, { text?: string } | null> };
      errors?: unknown[];
    }>(
      "POST",
      "graphql",
      {
        query: `query($owner: String!, $name: String!, ${files.map((_, i) => `$o${i}: GitObjectID!`).join(", ")}) {
          repository(owner: $owner, name: $name) {
            ${files.map((_, i) => `e${i}: object(oid: $o${i}) { ... on Blob { text } }`).join("\n            ")}
          }
        }`,
        variables: {
          owner: this.options.owner,
          name: project,
          ...Object.fromEntries(files.map((file, i) => [`o${i}`, file.sha])),
        },
      },
      { repeatable: true },
    );
    // GraphQL reports failure inside a successful answer; treat it as the failure it is.
    if (errors?.length || !data?.repository) {
      throw new GitHubError("POST", "graphql (event log)", 200, errors ?? "no such repository");
    }
    const { repository } = data;
    return new Map(
      files.flatMap((file, i) => {
        const text = repository[`e${i}`]?.text;
        return text === undefined ? [] : [[file.name, text]];
      }),
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

  /**
   * The event files, oldest first. Listed from main's Git tree: GitHub's contents listing stops at
   * 1,000 files, which would leave a busy project's log read in part.
   */
  private async eventFiles(project: string): Promise<EventFile[]> {
    const root = await this.wholeTree(project, "main");
    const events = root.find((entry) => entry.path === "events" && entry.type === "tree");
    if (!events) return [];
    const tree = await this.wholeTree(project, events.sha);
    return tree
      .filter((entry) => EVENT_FILE.test(entry.path))
      .map((entry) => ({ name: entry.path, sha: entry.sha }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** A Git tree's entries, all of them: decisions must never rest on part of the log. */
  private async wholeTree(project: string, tree: string): Promise<GitTree["tree"]> {
    const listed = await this.call<GitTree>("GET", `${this.repo(project)}/git/trees/${tree}`);
    if (listed.truncated) {
      throw new GitHubError("GET", `tree ${tree}`, 200, "GitHub listed the tree in part");
    }
    return listed.tree;
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
    const request = this.options.request ?? requestGitHub;
    return request<T>(this.options.token, method, path, body, options);
  }
}

/** One request to GitHub, answered with its status and parsed body. */
export type Request = typeof requestGitHub;

const EVENT_FILE = /^\d{6}\.json$/;

type GitTree = { tree: { path: string; type: string; sha: string }[]; truncated: boolean };
type EventFile = { name: string; sha: string };

/**
 * How many event files' text to ask GraphQL for at once. Asked for 1,001 in one request, GitHub
 * failed (sandbox, 2026-10-22); where it starts failing is not known, so this stays cautious.
 */
/** GitHub's answer to creating a file that exists already: another run took the event's number. */
const NUMBER_TAKEN = 422;

const TEXTS_PER_REQUEST = 100;

/** How many times to ask GraphQL for a log that has caught up with its files, a second apart. */
const LOG_ATTEMPTS = 10;

class GitHubError extends Error {
  constructor(method: string, path: string, status: number, data: unknown) {
    super(`GitHub ${method} ${path} answered ${status}: ${JSON.stringify(data)}`);
  }
}
