import type { Role } from "./roles.ts";

export type AcceptedWork = {
  fromRole: string;
  module: string;
  verdict: string;
  impediments: { type: string }[];
};

export type Task = {
  role: Role;
  module: string;
};

const MODULE_PIPELINE: readonly Role[] = [
  "architecture",
  "specification",
  "test",
  "coding",
  "reviewer",
  "security-and-quality",
];

export function route(work: AcceptedWork): Task[] {
  if (work.verdict === "fail" || work.verdict === "blocked")
    return [{ role: ownerOfFailure(work), module: work.module }];
  const next = (MODULE_PIPELINE as readonly string[]).indexOf(work.fromRole) + 1;
  return MODULE_PIPELINE.slice(next, next + 1).map((role) => ({ role, module: work.module }));
}

/** The role that can fix what a failed piece of work reports. */
function ownerOfFailure(work: AcceptedWork): Role {
  const reports = (type: string) => work.impediments.some((impediment) => impediment.type === type);
  if (reports("architecture_impediment") && !reports("upstream_ambiguity")) return "architecture";
  if (reports("scope_gap")) return "programme-architect";
  if (reports("test_failures")) return "coding";
  if (work.fromRole === "reviewer" || work.fromRole === "security-and-quality") return "coding";
  return work.fromRole === "test" ? "specification" : "programme-architect";
}
