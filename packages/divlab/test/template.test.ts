import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/** One of the project template's workflows, as a project repository would have it. */
const templateText = (name: string) =>
  readFileSync(new URL(`../../../template/.github/workflows/${name}`, import.meta.url), "utf8");
const templateWorkflow = (name: string) => parse(templateText(name));
const PULL_REQUEST_WORKFLOW = "divlab-pull-request.yml";
const PUSH_WORKFLOW = "anarres.yml";

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

  it("waits its turn with the project's other Divlab runs, so one acts at a time", () => {
    expect(workflow.concurrency).toEqual(templateWorkflow(PUSH_WORKFLOW).concurrency);
  });
});

describe.each([PULL_REQUEST_WORKFLOW, PUSH_WORKFLOW])(
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
      expect(divlab?.with).toEqual({ token: expression(`steps.${token?.id}.outputs.token`) });
    });

    it("gives the workflow's own token no permissions: Divlab acts only with the App's", () => {
      expect(workflow.permissions).toEqual({});
    });

    it("never puts anything from the event, such as a pull request's title or branch, in an expression", () => {
      expect(templateText(name)).not.toMatch(/\$\{\{[^}]*github\.(event|head_ref)/);
    });
  },
);
