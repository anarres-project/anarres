import { PROGRAMME } from "./access.ts";
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
  /** Handed over part done (decision 0008). */
  partial?: true;
  /** For the programme's Programme Architect work: the modules its modules.yaml starts (0013). */
  modulesToStart?: string[];
  /** The task's inputs that changed after it was posted (decision 0015). */
  inputsChanged?: string[];
  /** Too much changed on main since the task was posted to tell whether its inputs did (0015). */
  inputsUnchecked?: true;
  /** For Integration Test work: the module its tests found a defect in (decision 0017). */
  moduleAtFault?: string;
  /** The module at fault is not one main's modules.yaml lists, as Divlab found (0017). */
  moduleAtFaultUnlisted?: true;
  /** Security & Quality's work on the last of the programme's modules not yet done (0017). */
  lastModule?: true;
  /** For integration work: the modules not done again since they were reopened (decision 0017). */
  modulesReopened?: string[];
  /** For integration work: main's modules.yaml could not be read, so who is done is unknown. */
  modulesUnreadable?: true;
  /** The programme's integration had begun before a module was reopened (decision 0017). */
  integrationBegun?: true;
  /** The contracts the module provides or uses revised after the task was posted (0015). */
  contractsRevised?: string[];
  /** For the Programme Architect's work: its revised contracts, and the modules they send back
   * to Architecture now (0015). */
  contractRevision?: { contracts: string[]; modules: string[] };
};

export type Task = {
  role: Role;
  module: string;
  /** For a revision task: the feedback signal that sent the work back. */
  feedbackSignal?: string;
  /** For a Research task: the role that reported the knowledge gap. */
  researchFor?: string;
  /** A continuation of partial work, which also reads its role's own place (decision 0008). */
  continuation?: true;
  /** A revision of work whose inputs changed, which reads the work done too (decision 0015). */
  staleRevision?: true;
  /** A revision after research, which reads the module's research briefs too. */
  afterResearch?: true;
};

const MODULE_PIPELINE = [
  "architecture",
  "specification",
  "test",
  "coding",
  "reviewer",
  "security-and-quality",
] as const satisfies readonly Role[];

/** The programme's integration pipeline, once every module is done (decision 0017). */
export const INTEGRATION_PIPELINE = [
  "integration-specification",
  "integration-test",
  "integration-review",
] as const satisfies readonly Role[];

/** The role a module starts with: the first of its pipeline (decision 0013). */
export const FIRST_ROLE: Role = MODULE_PIPELINE[0];

export type RoutingDecision =
  | { tasks: Task[] }
  | { moduleDone: true; tasks?: Task[] }
  | {
      alert: {
        reason:
          | "no_matching_rule"
          | "re_run_limit"
          | "no_module_at_fault"
          | "unlisted_module_at_fault";
      };
    };

/** The rule that decided a routing decision. */
export type Reason =
  | { rule: "passed" }
  | { rule: "modules_listed" }
  | { rule: "partial" }
  | { rule: "pipeline_complete" }
  | { rule: "reported"; impediment: string }
  | { rule: "failed" }
  | { rule: "research_returned" }
  | { rule: "no_matching_rule" }
  | { rule: "no_module_at_fault" }
  | { rule: "integration_held"; modules: string[] }
  | { rule: "modules_unreadable" }
  | { rule: "unlisted_module_at_fault"; module: string }
  | { rule: "re_run_limit"; role: Role }
  | { rule: "inputs_changed"; inputs: string[] }
  | { rule: "inputs_unchecked" }
  | { rule: "contract_revised"; contracts: string[] };

/** A routing decision and the reason for it. */
export type Ruling = { decision: RoutingDecision; reason: Reason };

const NO_RULE_COVERS_IT: Ruling = {
  decision: { alert: { reason: "no_matching_rule" } },
  reason: { rule: "no_matching_rule" },
};

export function route(work: AcceptedWork): RoutingDecision {
  return rule(work).decision;
}

/** Blocked work is routed just as failed work is. */
export const failed = (work: Pick<AcceptedWork, "verdict">) =>
  work.verdict === "fail" || work.verdict === "blocked";

