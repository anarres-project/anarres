import { describe, expect, it } from "vitest";
import { GitHubAdapter, issueForTask } from "../src/index.ts";

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
