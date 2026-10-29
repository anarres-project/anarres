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

describe("the projects where a member holds a task", () => {
  it("are the organisation's repositories with an open task claimed for them, found in one search", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path ===
            "search/issues?q=org%3Acommons%20label%3Astate%3Aclaimed%20assignee%3Aalice%20is%3Aopen%20is%3Aissue&per_page=100"
        ) {
          const items = [{ repository_url: "https://api.github.com/repos/commons/ledger" }];
          return { status: 200, data: { items } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.namesHeldBy("alice")).toEqual(["ledger"]);
  });
});

describe("the projects where a member's work has been merged", () => {
  it("are the organisation's repositories with a merged pull request of theirs, found in one search", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path ===
            "search/issues?q=org%3Acommons%20author%3Aalice%20is%3Apr%20is%3Amerged&per_page=100"
        ) {
          const items = [{ repository_url: "https://api.github.com/repos/commons/atlas" }];
          return { status: 200, data: { items } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.namesContributedToBy("alice")).toEqual(["atlas"]);
  });
});

describe("a project's ready tasks", () => {
  it("are its open issues labelled ready, each with the role and module it is for, whether its work is under way, and when it was posted", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          /^repos\/commons\/ledger\/issues\?labels=state%3Aready&state=open&per_page=100(&page=1)?$/.test(
            path,
          )
        ) {
          const issues = [
            {
              number: 4,
              state: "open",
              created_at: "2026-10-29T09:00:00Z",
              labels: ["role:test", "module:lexer", "state:ready"].map((name) => ({ name })),
            },
            {
              number: 6,
              state: "open",
              created_at: "2026-10-29T10:00:00Z",
              body: "Feedback signal: feedback/FB-7.md\n\nDecided by …",
              labels: ["role:specification", "module:parser", "state:ready"].map((name) => ({
                name,
              })),
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
      { id: "4", role: "test", module: "lexer", underWay: false, posted: "2026-10-29T09:00:00Z" },
      {
        id: "6",
        role: "specification",
        module: "parser",
        underWay: true,
        posted: "2026-10-29T10:00:00Z",
      },
    ]);
  });

  it("are read from every page, however many are ready", async () => {
    const ready = Array.from({ length: 150 }, (_, n) => ({
      number: n + 1,
      state: "open",
      labels: ["role:test", `module:m${n}`, "state:ready"].map((name) => ({ name })),
    }));
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        const listing = path.match(
          /^repos\/commons\/ledger\/issues\?labels=state%3Aready&state=open&per_page=100(?:&page=(\d+))?$/,
        );
        if (method === "GET" && listing) {
          const page = Number(listing[1] ?? 1);
          return { status: 200, data: ready.slice((page - 1) * 100, page * 100) as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.readyTasks("ledger")).toHaveLength(150);
  });
});

describe("the tasks a member holds in a project", () => {
  it("are its open issues Divlab has marked claimed for the member, each with its role and module", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          /^repos\/commons\/ledger\/issues\?labels=state%3Aclaimed&assignee=alice&state=open&per_page=100(&page=1)?$/.test(
            path,
          )
        ) {
          const issues = [
            {
              number: 4,
              state: "open",
              labels: ["role:test", "module:lexer", "state:claimed"].map((name) => ({ name })),
              assignees: [{ login: "alice" }],
            },
          ];
          return { status: 200, data: issues as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.heldTasks("ledger", "alice")).toEqual([
      { id: "4", role: "test", module: "lexer" },
    ]);
  });

  it("leaves out a task someone else holds, though the member is assigned to it too", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>() => {
        const issues = [
          {
            number: 4,
            state: "open",
            labels: ["role:test", "module:lexer", "state:claimed"].map((name) => ({ name })),
            assignees: [{ login: "bob" }, { login: "alice" }],
          },
        ];
        return { status: 200, data: issues as T };
      },
    });
    expect(await adapter.heldTasks("ledger", "alice")).toEqual([]);
  });

  it("are read from every page, however many the member holds", async () => {
    const held = Array.from({ length: 150 }, (_, n) => ({
      number: n + 1,
      state: "open",
      labels: ["role:test", `module:m${n}`, "state:claimed"].map((name) => ({ name })),
      assignees: [{ login: "alice" }],
    }));
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        const listing = path.match(
          /^repos\/commons\/ledger\/issues\?labels=state%3Aclaimed&assignee=alice&state=open&per_page=100(?:&page=(\d+))?$/,
        );
        if (method === "GET" && listing) {
          const page = Number(listing[1] ?? 1);
          return { status: 200, data: held.slice((page - 1) * 100, page * 100) as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.heldTasks("ledger", "alice")).toHaveLength(150);
  });
});

