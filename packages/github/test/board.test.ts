import { describe, expect, it } from "vitest";
import { GitHubAdapter, issueForTask } from "../src/index.ts";

/** A project's issues as GitHub lists them, a hundred to a page, newest first. */
function githubWithIssues(issues: { body: string; labels: string[] }[]) {
  return async <T>(_token: string, method: string, path: string) => {
    const answer = (status: number, data: unknown) => ({ status, data: data as T });
    const listing = path.match(
      /^repos\/commons\/ledger\/issues\?state=all&per_page=100&page=(\d+)$/,
    );
    if (method === "GET" && listing) {
      const page = Number(listing[1]);
      return answer(
        200,
        issues
          .slice((page - 1) * 100, page * 100)
          .map(({ body, labels }) => ({ body, labels: labels.map((name) => ({ name })) })),
      );
    }
    return answer(404, { message: `the fake does not answer ${method} ${path}` });
  };
}

const taskFrom = (decidedOn: string) =>
  issueForTask({ project: "ledger", role: "test", module: "parser", decidedOn });

describe("the decisions a project's issues show Divlab acted on", () => {
  it("are the decisions its tasks, alerts and finished modules came from", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithIssues([
        taskFrom("feedback/FB-2.md"),
        { body: "A person's own issue", labels: [] },
        taskFrom("feedback/FB-1.md"),
      ]),
    });
    expect(await adapter.actedOn("ledger")).toEqual(["feedback/FB-2.md", "feedback/FB-1.md"]);
  });

  it("are only those on issues Divlab posted, which carry its labels", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithIssues([{ ...taskFrom("feedback/FB-3.md"), labels: [] }]),
    });
    expect(await adapter.actedOn("ledger")).toEqual([]);
  });

  it("are read from every page of the project's issues", async () => {
    const issues = Array.from({ length: 150 }, (_, i) => taskFrom(`feedback/FB-${i + 1}.md`));
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithIssues(issues),
    });
    expect(await adapter.actedOn("ledger")).toHaveLength(150);
  });
});
