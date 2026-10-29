import { afterEach, describe, expect, it, vi } from "vitest";
import { requestGitHub } from "../src/request.ts";

/** GitHub's answers, in turn, as `fetch` gives them. */
function answering(...answers: Response[]) {
  const fetch = vi.fn();
  for (const answer of answers) fetch.mockResolvedValueOnce(answer);
  vi.stubGlobal("fetch", fetch);
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("asking GitHub", () => {
  it("says when GitHub asks it to wait, for how long and why, apart from what it prints", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    answering(
      new Response(JSON.stringify({ message: "You have exceeded a secondary rate limit" }), {
        status: 403,
        headers: { "retry-after": "0" },
      }),
      new Response("{}", { status: 201 }),
    );
    await requestGitHub("t0k3n", "POST", "repos/commons/ledger/issues", { title: "A task" });
    expect(log.mock.calls).toEqual([
      [
        "GitHub answered POST repos/commons/ledger/issues with 403 (You have exceeded a secondary rate limit): asking again in 0 s",
      ],
    ]);
  });

  it("asks again for a write that a repository rule refused without running, as it timed out", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    const timedOut =
      "Repository rule violations found\n\nThe rule did not run because of a timeout.\n\n";
    answering(
      new Response(JSON.stringify({ message: timedOut }), { status: 409 }),
      new Response("{}", { status: 201 }),
    );
    const asked = requestGitHub(
      "t0k3n",
      "PUT",
      "repos/commons/ledger/contents/events/000071.json",
      {
        content: "e30=",
      },
    );
    await vi.runAllTimersAsync();
    expect((await asked).status).toBe(201);
  });

  it("gives the allowance GitHub's answer says is used, of which resource, and when it resets", async () => {
    answering(
      new Response("{}", {
        status: 200,
        headers: {
          "x-ratelimit-resource": "core",
          "x-ratelimit-used": "126",
          "x-ratelimit-limit": "5000",
          "x-ratelimit-reset": "1793350800",
        },
      }),
    );
    const answer = await requestGitHub("t0k3n", "GET", "repos/commons/ledger/issues/7");
    expect(answer.allowance).toEqual({
      resource: "core",
      used: 126,
      limit: 5000,
      reset: 1793350800,
    });
  });

  it("gives no allowance for an answer that does not say, such as a failing gateway's page", async () => {
    answering(new Response("<html>Bad gateway</html>", { status: 502 }));
    const answer = await requestGitHub("t0k3n", "POST", "repos/commons/ledger/issues", {});
    expect(answer.allowance).toBeUndefined();
  });
});
