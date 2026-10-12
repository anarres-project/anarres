import type { Role } from "./roles.ts";

export type AcceptedWork = {
  fromRole: string;
  module: string;
  verdict: string;
  impediments: { type: string }[];
  /** Where the feedback signal that reported this work can be found. */
  feedbackSignal: string;
  /** For Research work: the role that reported the knowledge gap. */
  researchFor?: string;
};

export type Task = {
  role: Role;
  module: string;
  /** For a revision task: the feedback signal that sent the work back. */
  feedbackSignal?: string;
  /** For a Research task: the role that reported the knowledge gap. */
  researchFor?: string;
};

const MODULE_PIPELINE: readonly Role[] = [
  "architecture",
  "specification",
  "test",
  "coding",
  "reviewer",
  "security-and-quality",
];

export type RoutingDecision = { tasks: Task[] } | { alert: { reason: "no_matching_rule" } };

const NO_MATCHING_RULE = { alert: { reason: "no_matching_rule" } } as const;

export function route(work: AcceptedWork): RoutingDecision {
  if (work.verdict === "fail" || work.verdict === "blocked") return revise(work);
  if (work.fromRole === "research") return returnResearch(work);
  return advance(work);
}

/** A revision task for the role that can fix what failed work reports. */
function revise(work: AcceptedWork): RoutingDecision {
  const owner = ownerOfFailure(work);
  if (!owner) return NO_MATCHING_RULE;
  const task = { role: owner, module: work.module, feedbackSignal: work.feedbackSignal };
  return { tasks: [owner === "research" ? { ...task, researchFor: work.fromRole } : task] };
}

/** Research that passes goes back, as a revision task, to the role that reported the gap. */
function returnResearch(work: AcceptedWork): RoutingDecision {
  const reporter = MODULE_PIPELINE.find((role) => role === work.researchFor);
  if (!reporter) return NO_MATCHING_RULE;
  return { tasks: [{ role: reporter, module: work.module, feedbackSignal: work.feedbackSignal }] };
}

/** A task for the next role in the module pipeline. */
function advance(work: AcceptedWork): RoutingDecision {
  const next = (MODULE_PIPELINE as readonly string[]).indexOf(work.fromRole) + 1;
  return {
    tasks: MODULE_PIPELINE.slice(next, next + 1).map((role) => ({ role, module: work.module })),
  };
}

/**
 * Who can fix what a failed piece of work reports: the CSD AutoPM routing table, adapted for
 * modules. A row without `reporting` applies whatever else the work reports. A contract that does
 * not work goes to the Programme Architect, never to the module on its other side.
 */
const FAILURE_ROUTES: readonly { from: Role; reporting?: string; to: Role }[] = [
  { from: "architecture", reporting: "upstream_ambiguity", to: "programme-architect" },
  { from: "architecture", reporting: "architecture_impediment", to: "architecture" },
  { from: "specification", reporting: "upstream_ambiguity", to: "programme-architect" },
  { from: "specification", reporting: "architecture_impediment", to: "architecture" },
  { from: "test", reporting: "upstream_ambiguity", to: "specification" },
  { from: "coding", reporting: "test_failures", to: "coding" },
  { from: "coding", reporting: "architecture_impediment", to: "architecture" },
  { from: "reviewer", reporting: "scope_gap", to: "programme-architect" },
  { from: "reviewer", to: "coding" },
  { from: "security-and-quality", to: "coding" },
  ...MODULE_PIPELINE.map((from) => ({
    from,
    reporting: "interface_impediment",
    to: "programme-architect" as const,
  })),
  ...(["architecture", "specification", "test", "coding"] as const).map((from) => ({
    from,
    reporting: "knowledge_gap",
    to: "research" as const,
  })),
];

/**
 * When several rules match, the first owner here wins: Research, since what is learnt may change
 * any other fix, then the most upstream role.
 */
const PRECEDENCE: readonly Role[] = ["research", "programme-architect", ...MODULE_PIPELINE];

/** The role that can fix what a failed piece of work reports, if any rule covers it. */
function ownerOfFailure(work: AcceptedWork): Role | undefined {
  const routes = FAILURE_ROUTES.filter((route) => route.from === work.fromRole);
  const owners = routes
    .filter((route) => work.impediments.some((impediment) => impediment.type === route.reporting))
    .map((route) => route.to);
  const otherwise = routes.find((route) => route.reporting === undefined)?.to;
  return PRECEDENCE.find((role) => owners.includes(role)) ?? otherwise;
}
