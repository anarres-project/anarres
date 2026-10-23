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
    await adapter.refuseClaim({
      project: "ledger",
      task: "12",
      member: "bob",
      reason: "it has already been claimed",
    });
    expect(comments).toEqual([
      { body: "@bob, Divlab did not give you this task: it has already been claimed." },
    ]);
  });
});
