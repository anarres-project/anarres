import { parse } from "yaml";

/** The work a feedback signal reports, as its header states it. */
export type FeedbackSignal = {
  fromRole: string;
  module: string;
  verdict: string;
  impediments: { type: string }[];
  /** The task the work was done for. */
  task?: string;
};

/**
 * Lower-case letters and digits, joined by single hyphens or underscores, at most 40 long. Divlab
 * writes these names into what it posts (titles, labels of at most 50 characters, text), so text
 * a member chose must be no more than a name.
 */
const PLAIN_NAME = /^(?=.{1,40}$)[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** Why a feedback signal could not be read. Divlab never guesses at what it meant. */
export type Unreadable = { unreadable: string };

export function readFeedbackSignal(text: string): FeedbackSignal | Unreadable {
  const lines = text.split("\n");
  if (lines[0] !== "---") return { unreadable: "it has no feedback signal header" };
  const end = lines.indexOf("---", 1);
  if (end === -1) return { unreadable: "its header never ends" };
  const frontMatter = lines.slice(1, end).join("\n");
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(frontMatter);
  } catch {
    return { unreadable: "its header is not valid YAML" };
  }
  const header = parsed?.feedback_signal;
  if (typeof header !== "object" || header === null) {
    return { unreadable: "its header has no feedback signal" };
  }
  for (const field of ["from_role", "module", "verdict"]) {
    if (typeof header[field] !== "string") {
      return { unreadable: `its feedback signal does not give its ${field}` };
    }
  }
  for (const field of ["from_role", "module", "verdict"]) {
    if (!PLAIN_NAME.test(header[field])) {
      return { unreadable: `its feedback signal's ${field} is not a plain name` };
    }
  }
  const impediments = header.impediments ?? [];
  if (
    !Array.isArray(impediments) ||
    !impediments.every((impediment) => typeof impediment?.type === "string")
  ) {
    return { unreadable: "its feedback signal's impediments do not each give a type" };
  }
  if (!impediments.every((impediment) => PLAIN_NAME.test(impediment.type))) {
    return { unreadable: "its feedback signal's impediments are not each a plain name" };
  }
  const task = header.task_id;
  if (task !== undefined && typeof task !== "string" && !Number.isInteger(task)) {
    return {
      unreadable: "its feedback signal does not give its task_id as text or a whole number",
    };
  }
  return {
    fromRole: header.from_role,
    module: header.module,
    verdict: header.verdict,
    impediments: impediments.map((impediment: { type: string }) => ({
      type: impediment.type,
    })),
    ...(task === undefined ? {} : { task: String(task) }),
  };
}

/** Where a member's feedback signal is: checked, since its name is text the member chose. */
export function readSignalFile(path: string): { path: string } | Unreadable {
  if (!SIGNAL_FILE.test(path)) return { unreadable: "its file name is not a plain name" };
  return { path };
}

/** A feedback signal file: directly in feedback/, named with letters, digits and hyphens. */
const SIGNAL_FILE = /^feedback\/[A-Za-z0-9-]+\.md$/;
