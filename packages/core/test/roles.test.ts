import { describe, expect, it } from "vitest";
import { isRole, ROLE_NAMES, type Role } from "../src/index.ts";

describe("role names", () => {
  it("names the Security & Quality role as members know it", () => {
    expect(ROLE_NAMES["security-and-quality"]).toBe("Security & Quality");
  });

  it("names the Programme Architect role as members know it", () => {
    expect(ROLE_NAMES["programme-architect"]).toBe("Programme Architect");
  });

  it("names the Integration Specification role as members know it (decision 0017)", () => {
    expect(ROLE_NAMES["integration-specification"]).toBe("Integration Specification");
  });

  it("names the Integration Test role as members know it (decision 0017)", () => {
    expect(ROLE_NAMES["integration-test"]).toBe("Integration Test");
  });

  it("names the Integration Review role as members know it (decision 0017)", () => {
    expect(ROLE_NAMES["integration-review"]).toBe("Integration Review");
  });

  it("names the Research role as members know it", () => {
    expect(ROLE_NAMES.research).toBe("Research");
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

describe("whether something read is a role", () => {
  it("is for a role Anarres has", () => {
    expect(isRole("reviewer")).toBe(true);
  });

  it.each([["bystander"], [12], ["toString"]])("is not for %j", (value) => {
    expect(isRole(value)).toBe(false);
  });
});
