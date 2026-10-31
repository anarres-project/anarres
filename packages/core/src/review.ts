import { isRoleInModule, type Part } from "./eligibility.ts";
import { isPlainName } from "./feedback-signal.ts";
import { memberFor, TRUST_LEVELS, type TrustLevel, trustLevelOf } from "./trust-levels.ts";

/**
 * Whether work on a project's module needs a person's approval before Divlab merges it: PDC
 * coordinators name such modules, per project, in the governance file (decision 0016). A file
 * or list that cannot be read holds everything, until a coordinator fixes it.
 */
export function needsReview(file: unknown, project: string, module: string): boolean {
  const named = modulesNeedingReview(file);
  return named === "unreadable" || (named.get(project) ?? []).includes(module);
}

/** Whether the governance file's list of modules needing review cannot be read. */
export function reviewListUnreadable(file: unknown): boolean {
  return modulesNeedingReview(file) === "unreadable";
}

/** A review given on a pull request: of a commit, approving it, asking for changes, or dismissed. */
export type Review = {
  reviewer: string;
  commit: string;
  verdict: "approved" | "changes requested" | "dismissed";
};

/** The approvals still standing on a pull request, from its reviews oldest first. */
export function approvalsStanding(
  reviews: readonly Review[],
): { reviewer: string; commit: string }[] {
  // As GitHub has it: a reviewer's latest review is the one that stands.
  const latest = new Map<string, Review>();
  for (const review of reviews) latest.set(review.reviewer, review);
  return [...latest.values()]
    .filter(({ verdict }) => verdict === "approved")
    .map(({ reviewer, commit }) => ({ reviewer, commit }));
}

/** Whether a person's approval of work counts towards merging it. */
export function approvalCounts(
  file: unknown,
  reviewer: string,
  work: { author: string; module: string },
  history: readonly Part[],
): boolean {
  // Accounts PDC coordinators linked are one member, for every rule (decision 0007).
  const member = memberFor(file, reviewer);
  if (member === memberFor(file, work.author)) return false;
  const hasPart = history.some(
    (part) => part.member === member && part.module === work.module && isRoleInModule(part.role),
  );
  if (hasPart) return false;
  return TRUST_LEVELS.indexOf(trustLevelOf(file, member)) >= TRUST_LEVELS.indexOf(REVIEWER_LEVEL);
}

/** The lowest trust level whose approval counts (decision 0016). */
const REVIEWER_LEVEL: TrustLevel = "trusted";

/** The modules of each project the governance file names for review, read as data. */
const modulesNeedingReview = (file: unknown) => modulesNamed(file, "review");

/** The modules of each project a list in the governance file names, read as data. */
function modulesNamed(file: unknown, list: string): Map<string, string[]> | "unreadable" {
  if (!isRecord(file)) return "unreadable";
  if (!Object.hasOwn(file, list)) return new Map();
  const listed = file[list];
  if (!isRecord(listed)) return "unreadable";
  const named = new Map<string, string[]>();
  for (const [project, modules] of Object.entries(listed)) {
    if (!Array.isArray(modules)) return "unreadable";
    if (!modules.every((one) => typeof one === "string" && isPlainName(one))) return "unreadable";
    named.set(project, modules);
  }
  return named;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Whether PDC coordinators name a project's module as high-risk (decision 0019). A list that
 * cannot be read makes every module high-risk, until a coordinator fixes it.
 */
export function isHighRisk(file: unknown, project: string, module: string): boolean {
  const named = modulesNamed(file, "highRisk");
  return named === "unreadable" || (named.get(project) ?? []).includes(module);
}

/** Whether the governance file's list of high-risk modules cannot be read (decision 0019). */
export function highRiskListUnreadable(file: unknown): boolean {
  return modulesNamed(file, "highRisk") === "unreadable";
}
