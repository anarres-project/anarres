import { readFileSync } from "node:fs";
import { TRUST_LEVELS } from "@anarres/core";
import { describe, expect, it } from "vitest";

/** The governance file as this repository holds it: PDC coordinators change it by pull request. */
const governance = JSON.parse(
  readFileSync(new URL("../../../governance/members.json", import.meta.url), "utf8"),
);

describe("the governance file (decision 0007)", () => {
  it("records only trust levels Anarres has, so no edit silently gives a member none", () => {
    const levels = Object.values(governance.members as Record<string, { level: string }>).map(
      (member) => member.level,
    );
    expect(levels.filter((level) => !(TRUST_LEVELS as readonly string[]).includes(level))).toEqual(
      [],
    );
  });
});
