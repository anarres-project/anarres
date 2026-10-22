import { describe, expect, it } from "vitest";
import { shortfall } from "./allowance.ts";

const NOW = Date.UTC(2026, 9, 22, 10, 0, 0);
const IN_20_MINUTES = (NOW + 20 * 60_000) / 1000;

describe("the sandbox's hourly allowance, before a run starts", () => {
  it("is too little when less is left than a run needs, and says when it resets", () => {
    expect(shortfall({ used: 4_000, limit: 5_000, reset: IN_20_MINUTES }, 1_500, NOW)).toBe(
      "GitHub's hourly allowance has 1000 requests left, and a sandbox run needs about 1500: " +
        "it resets at 10:20 UTC, in 20 minutes",
    );
  });

  it("is enough when more is left than a run needs", () => {
    expect(
      shortfall({ used: 3_000, limit: 5_000, reset: IN_20_MINUTES }, 1_500, NOW),
    ).toBeUndefined();
  });
});
