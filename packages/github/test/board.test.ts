import { describe, expect, it } from "vitest";
import {
  GitHubAdapter,
  issueForClaimedWithoutClaim,
  issueForTask,
  issueForUnreadableReviewList,
} from "../src/index.ts";
import { commentForRefused } from "../src/representation.ts";

/** A project's issues as GitHub lists them, a hundred to a page, newest first. */
function githubWithIssues(issues: { body: string; labels: string[] }[]) {
  return async <T>(_token: string, method: string, path: string) => {
    const answer = (status: number, data: unknown) => ({ status, data: data as T });
    const listing = path.match(
      /^repos\/commons\/ledger\/issues\?state=all&per_page=100&page=(\d+)$/,
    );
    if (method === "GET" && listing) {
      const page = Number(listing[1]);
      return answer(
        200,
        issues
          .slice((page - 1) * 100, page * 100)
          .map(({ body, labels }) => ({ body, labels: labels.map((name) => ({ name })) })),
      );
    }
    return answer(404, { message: `the fake does not answer ${method} ${path}` });
  };
}

const taskFrom = (decidedOn: string) =>
  issueForTask({ project: "ledger", role: "test", module: "parser", decidedOn });

describe("the decisions a project's issues show Divlab acted on", () => {
  it("are the decisions its tasks, alerts and finished modules came from", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithIssues([
        taskFrom("feedback/FB-2.md"),
        { body: "A person's own issue", labels: [] },
        taskFrom("feedback/FB-1.md"),
      ]),
    });
    expect(await adapter.actedOn("ledger")).toEqual(["feedback/FB-2.md", "feedback/FB-1.md"]);
  });

  it("are only those on issues Divlab posted, which carry its labels", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithIssues([{ ...taskFrom("feedback/FB-3.md"), labels: [] }]),
    });
    expect(await adapter.actedOn("ledger")).toEqual([]);
  });

  it("include the decision a claimed task came from", async () => {
    const task = taskFrom("feedback/FB-4.md");
    const claimed = {
      ...task,
      labels: task.labels.map((name) => (name === "state:ready" ? "state:claimed" : name)),
    };
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithIssues([claimed]),
    });
    expect(await adapter.actedOn("ledger")).toEqual(["feedback/FB-4.md"]);
  });

  it("are read from every page of the project's issues", async () => {
    const issues = Array.from({ length: 150 }, (_, i) => taskFrom(`feedback/FB-${i + 1}.md`));
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithIssues(issues),
    });
    expect(await adapter.actedOn("ledger")).toHaveLength(150);
  });
});

describe("marking a task claimed", () => {
  it("labels its issue claimed instead of ready, and assigns it to the member", async () => {
    const changes: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "GET" && path === "repos/commons/ledger/issues/12") {
          const labels = ["role:test", "module:parser", "state:ready"].map((name) => ({ name }));
          return { status: 200, data: { labels, body: "" } as T };
        }
        if (method === "PATCH" && path === "repos/commons/ledger/issues/12") {
          changes.push(body);
          return { status: 200, data: {} as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    await adapter.markClaimed({ project: "ledger", task: "12", member: "alice" });
    expect(changes).toEqual([
      { labels: ["role:test", "module:parser", "state:claimed"], assignees: ["alice"] },
    ]);
  });

  it("asks for the change as a write safe to repeat, since it sets the whole set of labels", async () => {
    const asked: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(
        _token: string,
        method: string,
        _path: string,
        _body?: unknown,
        options?: { repeatable?: boolean },
      ) => {
        if (method === "PATCH") asked.push(options);
        return { status: 200, data: { labels: [], body: "" } as T };
      },
    });
    await adapter.markClaimed({ project: "ledger", task: "12", member: "alice" });
    expect(asked).toEqual([{ repeatable: true }]);
  });
});

