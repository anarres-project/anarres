import type { Role } from "./roles.ts";

/**
 * Where each role's work may write, for the module named in its task: the access matrix's write
 * scopes (concept §6), defined here and nowhere else.
 */
/** The whole of a project, as the Programme Architect's tasks name it: one per project. */
export const PROGRAMME = "programme";

const WRITE_SCOPES: Record<Role, (module: string) => string> = {
  "programme-architect": () => `${PROGRAMME}/`,
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
export function mayRead(role: Role, module: string, path: string, task: ReadingTask = {}): boolean {
  return isPlainPath(path) && readScope(role, module, task).some((scope) => path.startsWith(scope));
}

/**
 * What each role's work may read, for the module named in its task: the access matrix's read
 * scopes (concept §6), defined here and nowhere else. A module's requirement slice is
 * `programme/slices/<module>/`. Architecture and Specification read the contracts their module
 * provides and uses (decision 0014); what a Research task reads, its question names.
 */
const READ_SCOPES: Record<Role, (module: string, contracts: readonly string[]) => string[]> = {
  "programme-architect": () => ["requirements/"],
  architecture: (module, contracts) => [
    `programme/slices/${module}/`,
    ...contractPlaces(contracts),
  ],
  specification: (module, contracts) => [
    `programme/slices/${module}/`,
    `modules/${module}/architecture/`,
    ...contractPlaces(contracts),
  ],
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
export function readScope(role: Role, module: string, task: ReadingTask = {}): string[] {
  // A continuation of partial work reads its role's own place too (decision 0008), as does a
  // revision of work whose inputs changed (decision 0015): the work already done is there.
  return [
    ...READ_SCOPES[role](module, task.contracts ?? []),
    ...(task.continuation || task.staleRevision ? [writeScope(role, module)] : []),
  ];
}

/**
 * What a task's reading depends on besides its role and module: whether it continues partial
 * work, or revises work whose inputs changed (decision 0015), and the contracts its module
 * provides and uses (decision 0014).
 */
export type ReadingTask = {
  continuation?: boolean;
  staleRevision?: boolean;
  contracts?: readonly string[];
};

/** Each contract is a folder of its own (decision 0014). */
const contractPlaces = (contracts: readonly string[]) =>
  contracts.map((contract) => `${PROGRAMME}/contracts/${contract}/`);

/** The place a role's work writes, for the module named in its task. */
export function writeScope(role: Role, module: string): string {
  return WRITE_SCOPES[role](module);
}

/** The task's inputs among the paths changed since it was posted (decision 0015). */
export function changedInputs(
  role: Role,
  module: string,
  task: ReadingTask,
  changed: readonly string[],
): string[] {
  return changed.filter((path) => mayRead(role, module, path, task));
}
