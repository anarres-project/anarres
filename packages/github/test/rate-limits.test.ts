import { describe, expect, it } from "vitest";
import { retryAfter } from "../src/index.ts";

const NOW = Date.UTC(2026, 9, 13, 13, 0, 0);

describe("waiting out GitHub's rate limits", () => {
  it("waits as long as GitHub asks when it says how long", () => {
    expect(
      retryAfter({ status: 429, headers: new Headers({ "retry-after": "30" }), message: "" }, NOW),
    ).toBe(30_000);
  });

  it("does not retry a refusal that is not about rate limits", () => {
    expect(
      retryAfter(
        {
          status: 403,
          headers: new Headers(),
          message: "Resource not accessible by personal access token",
        },
        NOW,
      ),
    ).toBeUndefined();
  });

  it("waits a minute out of a secondary rate limit that does not say how long", () => {
    expect(
      retryAfter(
        {
          status: 403,
          headers: new Headers(),
          message: "You have exceeded a secondary rate limit and have been temporarily blocked",
        },
        NOW,
      ),
    ).toBe(60_000);
  });

  it("waits until the hourly limit resets when it is used up", () => {
    const reset = (NOW + 90_000) / 1000;
    expect(
      retryAfter(
        {
          status: 403,
          headers: new Headers({
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(reset),
          }),
          message: "API rate limit exceeded",
        },
        NOW,
      ),
    ).toBe(90_000);
  });

  it("does not wait for the hourly limit to reset when told not to, so the caller can stop at once", () => {
    const reset = (NOW + 90_000) / 1000;
    const answer = {
      status: 403,
      headers: new Headers({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) }),
      message: "API rate limit exceeded",
    };
    expect(retryAfter(answer, NOW, { waitForAllowance: false })).toBeUndefined();
  });

  it("never retries a request that succeeded, even the last one the limit allowed", () => {
    expect(
      retryAfter(
        {
          status: 201,
          headers: new Headers({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1" }),
          message: "",
        },
        NOW,
      ),
    ).toBeUndefined();
  });

  it("tries again shortly when GitHub's gateway fails", () => {
    expect(retryAfter({ status: 504, headers: new Headers(), message: "" }, NOW)).toBe(2_000);
  });

  it("tries again shortly when GitHub fails with an error of its own", () => {
    expect(retryAfter({ status: 500, headers: new Headers(), message: "" }, NOW)).toBe(2_000);
  });
});
