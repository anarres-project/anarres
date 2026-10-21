import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/** One of the project template's workflows, as a project repository would have it. */
const templateText = (name: string) =>
  readFileSync(new URL(`../../../template/.github/workflows/${name}`, import.meta.url), "utf8");
const templateWorkflow = (name: string) => parse(templateText(name));
const PULL_REQUEST_WORKFLOW = "divlab-pull-request.yml";
const workflow = templateWorkflow(PULL_REQUEST_WORKFLOW);

/** A GitHub Actions expression, as a workflow writes it. */
const expression = (inside: string) => `\${{ ${inside} }}`;

type Step = { id?: string; uses?: string; run?: string; with?: Record<string, string> };
const steps: Step[] = Object.values(workflow.jobs).flatMap(
  (job) => (job as { steps: Step[] }).steps,
);

describe("the project template's pull request workflow (decision 0006)", () => {
  it("runs only as the project's main branch has it, never as a pull request has it", () => {
    expect(Object.keys(workflow.on)).toEqual(["pull_request_target"]);
  });

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

  it("waits its turn with the project's other Divlab runs, so one acts at a time", () => {
    expect(workflow.concurrency).toEqual(templateWorkflow("anarres.yml").concurrency);
  });

  it("never puts anything from the event, such as a pull request's title or branch, in an expression", () => {
    expect(templateText(PULL_REQUEST_WORKFLOW)).not.toMatch(/\$\{\{[^}]*github\.(event|head_ref)/);
  });
});
