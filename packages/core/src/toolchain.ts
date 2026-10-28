import { parse } from "yaml";

/** A project's toolchain, as its anarres.yaml declares it (concept §7, decision 0010). */
export type Toolchain = { image: string; test: string };

/** A project's file is data: only text in the places a toolchain names is read as one. */
export function readToolchain(text: string): Toolchain | undefined {
  let declared: { toolchain?: { image?: unknown; test?: unknown } } | null;
  try {
    declared = parse(text);
  } catch {
    return undefined;
  }
  const toolchain = declared?.toolchain;
  if (toolchain === undefined) return undefined;
  const { image, test } = toolchain;
  if (typeof image !== "string" || typeof test !== "string") return undefined;
  // One line: the checks workflow passes it on as a single output.
  if (test.includes("\n")) return undefined;
  return { image, test };
}