export function rule(work: AcceptedWork): Ruling {
  if (work.contractsRevised?.length && !failedAboveArchitecture(work)) {
    return reviseArchitecture(work, work.contractsRevised);
  }
  if (work.partial) return continuation(work);
  if (failed(work)) return revise(work);
  // Failed or part-done work goes where those rules send it, the most upstream (decision 0015).
  // Integration work finishes as it is: integration runs again once every module is done (0017).
  const integrating = (INTEGRATION_PIPELINE as readonly string[]).includes(work.fromRole);
  if (work.inputsChanged?.length && !integrating) {
    return {
      decision: staleRevision(work),
      reason: { rule: "inputs_changed", inputs: work.inputsChanged },
    };
  }
  if (work.inputsUnchecked && !integrating)
    return { decision: staleRevision(work), reason: { rule: "inputs_unchecked" } };
  if (work.fromRole === "research") return returnResearch(work);
  if (work.modulesToStart !== undefined) return startModules(work, work.modulesToStart);
  return advance(work);
}

/**
 * Partial work moves nothing on: its task is posted again for the same role, to continue it
 * from its handover (decision 0008).
 */
function continuation(work: AcceptedWork): Ruling {
  const task: Task = {
    role: work.fromRole as Role,
    module: work.module,
    feedbackSignal: work.feedbackSignal,
    continuation: true,
  };
  return { decision: { tasks: [task] }, reason: { rule: "partial" } };
}

/**
 * Work whose inputs changed after its task was posted, or may have, is revised by the same role,
 * with the new inputs, instead of moving on (decision 0015).
 */
function staleRevision(work: AcceptedWork): RoutingDecision {
  const task: Task = {
    role: work.fromRole as Role,
    module: work.module,
    feedbackSignal: work.feedbackSignal,
    staleRevision: true,
  };
  return { tasks: [task] };
}

/**
 * A revised contract sends each module providing or using it back to Architecture, the first role
 * that reads contracts, ahead of any other revision (decision 0015).
 */
function reviseArchitecture(work: AcceptedWork, contracts: string[]): Ruling {
  const task: Task = {
    role: "architecture",
    module: work.module,
    feedbackSignal: work.feedbackSignal,
    staleRevision: true,
  };
  return { decision: { tasks: [task] }, reason: { rule: "contract_revised", contracts } };
}

/** A revision task for the role that can fix what failed work reports. */
function revise(work: AcceptedWork): Ruling {
  const matched = failureRoute(work);
  if (!matched) return NO_RULE_COVERS_IT;
  const owner = matched.to;
  // A defect an integration test finds goes back to the module at fault (decision 0017), and
  // without one named, to a PDC coordinator: Divlab never guesses which.
  if (work.module === PROGRAMME && owner === "specification" && work.moduleAtFault === undefined) {
    return {
      decision: { alert: { reason: "no_module_at_fault" } },
      reason: { rule: "no_module_at_fault" },
    };
  }
  if (work.moduleAtFaultUnlisted) {
    return {
      decision: { alert: { reason: "unlisted_module_at_fault" } },
      reason: { rule: "unlisted_module_at_fault", module: work.moduleAtFault as string },
    };
  }
  const module = work.moduleAtFault ?? work.module;
  const task = { role: owner, module, feedbackSignal: work.feedbackSignal };
  return {
    decision: { tasks: [owner === "research" ? { ...task, researchFor: work.fromRole } : task] },
    reason:
      matched.reporting === undefined
        ? { rule: "failed" }
        : { rule: "reported", impediment: matched.reporting },
  };
}

/**
 * Research that passes goes back, as a revision task, to the role that reported the gap, which
 * reads the module's research briefs (Bernard, 2026-10-29).
 */
function returnResearch(work: AcceptedWork): Ruling {
  const reporter = MODULE_PIPELINE.find((role) => role === work.researchFor);
  if (!reporter) return NO_RULE_COVERS_IT;
  return {
    decision: {
      tasks: [
        {
          role: reporter,
          module: work.module,
          feedbackSignal: work.feedbackSignal,
          afterResearch: true,
        },
      ],
    },
    reason: { rule: "research_returned" },
  };
}

/** A task for the next role in the module pipeline; past its end, the module is done. */
/**
 * Each module the Programme Architect's modules.yaml starts begins with its first task; each its
 * revised contracts send back goes to Architecture (decision 0015).
 */
function startModules(work: AcceptedWork, modules: string[]): Ruling {
  const revision = work.contractRevision;
  const tasks: Task[] = [
    ...modules.map((module) => ({ role: FIRST_ROLE, module })),
    ...(revision?.modules ?? []).map((module) => ({
      role: "architecture" as const,
      module,
      feedbackSignal: work.feedbackSignal,
      staleRevision: true as const,
    })),
  ];
  return {
    decision: { tasks },
    reason: revision
      ? { rule: "contract_revised", contracts: revision.contracts }
      : { rule: "modules_listed" },
  };
}

