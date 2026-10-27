import { afterEach, describe, expect, it, vi } from "vitest";
import { requestGitHub } from "../src/request.ts";

/** GitHub's answers, in turn, as `fetch` gives them. */
function answering(...answers: Response[]) {
  const fetch = vi.fn();
  for (const answer of answers) fetch.mockResolvedValueOnce(answer);
  vi.stubGlobal("fetch", fetch);
}

afterEach(() => {
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
});
