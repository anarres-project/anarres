import { describe, expect, it } from "vitest";
import { type ProjectRepositories, setUpProject } from "../src/index.ts";

describe("setting up a project", () => {
  it("protects the project's main branch so that only Divlab can change it", async () => {
    const protectedProjects: string[] = [];
    const repositories: ProjectRepositories = {
      mainIsProtected: async () => true,
      protectMain: async (project) => {
        protectedProjects.push(project);
      },
      allowDivlabChecks: async () => {},
    };
    await setUpProject("ledger", repositories);
    expect(protectedProjects).toEqual(["ledger"]);
  });

  it("lets Divlab, and nothing else, check members' pull requests", async () => {
    const allowedProjects: string[] = [];
    const repositories: ProjectRepositories = {
      mainIsProtected: async () => true,
      protectMain: async () => {},
      allowDivlabChecks: async (project) => {
        allowedProjects.push(project);
      },
    };
    await setUpProject("ledger", repositories);
    expect(allowedProjects).toEqual(["ledger"]);
  });
});
