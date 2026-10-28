import { readFileSync } from "node:fs";
import { writeScope } from "@anarres/core";
import { PROJECT_CHECK } from "@anarres/github";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/** One of the project template's workflows, as a project repository would have it. */
const templateText = (name: string) =>
  readFileSync(new URL(`../../../template/.github/workflows/${name}`, import.meta.url), "utf8");
const templateWorkflow = (name: string) => parse(templateText(name));
const PULL_REQUEST_WORKFLOW = "divlab-pull-request.yml";
const PUSH_WORKFLOW = "anarres.yml";
const CLAIM_WORKFLOW = "divlab-claim.yml";
const LEASE_WORKFLOW = "divlab-leases.yml";
const CHECKS_WORKFLOW = "checks.yml";
const CHECKED_WORKFLOW = "divlab-checks.yml";

/** A GitHub Actions expression, as a workflow writes it. */
const expression = (inside: string) => `\${{ ${inside} }}`;

type Step = { id?: string; uses?: string; run?: string; with?: Record<string, string> };
const stepsOf = (workflow: { jobs: Record<string, { steps: Step[] }> }): Step[] =>
  Object.values(workflow.jobs).flatMap((job) => job.steps);

describe("the project template's pull request workflow (decision 0006)", () => {
  const workflow = templateWorkflow(PULL_REQUEST_WORKFLOW);

  it("runs only as the project's main branch has it, never as a pull request has it", () => {
    expect(Object.keys(workflow.on)).toEqual(["pull_request_target"]);
  });

  it("runs when a member marks a draft ready, as well as when work is opened or pushed to", () => {
    expect(workflow.on.pull_request_target.types).toEqual([
      "opened",
      "synchronize",
      "reopened",
      "ready_for_review",
    ]);
  });
});

describe("the project template's claim workflow", () => {
  it("tells Divlab where the organisation keeps its governance file, if it names one", () => {
    const divlab = stepsOf(templateWorkflow(CLAIM_WORKFLOW)).at(-1);
    expect(divlab?.with?.governance).toBe(expression("vars.ANARRES_GOVERNANCE"));
  });

  it("runs when someone comments on one of the project's issues, and on nothing else", () => {
    expect(templateWorkflow(CLAIM_WORKFLOW).on).toEqual({ issue_comment: { types: ["created"] } });
  });
});

describe("the project template's lease workflow", () => {
  it("runs every hour, or when someone who may run the project's workflows asks, and on nothing else", () => {
    expect(templateWorkflow(LEASE_WORKFLOW).on).toEqual({
      schedule: [{ cron: "17 * * * *" }],
      workflow_dispatch: null,
    });
  });
});

describe.each([
  PULL_REQUEST_WORKFLOW,
  PUSH_WORKFLOW,
  CLAIM_WORKFLOW,
  LEASE_WORKFLOW,
  CHECKED_WORKFLOW,
])("each of the project template's Divlab workflows: %s", (name) => {
  const workflow = templateWorkflow(name);
  const steps = stepsOf(workflow);

  it("does nothing but take the App's token and run Divlab: no step checks out or runs code", () => {
    expect(steps.map((step) => step.uses ?? `run: ${step.run}`)).toEqual([
      "actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1",
      "anarres-project/anarres/packages/divlab@main",
    ]);
  });

  it("runs Divlab as its App, with a token minted from the organisation's App credentials", () => {
    const [token, divlab] = steps;
    expect(token?.with).toEqual({
      "client-id": expression("vars.DIVLAB_APP_CLIENT_ID"),
      "private-key": expression("secrets.DIVLAB_APP_PRIVATE_KEY"),
    });
    expect(divlab?.with?.token).toBe(expression(`steps.${token?.id}.outputs.token`));
  });

  it("tells Divlab its App's name, so it knows its own changes to main from anyone's", () => {
    const [token, divlab] = steps;
    expect(divlab?.with?.app).toBe(expression(`steps.${token?.id}.outputs.app-slug`));
  });

  it("waits its turn with the project's other Divlab runs, so one acts at a time", () => {
    expect(workflow.concurrency.group).toBe("divlab");
    expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
  });

  it("keeps every run waiting its turn: none is dropped when members submit at once", () => {
    expect(workflow.concurrency.queue).toBe("max");
  });

  it("gives the workflow's own token no permissions: Divlab acts only with the App's", () => {
    expect(workflow.permissions).toEqual({});
  });

  it("never puts anything from the event, such as a pull request's title or branch, in an expression", () => {
    expect(templateText(name)).not.toMatch(/\$\{\{[^}]*github\.(event|head_ref)/);
  });
});

describe("the project template's checks workflow (decision 0010)", () => {
  const workflow = templateWorkflow(CHECKS_WORKFLOW);

  it("runs on members' pull requests as GitHub runs their own code: never with the project's secrets", () => {
    expect(Object.keys(workflow.on)).toEqual(["pull_request"]);
  });

  it("runs only on pull requests changing a module's code, where only Coding writes", () => {
    expect(workflow.on.pull_request.paths).toEqual([`${writeScope("coding", "*")}**`]);
  });
  it("gives the workflow's own token nothing but reading the project's code", () => {
    expect(workflow.permissions).toEqual({ contents: "read" });
  });
  it("gives its tests' check the name Divlab reads it by", () => {
    const names = Object.values(workflow.jobs as Record<string, { name?: string }>).map(
      (job) => job.name,
    );
    expect(names).toContain(PROJECT_CHECK);
  });
  it("runs the test command anarres.yaml declares, in the image it declares, never as workflow syntax", () => {
    type Job = {
      name?: string;
      needs?: string;
      container?: string;
      steps: Step[];
      outputs?: Record<string, string>;
    };
    const jobs = Object.entries(workflow.jobs as Record<string, Job>);
    const [toolchain, read] = jobs.find(([, job]) => job.outputs !== undefined) ?? [];
    const tests = jobs.find(([, job]) => job.name === PROJECT_CHECK)?.[1];
    expect(read?.steps.some((step) => step.run?.includes("anarres.yaml"))).toBe(true);
    expect(tests?.needs).toBe(toolchain);
    expect(tests?.container).toBe(expression(`needs.${toolchain}.outputs.image`));
    const running = tests?.steps.at(-1) as Step & { env?: Record<string, string> };
    expect(running.env).toEqual({ TEST_COMMAND: expression(`needs.${toolchain}.outputs.test`) });
    expect(running.run).toBe('sh -c "$TEST_COMMAND"');
  });
});

describe("the project template's workflow for the project's checks finishing", () => {
  it("runs when the project's checks workflow has finished, and on nothing else", () => {
    expect(templateWorkflow(CHECKED_WORKFLOW).on).toEqual({
      workflow_run: { workflows: [templateWorkflow(CHECKS_WORKFLOW).name], types: ["completed"] },
    });
  });
});
