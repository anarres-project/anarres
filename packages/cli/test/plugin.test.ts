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

  describe("its next skill, /anarres:next", () => {
    const skill = repositoryFile("plugin/skills/next/SKILL.md");
    const frontmatter = parse(skill.split("---")[1] ?? "");

    it("may run one thing without asking: the bundled CLI's next, inside the plugin", () => {
      expect(frontmatter["allowed-tools"]).toBe(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Claude Code's placeholder, literally.
        "Bash(node ${CLAUDE_PLUGIN_ROOT}/cli/anarres.js next)",
      );
    });
  });
});
