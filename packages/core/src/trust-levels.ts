import type { Role } from "./roles.ts";

/** How far PDC coordinators trust a member, lowest first (concept §11). */
export const TRUST_LEVELS = ["new", "established", "trusted", "pdc-coordinator"] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

/** The lowest trust level that may take each role (concept §11, decision 0007). */
const LEVEL_NEEDED: Record<Role, TrustLevel> = {
  specification: "new",
  test: "new",
  coding: "new",
  research: "new",
  architecture: "established",
  reviewer: "established",
  "security-and-quality": "trusted",
  "programme-architect": "trusted",
};

/** The lowest trust level that may take a role. */
export const levelNeeded = (role: Role): TrustLevel => LEVEL_NEEDED[role];

/** Whether a member at a trust level may take a task in a role. */
export function trustAllows(level: TrustLevel, role: Role): boolean {
  return TRUST_LEVELS.indexOf(level) >= TRUST_LEVELS.indexOf(levelNeeded(role));
}

/** A member's trust level, as the governance file records it: read as data, never assumed. */
export function trustLevelOf(file: unknown, member: string): TrustLevel {
  const level = recorded(recorded(recorded(file, "members"), member), "level");
  return TRUST_LEVELS.find((known) => known === level) ?? "new";
}

/** What an object read from outside records under a name of its own, if it is an object. */
const recorded = (value: unknown, name: string): unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.hasOwn(value, name)
    ? (value as Record<string, unknown>)[name]
    : undefined;
