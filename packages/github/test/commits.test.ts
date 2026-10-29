import { describe, expect, it } from "vitest";
import { GitHubAdapter } from "../src/index.ts";

/** A commit as GitHub's API describes it: only what Divlab reads. */
const commit = (sha: string, author: string, committer: string, verified: boolean) => ({
  sha,
  author: { login: author },
  committer: { login: committer },
  commit: { verification: { verified } },
});

describe("main's commits since Divlab last checked", () => {
  it("are those GitHub compares as after the last check, each with its author and signer", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/compare/b2...main?per_page=100&page=1"
        ) {
          const commits = [
            commit("c3", "divlab-sandbox[bot]", "web-flow", true),
            commit("c4", "mallory", "mallory", true),
          ];
          return { status: 200, data: { commits, total_commits: 2 } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.commitsSince("ledger", "b2")).toEqual([
      { sha: "c3", author: "divlab-sandbox[bot]", signedByGitHub: true },
      { sha: "c4", author: "mallory", signedByGitHub: false },
    ]);
  });
});

describe("the commit main is at", () => {
  it("is the one GitHub's reference for main points to", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "GET" && path === "repos/commons/ledger/git/ref/heads/main") {
          return { status: 200, data: { object: { sha: "h3ad" } } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.head("ledger")).toBe("h3ad");
  });

  it("are every one of them, on every page GitHub gives, though more than it compares at once", async () => {
    const many = Array.from({ length: 100 }, (_, n) =>
      commit(`a${n}`, "divlab-sandbox[bot]", "web-flow", true),
    );
    const pages: Record<string, unknown> = {
      "repos/commons/ledger/compare/b2...main?per_page=100&page=1": {
        commits: many,
        total_commits: 101,
      },
      "repos/commons/ledger/compare/b2...main?per_page=100&page=2": {
        commits: [commit("c4", "mallory", "mallory", true)],
        total_commits: 101,
      },
    };
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        const page = method === "GET" ? pages[path] : undefined;
        return page
          ? { status: 200, data: page as T }
          : { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    const commits = await adapter.commitsSince("ledger", "b2");
    expect([commits.length, commits.at(-1)]).toEqual([
      101,
      { sha: "c4", author: "mallory", signedByGitHub: false },
    ]);
  });

  it("stops at an empty page, though GitHub's count says more", async () => {
    const pages: Record<string, unknown> = {
      "repos/commons/ledger/compare/b2...main?per_page=100&page=1": {
        commits: [commit("c3", "mallory", "mallory", true)],
        total_commits: 5,
      },
      "repos/commons/ledger/compare/b2...main?per_page=100&page=2": {
        commits: [],
        total_commits: 5,
      },
    };
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        const page = method === "GET" ? pages[path] : undefined;
        return page
          ? { status: 200, data: page as T }
          : { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect((await adapter.commitsSince("ledger", "b2")).map((c) => c.sha)).toEqual(["c3"]);
  });
});

describe("the paths changed on main since a commit (decision 0015)", () => {
  it("are the files GitHub compares as changed between the commit and main", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/compare/p1nned...main?per_page=100&page=1"
        ) {
          const files = [{ filename: "programme/slices/parser/requirements.md" }];
          return { status: 200, data: { commits: [], total_commits: 1, files } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.changedOnMainSince("ledger", "p1nned")).toEqual([
      "programme/slices/parser/requirements.md",
    ]);
  });
});
