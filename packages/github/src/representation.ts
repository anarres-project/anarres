import {
  isRole,
  LEASE_HOURS,
  ROLE_NAMES,
  type Role,
  readMergedWork,
  readRoutingRecord,
} from "@anarres/core";
import type {
  AboutToMerge,
  ActedOn,
  Activity,
  ChangeNotByDivlab,
  Claimed,
  ClaimedTask,
  ClaimedWithoutClaim,
  FinishedModule,
  FoundClaimedWithoutClaim,
  LeaseRanOut,
  LogEvent,
  MainChecked,
  NotAccepted,
  PostedTask,
  Refused,
  Released,
  RoutingEvent,
} from "@anarres/divlab";

/** The label of a task anyone eligible may claim. */
export const READY = "state:ready";
/** The label of a task that continues partial work (decision 0008). */
const CONTINUATION = "continuation";
/** The label of a task revising work whose inputs changed after it was posted (decision 0015). */
const INPUTS_CHANGED = "inputs-changed";
/** The label of a task a member holds. */
export const CLAIMED = "state:claimed";

/** What GitHub needs to open an issue. */
export type NewIssue = { title: string; labels: string[]; body: string };

export function issueForTask(task: PostedTask, repository?: string): NewIssue {
  return {
    title: `${ROLE_NAMES[task.role]} task for ${task.module}`,
    labels: [
      `role:${task.role}`,
      `module:${task.module}`,
      READY,
      ...(task.researchFor === undefined ? [] : [`${RESEARCH_FOR}${task.researchFor}`]),
      ...(task.continuation ? [CONTINUATION] : []),
      ...(task.staleRevision ? [INPUTS_CHANGED] : []),
    ],
    body: [
      ...(task.feedbackSignal === undefined ? [] : [`Feedback signal: ${task.feedbackSignal}`, ""]),
      ...(task.inputsAt === undefined
        ? []
        : [`Read this task's inputs as they were at commit ${task.inputsAt}.`, ""]),
      ...(task.inputsAt === undefined || repository === undefined
        ? []
        : [
            `Decided by [${task.decidedOn}](https://github.com/${repository}/blob/${task.inputsAt}/${task.decidedOn}).`,
            "",
          ]),
      task.decidedOn === undefined
        ? "Divlab posted this as the module began: the first task in its pipeline."
        : decisionBlock(task.decidedOn, task.inputsAt),
    ].join("\n"),
  };
}

/** An issue as GitHub lists it: only what Divlab reads back. */
export type ListedIssue = {
  labels: { name: string }[];
  body?: string | null;
  assignees?: { login: string }[];
  state?: string;
};

/** Whether an issue carries a label Divlab gives the tasks, alerts and finished modules it posts. */
export const postedByDivlab = (issue: ListedIssue) =>
  issue.labels.some(({ name }) => [READY, CLAIMED, "escalation", "state:done"].includes(name));

/**
 * Whether an issue is one of Divlab's tasks, ready or claimed, and not an alert or anyone's own.
 * A closed task keeps its labels but is done.
 */
export const isTask = (issue: ListedIssue): boolean =>
  issue.state === "open" && issue.labels.some(({ name }) => name === READY || name === CLAIMED);

/** A released task's labels: what it had, but ready again instead of claimed. */
export const labelsWhenReleased = (issue: ListedIssue): string[] =>
  issue.labels.map(({ name }) => (name === CLAIMED ? READY : name));

/** A claimed task's labels: what it had, but claimed instead of ready. */
export const labelsWhenClaimed = (issue: ListedIssue): string[] =>
  issue.labels.map(({ name }) => (name === READY ? CLAIMED : name));

/** What Divlab recorded on a task when it posted it. */
export function taskFromIssue(issue: ListedIssue):
  | {
      role: Role;
      module: string;
      researchFor?: string;
      claimedBy?: string;
      claimed?: true;
      inputsAt?: string;
      continuation?: true;
      staleRevision?: true;
    }
  | undefined {
  const labelled = (prefix: string) =>
    issue.labels.find(({ name }) => name.startsWith(prefix))?.name.slice(prefix.length);
  // Labels can be changed by anyone who triages: a task names a role Anarres has, and a module.
  const role = labelled("role:");
  const module = labelled("module:");
  if (!isRole(role) || module === undefined) return undefined;
  const researchFor = labelled(RESEARCH_FOR);
  const claimant = issue.assignees?.[0]?.login;
  const inputsAt = pinnedCommit(issue.body ?? "");
  const claimed = issue.labels.some(({ name }) => name === CLAIMED);
  return {
    role,
    module,
    ...(issue.labels.some(({ name }) => name === CONTINUATION)
      ? { continuation: true as const }
      : {}),
    ...(issue.labels.some(({ name }) => name === INPUTS_CHANGED)
      ? { staleRevision: true as const }
      : {}),
    ...(inputsAt === undefined ? {} : { inputsAt }),
    ...(researchFor === undefined ? {} : { researchFor }),
    // Assigning is open to anyone who triages: only Divlab's claimed label makes a task held.
    ...(claimed ? { claimed: true as const } : {}),
    ...(claimant !== undefined && claimed ? { claimedBy: claimant } : {}),
  };
}

