import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { composeSkill } from "../src/skills.ts";

/**
 * Writes the plugin's skills from their sources in skills/: a source that starts with its
 * frontmatter is a skill; any other is a part skills share. The plugin's skill files are made
 * here and nowhere else, so edit the sources.
 */
const sources = new URL("../skills/", import.meta.url).pathname;
const plugin = new URL("../../../plugin/skills/", import.meta.url).pathname;
const files = readdirSync(sources).filter((file) => file.endsWith(".md"));
const read = (file: string) => readFileSync(join(sources, file), "utf8");
const isSkill = (file: string) => read(file).startsWith("---\n");
const shared = Object.fromEntries(
  files.filter((file) => !isSkill(file)).map((file) => [basename(file, ".md"), read(file)]),
);
for (const file of files.filter(isSkill)) {
  const folder = join(plugin, basename(file, ".md"));
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "SKILL.md"), composeSkill(read(file), shared));
}
