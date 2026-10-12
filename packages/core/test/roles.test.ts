import { describe, expect, it } from "vitest";
import { ROLE_NAMES, type Role } from "../src/index.ts";

describe("role names", () => {
  it("names the Security & Quality role as members know it", () => {
    expect(ROLE_NAMES["security-and-quality"]).toBe("Security & Quality");
  });

  it.each<[Role, string]>([
    ["architecture", "Architecture"],
    ["specification", "Specification"],
    ["test", "Test"],
    ["coding", "Coding"],
    ["reviewer", "Reviewer"],
  ])("names the %s role %s", (role, name) => {
    expect(ROLE_NAMES[role]).toBe(name);
  });
});
