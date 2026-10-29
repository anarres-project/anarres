import { parse } from "yaml";
import { contractPlace, PROGRAMME } from "./access.ts";
import { isPlainName } from "./feedback-signal.ts";

/** Where the Programme Architect keeps the project's modules (concept §5, decision 0013). */
export const MODULES_FILE = `${PROGRAMME}/modules.yaml`;

/**
 * The Programme Architect's modules.yaml, as data (decision 0013): the modules, and the contracts
 * between them, each provided by one module and used by others (decision 0014).
 */
export type Modules = { modules: string[]; contracts: Contract[] };

export type Contract = { name: string; providedBy: string; usedBy: string[] };

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
  const twice = repeated(names);
  if (twice !== undefined) return { unreadable: `modules.yaml lists a module twice: ${twice}` };
  const entries = modules as { name: string; provides?: unknown; uses?: unknown }[];
  const listed = (names: unknown) =>
    names === undefined ||
    (Array.isArray(names) && names.every((name) => typeof name === "string"));
  if (!entries.every(({ provides, uses }) => listed(provides) && listed(uses))) {
    return { unreadable: "modules.yaml gives a module's contracts other than as a list of names" };
  }
  const contractsOf = (names: unknown) => (names ?? []) as string[];
  const named = entries.flatMap(({ provides, uses }) => [
    ...contractsOf(provides),
    ...contractsOf(uses),
  ]);
  if (!named.every((name) => isPlainName(name))) {
    return { unreadable: "modules.yaml names a contract in more than a plain name" };
  }
  const contracts: Contract[] = entries.flatMap(({ name, provides }) =>
    contractsOf(provides).map((contract) => ({ name: contract, providedBy: name, usedBy: [] })),
  );
  const providedTwice = repeated(contracts.map((contract) => contract.name));
  if (providedTwice !== undefined) {
    return {
      unreadable: `modules.yaml has more than one module provide a contract: ${providedTwice}`,
    };
  }
  for (const { name, uses } of entries) {
    for (const used of contractsOf(uses)) {
      const contract = contracts.find((c) => c.name === used);
      if (contract === undefined) {
        return {
          unreadable: `modules.yaml has a module use a contract no module provides: ${used}`,
        };
      }
      if (contract.providedBy === name) {
        return { unreadable: `modules.yaml has a module use a contract it provides: ${used}` };
      }
      contract.usedBy.push(name);
    }
  }
  return { modules: names, contracts };
}

/** The first name a list has more than once. */
const repeated = (names: string[]) => names.find((name, i) => names.indexOf(name) !== i);

/** The contracts a module provides and uses. */
export function contractsOfModule(contracts: readonly Contract[], module: string): string[] {
  return contracts
    .filter((contract) => contract.providedBy === module || contract.usedBy.includes(module))
    .map((contract) => contract.name);
}

/** The module's contracts revised among the changed paths (decision 0015). */
export function contractsRevised(
  contracts: readonly Contract[],
  module: string,
  changed: readonly string[],
): string[] {
  return contractsOfModule(contracts, module).filter((contract) =>
    changed.some((path) => path.startsWith(contractPlace(contract))),
  );
}
