import { describe, expect, it } from "vitest";
import { mayStart } from "./governance-alone.ts";

const scenario = (...tags: string[]) => ({ tags: tags.map((name) => ({ name })) });

describe("scenarios that change the sandbox's governance file", () => {
  it("wait while any other scenario runs, since the file applies to every scenario", () => {
    expect(mayStart(scenario("@governance"), [scenario()])).toBe(false);
  });

  it("leave other scenarios to run alongside each other", () => {
    expect(mayStart(scenario(), [scenario(), scenario("@claiming")])).toBe(true);
  });

  it("hold back every other scenario while one runs", () => {
    expect(mayStart(scenario(), [scenario("@governance")])).toBe(false);
  });
});
