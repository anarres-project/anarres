import { ROLE_NAMES, type Role } from "@anarres/core";
import type { RoutingEvent } from "@anarres/divlab";
import type { AcceptedWork, Contract, RoutingRecord } from "./driver.ts";

/**
 * Translation between the scenarios' words and Divlab's ids, shared by every driver. Scenarios
 * say "Security & Quality" and "upstream ambiguity"; Divlab says "security-and-quality" and
 * "upstream_ambiguity".
 */

/**
 * The feedback signal a member's merged work adds to the project, as the plugin will write it:
 * a header naming the task the work was for, the role, module, verdict and any impediments.
 */
export function feedbackSignalFile(work: AcceptedWork, task?: string) {
  // Work without a feedback signal still has an artefact: the module's specification, say.
  if (work.withoutFeedbackSignal) {
    return { path: `modules/${work.module}/${work.feedbackSignal}.md`, text: "# Specification\n" };
  }
  const header = [
    "---",
    "feedback_signal:",
    ...(task === undefined || work.withoutTask ? [] : [`  task_id: "${task}"`]),
    `  from_role: ${roleId(work.role)}`,
    // Markdown in place of a name: text Divlab must never carry into what it posts.
    `  module: ${work.moduleNotPlain ? `"${work.module} [see](https://example.test)"` : work.module}`,
    ...(work.partial ? ["  status: partial"] : []),
    ...(work.withoutVerdict ? [] : [`  verdict: ${ids(work.verdict)}`]),
    ...(work.moduleAtFault === undefined ? [] : [`  module_at_fault: ${work.moduleAtFault}`]),
    ...(work.impediments.length === 0
      ? []
      : ["  impediments:", ...work.impediments.map((name) => `    - type: ${ids(name)}`)]),
    "---",
  ];
  // Markdown in the file's name: text Divlab must never carry into what it posts either.
  const name = work.fileNameNotPlain ? `${work.feedbackSignal}${NOT_PLAIN}` : work.feedbackSignal;
  return { path: `feedback/${name}.md`, text: `${header.join("\n")}\n` };
}

/** Where in `integration/` each integration role writes, by its name in the scenarios. */
const INTEGRATION_PLACES: Record<string, string | undefined> = {
  "Integration Specification": "specifications",
  "Integration Test": "tests",
  "Integration Review": "reviews",
};

/** Every file a member's work changes: its feedback signal, and any others the scenario says. */
export function workFiles(work: AcceptedWork, task?: string) {
  return [feedbackSignalFile(work, task), ...otherFiles(work)];
}

/** The files a member's work changes besides its feedback signal, as the scenario says. */
export function otherFiles(work: AcceptedWork) {
  return [
    // Test work adds the module's tests, as other work may when a scenario says it does.
    ...(work.changesTests || work.role === "Test"
      ? [
          {
            path: `modules/${work.module}/tests/${work.feedbackSignal}.md`,
            text: work.newTestsPass ? `# Tests\n\n${PASSES_ON_PURPOSE}\n` : "# Tests\n",
          },
        ]
      : []),
    // The Programme Architect's modules.yaml, listing the project's modules and the contracts
    // each provides and uses, and a folder for each contract (decision 0014).
    ...(work.modulesListed === undefined
      ? []
      : [
          { path: "programme/modules.yaml", text: modulesYaml(work.modulesListed, work.contracts) },
        ]),
    // The Programme Architect's work may change modules' requirement slices.
    ...(work.slicesChanged ?? []).map((module) => ({
      path: `programme/slices/${module}/slice.md`,
      text: `# Requirements for ${module}, revised by ${work.feedbackSignal}\n`,
    })),
    ...(work.contracts ?? []).map((contract) => ({
      path: `programme/contracts/${contract.name}/contract.md`,
      text: work.contractsRevised?.includes(contract.name)
        ? `# Contract ${contract.name}, revised by ${work.feedbackSignal}\n`
        : `# Contract ${contract.name}\n`,
    })),
    // Research work writes a brief for the module it was asked about.
    ...(work.role === "Research"
      ? [{ path: `research-briefs/${work.module}/${work.feedbackSignal}.md`, text: "# Brief\n" }]
      : []),
    // The integration roles write the programme's integration specifications, tests and reviews
    // (decision 0017).
    ...(INTEGRATION_PLACES[work.role] === undefined
      ? []
      : [
          {
            path: `integration/${INTEGRATION_PLACES[work.role]}/${work.feedbackSignal}.md`,
            text: `# ${work.role}\n`,
          },
        ]),
    // Architecture and Specification work write the module's architecture and specification.
    ...(work.role === "Architecture" || work.role === "Specification"
      ? [
          {
            path: `modules/${work.module}/${work.role === "Architecture" ? "architecture" : "specifications"}/${work.feedbackSignal}.md`,
            text: `# ${work.role}\n`,
          },
        ]
      : []),
    // Coding work changes the module's code; the sandbox project's tests fail on this marker.
    ...(work.role === "Coding"
      ? [
          {
            path: `modules/${work.module}/src/${work.feedbackSignal}.md`,
            text: work.testsFail ? `# Code\n\n${FAILS_ON_PURPOSE}\n` : "# Code\n",
          },
        ]
      : []),
  ];
}

