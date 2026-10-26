import type {
  AboutToMerge,
  Activity,
  Claimed,
  LeaseRanOut,
  NotAccepted,
  Released,
  RoutingEvent,
} from "@anarres/divlab";
import { describe, expect, it } from "vitest";
import {
  commentForRefusal,
  decisionOf,
  eventFile,
  eventFromFile,
  issueForAlert,
  issueForChangeNotByDivlab,
  issueForClaimedWithoutClaim,
  issueForModuleDone,
  issueForNotAccepted,
  issueForTask,
  issueForUnprotectedMain,
  issueNumber,
  logFrom,
  policyAllowingDivlabChecks,
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
        decidedOn: "feedback/T-0141.md",
      }),
    ).toEqual({
      title: "Specification task for parser",
      labels: ["role:specification", "module:parser", "state:ready"],
      body: 'Feedback signal: feedback/T-0142.md\n\nDivlab decided this from:\n\n```json\n{"decidedOn":"feedback/T-0141.md"}\n```',
    });
  });

  it("says nothing of a feedback signal when it has none", () => {
    expect(
      issueForTask({
        project: "ledger",
        role: "test",
        module: "parser",
        decidedOn: "feedback/T-1.md",
      }).body,
    ).not.toContain("Feedback signal:");
  });

  it("records on a Research task which role it is for", () => {
    expect(
      issueForTask({
        project: "ledger",
        role: "research",
        module: "parser",
        feedbackSignal: "feedback/T-0142.md",
        researchFor: "coding",
        decidedOn: "feedback/T-0141.md",
      }).labels,
    ).toEqual(["role:research", "module:parser", "state:ready", "research-for:coding"]);
  });

  it("links to the feedback signal it was decided from, as it was at the merged commit", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    const issue = issueForTask(
      {
        project: "ledger",
        role: "coding",
        module: "parser",
        decidedOn: "feedback/T-0141.md",
        inputsAt: sha,
      },
      "commons/ledger",
    );
    expect(issue.body).toContain(
      `Decided by [feedback/T-0141.md](https://github.com/commons/ledger/blob/${sha}/feedback/T-0141.md).`,
    );
  });

  it("says which commit the task's inputs are read at, in words and in its decision", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    const issue = issueForTask({
      project: "ledger",
      role: "coding",
      module: "parser",
      decidedOn: "feedback/T-0141.md",
      inputsAt: sha,
    });
    expect(issue.body).toBe(
      [
        `Read this task's inputs as they were at commit ${sha}.`,
        "",
        "Divlab decided this from:",
        "",
        "```json",
        JSON.stringify({ decidedOn: "feedback/T-0141.md", inputsAt: sha }),
        "```",
      ].join("\n"),
    );
  });

  it.each([
    [
      "a commit",
      "0123456789abcdef0123456789abcdef01234567",
      "0123456789abcdef0123456789abcdef01234567",
    ],
    ["something that is not a commit", "main; rm -rf ~", undefined],
  ])("reads back the commit a task's inputs are read at, if it is %s", (_what, written, read) => {
    const issue = issueForTask({
      project: "ledger",
      role: "coding",
      module: "parser",
      decidedOn: "feedback/T-0141.md",
      inputsAt: written,
    });
    const task = taskFromIssue({
      labels: issue.labels.map((name) => ({ name })),
      body: issue.body,
    });
    expect(task?.inputsAt).toBe(read);
  });

  it("reads no commit from a task whose decision block has been edited into something else", () => {
    const labels = ["role:test", "module:parser", "state:ready"].map((name) => ({ name }));
    const body = "Divlab decided this from:\n\n```json\n{ not json\n```";
    expect(taskFromIssue({ labels, body })?.inputsAt).toBeUndefined();
  });

  it("marks a continuation of partial work, and reads it back (decision 0008)", () => {
    const issue = issueForTask({
      project: "ledger",
      role: "coding",
      module: "parser",
      decidedOn: "feedback/T-0141.md",
      continuation: true,
    });
    expect(issue.labels).toContain("continuation");
    expect(taskFromIssue({ labels: issue.labels.map((name) => ({ name })) })?.continuation).toBe(
      true,
    );
  });

  it("reads back from a Research task which role it is for", () => {
    const issue = issueForTask({
      project: "ledger",
      role: "research",
      module: "parser",
      researchFor: "coding",
      decidedOn: "feedback/T-0141.md",
    });
    expect(taskFromIssue({ labels: issue.labels.map((name) => ({ name })) })?.researchFor).toBe(
      "coding",
    );
  });

  it("reads back nothing more from a task that is not Research", () => {
    const issue = issueForTask({
      project: "ledger",
      role: "test",
      module: "parser",
      decidedOn: "feedback/T-0141.md",
    });
    expect(taskFromIssue({ labels: issue.labels.map((name) => ({ name })) })).toEqual({
      role: "test",
      module: "parser",
    });
  });

  it("reads a ready task as held by nobody, even if someone has been assigned it", () => {
    const labels = ["role:test", "module:parser", "state:ready"].map((name) => ({ name }));
    expect(taskFromIssue({ labels, assignees: [{ login: "carol" }] })?.claimedBy).toBeUndefined();
  });

  it("reads a task Divlab marked claimed as claimed, though nobody is assigned it now", () => {
    const labels = ["role:test", "module:parser", "state:claimed"].map((name) => ({ name }));
    expect(taskFromIssue({ labels, assignees: [] })).toEqual({
      role: "test",
      module: "parser",
      claimed: true,
    });
  });

  it("reads back the role and module a task is for", () => {
    const labels = ["role:reviewer", "module:parser", "state:ready"].map((name) => ({ name }));
    expect(taskFromIssue({ labels })).toMatchObject({ role: "reviewer", module: "parser" });
  });

  it("reads back who holds a claimed task", () => {
    const labels = ["role:test", "module:parser", "state:claimed"].map((name) => ({ name }));
    expect(taskFromIssue({ labels, assignees: [{ login: "alice" }] })?.claimedBy).toBe("alice");
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

  it("reads back a record of a claim Divlab granted", () => {
    const claimed: Claimed = {
      project: "ledger",
      decidedAt: "2026-10-23T09:00:00.000Z",
      claimed: { task: "12", member: "alice" },
    };
    expect(eventFromFile(eventFile(claimed, 4).content)).toEqual(claimed);
  });

  it("is refused, saying why, when a claim names a role Anarres does not have", () => {
    const claimed = {
      project: "ledger",
      decidedAt: "2026-10-23T09:00:00.000Z",
      claimed: { task: "12", member: "alice", role: "bystander", module: "parser" },
    };
    expect(() => eventFromFile(JSON.stringify(claimed))).toThrow(
      "The event file cannot be read: the claim names a role Anarres does not have",
    );
  });

  it("reads back a record that a member's lease ran out", () => {
    const ranOut: LeaseRanOut = {
      project: "ledger",
      decidedAt: "2026-10-24T09:00:00.000Z",
      leaseRanOut: { task: "12", member: "alice" },
    };
    expect(eventFromFile(eventFile(ranOut, 5).content)).toEqual(ranOut);
  });

  it("reads back a record of activity on a task", () => {
    const activity: Activity = {
      project: "ledger",
      decidedAt: "2026-10-24T08:00:00.000Z",
      activity: { task: "12", member: "alice" },
    };
    expect(eventFromFile(eventFile(activity, 6).content)).toEqual(activity);
  });

  it("reads back a record that a member gave a task back", () => {
    const released: Released = {
      project: "ledger",
      decidedAt: "2026-10-24T08:30:00.000Z",
      released: { task: "12", member: "alice" },
    };
    expect(eventFromFile(eventFile(released, 7).content)).toEqual(released);
  });

  it.each([
    [
      "a change that reached main without Divlab",
      { changeNotByDivlab: { commit: "c0ffee", author: "mallory" } },
    ],
    ["how far Divlab has checked main", { mainChecked: { upTo: "c0ffee" } }],
    [
      "a task shown as claimed without a claim",
      { claimedWithoutClaim: { task: "12", shownAs: "mallory" } },
    ],
  ])("reads back a record of %s", (_what, record) => {
    const event = { project: "ledger", decidedAt: "2026-10-23T09:00:00.000Z", ...record };
    expect(eventFromFile(eventFile(event as never, 8).content)).toEqual(event);
  });

  it("is refused, saying why, when the work it was about to merge could not be routed", () => {
    const begun = {
      project: "ledger",
      aboutToMerge: {
        pullRequest: "7",
        head: "c0ffee",
        feedbackSignal: "feedback/T-0144.md",
        work: { fromRole: "test", module: "parser", impediments: [] },
      },
    };
    expect(() => eventFromFile(JSON.stringify(begun))).toThrow(
      "its work does not give its verdict",
    );
  });

  it("reads back a record that Divlab acted on a decision", () => {
    const acted = { project: "ledger", actedOn: { feedbackSignal: "feedback/T-0144.md" } };
    expect(eventFromFile(eventFile(acted, 4).content)).toEqual(acted);
  });

  it("is refused when it is not a routing record", () => {
    expect(() => eventFromFile('{"project": "ledger"}')).toThrow("not a routing record");
  });

  it("is refused, saying why, when its record is one routing could not rely on", () => {
    const { verdict: _, ...work } = EVENT.work;
    expect(() => eventFromFile(JSON.stringify({ ...EVENT, work }))).toThrow(
      "its work does not give its verdict",
    );
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
    expect(
      issueForModuleDone({ project: "ledger", module: "parser", decidedOn: "feedback/FB-6.md" }),
    ).toMatchObject({
      title: "Module parser is done",
      labels: ["module:parser", "state:done"],
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

describe("the Actions policy that lets Divlab check members' pull requests", () => {
  it("allows pull request events for Divlab's pull request workflow, and no other", () => {
    expect(policyAllowingDivlabChecks()).toEqual({
      name: "Only Divlab checks pull requests",
      enforcement: "active",
      conditions: {
        workflow_path: { include: [".github/workflows/divlab-pull-request.yml"], exclude: [] },
      },
      rules: [
        { type: "restrict_action_events", parameters: { allowed_events: ["pull_request_target"] } },
      ],
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

describe("the decision an issue Divlab posted came from", () => {
  it("is read back from a task's issue", () => {
    const task = {
      project: "ledger",
      role: "test" as const,
      module: "parser",
      decidedOn: "feedback/FB-1.md",
    };
    expect(decisionOf(issueForTask(task).body)).toBe("feedback/FB-1.md");
  });

  it("is read back from a finished module's issue", () => {
    const done = { project: "ledger", module: "parser", decidedOn: "feedback/FB-6.md" };
    expect(decisionOf(issueForModuleDone(done).body)).toBe("feedback/FB-6.md");
  });

  it("is read back from a PDC coordinators' alert", () => {
    const alert = {
      ...EVENT,
      decision: { alert: { reason: "no_matching_rule" as const } },
      reason: { rule: "no_matching_rule" as const },
    };
    expect(decisionOf(issueForAlert(alert).body)).toBe(EVENT.work.feedbackSignal);
  });

  it("is read back whole, and stays inside its code block, whatever the path is called", () => {
    const sly = "feedback/x\n```\n@everyone [click](https://example.test)";
    const { body } = issueForTask({
      project: "ledger",
      role: "test",
      module: "parser",
      decidedOn: sly,
    });
    expect([decisionOf(body), body.split("\n").filter((line) => line.startsWith("```"))]).toEqual([
      sly,
      ["```json", "```"],
    ]);
  });
});

describe("an alert of a change on main Divlab did not make, as a GitHub issue", () => {
  it("tells PDC coordinators which commit it was and whose, quoted as text", () => {
    expect(
      issueForChangeNotByDivlab({
        project: "ledger",
        decidedAt: "2026-10-23T09:00:00.000Z",
        changeNotByDivlab: { commit: "c0ffee", author: "mallory" },
      }),
    ).toEqual({
      title: "Escalation: a change reached main without Divlab",
      labels: ["escalation", "not-accepted", "change-not-by-divlab"],
      body: [
        "This commit on main was not made by Divlab, so it did not pass Divlab's checks. Its author, as GitHub records it, and the commit:",
        "",
        "```",
        "mallory c0ffee",
        "```",
      ].join("\n"),
    });
  });
});

describe("an alert of a task shown as claimed with no claim in Divlab's log, as a GitHub issue", () => {
  it("tells PDC coordinators which task it was and whom it showed, quoted as text", () => {
    expect(
      issueForClaimedWithoutClaim({
        project: "ledger",
        task: "12",
        role: "test",
        module: "parser",
        shownAs: "mallory",
      }),
    ).toEqual({
      title: "Escalation: a task was shown as claimed without a claim",
      labels: ["escalation", "claimed-without-claim"],
      body: [
        "Task #12, Test task for parser, was shown as claimed, but Divlab's log has no claim for it, so Divlab did not give it to anyone. Divlab has made it ready again. Whom it showed as holding it:",
        "",
        "```",
        "mallory",
        "```",
      ].join("\n"),
    });
  });

  it("says nobody was shown holding it when nobody was", () => {
    const { body } = issueForClaimedWithoutClaim({
      project: "ledger",
      task: "12",
      role: "test",
      module: "parser",
    });
    expect(body.endsWith("ready again. Nobody was shown as holding it.")).toBe(true);
  });
});
