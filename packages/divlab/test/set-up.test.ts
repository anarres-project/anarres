import { describe, expect, it } from "vitest";
import { type ProjectRepositories, setUpProject } from "../src/index.ts";

/** A toolchain as a project declares it: the image its tests run in, and the command. */
const DECLARED = { image: "node:24", test: "npm test" };

describe("setting up a project", () => {
  it("protects the project's main branch so that only Divlab can change it", async () => {
    const protectedProjects: string[] = [];
    const repositories: ProjectRepositories = {
      mainIsProtected: async () => true,
      protectMain: async (project) => {
        protectedProjects.push(project);
      },
      allowDivlabChecks: async () => {},
      toolchain: async () => DECLARED,
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
      toolchain: async () => DECLARED,
    };
    await setUpProject("ledger", repositories);
    expect(allowedProjects).toEqual(["ledger"]);
  });
  it("does not set up a project that declares no toolchain, and says so, protecting nothing", async () => {
    const protectedProjects: string[] = [];
    const repositories: ProjectRepositories = {
      mainIsProtected: async () => true,
      protectMain: async (project) => {
        protectedProjects.push(project);
      },
      allowDivlabChecks: async () => {},
      toolchain: async () => undefined,
    };
    await expect(setUpProject("ledger", repositories)).rejects.toThrow(
      "The project ledger cannot be started: it declares no toolchain (the image its tests run in, and the command that runs them) in anarres.yaml",
    );
    expect(protectedProjects).toEqual([]);
  });
});
