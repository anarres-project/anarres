import { describe, expect, it } from "vitest";
import { recording, standingIn, unreached } from "./sandbox-coverage.ts";

describe("the GitHub paths the sandbox's scenarios reach (decision 0018)", () => {
  it("names each adapter method no sandbox scenario called", () => {
    expect(unreached(["merge", "post", "close"], new Set(["post"]), {})).toEqual([
      "merge",
      "close",
    ]);
  });

  it("leaves out a method the sandbox cannot reach, as its exceptions say why", () => {
    expect(
      unreached(["merge", "tellLeaseRanOut"], new Set(["merge"]), {
        tellLeaseRanOut: "a lease runs 24 hours, longer than a sandbox run",
      }),
    ).toEqual([]);
  });
});

describe("recording which of the fake's methods the system calls (decision 0018)", () => {
  it("notes each method called, and gives the fake's own answer", async () => {
    const called = new Set<string>();
    const fake = {
      count: 2,
      async post(n: number) {
        return n + this.count;
      },
    };
    expect(await recording(fake, called).post(1)).toBe(3);
    expect([...called]).toEqual(["post"]);
  });

  it("passes what is not a method through, noting nothing", () => {
    const called = new Set<string>();
    expect(recording({ count: 2 }, called).count).toBe(2);
    expect([...called]).toEqual([]);
  });
});

describe("the adapter's methods the fake stands in for (decision 0018)", () => {
  it("are the methods both have, and none of the adapter's own workings", () => {
    class Adapter {
      merge() {}
      post() {}
      everyPage() {}
    }
    class Fake {
      merge() {}
      post() {}
      putOffNextMerge() {}
    }
    expect(standingIn(Adapter, Fake)).toEqual(["merge", "post"]);
  });
});
