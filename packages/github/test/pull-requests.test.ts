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