const RESEARCH_FOR = "research-for:";

/** The issue a task id names. The id comes from a member's feedback signal, so it is checked. */
export function issueNumber(task: string): number | undefined {
  return /^[1-9][0-9]*$/.test(task) ? Number(task) : undefined;
}

/** One file per event, so concurrent writers never touch the same file (concept §7). */
export function eventFile(event: LogEvent, sequence: number): { path: string; content: string } {
  return {
    path: `events/${String(sequence).padStart(6, "0")}.json`,
    content: `${JSON.stringify(event, null, 2)}\n`,
  };
}

/** A claim, a lease that ran out, activity or a release: each names a task and its member. */
const namesTaskAndMember = (value: unknown): boolean =>
  isObject(value) && typeof value.task === "string" && typeof value.member === "string";

/** Event files can be edited by people, so what is read back is checked, never assumed. */
export function eventFromFile(content: string): LogEvent {
  const event: unknown = JSON.parse(content);
  if (isObject(event) && namesTaskAndMember(event.claimed)) {
    const { role } = event.claimed as { role?: unknown };
    if (role !== undefined && !isRole(role)) {
      throw new Error(
        "The event file cannot be read: the claim names a role Anarres does not have",
      );
    }
    return event as Claimed;
  }
  if (isObject(event) && namesTaskAndMember(event.leaseRanOut)) return event as LeaseRanOut;
  if (isObject(event) && namesTaskAndMember(event.activity)) return event as Activity;
  if (isObject(event) && namesTaskAndMember(event.released)) return event as Released;
  if (
    isObject(event) &&
    isObject(event.changeNotByDivlab) &&
    typeof event.changeNotByDivlab.commit === "string"
  ) {
    return event as ChangeNotByDivlab;
  }
  if (
    isObject(event) &&
    isObject(event.claimedWithoutClaim) &&
    typeof event.claimedWithoutClaim.task === "string"
  ) {
    const { shownAs } = event.claimedWithoutClaim;
    if (shownAs !== undefined && typeof shownAs !== "string") {
      throw new Error(
        "The event file cannot be read: the record names whom the task showed as holding it as something other than an account",
      );
    }
    return event as FoundClaimedWithoutClaim;
  }
  if (
    isObject(event) &&
    isObject(event.mainChecked) &&
    typeof event.mainChecked.upTo === "string"
  ) {
    return event as MainChecked;
  }
  if (
    isObject(event) &&
    isObject(event.actedOn) &&
    typeof event.actedOn.feedbackSignal === "string"
  ) {
    return event as ActedOn;
  }
  if (
    isObject(event) &&
    isObject(event.notAccepted) &&
    typeof event.notAccepted.feedbackSignal === "string" &&
    typeof event.notAccepted.reason === "string"
  ) {
    return event as NotAccepted;
  }
  if (
    isObject(event) &&
    isObject(event.aboutToMerge) &&
    typeof event.aboutToMerge.feedbackSignal === "string" &&
    isObject(event.aboutToMerge.work)
  ) {
    const work = readMergedWork(event.aboutToMerge.work);
    if ("unreadable" in work) throw new Error(`The event file cannot be read: ${work.unreadable}`);
    const { testsAdded } = event.aboutToMerge;
    if (
      testsAdded !== undefined &&
      !(Array.isArray(testsAdded) && testsAdded.every((test) => typeof test === "string"))
    ) {
      throw new Error(
        "The event file cannot be read: the record names the tests Test work added as something other than text",
      );
    }
    const { tests } = event.aboutToMerge;
    if (tests !== undefined && !countsAddUp(tests)) {
      throw new Error(
        "The event file cannot be read: the record's test counts are not whole numbers that add up",
      );
    }
    return event as AboutToMerge;
  }
  const record = readRoutingRecord(event);
  if ("unreadable" in record)
    throw new Error(`The event file cannot be read: ${record.unreadable}`);
  return event as RoutingEvent;
}