/** The kind of a module's work each of its folders holds, in the scenarios' words. */
const MODULE_WORK: Record<string, string> = {
  architecture: "architecture",
  specifications: "specification",
  tests: "tests",
  src: "code",
  reviews: "reviews",
};

/** The modules' work among a project's files: each file's module, and its kind of work. */
/** The kinds of the programme's integration work among fetched paths: `integration/<kind>/…`. */
export function integrationKindsIn(paths: readonly string[]): string[] {
  const kinds = paths.flatMap((path) => {
    const [top, kind, file] = path.split("/");
    return top === "integration" && kind !== undefined && file !== undefined ? [kind] : [];
  });
  return [...new Set(kinds)].sort();
}

export function moduleWorkIn(paths: readonly string[]): { module: string; kind: string }[] {
  return paths.flatMap((path) => {
    const [top, module, folder] = path.split("/");
    if (top === "research-briefs" && module !== undefined && folder !== undefined) {
      return [{ module, kind: "research brief" }];
    }
    const kind = folder === undefined ? undefined : MODULE_WORK[folder];
    return top === "modules" && module !== undefined && kind !== undefined
      ? [{ module, kind }]
      : [];
  });
}

/** What a sandbox project's tests fail on: work a scenario makes fail on purpose (decision 0010). */
export const FAILS_ON_PURPOSE = "fails on purpose";

/** What makes a new test pass before its code exists: Test work a scenario makes wrong (0011). */
export const PASSES_ON_PURPOSE = "passes on purpose";

/** What makes a feedback signal file's name more than a plain name, in the scenarios. */
const NOT_PLAIN = "_*see*";

/** The scenario's name for a feedback signal, from where Divlab found it. */
export const signalName = (path: string) =>
  path.replace(/^feedback\/(.+)\.md$/, "$1").replace(NOT_PLAIN, "");

/** A routing record as the scenarios speak of it: role names and plain words, not ids. */
export function inScenarioWords(event: RoutingEvent): RoutingRecord {
  const { work, decision, reason } = event;
  const decided = (event as { decidedAt?: string }).decidedAt;
  return {
    ...(decided === undefined ? {} : { decidedAt: decided }),
    work: {
      role: roleNameOf(work.fromRole),
      module: work.module,
      verdict: words(work.verdict),
      impediments: work.impediments.map((impediment) => words(impediment.type)),
      feedbackSignal: signalName(work.feedbackSignal),
    },
    // A module done may start the programme's integration too (decision 0017).
    outcome:
      "alert" in decision
        ? { alert: true }
        : {
            ...("moduleDone" in decision ? { moduleDone: true as const } : {}),
            ...(decision.tasks === undefined
              ? {}
              : { tasksFor: decision.tasks.map((task) => roleName(task.role)) }),
          },
    reason:
      "impediment" in reason
        ? { ...reason, impediment: words(reason.impediment) }
        : "role" in reason
          ? { ...reason, role: roleName(reason.role) }
          : reason,
  };
}

export const roleName = (role: Role) => ROLE_NAMES[role];

export function roleId(name: string): Role {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => ROLE_NAMES[role] === name);
  if (!role) throw new Error(`No role is called "${name}"`);
  return role;
}

// Divlab records the role as the work gave it, which need not be a role Divlab knows.
export function roleNameOf(id: string): string {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => role === id);
  return role ? ROLE_NAMES[role] : id;
}

const words = (id: string) => id.replaceAll("_", " ");
const ids = (words: string) => words.replaceAll(" ", "_");

/** A modules.yaml listing the modules, each with the contracts it provides and uses. */
function modulesYaml(modules: string[], contracts: Contract[] = []): string {
  const list = (key: string, names: string[]) =>
    names.length === 0 ? "" : `    ${key}:\n${names.map((name) => `      - ${name}\n`).join("")}`;
  const entry = (module: string) =>
    `  - name: ${module}\n` +
    list(
      "provides",
      contracts.filter((c) => c.providedBy === module).map((c) => c.name),
    ) +
    list(
      "uses",
      contracts.filter((c) => c.usedBy.includes(module)).map((c) => c.name),
    );
  return `modules:\n${modules.map(entry).join("")}`;
}
