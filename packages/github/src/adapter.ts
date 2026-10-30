import {
  MODULES_FILE,
  readTestReport,
  readToolchain,
  TEST_REPORT_LIMIT,
  TEST_REPORT_TOO_LARGE,
  type TestReport,
  type Toolchain,
  underWay,
} from "@anarres/core";
import type {
  ChangedOnMain,
  ChangeNotByDivlab,
  ClaimedTask,
  ClaimedWithoutClaim,
  EventLog,
  FinishedModule,
  LogEvent,
  MainCommit,
  NotAccepted,
  PostedTask,
  ProjectRepositories,
  PullRequests,
  Refused,
  Repository,
  RoutingEvent,
  TaskBoard,
} from "@anarres/divlab";
import { CLAIM, RELEASE } from "@anarres/divlab";
import { strFromU8, unzipSync } from "fflate";
import { MERGE_IN_PROGRESS } from "./rate-limits.ts";
import {
  CLAIMED,
  commentForLeaseRanOut,
  commentForRefusal,
  commentForRefused,
  decisionOf,
  eventFile,
  issueForAlert,
  issueForChangeNotByDivlab,
  issueForClaimedWithoutClaim,
  issueForModuleDone,
  issueForNotAccepted,
  issueForTask,
  issueForUnprotectedMain,
  issueForUnreadableReviewList,
  issueNumber,
  isTask,
  type ListedIssue,
  labelsWhenClaimed,
  labelsWhenReleased,
  logFrom,
  type NewIssue,
  policyAllowingDivlabChecks,
  postedByDivlab,
  protectsMain,
  READY,
  reasonOfRefusal,
  rulesetProtectingMain,
  taskFromIssue,
  UNPROTECTED_MAIN,
  UNREADABLE_REVIEW_LIST,
} from "./representation.ts";
import { type Download, downloadGitHub, requestGitHub } from "./request.ts";

/**
 * Divlab's task board, event log, merged files and members' pull requests on GitHub: each project is a repository owned
 * by `owner`. The only code that calls the GitHub API on Divlab's behalf.
 */
/** A commit as GitHub lists it: only what Divlab reads. */
type ListedCommit = {
  sha: string;
  author: { login: string } | null;
  committer: { login: string } | null;
  commit: { verification?: { verified: boolean } };
};

/**
 * A commit as Divlab judges it. GitHub signs, as `web-flow`, the commits it makes for an
 * account through its API or website; a member's own signature on their commit is not GitHub's.
 */
const mainCommit = (listed: ListedCommit): MainCommit => ({
  sha: listed.sha,
  author: listed.author?.login,
  signedByGitHub:
    listed.committer?.login === "web-flow" && listed.commit.verification?.verified === true,
});

/** Where PDC coordinators keep members' trust levels and linked accounts (decision 0007). */
const GOVERNANCE_REPOSITORY = "anarres-project/anarres";
const GOVERNANCE_FILE = "governance/members.json";

/** The most files GitHub lists of a comparison of two commits. */
const COMPARED_FILES = 300;

/** How many times to ask for a write GitHub's server failed without carrying out, a merge included. */
const WRITE_ATTEMPTS = 3;

/** Where the project's checks workflow lives, as the template has it (decision 0010). */
const CHECKS_WORKFLOW = ".github/workflows/checks.yml";

/** What Divlab says when the project's checks left no report to read. */
const NO_TEST_REPORT = { unreadable: "the project's checks left no test report" };

/** The artefact the checks workflow leaves its test report in (decision 0011). */
export const TEST_REPORT = "test-report";

/** The name of the project's own check, as the template's checks workflow gives it (decision 0010). */
export const PROJECT_CHECK = "project-tests";

