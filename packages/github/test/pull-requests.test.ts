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