describe("refusing a claim", () => {
  it("replies on the task's issue to the member, saying why", async () => {
    const comments: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "POST" && path === "repos/commons/ledger/issues/12/comments") {
          comments.push(body);
          return { status: 201, data: {} as T };
        }
        if (method === "GET" && path.startsWith("repos/commons/ledger/issues/12/comments?")) {
          return { status: 200, data: [] as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    await adapter.refuseMember({
      project: "ledger",
      task: "12",
      member: "bob",
      reason: "Divlab did not give you this task: it has already been claimed",
    });
    expect(comments).toEqual([
      { body: "@bob, Divlab did not give you this task: it has already been claimed." },
    ]);
  });
});

describe("a task's comments", () => {
  it("are read earliest first, each with who made it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/issues/12/comments?per_page=100&page=1"
        ) {
          const comments = [
            { user: { login: "alice" }, body: "/claim" },
            { user: { login: "bob" }, body: "/claim" },
          ];
          return { status: 200, data: comments as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.comments("ledger", "12")).toEqual([
      { member: "alice", text: "/claim" },
      { member: "bob", text: "/claim" },
    ]);
  });

  it("are read with when each was made", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/issues/12/comments?per_page=100&page=1"
        ) {
          const comments = [
            { user: { login: "alice" }, body: "/claim", created_at: "2026-10-23T08:30:00Z" },
          ];
          return { status: 200, data: comments as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.comments("ledger", "12")).toEqual([
      { member: "alice", text: "/claim", at: "2026-10-23T08:30:00Z" },
    ]);
  });

  it("leave out a comment whose account has been deleted: GitHub names nobody for it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/issues/12/comments?per_page=100&page=1"
        ) {
          const comments = [
            { user: null, body: "/claim" },
            { user: { login: "bob" }, body: "/claim" },
          ];
          return { status: 200, data: comments as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.comments("ledger", "12")).toEqual([{ member: "bob", text: "/claim" }]);
  });

  it("are read from every page, so no claim is missed on a busy task", async () => {
    const all = Array.from({ length: 150 }, (_, i) => ({
      user: { login: `m${i}` },
      body: "hello",
    }));
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        const page = path.match(
          /^repos\/commons\/ledger\/issues\/12\/comments\?per_page=100&page=(\d+)$/,
        );
        if (method === "GET" && page) {
          const n = Number(page[1]);
          return { status: 200, data: all.slice((n - 1) * 100, n * 100) as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.comments("ledger", "12")).toHaveLength(150);
  });
});

describe("the task an issue number names", () => {
  /** A project with one issue, number 12, as GitHub would answer for it. */
  const withIssue = (issue: { labels: string[]; state: string }) =>
    new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "GET" && path === "repos/commons/ledger/issues/12") {
          const labels = issue.labels.map((name) => ({ name }));
          return { status: 200, data: { ...issue, labels, body: "" } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });

  it("is no task when the issue is an alert to PDC coordinators", async () => {
    const adapter = withIssue({ labels: ["escalation", "module:parser"], state: "open" });
    expect(await adapter.task("ledger", "12")).toBeUndefined();
  });

  it.each([
    ["no role", ["module:parser", "state:ready"]],
    ["a role Anarres does not have", ["role:bystander", "module:parser", "state:ready"]],
    ["no module", ["role:test", "state:ready"]],
  ])("is no task when the issue names %s", async (_what, labels) => {
    const adapter = withIssue({ labels, state: "open" });
    expect(await adapter.task("ledger", "12")).toBeUndefined();
  });

  it("is no task when the task's issue has been closed: it is done", async () => {
    const adapter = withIssue({
      labels: ["role:test", "module:parser", "state:ready"],
      state: "closed",
    });
    expect(await adapter.task("ledger", "12")).toBeUndefined();
  });
});

describe("releasing a claim", () => {
  it("labels its issue ready instead of claimed, and assigns it to nobody", async () => {
    const changes: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "GET" && path === "repos/commons/ledger/issues/12") {
          const labels = ["role:test", "module:parser", "state:claimed"].map((name) => ({ name }));
          return { status: 200, data: { labels, body: "" } as T };
        }
        if (method === "PATCH" && path === "repos/commons/ledger/issues/12") {
          changes.push(body);
          return { status: 200, data: {} as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    await adapter.releaseClaim("ledger", "12");
    expect(changes).toEqual([
      { labels: ["role:test", "module:parser", "state:ready"], assignees: [] },
    ]);
  });

  it("asks for the change as a write safe to repeat, since it sets the whole set of labels", async () => {
    const asked: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(
        _token: string,
        method: string,
        _path: string,
        _body?: unknown,
        options?: { repeatable?: boolean },
      ) => {
        if (method === "PATCH") asked.push(options);
        return { status: 200, data: { labels: [], body: "" } as T };
      },
    });
    await adapter.releaseClaim("ledger", "12");
    expect(asked).toEqual([{ repeatable: true }]);
  });
});

