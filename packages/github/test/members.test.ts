import { describe, expect, it } from "vitest";
import { GitHubAdapter } from "../src/index.ts";

/** GitHub answering for one file in one repository, as its contents API does. */
const githubWithFile =
  (repository: string, path: string, text: string) =>
  async <T>(_token: string, method: string, asked: string) => {
    if (method === "GET" && asked === `repos/${repository}/contents/${path}`) {
      const content = Buffer.from(text).toString("base64");
      return { status: 200, data: { content, encoding: "base64" } as T };
    }
    return { status: 404, data: { message: `not answered: ${method} ${asked}` } as T };
  };

describe("the governance file (decision 0007)", () => {
  it("is read from Anarres's own repository unless the organisation names another", async () => {
    const file = { members: { alice: { level: "established" } } };
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithFile(
        "anarres-project/anarres",
        "governance/members.json",
        JSON.stringify(file),
      ),
    });
    expect(await adapter.governanceFile()).toEqual(file);
  });

  it("is nothing when there is no such file: everyone is new", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithFile("anarres-project/anarres", "governance/elsewhere.json", "{}"),
    });
    expect(await adapter.governanceFile()).toBeUndefined();
  });

  it("fails, saying what GitHub answered, when GitHub will not give it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: async <T>() => ({ status: 403, data: { message: "Resource not accessible" } as T }),
    });
    await expect(adapter.governanceFile()).rejects.toThrow("403");
  });

  it("is nothing when the file is not JSON: everyone is new, as core reads it", async () => {
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      request: githubWithFile(
        "anarres-project/anarres",
        "governance/members.json",
        "alice: trusted",
      ),
    });
    expect(await adapter.governanceFile()).toBeUndefined();
  });

  it("is read from the repository the organisation names instead, such as the sandbox's", async () => {
    const file = { members: { alice: { level: "trusted" } } };
    const adapter = new GitHubAdapter({
      owner: "commons",
      token: "test",
      governance: "commons/governance",
      request: githubWithFile(
        "commons/governance",
        "governance/members.json",
        JSON.stringify(file),
      ),
    });
    expect(await adapter.governanceFile()).toEqual(file);
  });
});