function advance(work: AcceptedWork): Ruling {
  const integrating = (INTEGRATION_PIPELINE as readonly string[]).indexOf(work.fromRole);
  if (integrating >= 0) {
    // Nothing further in integration until every module is done again (decision 0017), nor
    // while Divlab cannot tell whether they are.
    if (work.modulesUnreadable) {
      return { decision: { tasks: [] }, reason: { rule: "modules_unreadable" } };
    }
    if (work.modulesReopened?.length) {
      return {
        decision: { tasks: [] },
        reason: { rule: "integration_held", modules: work.modulesReopened },
      };
    }
    const role = INTEGRATION_PIPELINE[integrating + 1];
    // Integration Review passing completes the programme, done as a module is.
    if (role === undefined) {
      return { decision: { moduleDone: true }, reason: { rule: "pipeline_complete" } };
    }
    return { decision: { tasks: [{ role, module: work.module }] }, reason: { rule: "passed" } };
  }
  const next = (MODULE_PIPELINE as readonly string[]).indexOf(work.fromRole) + 1;
  if (next === MODULE_PIPELINE.length) {
    // The last module done starts the programme's integration pipeline (decision 0017); done
    // again after integration began, it runs the integration tests again.
    const first: Role = work.integrationBegun ? "integration-test" : "integration-specification";
    const integration = work.lastModule ? { tasks: [{ role: first, module: PROGRAMME }] } : {};
    return {
      decision: { moduleDone: true, ...integration },
      reason: { rule: "pipeline_complete" },
    };
  }
  return {
    decision: {
      tasks: MODULE_PIPELINE.slice(next, next + 1).map((role) => ({ role, module: work.module })),
    },
    reason: { rule: "passed" },
  };
}

/**
 * Who can fix what a failed piece of work reports: the CSD AutoPM routing table, adapted for
 * modules. A row without `reporting` applies whatever else the work reports. A contract that does
 * not work goes to the Programme Architect, never to the module on its other side.
 */
type FailureRoute = { from: Role; reporting?: string; to: Role };

const FAILURE_ROUTES: readonly FailureRoute[] = [
  { from: "architecture", reporting: "upstream_ambiguity", to: "programme-architect" },
  { from: "architecture", reporting: "architecture_impediment", to: "architecture" },
  { from: "specification", reporting: "upstream_ambiguity", to: "programme-architect" },
  { from: "specification", reporting: "architecture_impediment", to: "architecture" },
  { from: "test", reporting: "upstream_ambiguity", to: "specification" },
  { from: "coding", reporting: "upstream_ambiguity", to: "specification" },
  { from: "coding", reporting: "test_failures", to: "coding" },
  { from: "coding", reporting: "architecture_impediment", to: "architecture" },
  { from: "reviewer", reporting: "scope_gap", to: "programme-architect" },
  // A review or security check finding the architecture at fault (Bernard, 2026-10-29).
  { from: "reviewer", reporting: "architecture_impediment", to: "architecture" },
  { from: "security-and-quality", reporting: "architecture_impediment", to: "architecture" },
  { from: "reviewer", to: "coding" },
  { from: "security-and-quality", to: "coding" },
  // The missed behaviour becomes a module scenario, then a failing test, then code (0017).
  { from: "integration-test", reporting: "test_failures", to: "specification" },
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

/** Failed work whose fix falls to a role above Architecture, which wins over a revised contract. */
function failedAboveArchitecture(work: AcceptedWork): boolean {
  const owner = failed(work) ? failureRoute(work)?.to : undefined;
  return owner !== undefined && PRECEDENCE.indexOf(owner) < PRECEDENCE.indexOf("architecture");
}

/** The rule that decides who can fix what a failed piece of work reports, if any covers it. */
function failureRoute(work: AcceptedWork): FailureRoute | undefined {
  const routes = FAILURE_ROUTES.filter((route) => route.from === work.fromRole);
  const matching = routes.filter((route) =>
    work.impediments.some((impediment) => impediment.type === route.reporting),
  );
  const otherwise = routes.find((route) => route.reporting === undefined);
  return (
    PRECEDENCE.map((role) => matching.find((route) => route.to === role)).find(
      (route) => route !== undefined,
    ) ?? otherwise
  );
}
