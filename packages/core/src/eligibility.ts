import { ROLE_NAMES, type Role } from "./roles.ts";
import { levelNeeded, type TrustLevel, trustAllows } from "./trust-levels.ts";

/** Work a member has done, or a task they hold, in a project: their part in a module. */
export type Part = { member: string; role: Role; module: string };

/** Research answers a knowledge gap: it is not a role in a module (decision 0007). */
const isRoleInModule = (role: Role) => role !== "research";

/**
 * Whether a member may take a task in a role on a module, given their trust level and everyone's
 * parts so far. A member takes one role in a module for its whole life (concept §6, decision 0007).
 */
export function mayTake(
  task: Part,
  history: readonly Part[],
  level: TrustLevel,
): { refused: string } | "allowed" {
  if (!trustAllows(level, task.role)) {
    const needed = levelNeeded(task.role);
    return {
      refused: `a ${ROLE_NAMES[task.role]} task needs ${needed === "established" ? "an" : "a"} ${needed} member, and you are ${level}`,
    };
  }
  if (!isRoleInModule(task.role)) return "allowed";
  const other = history.find(
    (part) =>
      part.member === task.member &&
      part.module === task.module &&
      isRoleInModule(part.role) &&
      part.role !== task.role,
  );
  if (other === undefined) return "allowed";
  return {
    refused: `a member takes only one role in a module, and you have worked on it as ${ROLE_NAMES[other.role]}`,
  };
}
