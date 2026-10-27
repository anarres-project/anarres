import { describe, expect, it } from "vitest";
import { GitHubAdapter } from "../src/index.ts";

describe("a member's pull request", () => {
  it("is read as the commit it is at, whether it is a draft, and who opened it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "GET" && path === "repos/commons/ledger/pulls/7") {
          const pull = { head: { sha: "c0ffee" }, draft: true, user: { login: "alice" } };
          return { status: 200, data: pull as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.pullRequest("ledger", "7")).toEqual({
      head: "c0ffee",
      draft: true,
      author: "alice",
    });
  });
});

describe("merging a member's pull request", () => {
  it("gives the commit GitHub's merge made", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "PUT" && path === "repos/commons/ledger/pulls/7/merge") {
          return { status: 200, data: { sha: "m3rg3d", merged: true } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.merge("ledger", "7", "c0ffee")).toBe("m3rg3d");
  });
});

describe("a merged pull request's commit", () => {
  it("is the commit GitHub says its merge made", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "GET" && path === "repos/commons/ledger/pulls/7") {
          return { status: 200, data: { merged: true, merge_commit_sha: "m3rg3d" } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.mergeCommitOf("ledger", "7")).toBe("m3rg3d");
  });
});

describe("merging, when GitHub's server fails part way", () => {
  it("carries on with the merge's commit if GitHub merged the pull request after all", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "PUT" && path === "repos/commons/ledger/pulls/7/merge") {
          return { status: 502, data: { message: "Server Error" } as T };
        }
        if (method === "GET" && path === "repos/commons/ledger/pulls/7") {
          return {
            status: 200,
            data: { merged: true, merge_commit_sha: "m3rg3d", head: { sha: "c0ffee" } } as T,
          };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.merge("ledger", "7", "c0ffee")).toBe("m3rg3d");
  });

  it("asks again if GitHub did not merge it, since it can only merge the commit Divlab read", async () => {
    const asked: string[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "PUT" && path === "repos/commons/ledger/pulls/7/merge") {
          asked.push("merge");
          return asked.length === 1
            ? { status: 500, data: { message: "Server Error" } as T }
            : { status: 200, data: { sha: "m3rg3d", merged: true } as T };
        }
        if (method === "GET" && path === "repos/commons/ledger/pulls/7") {
          return { status: 200, data: { merged: false, merge_commit_sha: null } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.merge("ledger", "7", "c0ffee")).toBe("m3rg3d");
  });

  it("fails as before if GitHub did not merge it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) =>
        method === "PUT"
          ? { status: 502, data: { message: "Server Error" } as T }
          : path === "repos/commons/ledger/pulls/7"
            ? { status: 200, data: { merged: false, merge_commit_sha: null } as T }
            : { status: 404, data: {} as T },
    });
    await expect(adapter.merge("ledger", "7", "c0ffee")).rejects.toThrow("answered 502");
  });

  it("carries on with the merge's commit if GitHub refused a repeat because it merged it already", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "PUT" && path === "repos/commons/ledger/pulls/7/merge") {
          return { status: 405, data: { message: "Pull Request is not mergeable" } as T };
        }
        if (method === "GET" && path === "repos/commons/ledger/pulls/7") {
          return { status: 200, data: { merged: true, merge_commit_sha: "m3rg3d" } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.merge("ledger", "7", "c0ffee")).toBe("m3rg3d");
  });

  it("asks for the merge as a write safe to repeat, since GitHub merges only the commit Divlab read", async () => {
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
        if (method === "PUT") asked.push(options);
        return { status: 200, data: { sha: "m3rg3d", merged: true } as T };
      },
    });
    await adapter.merge("ledger", "7", "c0ffee");
    expect(asked).toEqual([{ repeatable: true }]);
  });
});

describe("the project's own check on a commit (decision 0010)", () => {
  it("is what GitHub Actions' run of the template's check found, and where to see it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/commits/c0ffee/check-runs?check_name=project-tests"
        ) {
          const failed = {
            status: "completed",
            conclusion: "failure",
            html_url: "https://github.com/commons/ledger/actions/runs/42/job/7",
            app: { slug: "github-actions" },
          };
          return { status: 200, data: { check_runs: [failed] } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.check("ledger", "c0ffee")).toEqual({
      state: "failed",
      url: "https://github.com/commons/ledger/actions/runs/42/job/7",
    });
  });
  it("has passed when GitHub Actions' run of it succeeded", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/commits/c0ffee/check-runs?check_name=project-tests"
        ) {
          const passed = {
            status: "completed",
            conclusion: "success",
            html_url: "https://github.com/commons/ledger/actions/runs/43/job/8",
            app: { slug: "github-actions" },
          };
          return { status: 200, data: { check_runs: [passed] } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect((await adapter.check("ledger", "c0ffee")).state).toBe("passed");
  });
  it("is still running while GitHub Actions' run of it has not completed", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/commits/c0ffee/check-runs?check_name=project-tests"
        ) {
          const running = {
            status: "in_progress",
            conclusion: null,
            html_url: "https://github.com/commons/ledger/actions/runs/45/job/9",
            app: { slug: "github-actions" },
          };
          return { status: 200, data: { check_runs: [running] } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect((await adapter.check("ledger", "c0ffee")).state).toBe("running");
  });
  it("is still running while GitHub Actions has not started a run of it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/commits/c0ffee/check-runs?check_name=project-tests"
        ) {
          return { status: 200, data: { check_runs: [] } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect((await adapter.check("ledger", "c0ffee")).state).toBe("running");
  });
  it("counts only GitHub Actions' run of it, never another app's of the same name", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/commits/c0ffee/check-runs?check_name=project-tests"
        ) {
          const elsewhere = {
            status: "completed",
            conclusion: "success",
            html_url: "https://example.test/checks/1",
            app: { slug: "another-app" },
          };
          return { status: 200, data: { check_runs: [elsewhere] } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect((await adapter.check("ledger", "c0ffee")).state).toBe("running");
  });
});

describe("the open pull requests at a commit", () => {
  it("are those whose head is the commit, read from every page", async () => {
    const pull = (number: number, sha: string) => ({ number, head: { sha } });
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/pulls?state=open&per_page=100&page=1"
        ) {
          const first = Array.from({ length: 100 }, (_, i) =>
            pull(i + 1, i === 4 ? "c0ffee" : "0ther"),
          );
          return { status: 200, data: first as T };
        }
        if (
          method === "GET" &&
          path === "repos/commons/ledger/pulls?state=open&per_page=100&page=2"
        ) {
          return { status: 200, data: [pull(101, "c0ffee")] as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.openAt("ledger", "c0ffee")).toEqual(["5", "101"]);
  });
});
