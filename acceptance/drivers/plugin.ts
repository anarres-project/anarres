import { existsSync } from "node:fs";

/** Whether the plugin, as members install it, carries a skill of that name. */
export function inPlugin(skill: string): boolean {
  return existsSync(new URL(`../../plugin/skills/${skill}/SKILL.md`, import.meta.url));
}
