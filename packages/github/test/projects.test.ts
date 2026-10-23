import { describe, expect, it } from "vitest";
import { GitHubAdapter } from "../src/index.ts";

describe("the projects with work ready", () => {
  it("are the organisation's repositories with an open task ready to claim, found in one search", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path ===
            "search/issues?q=org%3Acommons%20label%3Astate%3Aready%20is%3Aopen%20is%3Aissue&per_page=100"
        ) {
          const items = [
            { repository_url: "https://api.github.com/repos/commons/ledger" },
            { repository_url: "https://api.github.com/repos/commons/atlas" },
            { repository_url: "https://api.github.com/repos/commons/ledger" },
          ];
          return { status: 200, data: { items } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.names()).toEqual(["ledger", "atlas"]);
  });
});

describe("a project's ready tasks", () => {
  it("are its open issues labelled ready, each with the role and module it is for", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/issues?labels=state%3Aready&state=open&per_page=100"
        ) {
          const issues = [
            {
              number: 4,
              state: "open",
              labels: ["role:test", "module:lexer", "state:ready"].map((name) => ({ name })),
            },
            {
              number: 5,
              state: "open",
              labels: ["escalation", "state:ready"].map((name) => ({ name })),
            },
          ];
          return { status: 200, data: issues as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.readyTasks("ledger")).toEqual([
      { id: "4", role: "test", module: "lexer" },
    ]);
  });
});
