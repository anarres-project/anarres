import type { AboutToMerge, NotAccepted, RoutingEvent } from "@anarres/divlab";
import { describe, expect, it } from "vitest";
import {
  commentForRefusal,
  eventFile,
  eventFromFile,
  issueForAlert,
  issueForModuleDone,
  issueForNotAccepted,
  issueForTask,
  issueForUnprotectedMain,
  issueNumber,
  logFrom,
  protectsMain,
  rulesetProtectingMain,
  taskFromIssue,
} from "../src/index.ts";

const EVENT: RoutingEvent = {
  project: "ledger",
  work: {
    fromRole: "test",
    module: "parser",
    verdict: "pass",
    impediments: [],
    feedbackSignal: "feedback/T-0142.md",
  },
  decision: { tasks: [{ role: "coding", module: "parser" }] },
  reason: { rule: "passed" },
};

describe("a task as a GitHub issue", () => {
  it("is labelled with its role, its module and as ready, and links its feedback signal", () => {
    expect(
      issueForTask({
        project: "ledger",
        role: "specification",
        module: "parser",
        feedbackSignal: "feedback/T-0142.md",
      }),
    ).toEqual({
      title: "Specification task for parser",
      labels: ["role:specification", "module:parser", "state:ready"],
      body: "Feedback signal: feedback/T-0142.md",
    });
  });

  it("says nothing of a feedback signal when it has none", () => {
    expect(issueForTask({ project: "ledger", role: "test", module: "parser" }).body).toBe("");
  });

  it("records on a Research task which role it is for", () => {
    expect(
      issueForTask({
        project: "ledger",
        role: "research",
        module: "parser",
        feedbackSignal: "feedback/T-0142.md",
        researchFor: "coding",
      }).labels,
    ).toEqual(["role:research", "module:parser", "state:ready", "research-for:coding"]);
  });

  it("reads back from a Research task which role it is for", () => {
    const issue = issueForTask({
      project: "ledger",
      role: "research",
      module: "parser",
      researchFor: "coding",
    });
    expect(taskFromIssue({ labels: issue.labels.map((name) => ({ name })) })).toEqual({
      researchFor: "coding",
    });
  });

  it("reads back nothing more from a task that is not Research", () => {
    const issue = issueForTask({ project: "ledger", role: "test", module: "parser" });
    expect(taskFromIssue({ labels: issue.labels.map((name) => ({ name })) })).toEqual({});
  });
});

describe("the task a feedback signal names", () => {
  it("is the issue with that number", () => {
    expect(issueNumber("12")).toBe(12);
  });

  it.each(["../../orgs/anarres-sandbox", "12/comments", "12?state=open", "T-0142", "0", "012", ""])(
    "is no issue at all when the id is %j, not a plain issue number",
    (task) => {
      expect(issueNumber(task)).toBeUndefined();
    },
  );
});

describe("a routing event as a file", () => {
  it("is one file under events/, named by its place in the log", () => {
    expect(eventFile(EVENT, 7).path).toBe("events/000007.json");
  });

  it("reads back as the event that was written", () => {
    expect(eventFromFile(eventFile(EVENT, 1).content)).toEqual(EVENT);
  });

  it("reads back a record of work Divlab did not accept", () => {
    const notAccepted: NotAccepted = {
      project: "ledger",
      notAccepted: {
        feedbackSignal: "feedback/T-0143.md",
        reason: "it reached main without Divlab merging it",
      },
    };
    expect(eventFromFile(eventFile(notAccepted, 2).content)).toEqual(notAccepted);
  });

  it("reads back a record that Divlab was about to merge a pull request", () => {
    const begun: AboutToMerge = {
      project: "ledger",
      aboutToMerge: {
        pullRequest: "7",
        head: "c0ffee",
        feedbackSignal: "feedback/T-0144.md",
        work: { fromRole: "test", module: "parser", verdict: "pass", impediments: [] },
      },
    };
    expect(eventFromFile(eventFile(begun, 3).content)).toEqual(begun);
  });

  it("is refused when it is not a routing record", () => {
    expect(() => eventFromFile('{"project": "ledger"}')).toThrow("not a routing record");
  });

  it("makes a log only when every listed event file has been read", () => {
    const texts = new Map([["000001.json", eventFile(EVENT, 1).content]]);
    expect(logFrom(["000001.json", "000002.json"], texts)).toBeUndefined();
  });

  it("reads the listed events oldest first, ignoring any other file", () => {
    const second = { ...EVENT, reason: { rule: "failed" as const } };
    const texts = new Map([
      ["000002.json", eventFile(second, 2).content],
      ["README.md", "not an event"],
      ["000001.json", eventFile(EVENT, 1).content],
    ]);
    expect(logFrom(["000001.json", "000002.json"], texts)).toEqual([EVENT, second]);
  });
});

