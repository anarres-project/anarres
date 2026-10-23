import type { Role } from "./roles.ts";

/**
 * Where each role's work may write, for the module named in its task: the access matrix's write
 * scopes (concept §6), defined here and nowhere else.
 */
const WRITE_SCOPES: Record<Role, (module: string) => string> = {
  "programme-architect": () => "programme/",
  architecture: (module) => `modules/${module}/architecture/`,
  specification: (module) => `modules/${module}/specifications/`,
  test: (module) => `modules/${module}/tests/`,
  coding: (module) => `modules/${module}/src/`,
  reviewer: (module) => `modules/${module}/reviews/`,
  "security-and-quality": (module) => `modules/${module}/reviews/`,
  research: () => "research-briefs/",
};

/**
 * The paths among those a piece of work changes that its role may not write (concept §6). Every
 * role writes one feedback signal per task: the first file in `feedback/`, as Divlab reads it.
 */
export function outsideScope(role: Role, module: string, paths: readonly string[]): string[] {
  const signal = paths.find((path) => path.startsWith("feedback/"));
  const scope = WRITE_SCOPES[role](module);
  return paths.filter((path) => !isPlainPath(path) || (path !== signal && !path.startsWith(scope)));
}

/**
 * A path a member's work names is plain if each part is a name: none empty, none `.` or `..`, no
 * backslash. Anything else might lead somewhere other than it seems to.
 */
const isPlainPath = (path: string) =>
  !path.includes("\\") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
