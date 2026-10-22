import type { RoutingEvent } from "@anarres/divlab";
import { describe, expect, it } from "vitest";
import { eventFile, GitHubAdapter } from "../src/index.ts";

const event = (n: number): RoutingEvent => ({
  project: "ledger",
  work: {
    fromRole: "test",
    module: `module-${n}`,
    verdict: "pass",
    impediments: [],
    feedbackSignal: `feedback/T-${n}.md`,
  },
  decision: { tasks: [{ role: "coding", module: `module-${n}` }] },
  reason: { rule: "passed" },
});

/** The most files GitHub lists in a directory's contents (seen in the sandbox, 2026-10-22). */
const CONTENTS_LISTING_LIMIT = 1_000;

/**
 * A project repository's event log as GitHub serves it, with the limits seen in the sandbox: the
 * contents listing stops at 1,000 files; a Git tree lists them all. Asked for too many files' text
 * in one GraphQL request, GitHub fails (a 502 for 1,001); where it starts failing is not known, so
 * a fake can be told to fail above a cautious limit.
 */
class FakeGitHub {
  readonly files = new Map<string, string>();
  /** How many requests GitHub has been sent. */
  requests = 0;

  constructor(
    events: number,
    private readonly limits: { textsPerRequest?: number; failWritesAfterSaving?: boolean } = {},
  ) {
    for (let n = 1; n <= events; n++) {
      const { path, content } = eventFile(event(n), n);
      this.files.set(path, content);
    }
  }

  private get eventNames(): string[] {
    return [...this.files.keys()].map((path) => path.slice("events/".length)).sort();
  }

  readonly request = async <T>(
    _token: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: T }> => {
    this.requests++;
    const answer = (status: number, data: unknown) => ({ status, data: data as T });
    const local = path.replace("repos/commons/ledger/", "");
    if (method === "GET" && local === "contents/events") {
      return answer(
        200,
        this.eventNames
          .slice(0, CONTENTS_LISTING_LIMIT)
          .map((name) => ({ name, path: `events/${name}`, type: "file" })),
      );
    }
    if (method === "GET" && local === "git/trees/main") {
      return answer(200, {
        tree: [{ path: "events", type: "tree", sha: "events-tree" }],
        truncated: false,
      });
    }
    if (method === "GET" && local === "git/trees/events-tree") {
      return answer(200, {
        tree: this.eventNames.map((name) => ({ path: name, type: "blob", sha: `blob-${name}` })),
        truncated: false,
      });
    }
    if (method === "POST" && path === "graphql") {
      const { variables } = body as { variables: Record<string, string> };
      // Objects asked for by ID, each variable `oN` answered as the alias `eN`.
      const asked = Object.entries(variables).filter(([name]) => /^o\d+$/.test(name));
      if (asked.length > 0) {
        if (asked.length > (this.limits.textsPerRequest ?? Infinity)) return answer(502, undefined);
        const byBlob = new Map(this.eventNames.map((name) => [`blob-${name}`, name]));
        const repository = Object.fromEntries(
          asked.map(([variable, oid]) => {
            const name = byBlob.get(oid);
            const text = name && this.files.get(`events/${name}`);
            return [`e${variable.slice(1)}`, text === undefined ? null : { text }];
          }),
        );
        return answer(200, { data: { repository } });
      }
    }
    if (method === "PUT" && local.startsWith("contents/events/")) {
      const file = local.slice("contents/".length);
      // Creating a file that already exists fails, as on GitHub.
      if (this.files.has(file)) return answer(422, { message: "sha wasn't supplied" });
      const { content } = body as { content: string };
      this.files.set(file, Buffer.from(content, "base64").toString("utf8"));
      // A failure from GitHub does not show that it did not carry the request out.
      if (this.limits.failWritesAfterSaving) return answer(502, undefined);
      return answer(201, {});
    }
    return answer(404, { message: `the fake does not answer ${method} ${path}` });
  };
}

const adapterFor = (github: FakeGitHub) =>
  new GitHubAdapter({ owner: "commons", token: "test", request: github.request });

describe("a project's event log on GitHub", () => {
  it("is read whole, however many events it holds", async () => {
    const github = new FakeGitHub(CONTENTS_LISTING_LIMIT + 1);
    const log = await adapterFor(github).read("ledger");
    expect(log).toHaveLength(CONTENTS_LISTING_LIMIT + 1);
  });

  it("is read a part at a time, never asking GitHub for too much at once", async () => {
    const github = new FakeGitHub(250, { textsPerRequest: 100 });
    const log = await adapterFor(github).read("ledger");
    expect(log.map((event) => (event as RoutingEvent).work.module)).toEqual(
      Array.from({ length: 250 }, (_, i) => `module-${i + 1}`),
    );
  });

  it("gives a new event the next number, however many events the log holds", async () => {
    const github = new FakeGitHub(CONTENTS_LISTING_LIMIT + 1);
    await adapterFor(github).append(event(CONTENTS_LISTING_LIMIT + 2));
    expect([...github.files.keys()].sort().at(-1)).toBe("events/001002.json");
  });

  it("records a new event in one request once the log has been read", async () => {
    const github = new FakeGitHub(250);
    const adapter = adapterFor(github);
    await adapter.read("ledger");
    const before = github.requests;
    await adapter.append(event(251));
    expect(github.requests - before).toBe(1);
  });

  it("numbers each event a run records after reading the log", async () => {
    const github = new FakeGitHub(250);
    const adapter = adapterFor(github);
    await adapter.read("ledger");
    await adapter.append(event(251));
    await adapter.append(event(252));
    expect(JSON.parse(github.files.get("events/000252.json") ?? "{}").work?.module).toBe(
      "module-252",
    );
  });

  it("gives a new event the next free number when another run has recorded one since", async () => {
    const github = new FakeGitHub(250);
    const adapter = adapterFor(github);
    await adapter.read("ledger");
    await adapterFor(github).append(event(251));
    await adapter.append(event(252));
    const modules = [...github.files.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-2)
      .map(([, content]) => JSON.parse(content).work.module);
    expect(modules).toEqual(["module-251", "module-252"]);
  });

  it("records an event once, when GitHub saves it but answers with a failure", async () => {
    const github = new FakeGitHub(250, { failWritesAfterSaving: true });
    const adapter = adapterFor(github);
    await adapter.read("ledger");
    await adapter.append(event(251)).catch(() => {});
    expect(github.files.size).toBe(251);
  });
});
