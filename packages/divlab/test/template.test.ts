import { readFileSync } from "node:fs";
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
  it("runs every hour, and on nothing else", () => {
    expect(templateWorkflow(LEASE_WORKFLOW).on).toEqual({ schedule: [{ cron: "17 * * * *" }] });
  });
});

describe.each([PULL_REQUEST_WORKFLOW, PUSH_WORKFLOW, CLAIM_WORKFLOW, LEASE_WORKFLOW])(
  "each of the project template's Divlab workflows: %s",
  (name) => {
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
  },
);