/** Test counts as the state vector has them: whole numbers, passing and failing making the total. */
function countsAddUp(tests: unknown): boolean {
  if (!isObject(tests)) return false;
  const { total, passed, failed } = tests;
  const whole = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;
  return (
    whole(total) &&
    whole(passed) &&
    whole(failed) &&
    (passed as number) + (failed as number) === total
  );
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function issueForAlert(alert: RoutingEvent): NewIssue {
  const { module } = alert.work;
  const work = `the ${roleName(alert.work.fromRole)} work on ${module}`;
  const reported =
    alert.work.impediments.map((impediment) => impediment.type).join(", ") || "no problem";
  const [title, why] =
    alert.reason.rule === "re_run_limit"
      ? [
          `${roleName(alert.reason.role)} has been re-run more than three times on ${module}`,
          `${roleName(alert.reason.role)} has already been re-run three times for this module, so Divlab has not sent it back again.`,
        ]
      : [`no rule covers ${work}`, "No routing rule covers that."];
  return {
    title: `Escalation: ${title}`,
    labels: ["escalation", `module:${module}`],
    body: [
      `${capitalised(work)} ${alert.work.verdict === "blocked" ? "was blocked" : "failed"}, reporting ${reported}. ${why}`,
      "",
      "The routing record:",
      "",
      "```json",
      JSON.stringify(alert, null, 2),
      "```",
    ].join("\n"),
  };
}

/** The role's name as members know it, or the id as the work gave it if no role has that id. */
function roleName(id: string): string {
  const role = (Object.keys(ROLE_NAMES) as Role[]).find((role) => role === id);
  return role ? ROLE_NAMES[role] : id;
}

const capitalised = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Opened and closed at once, so the issue list shows when the module finished. */
export function issueForModuleDone({ module, decidedOn }: FinishedModule): NewIssue {
  return {
    title: `Module ${module} is done`,
    labels: [`module:${module}`, "state:done"],
    body: decisionBlock(decidedOn),
  };
}

/**
 * The event log from the files listed and the texts read, oldest first; undefined while any
 * listed file is unread, since a decision must never rest on a log missing its latest events.
 */
export function logFrom(listed: string[], texts: Map<string, string>): LogEvent[] | undefined {
  if (!listed.every((name) => texts.has(name))) return undefined;
  return listed
    .filter((name) => /^\d{6}\.json$/.test(name))
    .sort()
    .map((name) => eventFromFile(texts.get(name) ?? ""));
}

/** The reason is quoted in a code block, so text a member wrote can never act as Markdown. */
export function commentForRefusal(reason: string): string {
  return `Divlab has not merged this pull request:\n\n${quoted(reason)}`;
}

/** Divlab's reply to a member whose lease on a task ran out. */
export function commentForLeaseRanOut(ranOut: ClaimedTask): string {
  return `@${ranOut.member}, your lease on this task ran out: ${LEASE_HOURS} hours passed without activity on it, so it is ready for anyone to claim again.`;
}

/** Divlab's reply to a member it did not do as they asked: its reasons are its own words. */
export function commentForRefused(refusal: Refused): string {
  return `@${refusal.member}, ${refusal.reason}.`;
}

/** Text in a code block, fenced longer than any run of backticks in it, so nothing can close it. */
function quoted(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${text}\n${fence}`;
}

/** What protects main: no update, no deletion, no rewriting history, except by Divlab's App. */
const MAIN_RULES = ["update", "deletion", "non_fast_forward"];

/**
 * Nobody may update, delete or rewrite main except Divlab's App, which merges members' pull
 * requests and records its decisions. No person is exempt, administrators included.
 */
export function rulesetProtectingMain(app: number) {
  return {
    name: "Only Divlab changes main",
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    rules: MAIN_RULES.map((type) => ({ type })),
    bypass_actors: [{ actor_id: app, actor_type: "Integration", bypass_mode: "always" }],
  };
}

/**
 * The Actions policy that lets Divlab's pull request workflow, and no other, act on pull
 * requests: GitHub blocks that event on public repositories unless a policy allows it.
 */
export function policyAllowingDivlabChecks() {
  return {
    name: "Only Divlab checks pull requests",
    enforcement: "active",
    conditions: {
      workflow_path: { include: [".github/workflows/divlab-pull-request.yml"], exclude: [] },
    },
    rules: [
      { type: "restrict_action_events", parameters: { allowed_events: ["pull_request_target"] } },
    ],
  };
}

/** The commit and its author go only in a code block, never in the title or the words. */
export function issueForChangeNotByDivlab({ changeNotByDivlab }: ChangeNotByDivlab): NewIssue {
  const { commit, author } = changeNotByDivlab;
  return {
    title: "Escalation: a change reached main without Divlab",
    labels: ["escalation", "not-accepted", CHANGE_NOT_BY_DIVLAB],
    body: `This commit on main was not made by Divlab, so it did not pass Divlab's checks. Its author, as GitHub records it, and the commit:\n\n${quoted(`${author ?? "(no account)"} ${commit}`)}`,
  };
}