describe("a PDC coordinator alert as a GitHub issue", () => {
  const unroutable: RoutingEvent = {
    ...EVENT,
    work: { ...EVENT.work, verdict: "fail", impediments: [{ type: "test_failures" }] },
    decision: { alert: { reason: "no_matching_rule" } },
    reason: { rule: "no_matching_rule" },
  };

  it("is an escalation for the module, saying what was reported and that no rule covers it", () => {
    expect(issueForAlert(unroutable)).toEqual({
      title: "Escalation: no rule covers the Test work on parser",
      labels: ["escalation", "module:parser"],
      body: expect.stringContaining(
        "The Test work on parser failed, reporting test_failures. No routing rule covers that.",
      ),
    });
  });

  it("names the role that has been re-run more than three times", () => {
    const stuck: RoutingEvent = {
      ...unroutable,
      work: { ...unroutable.work, fromRole: "coding" },
      decision: { alert: { reason: "re_run_limit" } },
      reason: { rule: "re_run_limit", role: "coding" },
    };
    expect(issueForAlert(stuck)).toEqual({
      title: "Escalation: Coding has been re-run more than three times on parser",
      labels: ["escalation", "module:parser"],
      body: expect.stringContaining(
        "The Coding work on parser failed, reporting test_failures. Coding has already been re-run three times for this module, so Divlab has not sent it back again.",
      ),
    });
  });

  it("carries the routing record for tools, after the words", () => {
    const { body } = issueForAlert(unroutable);
    const json = body.match(/```json\n([\s\S]*)\n```$/)?.[1];
    expect(JSON.parse(json ?? "null")).toEqual(unroutable);
  });

  it("keeps the routing record inside its code block, whatever the work's feedback signal is called", () => {
    const sly: RoutingEvent = {
      ...unroutable,
      work: {
        ...unroutable.work,
        feedbackSignal: "feedback/x\n```\n@everyone [click](https://example.test)",
      },
    };
    const { body } = issueForAlert(sly);
    expect(body.split("\n").filter((line) => line.startsWith("```"))).toEqual(["```json", "```"]);
  });

  it("says blocked work was blocked", () => {
    const blocked: RoutingEvent = {
      ...unroutable,
      work: { ...unroutable.work, verdict: "blocked" },
    };
    expect(issueForAlert(blocked).body).toMatch(/^The Test work on parser was blocked, reporting/);
  });

  it("says when the work reported no problem", () => {
    const silent: RoutingEvent = { ...unroutable, work: { ...unroutable.work, impediments: [] } };
    expect(issueForAlert(silent).body).toMatch(
      /^The Test work on parser failed, reporting no problem\./,
    );
  });
});

describe("a finished module on GitHub", () => {
  it("is an issue labelled with the module and as done", () => {
    expect(issueForModuleDone("parser")).toEqual({
      title: "Module parser is done",
      labels: ["module:parser", "state:done"],
      body: "",
    });
  });
});

describe("Divlab's comment on a pull request it will not merge", () => {
  it("says why, quoting the reason as text, never as Markdown", () => {
    expect(commentForRefusal("The feedback signal feedback/@all.md cannot be read")).toBe(
      "Divlab has not merged this pull request:\n\n```\nThe feedback signal feedback/@all.md cannot be read\n```",
    );
  });

  it("keeps the reason inside its code block even when the reason contains a fence", () => {
    const reason = "feedback/x```\n[click](https://example.test)\n```.md cannot be read";
    expect(commentForRefusal(reason)).toBe(
      `Divlab has not merged this pull request:\n\n\`\`\`\`\n${reason}\n\`\`\`\``,
    );
  });
});

describe("the ruleset that protects a project's main branch (decision 0006)", () => {
  it("is not in force when any of its rules no longer applies to main", () => {
    expect(protectsMain([{ type: "deletion" }, { type: "non_fast_forward" }])).toBe(false);
  });

  it("is in force when GitHub applies all its rules to main", () => {
    expect(
      protectsMain([{ type: "deletion" }, { type: "update" }, { type: "non_fast_forward" }]),
    ).toBe(true);
  });

  it("lets nobody but Divlab's App change, delete or rewrite main", () => {
    expect(rulesetProtectingMain(5414648)).toEqual({
      name: "Only Divlab changes main",
      target: "branch",
      enforcement: "active",
      conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
      rules: [{ type: "update" }, { type: "deletion" }, { type: "non_fast_forward" }],
      bypass_actors: [{ actor_id: 5414648, actor_type: "Integration", bypass_mode: "always" }],
    });
  });
});

describe("an alert of work Divlab did not accept, as a GitHub issue", () => {
  it("tells PDC coordinators what reached main without Divlab, quoting its path as text", () => {
    expect(
      issueForNotAccepted({
        project: "ledger",
        notAccepted: {
          feedbackSignal: "feedback/@all.md",
          reason: "it reached main without Divlab merging it",
        },
      }),
    ).toEqual({
      title: "Escalation: work reached main without Divlab merging it",
      labels: ["escalation", "not-accepted"],
      body: [
        "Divlab has not accepted this feedback signal, and will not route its work: it reached main without Divlab merging it.",
        "",
        "```",
        "feedback/@all.md",
        "```",
      ].join("\n"),
    });
  });
});

describe("an alert that a project's main branch is not protected, as a GitHub issue", () => {
  it("tells PDC coordinators, under a label that marks it until they close it", () => {
    expect(issueForUnprotectedMain()).toEqual({
      title: "Escalation: this project's main branch is not protected",
      labels: ["escalation", "unprotected-main"],
      body: "Divlab found that this project's main branch no longer has the protection that lets only Divlab change it (decision 0006). Until it is restored, anyone with enough access could change main without Divlab's checks. Close this issue once main is protected again; Divlab alerts again if protection is lost later.",
    });
  });
});