describe("telling a member their lease ran out", () => {
  it("replies on the task's issue to the member, saying the task is ready again", async () => {
    const comments: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "POST" && path === "repos/commons/ledger/issues/12/comments") {
          comments.push(body);
          return { status: 201, data: {} as T };
        }
        if (method === "GET" && path.startsWith("repos/commons/ledger/issues/12/comments?")) {
          return { status: 200, data: [] as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    await adapter.tellLeaseRanOut({ project: "ledger", task: "12", member: "alice" });
    expect(comments).toEqual([
      {
        body: "@alice, your lease on this task ran out: 24 hours passed without activity on it, so it is ready for anyone to claim again.",
      },
    ]);
  });
});

describe("the tasks a project's board shows as claimed", () => {
  it("are its open task issues marked claimed, each with its role, module and assignee", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          /^repos\/commons\/ledger\/issues\?labels=state%3Aclaimed&state=open&per_page=100(&page=1)?$/.test(
            path,
          )
        ) {
          const issues = [
            {
              number: 12,
              state: "open",
              labels: ["role:test", "module:parser", "state:claimed"].map((name) => ({ name })),
              assignees: [{ login: "mallory" }],
            },
            {
              number: 13,
              state: "open",
              labels: ["escalation", "state:claimed"].map((name) => ({ name })),
            },
          ];
          return { status: 200, data: issues as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.claimedTasks("ledger")).toEqual([
      { task: "12", role: "test", module: "parser", claimedBy: "mallory" },
    ]);
  });

  it("name nobody as holding a task marked claimed that nobody is assigned", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "GET" && path.startsWith("repos/commons/ledger/issues?labels=")) {
          const labels = ["role:test", "module:parser", "state:claimed"].map((name) => ({ name }));
          return { status: 200, data: [{ number: 12, state: "open", labels }] as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.claimedTasks("ledger")).toEqual([
      { task: "12", role: "test", module: "parser" },
    ]);
  });

  it("are read from every page, however many tasks are claimed", async () => {
    const claimed = Array.from({ length: 150 }, (_, n) => ({
      number: n + 1,
      state: "open",
      labels: ["role:test", `module:m${n}`, "state:claimed"].map((name) => ({ name })),
    }));
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        const listing = path.match(
          /^repos\/commons\/ledger\/issues\?labels=state%3Aclaimed&state=open&per_page=100(?:&page=(\d+))?$/,
        );
        if (method === "GET" && listing) {
          const page = Number(listing[1] ?? 1);
          return { status: 200, data: claimed.slice((page - 1) * 100, page * 100) as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.claimedTasks("ledger")).toHaveLength(150);
  });
});

