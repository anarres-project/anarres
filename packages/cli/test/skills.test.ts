import { describe, expect, it } from "vitest";
import { composeSkill } from "../src/skills.ts";

describe("a plugin skill, made from its source and the instructions skills share", () => {
  it("has each shared part in place of the line naming it", () => {
    const source = [
      "---",
      "description: Resume.",
      "---",
      "",
      "Resume it.",
      "",
      "{{doing-the-work}}",
      "",
    ].join("\n");
    expect(composeSkill(source, { "doing-the-work": "Do the work.\nThen submit it.\n" })).toBe(
      [
        "---",
        "description: Resume.",
        "---",
        "",
        "Resume it.",
        "",
        "Do the work.",
        "Then submit it.",
        "",
      ].join("\n"),
    );
  });

  it("fails, naming it, when the source names a shared part there is not", () => {
    expect(() => composeSkill("{{doing-the-wrok}}\n", { "doing-the-work": "" })).toThrow(
      "No shared part doing-the-wrok",
    );
  });
});
