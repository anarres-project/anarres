import { describe, expect, it } from "vitest";
import { ROLE_NAMES } from "../src/index.ts";

describe("role names", () => {
  it("names the Security & Quality role as members know it", () => {
    expect(ROLE_NAMES["security-and-quality"]).toBe("Security & Quality");
  });
});
