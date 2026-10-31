import { describe, expect, it } from "vitest";
import { type RoutingRecord, readMergedWork, readRoutingRecord } from "../src/index.ts";

/** Coding work sent back to Test, as routing records it. */
const RECORD: RoutingRecord = {
  work: {
    fromRole: "coding",
    module: "parser",
    verdict: "fail",
    impediments: [{ type: "test_failure" }],
    feedbackSignal: "feedback/C-1.md",
  },
  decision: { tasks: [{ role: "test", module: "parser", feedbackSignal: "feedback/C-1.md" }] },
  reason: { rule: "reported", impediment: "test_failure" },
};

describe("reading back a routing record from the event log", () => {
  it("gives the record as routing wrote it", () => {
    expect(readRoutingRecord(JSON.parse(JSON.stringify(RECORD)))).toEqual(RECORD);
  });

  it("gives a record whose decision was an alert, which has no tasks", () => {
    const alert: RoutingRecord = {
      ...RECORD,
      decision: { alert: { reason: "re_run_limit" } },
      reason: { rule: "re_run_limit", role: "test" },
    };
    expect(readRoutingRecord(JSON.parse(JSON.stringify(alert)))).toEqual(alert);
  });

  it("is unreadable when its work gives no verdict, rather than taken as passed", () => {
    const { verdict: _, ...work } = RECORD.work;
    expect(readRoutingRecord({ ...RECORD, work })).toEqual({
      unreadable: "its work does not give its verdict",
    });
  });

  it.each([
    ["fromRole", "role"],
    ["module", "module"],
  ] as const)("is unreadable when its work gives no %s", (field, named) => {
    const work: Partial<RoutingRecord["work"]> = { ...RECORD.work };
    delete work[field];
    expect(readRoutingRecord({ ...RECORD, work })).toEqual({
      unreadable: `its work does not give its ${named}`,
    });
  });

  it.each([["12", "../issues"], "12", [12]])(
    "is unreadable when the tasks it withdrew are not a list of task numbers: %j",
    (withdrawn) => {
      expect(readRoutingRecord({ ...RECORD, withdrawn })).toEqual({
        unreadable: "the tasks it withdrew are not a list of task numbers",
      });
    },
  );

  it("is unreadable when a task it decided on names no role Anarres has", () => {
    const decision = { tasks: [{ role: "tester", module: "parser" }] };
    expect(readRoutingRecord({ ...RECORD, decision })).toEqual({
      unreadable: "its decision names a role Anarres does not have",
    });
  });

  it.each([null, {}, { work: "coding" }, { work: RECORD.work }])(
    "is unreadable when it is not a routing record at all: %j",
    (value) => {
      expect(readRoutingRecord(value)).toEqual({ unreadable: "it is not a routing record" });
    },
  );

  it.each([{ tasks: "test" }, { tasks: [null] }])(
    "is unreadable when its decision's tasks are not a list of tasks: %j",
    (decision) => {
      expect(readRoutingRecord({ ...RECORD, decision })).toEqual({
        unreadable: "its decision's tasks are not a list of tasks",
      });
    },
  );
});

describe("reading back the work Divlab recorded as about to merge", () => {
  const WORK = { fromRole: "test", module: "parser", verdict: "pass", impediments: [] };

  it("gives the work as Divlab recorded it", () => {
    expect(readMergedWork(JSON.parse(JSON.stringify(WORK)))).toEqual(WORK);
  });

  it("keeps that the work completed the last module, so integration still starts (0017)", () => {
    const last = { ...WORK, fromRole: "security-and-quality", lastModule: true };
    expect(readMergedWork(JSON.parse(JSON.stringify(last)))).toEqual(last);
  });

  it.each(["false", false, 1])(
    "is unreadable when it says the work completed the last module as anything but yes: %j",
    (lastModule) => {
      expect(readMergedWork({ ...WORK, lastModule })).toEqual({
        unreadable: "its work says it completed the last module in something other than yes",
      });
    },
  );

  it.each(["false", false])(
    "is unreadable when it says the module at fault is unlisted as anything but yes: %j",
    (moduleAtFaultUnlisted) => {
      expect(readMergedWork({ ...WORK, moduleAtFaultUnlisted })).toEqual({
        unreadable: "its work says its module at fault is unlisted in something other than yes",
      });
    },
  );

  it("is unreadable when it gives no verdict, rather than routed as passed", () => {
    const { verdict: _, ...withoutVerdict } = WORK;
    expect(readMergedWork(withoutVerdict)).toEqual({
      unreadable: "its work does not give its verdict",
    });
  });
  it("is unreadable when the modules its work started are not plain names", () => {
    expect(
      readRoutingRecord({
        work: {
          fromRole: "programme-architect",
          module: "programme",
          verdict: "pass",
          modulesToStart: ["parser", 42],
        },
        decision: { tasks: [] },
        reason: { rule: "modules_listed" },
      }),
    ).toEqual({ unreadable: "its work names the modules it started in more than plain names" });
  });
});