describe("a member's open pull requests in a project", () => {
  it("are those they opened from a task's branch, each with its task and whether it is a draft", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/pulls?state=open&per_page=100&page=1"
        ) {
          const pulls = [
            { number: 17, draft: true, user: { login: "alice" }, head: { ref: "anarres/task-4" } },
          ];
          return { status: 200, data: pulls as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.pullRequestsOpenBy("ledger", "alice")).toEqual([
      { number: "17", task: "4", draft: true },
    ]);
  });

  it("are found on every page GitHub gives, not only the first hundred", async () => {
    const others = Array.from({ length: 100 }, (_, n) => ({
      number: n + 1,
      draft: false,
      user: { login: "bob" },
      head: { ref: `anarres/task-${n + 1}` },
    }));
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        const pages: Record<string, unknown[]> = {
          "repos/commons/ledger/pulls?state=open&per_page=100&page=1": others,
          "repos/commons/ledger/pulls?state=open&per_page=100&page=2": [
            { number: 117, draft: true, user: { login: "alice" }, head: { ref: "anarres/task-4" } },
          ],
        };
        const page = method === "GET" ? pages[path] : undefined;
        return page
          ? { status: 200, data: page as T }
          : { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.pullRequestsOpenBy("ledger", "alice")).toEqual([
      { number: "117", task: "4", draft: true },
    ]);
  });

  it.each([
    ["someone else opened", { user: { login: "bob" }, head: { ref: "anarres/task-4" } }],
    ["is from a branch that is not a task's", { user: { login: "alice" }, head: { ref: "fix-4" } }],
  ])("leaves out a pull request that %s", async (_what, pull) => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>() => ({ status: 200, data: [{ number: 17, draft: false, ...pull }] as T }),
    });
    expect(await adapter.pullRequestsOpenBy("ledger", "alice")).toEqual([]);
  });
});

describe("the member a CLI acts for", () => {
  it("is the account GitHub says the member's login is", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) =>
        method === "GET" && path === "user"
          ? { status: 200, data: { login: "alice" } as T }
          : { status: 404, data: { message: `not answered: ${method} ${path}` } as T },
    });
    expect(await adapter.account()).toBe("alice");
  });
});

describe("a member's claim, from their CLI", () => {
  it("is the claim comment Divlab reads, on the task's issue", async () => {
    const comments: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        if (method === "POST" && path === "repos/commons/ledger/issues/4/comments") {
          comments.push(body);
          return { status: 201, data: {} as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    await adapter.askToClaim("ledger", "4");
    expect(comments).toEqual([{ body: "/claim" }]);
  });
});

describe("a project's declared toolchain", () => {
  it("is read from anarres.yaml on the project's main branch", async () => {
    const declared = "toolchain:\n  image: node:24\n  test: npm test\n  report: junit.xml\n";
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "GET" && path === "repos/commons/ledger/contents/anarres.yaml") {
          return { status: 200, data: { content: Buffer.from(declared).toString("base64") } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.toolchain("ledger")).toEqual({
      image: "node:24",
      test: "npm test",
      report: "junit.xml",
    });
  });
  it("is none when the project has no anarres.yaml", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => ({
        status: 404,
        data: { message: `not answered: ${method} ${path}` } as T,
      }),
    });
    expect(await adapter.toolchain("ledger")).toBeUndefined();
  });
});

describe("a project's modules.yaml at a commit (decision 0014)", () => {
  const SHA = "0123456789abcdef0123456789abcdef01234567";
  it("is read as it was at that commit", async () => {
    const listed = "modules:\n  - name: parser\n";
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === `repos/commons/ledger/contents/programme/modules.yaml?ref=${SHA}`
        ) {
          return { status: 200, data: { content: Buffer.from(listed).toString("base64") } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.modulesAt("ledger", SHA)).toBe(listed);
  });
  it("is none when the project had none at that commit", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => ({
        status: 404,
        data: { message: `not answered: ${method} ${path}` } as T,
      }),
    });
    expect(await adapter.modulesAt("ledger", SHA)).toBeUndefined();
  });
});

describe("a project's modules.yaml on main (decision 0015)", () => {
  it("is read as main has it now", async () => {
    const listed = "modules:\n  - name: parser\n";
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (
          method === "GET" &&
          path === "repos/commons/ledger/contents/programme/modules.yaml?ref=main"
        ) {
          return { status: 200, data: { content: Buffer.from(listed).toString("base64") } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.modulesOnMain("ledger")).toBe(listed);
  });
});
