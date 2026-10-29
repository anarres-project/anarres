import { describe, expect, it } from "vitest";
import { allowanceSaid, countingRequests, GitHubAdapter, kindOf, summary } from "../src/index.ts";

describe("the kind of request a sandbox run makes", () => {
  it("is its method and what it asks for in the repository, without the repository's name", () => {
    expect(kindOf("GET", "repos/anarres-sandbox/ledger-mvjb8bef/issues?labels=state:ready")).toBe(
      "GET issues",
    );
  });

  it("counts requests about different issues, pull requests or runs as one kind", () => {
    expect(
      kindOf("GET", "repos/anarres-sandbox/ledger-mvjb8bef/actions/runs/39747493613/jobs"),
    ).toBe("GET actions/runs/{n}/jobs");
  });

  it("counts requests about different files or commits as one kind", () => {
    expect(
      kindOf("PUT", "repos/anarres-sandbox-members/ledger-mvjb8bef/contents/feedback/parser-s3.md"),
    ).toBe("PUT contents/…");
    expect(kindOf("GET", "repos/anarres-sandbox/ledger-mvjb8bef/git/trees/9f3c2e1")).toBe(
      "GET git/trees/…",
    );
  });
});

describe("a sandbox run's requests, summed up", () => {
  it("gives the total, then each kind, the most made first", () => {
    expect(
      summary(
        new Map([
          ["POST issues", 2],
          ["GET issues", 40],
        ]),
      ),
    ).toEqual(["42 requests to GitHub", "  40 GET issues", "   2 POST issues"]);
  });
});

describe("counting a run's requests to GitHub", () => {
  it("tallies each request it passes on, by kind", async () => {
    const answered: string[] = [];
    const counted = countingRequests(async <T>(_token: string, method: string, path: string) => {
      answered.push(`${method} ${path}`);
      return { status: 200, data: {} as T };
    });
    await counted.request("t", "GET", "repos/commons/ledger/issues/4/comments");
    await counted.request("t", "GET", "repos/commons/ledger/issues/5/comments");
    await counted.request("t", "POST", "repos/commons/ledger/issues");
    expect(answered).toHaveLength(3);
    expect(summary(counted.tally)).toEqual([
      "3 requests to GitHub",
      "  2 GET issues/{n}/comments",
      "  1 POST issues",
    ]);
  });
});

describe("counting a run's downloads from GitHub", () => {
  it("tallies each download it passes on with the run's requests, as GitHub counts it too", async () => {
    const counted = countingRequests(
      async <T>() => ({ status: 200, data: {} as T }),
      async () => new Uint8Array([1]),
    );
    await counted.download("t", "repos/commons/ledger/actions/artifacts/77/zip");
    await counted.request("t", "GET", "repos/commons/ledger/issues/4");
    expect(summary(counted.tally)).toEqual([
      "2 requests to GitHub",
      "  1 GET actions/artifacts/{n}/zip",
      "  1 GET issues/{n}",
    ]);
  });
});

describe("the allowance a run's requests were counted against", () => {
  it("is what GitHub's last answer said, read from the requests themselves", async () => {
    const answers = [
      { resource: "core", used: 125, limit: 5000, reset: 1_793_052_000 },
      { resource: "core", used: 126, limit: 5000, reset: 1_793_052_000 },
    ];
    const counted = countingRequests(async <T>() => {
      const allowance = answers.shift();
      return { status: 200, data: {} as T, ...(allowance === undefined ? {} : { allowance }) };
    });
    await counted.request("t", "GET", "repos/commons/ledger/issues/4");
    await counted.request("t", "GET", "repos/commons/ledger/issues/5");
    expect(counted.lastAllowance()).toEqual({
      resource: "core",
      used: 126,
      limit: 5000,
      reset: 1_793_052_000,
    });
  });

  it("stays the last that said, when a later answer does not", async () => {
    const answers = [{ resource: "core", used: 125, limit: 5000, reset: 1_793_052_000 }];
    const counted = countingRequests(async <T>() => {
      const allowance = answers.shift();
      return { status: 200, data: {} as T, ...(allowance === undefined ? {} : { allowance }) };
    });
    await counted.request("t", "GET", "repos/commons/ledger/issues/4");
    await counted.request("t", "GET", "repos/commons/ledger/issues/5");
    expect(counted.lastAllowance()?.used).toBe(125);
  });
});

describe("the allowance a run has used", () => {
  it("is GitHub's reading of the token's hourly allowance, which reading does not use up", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>(_token: string, method: string, path: string) => {
        if (method === "GET" && path === "rate_limit") {
          const core = { used: 4210, limit: 5000, reset: 1_793_052_000 };
          return { status: 200, data: { resources: { core } } as T };
        }
        return { status: 404, data: { message: `not answered: ${method} ${path}` } as T };
      },
    });
    expect(await adapter.allowance()).toEqual({ used: 4210, limit: 5000, reset: 1_793_052_000 });
  });
});

describe("an allowance, as a run's log says it", () => {
  it("names the resource, how much is used of how much, and when it resets in UTC", () => {
    expect(
      allowanceSaid({
        resource: "core",
        used: 126,
        limit: 5000,
        reset: Date.UTC(2026, 9, 29, 9, 31) / 1000,
      }),
    ).toBe("core 126 of 5000 used (resets 09:31 UTC)");
  });
});