describe("alerting PDC coordinators to a task shown as claimed without a claim", () => {
  it("opens an issue in the project saying which task it was", async () => {
    const opened: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "POST" && path === "repos/commons/ledger/issues") {
          opened.push(body);
          return { status: 201, data: { number: 30 } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    const alert = {
      project: "ledger",
      task: "12",
      role: "test" as const,
      module: "parser",
      shownAs: "mallory",
    };
    await adapter.alertClaimedWithoutClaim(alert);
    expect(opened).toEqual([issueForClaimedWithoutClaim(alert)]);
  });
});

describe("alerting PDC coordinators that the list of modules needing review cannot be read", () => {
  it("opens an issue in the project saying so", async () => {
    const opened: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "POST" && path === "repos/commons/ledger/issues") {
          opened.push(body);
          return { status: 201, data: { number: 31 } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    await adapter.alertUnreadableReviewList("ledger");
    expect(opened).toEqual([issueForUnreadableReviewList()]);
  });

  it("is open while an issue under its label is open in the project", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/issues?labels=unreadable-review-list&state=open&per_page=1"
        ) {
          return { status: 200, data: [{ number: 31 }] as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.unreadableReviewListAlertOpen("ledger")).toBe(true);
  });
});

describe("closing a task", () => {
  it("closes the task's issue", async () => {
    const changes: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "PATCH" && path === "repos/commons/ledger/issues/12") {
          changes.push(body);
          return { status: 200, data: {} as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    await adapter.close("ledger", "12");
    expect(changes).toEqual([{ state: "closed" }]);
  });

  it("asks for it as a write safe to repeat, since a closed issue closed again stays closed", async () => {
    const asked: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(
        _token: string,
        method: string,
        _path: string,
        _body?: unknown,
        options?: { repeatable?: boolean },
      ) => {
        if (method === "PATCH") asked.push(options);
        return { status: 200, data: {} as T };
      },
    });
    await adapter.close("ledger", "12");
    expect(asked).toEqual([{ repeatable: true }]);
  });
});

describe("marking a module done", () => {
  it("closes the issue saying so as a write safe to repeat", async () => {
    const asked: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(
        _token: string,
        method: string,
        _path: string,
        _body?: unknown,
        options?: { repeatable?: boolean },
      ) => {
        if (method === "PATCH") asked.push(options);
        return { status: 201, data: { number: 30 } as T };
      },
    });
    await adapter.markModuleDone({ project: "ledger", module: "parser", decidedOn: "e1" });
    expect(asked).toEqual([{ repeatable: true }]);
  });
});

/**
 * A project's issues on a GitHub whose server fails the first `failures` issues opened: before
 * saving the issue if `saving` is false, after it if true. Listed newest first, as GitHub does.
 */
function githubFailingToOpen(
  failures: number,
  saving: boolean,
  issues: { number: number; title: string; body: string; state: string }[] = [],
) {
  let failed = 0;
  const request = async <T>(_token: string, method: string, path: string, body?: unknown) => {
    const answer = (status: number, data: unknown) => ({ status, data: data as T });
    if (method === "POST" && path === "repos/commons/ledger/issues") {
      const { title, body: text } = body as { title: string; body: string };
      const failing = failed < failures;
      if (failing) failed++;
      if (failing && !saving) return answer(502, { message: "Server Error" });
      const issue = { number: issues.length + 1, title, body: text, state: "open" };
      issues.unshift(issue);
      return failing ? answer(502, { message: "Server Error" }) : answer(201, issue);
    }
    if (method === "GET" && path.startsWith("repos/commons/ledger/issues?")) {
      const state = new URLSearchParams(path.split("?")[1]).get("state") ?? "open";
      return answer(200, state === "all" ? issues : issues.filter((i) => i.state === state));
    }
    return answer(404, { message: `not answered: ${method} ${path}` });
  };
  return { issues, request };
}

const POSTED = { project: "ledger", role: "test" as const, module: "parser", decidedOn: "e1" };

describe("opening an issue, when GitHub's server fails", () => {
  it("opens it once when GitHub saved it, though it answered with a failure", async () => {
    const github = githubFailingToOpen(1, true);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.post(POSTED);
    expect(github.issues).toHaveLength(1);
  });

  it("opens it again when GitHub's server failed before saving it", async () => {
    const github = githubFailingToOpen(1, false);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.post(POSTED);
    expect(github.issues).toHaveLength(1);
  });

  it("stops asking, and fails, when GitHub's server keeps failing before saving it", async () => {
    const github = githubFailingToOpen(3, false);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await expect(adapter.post(POSTED)).rejects.toThrow("answered 502");
  });

  it("opens it again, though an issue saying the same was opened and closed before", async () => {
    const { title, body } = issueForTask(POSTED, "commons/ledger");
    const github = githubFailingToOpen(1, false, [{ number: 1, title, body, state: "closed" }]);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.post(POSTED);
    expect(github.issues.map((i) => i.state)).toEqual(["open", "closed"]);
  });
});

