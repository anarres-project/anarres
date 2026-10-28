import { parse } from "yaml";
import { PROGRAMME } from "./access.ts";
import { isPlainName } from "./feedback-signal.ts";

/** The Programme Architect's modules.yaml, as data (decision 0013). */
export type Modules = { modules: string[] };

/** The file comes from a member's work: only plain names are read as modules. */
export function readModules(text: string): Modules | { unreadable: string } {
  let declared: { modules?: unknown } | null;
  try {
    declared = parse(text);
  } catch {
    return { unreadable: "modules.yaml cannot be read as YAML" };
  }
  const modules = declared?.modules;
  const names = Array.isArray(modules)
    ? modules.map((module) => (module as { name?: unknown } | null)?.name)
    : [];
  if (names.length === 0 || !names.every((name) => typeof name === "string")) {
    return { unreadable: "modules.yaml lists no modules by name" };
  }
  if (!names.every((name) => isPlainName(name))) {
    return { unreadable: "modules.yaml names a module in more than a plain name" };
  }
  if (names.includes(PROGRAMME)) {
    return {
      unreadable: `modules.yaml names a module ${PROGRAMME}, the name of the whole programme`,
    };
  }
  const twice = names.find((name, i) => names.indexOf(name) !== i);
  if (twice !== undefined) return { unreadable: `modules.yaml lists a module twice: ${twice}` };
  return { modules: names };
}
