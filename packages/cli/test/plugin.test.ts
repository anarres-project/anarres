import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/** A file of this repository, as a member's Claude Code reads it when installing the plugin. */
const repositoryFile = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

describe("the Anarres plugin, as members install it (concept §10)", () => {
  it("is listed by this repository's marketplace, from the plugin folder", () => {
    const marketplace = JSON.parse(repositoryFile(".claude-plugin/marketplace.json"));
    expect(marketplace.plugins).toEqual([
      expect.objectContaining({ name: "anarres", source: "./plugin" }),
    ]);
  });

  it("is named as the marketplace names it, so it installs as anarres", () => {
    const manifest = JSON.parse(repositoryFile("plugin/.claude-plugin/plugin.json"));
    expect(manifest.name).toBe("anarres");
  });

  it("carries the CLI it runs, bundled: an installed plugin can reach nothing outside its folder", () => {
    expect(repositoryFile("plugin/cli/anarres.js")).toContain(
      "No tasks you may take are ready just now.",
    );
  });

  it("guards Claude's file tools with the read-scope hook, run by the bundled CLI", () => {
    const { hooks } = JSON.parse(repositoryFile("plugin/hooks/hooks.json"));
    expect(hooks.PreToolUse).toEqual([
      {
        matcher: "Read|Edit|Write|NotebookEdit|Glob|Grep",
        hooks: [
          {
            type: "command",
            command: "node",
            // biome-ignore lint/suspicious/noTemplateCurlyInString: Claude Code's placeholder, literally.
            args: ["${CLAUDE_PLUGIN_ROOT}/cli/anarres.js", "hook"],
          },
        ],
      },
    ]);
  });

  describe("its next skill, /anarres:next", () => {
    const skill = repositoryFile("plugin/skills/next/SKILL.md");
    const frontmatter = parse(skill.split("---")[1] ?? "");

    it("may run four things without asking: the bundled CLI's next, claim, prepare and submit", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Claude Code's placeholder, literally.
      const cli = "node ${CLAUDE_PLUGIN_ROOT}/cli/anarres.js";
      expect(frontmatter["allowed-tools"]).toBe(
        `Bash(${cli} next) Bash(${cli} claim *) Bash(${cli} prepare *) Bash(${cli} submit *)`,
      );
    });
  });

  describe("its status skill, /anarres:status", () => {
    it("may run one thing without asking: the bundled CLI's status", () => {
      const skill = repositoryFile("plugin/skills/status/SKILL.md");
      const frontmatter = parse(skill.split("---")[1] ?? "");
      expect(frontmatter["allowed-tools"]).toBe(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Claude Code's placeholder, literally.
        "Bash(node ${CLAUDE_PLUGIN_ROOT}/cli/anarres.js status)",
      );
    });
  });

  describe("its resume skill, /anarres:resume", () => {
    it("may run three things without asking: the bundled CLI's resume, prepare and submit", () => {
      const skill = repositoryFile("plugin/skills/resume/SKILL.md");
      const frontmatter = parse(skill.split("---")[1] ?? "");
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Claude Code's placeholder, literally.
      const cli = "node ${CLAUDE_PLUGIN_ROOT}/cli/anarres.js";
      expect(frontmatter["allowed-tools"]).toBe(
        `Bash(${cli} resume *) Bash(${cli} prepare *) Bash(${cli} submit *)`,
      );
    });
  });
});
