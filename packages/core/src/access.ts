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
  const scope = writeScope(role, module);
  return paths.filter((path) => !isPlainPath(path) || (path !== signal && !path.startsWith(scope)));
}

/**
 * A path a member's work names is plain if each part is a name: none empty, none `.` or `..`, no
 * backslash. Anything else might lead somewhere other than it seems to.
 */
const isPlainPath = (path: string) =>
  !path.includes("\\") &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");

/** Whether a role's work may read a path in the project, for the module named in its task. */
export function mayRead(
  role: Role,
  module: string,
  path: string,
  task: { continuation?: boolean } = {},
): boolean {
  return isPlainPath(path) && readScope(role, module, task).some((scope) => path.startsWith(scope));
}

/**
 * What each role's work may read, for the module named in its task: the access matrix's read
 * scopes (concept §6), defined here and nowhere else. A module's requirement slice is
 * `programme/slices/<module>/`. Contracts wait for the Programme Architect's modules.yaml; what a
 * Research task reads, its question names.
 */
const READ_SCOPES: Record<Role, (module: string) => string[]> = {
  "programme-architect": () => ["requirements/"],
  architecture: (module) => [`programme/slices/${module}/`],
  specification: (module) => [`programme/slices/${module}/`, `modules/${module}/architecture/`],
  test: (module) => [
    `programme/slices/${module}/`,
    `modules/${module}/architecture/`,
    `modules/${module}/specifications/`,
  ],
  coding: (module) => [`modules/${module}/specifications/`, `modules/${module}/tests/`],
  reviewer: (module) => [
    `programme/slices/${module}/`,
    `modules/${module}/specifications/`,
    `modules/${module}/src/`,
  ],
  "security-and-quality": (module) => [
    `programme/slices/${module}/`,
    `modules/${module}/architecture/`,
    `modules/${module}/src/`,
  ],
  research: () => [],
};

/** The places a role's work may read, for the module named in its task, a continuation or not. */
export function readScope(
  role: Role,
  module: string,
  task: { continuation?: boolean } = {},
): string[] {
  // A continuation of partial work reads its role's own place too (decision 0008).
  return [...READ_SCOPES[role](module), ...(task.continuation ? [writeScope(role, module)] : [])];
}

/** The place a role's work writes, for the module named in its task. */
export function writeScope(role: Role, module: string): string {
  return WRITE_SCOPES[role](module);
}
