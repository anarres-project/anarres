/** Each role's name as members know it. */
export const ROLE_NAMES = {
  "programme-architect": "Programme Architect",
  architecture: "Architecture",
  specification: "Specification",
  test: "Test",
  coding: "Coding",
  reviewer: "Reviewer",
  "security-and-quality": "Security & Quality",
  research: "Research",
  "integration-specification": "Integration Specification",
} as const;

export type Role = keyof typeof ROLE_NAMES;

/** Whether something read from outside, such as a label or a record, is a role Anarres has. */
export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && Object.hasOwn(ROLE_NAMES, value);