type ListedComment = { user: { login: string; type: string }; body: string };

/**
 * A task's comments on a GitHub whose server fails the first `failures` comments posted: before
 * saving the comment if `saving` is false, after it if true. Divlab posts as its App, a bot.
 */
function githubFailingToComment(
  failures: number,
  saving: boolean,
  comments: ListedComment[] = [],
  /** A member who posts the same words as Divlab's comment while GitHub fails it. */
  echoedBy?: string,
) {
  let failed = 0;
  const request = async <T>(_token: string, method: string, path: string, body?: unknown) => {
    const answer = (status: number, data: unknown) => ({ status, data: data as T });
    if (method === "POST" && path === "repos/commons/ledger/issues/12/comments") {
      const failing = failed < failures;
      if (failing) failed++;
      const { body: text } = body as { body: string };
      if (failing && echoedBy)
        comments.push({ user: { login: echoedBy, type: "User" }, body: text });
      if (failing && !saving) return answer(502, { message: "Server Error" });
      comments.push({ user: { login: "divlab[bot]", type: "Bot" }, body: text });
      return failing ? answer(502, { message: "Server Error" }) : answer(201, {});
    }
    const listing = path.match(
      /^repos\/commons\/ledger\/issues\/12\/comments\?per_page=100&page=(\d+)$/,
    );
    if (method === "GET" && listing) {
      // Oldest first, a hundred to a page, as GitHub lists them.
      const page = Number(listing[1]);
      return answer(200, comments.slice((page - 1) * 100, page * 100));
    }
    return answer(404, { message: `not answered: ${method} ${path}` });
  };
  return { comments, request };
}

const REFUSED = {
  project: "ledger",
  task: "12",
  member: "alice",
  reason: "it has already been claimed",
};

describe("posting a comment, when GitHub's server fails", () => {
  it("posts it once when GitHub saved it, though it answered with a failure", async () => {
    const github = githubFailingToComment(1, true);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.refuseMember(REFUSED);
    expect(github.comments).toHaveLength(1);
  });

  it("posts it again when GitHub's server failed before saving it", async () => {
    const github = githubFailingToComment(1, false);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.refuseMember(REFUSED);
    expect(github.comments).toHaveLength(1);
  });

  it("posts it again, though Divlab rightly said the same before, to an earlier claim", async () => {
    const earlier = {
      user: { login: "divlab[bot]", type: "Bot" },
      body: commentForRefused(REFUSED),
    };
    const github = githubFailingToComment(1, false, [earlier]);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.refuseMember(REFUSED);
    expect(github.comments).toHaveLength(2);
  });

  it("stops asking, and fails, when GitHub's server keeps failing before saving it", async () => {
    const github = githubFailingToComment(3, false);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await expect(adapter.refuseMember(REFUSED)).rejects.toThrow("answered 502");
  });

  it("posts it once on a busy task, whose newest comments are listed past the first page", async () => {
    const chatter = Array.from({ length: 150 }, (_, n) => ({
      user: { login: "bob", type: "User" },
      body: `comment ${n}`,
    }));
    const github = githubFailingToComment(1, true, chatter);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.refuseMember(REFUSED);
    expect(github.comments).toHaveLength(151);
  });

  it("posts it again, though a member said the same words meanwhile", async () => {
    const github = githubFailingToComment(1, false, [], "mallory");
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.refuseMember(REFUSED);
    expect(github.comments.filter((c) => c.user.type === "Bot")).toHaveLength(1);
  });

  it("tells a member their lease ran out once, when GitHub saved it but answered with a failure", async () => {
    const github = githubFailingToComment(1, true);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.tellLeaseRanOut({ project: "ledger", task: "12", member: "alice" });
    expect(github.comments).toHaveLength(1);
  });

  it("refuses a pull request once, when GitHub saved it but answered with a failure", async () => {
    const github = githubFailingToComment(1, true);
    const adapter = new GitHubAdapter({ owner: "commons", token: "test", request: github.request });
    await adapter.refuse("ledger", "12", "it changes files outside its role's place");
    expect(github.comments).toHaveLength(1);
  });
});