/** Whom the task showed goes only in a code block: anyone could have assigned anyone. */
export function issueForClaimedWithoutClaim(alert: ClaimedWithoutClaim): NewIssue {
  const { task, role, module, shownAs } = alert;
  return {
    title: "Escalation: a task was shown as claimed without a claim",
    labels: ["escalation", CLAIMED_WITHOUT_CLAIM],
    body: `Task #${task}, ${ROLE_NAMES[role]} task for ${module}, was shown as claimed, but Divlab's log has no claim for it, so Divlab did not give it to anyone. Divlab has made it ready again. ${
      shownAs === undefined
        ? "Nobody was shown as holding it."
        : `Whom it showed as holding it:\n\n${quoted(shownAs)}`
    }`,
  };
}

/** The path the member chose goes only in a code block, never in the title or the words. */
export function issueForNotAccepted({ notAccepted }: NotAccepted): NewIssue {
  return {
    title: "Escalation: work reached main without Divlab merging it",
    labels: ["escalation", "not-accepted"],
    body: `Divlab has not accepted this feedback signal, and will not route its work: ${notAccepted.reason}.\n\n${quoted(notAccepted.feedbackSignal)}`,
  };
}

/** Whether every rule the ruleset gives main still applies to it, as GitHub reports. */
export function protectsMain(rules: { type: string }[]): boolean {
  const applied = new Set(rules.map((rule) => rule.type));
  return MAIN_RULES.every((type) => applied.has(type));
}

/** The open issue is Divlab's record that it has alerted: closing it re-arms the check. */
export function issueForUnprotectedMain(): NewIssue {
  return {
    title: "Escalation: this project's main branch is not protected",
    labels: ["escalation", UNPROTECTED_MAIN],
    body: "Divlab found that this project's main branch no longer has the protection that lets only Divlab change it (decision 0006). Until it is restored, anyone with enough access could change main without Divlab's checks. Close this issue once main is protected again; Divlab alerts again if protection is lost later.",
  };
}

/** The label on Divlab's alert that a project's main branch is not protected. */
export const UNPROTECTED_MAIN = "unprotected-main";
/** The label of an alert of a change on main that Divlab did not make. */
export const CHANGE_NOT_BY_DIVLAB = "change-not-by-divlab";

/** The label of an alert of a task shown as claimed with no claim in Divlab's log. */
export const CLAIMED_WITHOUT_CLAIM = "claimed-without-claim";

/** The feedback signal whose routing decision an issue Divlab posted came from. */
/**
 * The commit a task's issue says its inputs are read at, from its decision block: only a commit
 * name, since anyone who can edit the issue can change its text.
 */
function pinnedCommit(body: string): string | undefined {
  const json = body.match(/```json\n([\s\S]*)\n```$/)?.[1];
  let inputsAt: unknown;
  try {
    inputsAt = (JSON.parse(json ?? "null") as { inputsAt?: unknown } | null)?.inputsAt;
  } catch {
    return undefined;
  }
  return typeof inputsAt === "string" && /^[0-9a-f]{40}$/.test(inputsAt) ? inputsAt : undefined;
}

export function decisionOf(body: string): string | undefined {
  const json = body.match(/```json\n([\s\S]*)\n```$/)?.[1];
  const closing = JSON.parse(json ?? "null") as {
    decidedOn?: string;
    work?: { feedbackSignal?: string };
  } | null;
  return closing?.decidedOn ?? closing?.work?.feedbackSignal;
}

/**
 * The decision, closing the issue as JSON: a path a member chose stays one line inside the code
 * block, so it can never close it or act as Markdown. An alert closes with its routing record.
 */
const decisionBlock = (feedbackSignal: string, inputsAt?: string) =>
  [
    "Divlab decided this from:",
    "",
    "```json",
    JSON.stringify({ decidedOn: feedbackSignal, ...(inputsAt === undefined ? {} : { inputsAt }) }),
    "```",
  ].join("\n");
