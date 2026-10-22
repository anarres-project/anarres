import { describe, expect, it } from "vitest";
import { kindOf, summary } from "./request-tally.ts";

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
