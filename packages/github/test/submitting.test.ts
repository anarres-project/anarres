import { describe, expect, it } from "vitest";
import { GitHubAdapter } from "../src/index.ts";

/** GitHub answering the requests a test names, in order of matching; anything else is a 404. */
const github =
  (answers: Record<string, unknown>, seen: unknown[] = []) =>
  async <T>(_token: string, method: string, path: string, body?: unknown) => {
    seen.push([method, path, body]);
    const answer = answers[`${method} ${path}`];
    return answer === undefined
      ? { status: 404, data: { message: `not answered: ${method} ${path}` } as T }
      : { status: 200, data: answer as T };
  };

describe("submitting through GitHub's API, with the member's own login", () => {
  it("forks the project into the member's account, or finds the fork they have", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: github({
        "POST repos/commons/ledger/forks": { full_name: "alice/ledger" },
        "GET repos/alice/ledger/branches/main": { name: "main" },
      }),
    });
    expect(await adapter.forkOf("ledger")).toBe("alice/ledger");
  });

  it("branches from the fork's main", async () => {
    const seen: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: github(
        {
          "GET repos/alice/ledger/git/ref/heads/main": { object: { sha: "f0rk" } },
          "POST repos/alice/ledger/git/refs": {},
        },
        seen,
      ),
    });
    await adapter.branch("alice/ledger", "anarres/task-4");
    expect(seen.at(-1)).toEqual([
      "POST",
      "repos/alice/ledger/git/refs",
      { ref: "refs/heads/anarres/task-4", sha: "f0rk" },
    ]);
  });

  it("asks for the branch as a write safe to repeat, since asking again finds the branch made", async () => {
    const asked: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(
        _token: string,
        method: string,
        path: string,
        _body?: unknown,
        options?: { repeatable?: boolean },
      ) => {
        if (method === "POST") asked.push(options);
        return method === "GET"
          ? { status: 200, data: { object: { sha: "f0rk" } } as T }
          : { status: 201, data: {} as T };
      },
    });
    await adapter.branch("alice/ledger", "anarres/task-4");
    expect(asked).toEqual([{ repeatable: true }]);
  });

  it("keeps the branch the member submitted to before, such as a draft's", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) =>
        method === "GET" && path === "repos/alice/ledger/git/ref/heads/main"
          ? { status: 200, data: { object: { sha: "f0rk" } } as T }
          : method === "POST" && path === "repos/alice/ledger/git/refs"
            ? { status: 422, data: { message: "Reference already exists" } as T }
            : { status: 404, data: {} as T },
    });
    await expect(adapter.branch("alice/ledger", "anarres/task-4")).resolves.toBeUndefined();
  });

  it.each([
    ["a new file", undefined, {}],
    ["one the branch has already", { sha: "0ld" }, { sha: "0ld" }],
  ])("puts %s on the branch, as the member", async (_what, existing, replaced) => {
    const seen: unknown[] = [];
    const where = "repos/alice/ledger/contents/modules/parser/src/lexer.ts";
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: github(
        {
          ...(existing ? { [`GET ${where}?ref=anarres%2Ftask-4`]: existing } : {}),
          [`PUT ${where}`]: {},
        },
        seen,
      ),
    });
    await adapter.putFile("alice/ledger", "anarres/task-4", "modules/parser/src/lexer.ts", "x");
    expect(seen.at(-1)).toEqual([
      "PUT",
      where,
      {
        message: "modules/parser/src/lexer.ts",
        content: Buffer.from("x").toString("base64"),
        branch: "anarres/task-4",
        ...replaced,
      },
    ]);
  });

  it("asks the project to merge the branch, giving the pull request's number", async () => {
    const seen: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: github({ "POST repos/commons/ledger/pulls": { number: 17 } }, seen),
    });
    expect(
      await adapter.openPullRequest("ledger", "alice:anarres/task-4", "Coding work", false),
    ).toBe("17");
    expect(seen.at(-1)).toEqual([
      "POST",
      "repos/commons/ledger/pulls",
      { title: "Coding work", head: "alice:anarres/task-4", base: "main", draft: false },
    ]);
  });

  it("gives the pull request the branch has already, as after a draft", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) =>
        method === "POST"
          ? { status: 422, data: { message: "A pull request already exists" } as T }
          : path === "repos/commons/ledger/pulls?head=alice%3Aanarres%2Ftask-4&state=open"
            ? { status: 200, data: [{ number: 12 }] as T }
            : { status: 404, data: {} as T },
    });
    expect(
      await adapter.openPullRequest("ledger", "alice:anarres/task-4", "Coding work", false),
    ).toBe("12");
  });

  it("marks the member's draft ready when they submit the finished work to it", async () => {
    const seen: unknown[] = [];
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string, body?: unknown) => {
        seen.push([method, path, body]);
        if (method === "POST" && path === "repos/commons/ledger/pulls") {
          return { status: 422, data: { message: "A pull request already exists" } as T };
        }
        if (path === "repos/commons/ledger/pulls?head=alice%3Aanarres%2Ftask-4&state=open") {
          return { status: 200, data: [{ number: 12, draft: true, node_id: "PR_kw12" }] as T };
        }
        if (method === "POST" && path === "graphql")
          return { status: 200, data: { data: {} } as T };
        return { status: 404, data: {} as T };
      },
    });
    await adapter.openPullRequest("ledger", "alice:anarres/task-4", "Coding work", false);
    expect(seen.at(-1)).toEqual([
      "POST",
      "graphql",
      {
        query:
          "mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId } }",
        variables: { id: "PR_kw12" },
      },
    ]);
  });

  it("fails, saying why, if GitHub will not mark the draft ready", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) =>
        method === "POST" && path === "repos/commons/ledger/pulls"
          ? { status: 422, data: { message: "A pull request already exists" } as T }
          : path.includes("pulls?head=")
            ? { status: 200, data: [{ number: 12, draft: true, node_id: "PR_kw12" }] as T }
            : path === "graphql"
              ? { status: 200, data: { errors: [{ message: "Resource not accessible" }] } as T }
              : { status: 404, data: {} as T },
    });
    await expect(
      adapter.openPullRequest("ledger", "alice:anarres/task-4", "Coding work", false),
    ).rejects.toThrow("Resource not accessible");
  });
});
