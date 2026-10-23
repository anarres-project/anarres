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
        if (method === "GET" && path === "repos/commons/ledger/compare/b2...main") {
          const commits = [
            commit("c3", "divlab-sandbox[bot]", "web-flow", true),
            commit("c4", "mallory", "mallory", true),
          ];
          return { status: 200, data: { commits } as T };
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
});