export class GitHubAdapter
  implements TaskBoard, EventLog, Repository, PullRequests, ProjectRepositories
{
  /**
   * `app`: Divlab's GitHub App, needed only to set projects up. `request` and `download`: how
   * requests and downloads reach GitHub; the real API unless a test stands in for it.
   */
  constructor(
    private readonly options: {
      owner: string;
      token: string;
      app?: number;
      request?: Request;
      download?: Download;
      /** Where the governance file is, if the organisation names a repository of its own. */
      governance?: string;
      /**
       * The adapter serves one Divlab run, so may keep the event log it reads: Divlab's runs on a
       * project take turns, and nothing else records events.
       */
      oneRun?: boolean;
    },
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
    await this.openIssue(task.project, issueForTask(task, `${this.options.owner}/${task.project}`));
  }

  async alertCoordinators(alert: RoutingEvent): Promise<void> {
    await this.openIssue(alert.project, issueForAlert(alert));
  }

  async alertChangeNotByDivlab(change: ChangeNotByDivlab): Promise<void> {
    await this.openIssue(change.project, issueForChangeNotByDivlab(change));
  }

  async alertClaimedWithoutClaim(alert: ClaimedWithoutClaim): Promise<void> {
    await this.openIssue(alert.project, issueForClaimedWithoutClaim(alert));
  }

  async alertNotAccepted(record: NotAccepted): Promise<void> {
    await this.openIssue(record.project, issueForNotAccepted(record));
  }

  async alertUnprotectedMain(project: string): Promise<void> {
    await this.openIssue(project, issueForUnprotectedMain());
  }

  async unprotectedMainAlertOpen(project: string): Promise<boolean> {
    return this.alertOpen(project, UNPROTECTED_MAIN);
  }

  /** Whether an alert under the label is open: coordinators close it once it is dealt with. */
  private async alertOpen(project: string, label: string): Promise<boolean> {
    const open = await this.call<unknown[]>(
      "GET",
      `${this.repo(project)}/issues?labels=${label}&state=open&per_page=1`,
    );
    return open.length > 0;
  }

  async alertUnreadableReviewList(project: string): Promise<void> {
    await this.openIssue(project, issueForUnreadableReviewList());
  }

  async unreadableReviewListAlertOpen(project: string): Promise<boolean> {
    return this.alertOpen(project, UNREADABLE_REVIEW_LIST);
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
    await this.closeIssue(project, number);
  }

  async task(project: string, task: string): Promise<ReturnType<typeof taskFromIssue>> {
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
    await this.closeIssue(project, number);
  }

  /** Closing an issue closed already leaves it closed, so it is safe to repeat. */
  private async closeIssue(project: string, number: number): Promise<void> {
    await this.call(
      "PATCH",
      `${this.repo(project)}/issues/${number}`,
      { state: "closed" },
      { repeatable: true },
    );
  }

  async markClaimed(claim: ClaimedTask): Promise<void> {
    const issue = `${this.repo(claim.project)}/issues/${claim.task}`;
    const listed = await this.call<ListedIssue>("GET", issue);
    await this.call(
      "PATCH",
      issue,
      { labels: labelsWhenClaimed(listed), assignees: [claim.member] },
      { repeatable: true },
    );
  }

  async tellLeaseRanOut(ranOut: ClaimedTask): Promise<void> {
    await this.comment(ranOut.project, ranOut.task, commentForLeaseRanOut(ranOut));
  }

  async releaseClaim(project: string, task: string): Promise<void> {
    const issue = `${this.repo(project)}/issues/${task}`;
    const listed = await this.call<ListedIssue>("GET", issue);
    await this.call(
      "PATCH",
      issue,
      { labels: labelsWhenReleased(listed), assignees: [] },
      { repeatable: true },
    );
  }

  /**
   * The project's tasks ready to claim, each read as Divlab reads a task: as data. Its work is
   * under way when Divlab posted it for a feedback signal: a revision, a continuation or research.
   */
  async readyTasks(project: string): Promise<ReadyTask[]> {
    const issues = await this.everyPage<ListedIssue & { number: number; created_at: string }>(
      `${this.repo(project)}/issues?labels=${encodeURIComponent(READY)}&state=open`,
    );
    return issues.flatMap((issue) => {
      const task = isTask(issue) ? taskFromIssue(issue) : undefined;
      if (task === undefined) return [];
      const { role, module } = task;
      return [
        {
          id: String(issue.number),
          role,
          module,
          underWay: underWay(task),
          posted: issue.created_at,
        },
      ];
    });
  }

  /** The project's tasks its issues show as claimed, whoever marked them, each read as data. */
  async claimedTasks(project: string) {
    const issues = await this.everyPage<ListedIssue & { number: number }>(
      `${this.repo(project)}/issues?labels=${encodeURIComponent(CLAIMED)}&state=open`,
    );
    return issues.flatMap((issue) => {
      const task = isTask(issue) ? taskFromIssue(issue) : undefined;
      if (task === undefined) return [];
      const { role, module, claimedBy } = task;
      return [{ task: String(issue.number), role, module, ...(claimedBy ? { claimedBy } : {}) }];
    });
  }

  async heldTasks(
    project: string,
    member: string,
  ): Promise<{ id: string; role: string; module: string }[]> {
    const issues = await this.everyPage<ListedIssue & { number: number }>(
      `${this.repo(project)}/issues?labels=${encodeURIComponent(CLAIMED)}&assignee=${encodeURIComponent(member)}&state=open`,
    );
    return issues.flatMap((issue) => {
      const task = isTask(issue) ? taskFromIssue(issue) : undefined;
      // Held as Divlab reads it: the member its claimed task names, not any assignee.
      return task?.claimedBy === member
        ? [{ id: String(issue.number), role: task.role, module: task.module }]
        : [];
    });
  }

  async pullRequestsOpenBy(
    project: string,
    member: string,
  ): Promise<{ number: string; task: string; draft: boolean }[]> {
    type Pull = { number: number; draft: boolean; user: { login: string }; head: { ref: string } };
    const pulls: Pull[] = [];
    for (let page = 1; ; page++) {
      const listed = await this.call<Pull[]>(
        "GET",
        `${this.repo(project)}/pulls?state=open&per_page=100&page=${page}`,
      );
      pulls.push(...listed);
      if (listed.length < 100) break;
    }
    return pulls.flatMap((pull) => {
      // The branch a member's CLI names for a task; any other branch is not one of its tasks.
      const task = pull.head.ref.match(/^anarres\/task-([1-9][0-9]{0,9})$/)?.[1];
      return task && pull.user.login === member
        ? [{ number: String(pull.number), task, draft: pull.draft }]
        : [];
    });
  }

  /**
   * The member's fork of the project: GitHub makes one, or gives the one they have. Forks are
   * made in the background, so this waits, a minute at most, until the fork has its main.
   */
  async forkOf(project: string): Promise<string> {
    const { full_name: fork } = await this.call<{ full_name: string }>(
      "POST",
      `${this.repo(project)}/forks`,
      { default_branch_only: true },
    );
    for (let check = 0; check < 30; check++) {
      const { status } = await this.request("GET", `repos/${fork}/branches/main`);
      if (status === 200) return fork;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
    throw new Error(`GitHub did not finish making the fork ${fork}`);
  }

  async branch(fork: string, name: string): Promise<void> {
    const { object } = await this.call<{ object: { sha: string } }>(
      "GET",
      `repos/${fork}/git/ref/heads/main`,
    );
    const where = `repos/${fork}/git/refs`;
    // Safe to ask again after a server error: if the first ask made it, the branch is there.
    const { status, data } = await this.request(
      "POST",
      where,
      { ref: `refs/heads/${name}`, sha: object.sha },
      { repeatable: true },
    );
    // A branch the member submitted to before, a draft's say, is kept: the work goes on it.
    if (status >= 300 && status !== 422) throw new GitHubError("POST", where, status, data);
  }

  /** A file of the member's work, on their branch: a new one, or replacing what is there. */
  async putFile(fork: string, branch: string, path: string, text: string): Promise<void> {
    const where = `repos/${fork}/contents/${path}`;
    const { status, data } = await this.request<{ sha: string }>(
      "GET",
      `${where}?ref=${encodeURIComponent(branch)}`,
    );
    await this.call("PUT", where, {
      message: path,
      content: Buffer.from(text).toString("base64"),
      branch,
      ...(status === 200 ? { sha: data.sha } : {}),
    });
  }

  /** The project is asked to merge the member's branch; one already open for it is the same ask. */
  async openPullRequest(
    project: string,
    head: string,
    title: string,
    draft: boolean,
  ): Promise<string> {
    const where = `${this.repo(project)}/pulls`;
    const { status, data } = await this.request<{ number: number }>("POST", where, {
      title,
      head,
      base: "main",
      draft,
    });
    if (status < 300) return String(data.number);
    if (status !== 422) throw new GitHubError("POST", where, status, data);
    const open = await this.call<{ number: number; draft?: boolean; node_id?: string }[]>(
      "GET",
      `${where}?head=${encodeURIComponent(head)}&state=open`,
    );
    const existing = open[0];
    if (existing === undefined) throw new GitHubError("POST", where, status, data);
    // Finished work on what was a draft: marked ready, which only GitHub's GraphQL API can do.
    if (!draft && existing.draft) {
      // GraphQL answers 200 even when it refuses: its errors say so.
      const { errors } = await this.call<{ errors?: { message: string }[] }>("POST", "graphql", {
        query:
          "mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId } }",
        variables: { id: existing.node_id },
      });
      if (errors?.length) {
        throw new Error(
          `GitHub did not mark the draft ready: ${errors.map((e) => e.message).join("; ")}`,
        );
      }
    }
    return String(existing.number);
  }

  /** The member's claim: Divlab's claim comment on the task's issue, made as the member. */
  async askToClaim(project: string, task: string): Promise<void> {
    await this.call("POST", `${this.repo(project)}/issues/${task}/comments`, { body: CLAIM });
  }

  async askToRelease(project: string, task: string): Promise<void> {
    await this.call("POST", `${this.repo(project)}/issues/${task}/comments`, { body: RELEASE });
  }

  /** The account the token acts as: the member, when it is the member's own login. */
  async account(): Promise<string> {
    const { login } = await this.call<{ login: string }>("GET", "user");
    return login;
  }

  /** The organisation's projects with a task ready to claim, from one search of its issues. */
  async names(): Promise<string[]> {
    return this.projectsFound(`label:${READY} is:open is:issue`);
  }

  async namesHeldBy(member: string): Promise<string[]> {
    return this.projectsFound(`label:${CLAIMED} assignee:${member} is:open is:issue`);
  }

  async namesContributedToBy(member: string): Promise<string[]> {
    return this.projectsFound(`author:${member} is:pr is:merged`);
  }

  /** The organisation's repositories with an issue or pull request matching, in one search. */
  private async projectsFound(matching: string): Promise<string[]> {
    const query = encodeURIComponent(`org:${this.options.owner} ${matching}`);
    const { items } = await this.call<{ items: { repository_url: string }[] }>(
      "GET",
      `search/issues?q=${query}&per_page=100`,
    );
    return [...new Set(items.map((item) => item.repository_url.split("/").at(-1) ?? ""))];
  }

  /** The governance file, as read: core checks what it says (decision 0007). */
  async governanceFile(): Promise<unknown> {
    const repository = this.options.governance || GOVERNANCE_REPOSITORY;
    const where = `repos/${repository}/contents/${GOVERNANCE_FILE}`;
    const { status, data } = await this.request<{ content: string }>("GET", where);
    if (status === 404) return undefined;
    if (status !== 200) throw new GitHubError("GET", where, status, data);
    // A file that cannot be read gives nobody any trust: core reads nothing as everyone new.
    try {
      return JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
    } catch {
      return undefined;
    }
  }

  async comments(
    project: string,
    task: string,
  ): Promise<{ member: string; text: string; at: string }[]> {
    const comments: { member: string; text: string; at: string }[] = [];
    for (let page = 1; ; page++) {
      const listed = await this.call<
        { user: { login: string } | null; body: string; created_at: string }[]
      >("GET", `${this.repo(project)}/issues/${task}/comments?per_page=100&page=${page}`);
      // A deleted account's comments remain, but GitHub names nobody for them.
      comments.push(
        ...listed.flatMap(({ user, body, created_at }) =>
          user ? [{ member: user.login, text: body, at: created_at }] : [],
        ),
      );
      if (listed.length < 100) return comments;
    }
  }

  async refuseMember(refusal: Refused): Promise<void> {
    await this.comment(refusal.project, refusal.task, commentForRefused(refusal));
  }

  /**
   * Posts Divlab's comment on an issue or pull request. Divlab may rightly say the same twice, so
   * after a server error it is the number of times said, before and after, that tells whether
   * GitHub posted it. Divlab's runs for a project never overlap, so no other run says it meanwhile.
   */
  private async comment(
    project: string,
    issue: string,
    body: string,
    before?: number,
    attempt = 1,
  ): Promise<void> {
    const where = `${this.repo(project)}/issues/${issue}/comments`;
    const said = before ?? (await this.timesSaid(where, body));
    const { status, data } = await this.request("POST", where, { body });
    if (status >= 200 && status < 300) return;
    if (status >= 500) {
      if ((await this.timesSaid(where, body)) > said) return;
      if (attempt < WRITE_ATTEMPTS) return this.comment(project, issue, body, said, attempt + 1);
    }
    throw new GitHubError("POST", where, status, data);
  }

  /**
   * How many of an issue's comments by a bot, as Divlab's App is, say `body`, read from every
   * page. A member's comment saying the same words is not Divlab's.
   */
  private async timesSaid(where: string, body: string): Promise<number> {
    let said = 0;
    for (let page = 1; ; page++) {
      const listed = await this.call<{ user: { type: string } | null; body: string }[]>(
        "GET",
        `${where}?per_page=100&page=${page}`,
      );
      said += listed.filter((c) => c.user?.type === "Bot" && c.body === body).length;
      if (listed.length < 100) return said;
    }
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
    if (seen !== undefined && (await this.createEvent(event, seen + 1)) === "created") {
      this.logRead.get(event.project)?.push(event);
      return;
    }
    // Something recorded an event since the run read the log: read it from GitHub again.
    this.logRead.delete(event.project);
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
  private async createEvent(
    event: LogEvent,
    sequence: number,
    attempt = 1,
  ): Promise<"created" | "taken"> {
    const { path, content } = eventFile(event, sequence);
    const put = `${this.repo(event.project)}/contents/${path}`;
    const { status, data } = await this.request("PUT", put, {
      message: `Divlab: routing event ${sequence}`,
      content: Buffer.from(content).toString("base64"),
    });
    if (status === NUMBER_TAKEN) return "taken";
    if (status >= 500) {
      // A server error does not say whether GitHub saved the file: the file does.
      const saved = await this.fileText(event.project, path);
      if (saved === content) {
        this.eventsRead.set(event.project, sequence);
        return "created";
      }
      // Holding another event, the file is another run's, made while GitHub failed this one.
      if (saved !== undefined) return "taken";
      if (attempt < WRITE_ATTEMPTS) return this.createEvent(event, sequence, attempt + 1);
    }
    if (status < 200 || status >= 300) throw new GitHubError("PUT", put, status, data);
    this.eventsRead.set(event.project, sequence);
    return "created";
  }

  /** A file's text on main, or undefined if there is no such file. */
  /** The toolchain anarres.yaml declares on the project's main branch, read as data. */
  async toolchain(project: string): Promise<Toolchain | undefined> {
    const text = await this.fileText(project, "anarres.yaml");
    return text === undefined ? undefined : readToolchain(text);
  }

  /** The token's hourly allowance as GitHub reads it; asking does not use any of it up. */
  async allowance(): Promise<{ used: number; limit: number; reset: number }> {
    const { resources } = await this.call<{
      resources: { core: { used: number; limit: number; reset: number } };
    }>("GET", "rate_limit");
    const { used, limit, reset } = resources.core;
    return { used, limit, reset };
  }

  /** The project's modules.yaml as it was at a commit, if it had one then (decision 0014). */
  async modulesAt(project: string, commit: string): Promise<string | undefined> {
    return this.fileText(project, `${MODULES_FILE}?ref=${encodeURIComponent(commit)}`);
  }

  async modulesOnMain(project: string): Promise<string | undefined> {
    return this.modulesAt(project, "main");
  }

  private async fileText(project: string, path: string): Promise<string | undefined> {
    const { status, data } = await this.request<{ content: string }>(
      "GET",
      `${this.repo(project)}/contents/${path}`,
    );
    if (status === 404) return undefined;
    return Buffer.from(data.content, "base64").toString("utf8");
  }

  /**
   * The whole event log. The files are listed with the REST API, which reflects writes at once,
   * and their contents fetched with GraphQL, a part at a time, which can lag behind writes.
   * Divlab's decisions (re-run counts above all) must never rest on a log missing its latest
   * events, so the read waits for GraphQL to hold every listed file, and fails rather than return
   * less.
   */
  async read(project: string): Promise<LogEvent[]> {
    // Divlab's runs on a project take turns (one concurrency group), so within a run the log
    // changes only by what the run itself records.
    const known = this.logRead.get(project);
    if (known) return known;
    const log = await this.readFromGitHub(project);
    if (this.options.oneRun) this.logRead.set(project, log);
    return log;
  }

  /** Each project's log as this run read it. */
  private readonly logRead = new Map<string, LogEvent[]>();

  private async readFromGitHub(project: string): Promise<LogEvent[]> {
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

  async pullRequest(
    project: string,
    pullRequest: string,
  ): Promise<{ head: string; draft: boolean; author: string }> {
    const { head, draft, user } = await this.call<{
      head: { sha: string };
      draft: boolean;
      user: { login: string };
    }>("GET", `${this.repo(project)}/pulls/${pullRequest}`);
    return { head: head.sha, draft, author: user.login };
  }

  async openHead(project: string, pullRequest: string): Promise<string | undefined> {
    const { state, head } = await this.call<{ state: string; head: { sha: string } }>(
      "GET",
      `${this.repo(project)}/pulls/${pullRequest}`,
    );
    return state === "open" ? head.sha : undefined;
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
  async head(project: string): Promise<string> {
    const { object } = await this.call<{ object: { sha: string } }>(
      "GET",
      `${this.repo(project)}/git/ref/heads/main`,
    );
    return object.sha;
  }

  async commitsSince(project: string, since: string): Promise<MainCommit[]> {
    // GitHub compares at most 250 commits at once: every page is read, so none goes unchecked.
    const commits: ListedCommit[] = [];
    for (let page = 1; ; page++) {
      const compared = await this.call<{ commits: ListedCommit[]; total_commits: number }>(
        "GET",
        `${this.repo(project)}/compare/${since}...main?per_page=100&page=${page}`,
      );
      commits.push(...compared.commits);
      if (compared.commits.length === 0 || commits.length >= compared.total_commits) {
        return commits.map(mainCommit);
      }
    }
  }

  /** GitHub lists at most 300 files of a comparison: as many as that may be cut short. */
  async changedOnMainSince(project: string, commit: string): Promise<ChangedOnMain> {
    const { files } = await this.call<{ files: { filename: string }[] }>(
      "GET",
      `${this.repo(project)}/compare/${commit}...main?per_page=100&page=1`,
    );
    if (files.length >= COMPARED_FILES) return { tooMany: true };
    return files.map((file) => file.filename);
  }

  async mergeCommitOf(project: string, pullRequest: string): Promise<string> {
    const { merge_commit_sha } = await this.call<{ merge_commit_sha: string }>(
      "GET",
      `${this.repo(project)}/pulls/${pullRequest}`,
    );
    return merge_commit_sha;
  }

  async merge(project: string, pullRequest: string, head: string): Promise<string> {
    const where = `${this.repo(project)}/pulls/${pullRequest}/merge`;
    for (let attempt = 1; ; attempt++) {
      const { status, data } = await this.request<{ sha: string }>(
        "PUT",
        where,
        { sha: head, merge_method: "squash" },
        { repeatable: true },
      );
      if (status >= 200 && status < 300) return data.sha;
      // Neither a server error nor a refused repeat says whether an earlier ask merged it: GitHub's
      // pull request does. If not, asking again is safe: GitHub merges only `head`, so never twice.
      const pull = await this.call<{ merged: boolean; merge_commit_sha: string }>(
        "GET",
        `${this.repo(project)}/pulls/${pullRequest}`,
      );
      if (pull.merged) return pull.merge_commit_sha;
      // A merge an earlier ask began may still be under way, as a server error may leave it.
      const inProgress = (data as { message?: string } | undefined)?.message === MERGE_IN_PROGRESS;
      if ((status < 500 && !inProgress) || attempt === WRITE_ATTEMPTS) {
        throw new GitHubError("PUT", where, status, data);
      }
    }
  }

  /** The project's own check on the commit: the template's checks workflow's run (decision 0010). */
  async check(
    project: string,
    head: string,
  ): Promise<{ state: "passed" | "failed" | "running"; url: string }> {
    const { check_runs: runs } = await this.call<{
      check_runs: {
        status: string;
        conclusion: string | null;
        html_url: string;
        app?: { slug?: string };
      }[];
    }>("GET", `${this.repo(project)}/commits/${head}/check-runs?check_name=${PROJECT_CHECK}`);
    // Only GitHub Actions' run counts: another app could give a check the same name.
    const run = runs.find((run) => run.app?.slug === "github-actions");
    const url = run?.html_url ?? "";
    if (run?.status !== "completed") return { state: "running", url };
    return { state: run.conclusion === "success" ? "passed" : "failed", url };
  }

  /**
   * The open pull requests whose head is the commit. GitHub's checks event names none for a pull
   * request from a fork, as members' are, so they are found by their head.
   */
  async openAt(project: string, commit: string): Promise<string[]> {
    const open = await this.everyPage<{ number: number; head: { sha: string } }>(
      `${this.repo(project)}/pulls?state=open`,
    );
    return open.filter((pull) => pull.head.sha === commit).map((pull) => String(pull.number));
  }

  /**
   * The test report the project's checks run left on the commit, as its artefact (decision
   * 0011). The report comes from running a member's code: it is read as data.
   */
  async testReport(
    project: string,
    head: string,
  ): Promise<
    | { state: "running"; url: string }
    | { state: "finished"; url: string; report: TestReport | { unreadable: string } }
  > {
    const { workflow_runs: runs } = await this.call<{
      workflow_runs: { id: number; path: string; status: string; html_url: string }[];
    }>("GET", `${this.repo(project)}/actions/runs?head_sha=${head}&event=pull_request`);
    const run = runs.find((run) => run.path === CHECKS_WORKFLOW);
    if (run?.status !== "completed") return { state: "running", url: run?.html_url ?? "" };
    const { artifacts } = await this.call<{
      artifacts: { id: number; name: string; size_in_bytes: number }[];
    }>("GET", `${this.repo(project)}/actions/runs/${run.id}/artifacts`);
    const artifact = artifacts.find((artifact) => artifact.name === TEST_REPORT);
    if (artifact === undefined) {
      return { state: "finished", url: run.html_url, report: NO_TEST_REPORT };
    }
    if (artifact.size_in_bytes > TEST_REPORT_LIMIT) {
      return { state: "finished", url: run.html_url, report: TEST_REPORT_TOO_LARGE };
    }
    const download = this.options.download ?? downloadGitHub;
    const zip = await download(
      this.options.token,
      `${this.repo(project)}/actions/artifacts/${artifact.id}/zip`,
    );
    // Each file's size is known before it is unpacked: one too large is never unpacked at all.
    let tooLarge = false;
    const files = unzipSync(zip, {
      filter: (file) => {
        if (file.originalSize > TEST_REPORT_LIMIT) tooLarge = true;
        return !tooLarge;
      },
    });
    if (tooLarge) return { state: "finished", url: run.html_url, report: TEST_REPORT_TOO_LARGE };
    const [xml] = Object.values(files);
    if (xml === undefined) return { state: "finished", url: run.html_url, report: NO_TEST_REPORT };
    return { state: "finished", url: run.html_url, report: readTestReport(strFromU8(xml)) };
  }

  /** GitHub's Approve reviews of the pull request: who approved, and the commit they reviewed. */
  async approvals(
    project: string,
    pullRequest: string,
  ): Promise<{ reviewer: string; commit: string }[]> {
    const reviews: { user: { login: string } | null; state: string; commit_id: string }[] = [];
    for (let page = 1; ; page++) {
      const listed = await this.call<typeof reviews>(
        "GET",
        `${this.repo(project)}/pulls/${pullRequest}/reviews?per_page=100&page=${page}`,
      );
      reviews.push(...listed);
      if (listed.length < 100) break;
    }
    return reviews.flatMap((review) =>
      review.state === "APPROVED" && review.user
        ? [{ reviewer: review.user.login, commit: review.commit_id }]
        : [],
    );
  }

  /** The reasons in Divlab's own refusals on the pull request: an App's comments, no one else's. */
  async refusalsGiven(project: string, pullRequest: string): Promise<string[]> {
    const listed = await this.call<{ user: { type: string } | null; body: string }[]>(
      "GET",
      `${this.repo(project)}/issues/${pullRequest}/comments?per_page=100&page=1`,
    );
    return listed.flatMap(({ user, body }) => {
      const reason = user?.type === "Bot" ? reasonOfRefusal(body) : undefined;
      return reason === undefined ? [] : [reason];
    });
  }

  async refuse(project: string, pullRequest: string, reason: string): Promise<void> {
    await this.comment(project, pullRequest, commentForRefusal(reason));
  }

  /**
   * The event files, oldest first. Listed from the Git tree of `events/` on main, named as
   * `main:events` in one request: GitHub's contents listing stops at 1,000 files, which would
   * leave a busy project's log read in part. No such folder (404) is a log with no events yet.
   */
  private async eventFiles(project: string): Promise<EventFile[]> {
    const where = `${this.repo(project)}/git/trees/main:events`;
    const { status, data } = await this.request<GitTree>("GET", where);
    if (status === 404) return [];
    if (status !== 200) throw new GitHubError("GET", where, status, data);
    if (data.truncated) {
      throw new GitHubError("GET", "tree main:events", 200, "GitHub listed the tree in part");
    }
    return data.tree
      .filter((entry) => EVENT_FILE.test(entry.path))
      .map((entry) => ({ name: entry.path, sha: entry.sha }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async openIssue(
    project: string,
    issue: NewIssue,
    attempt = 1,
  ): Promise<{ number: number }> {
    const where = `${this.repo(project)}/issues`;
    const { status, data } = await this.request<{ number: number }>("POST", where, issue);
    if (status >= 200 && status < 300) return data;
    if (status >= 500) {
      // A server error does not say whether GitHub opened the issue: its open issues do.
      const open = await this.call<{ number: number; title: string; body: string | null }[]>(
        "GET",
        `${where}?state=open&sort=created&direction=desc&per_page=100`,
      );
      const opened = open.find((i) => i.title === issue.title && i.body === issue.body);
      if (opened) return opened;
      if (attempt < WRITE_ATTEMPTS) return this.openIssue(project, issue, attempt + 1);
    }
    throw new GitHubError("POST", where, status, data);
  }

  /** Everything GitHub lists at `path`, read a hundred to a page until a page is not full. */
  private async everyPage<T>(path: string): Promise<T[]> {
    const all: T[] = [];
    for (let page = 1; ; page++) {
      const listed = await this.call<T[]>("GET", `${path}&per_page=100&page=${page}`);
      all.push(...listed);
      if (listed.length < 100) return all;
    }
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
/** A task ready to claim, as a member is offered it. */
export type ReadyTask = {
  id: string;
  role: string;
  module: string;
  underWay: boolean;
  posted: string;
};

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
