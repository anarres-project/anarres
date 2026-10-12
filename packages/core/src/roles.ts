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
} as const;

export type Role = keyof typeof ROLE_NAMES;
