/**
 * In the sandbox, the governance file (trust levels, linked accounts) applies to every scenario,
 * since every worker's scenarios share its accounts. A scenario that changes it runs alone.
 */
type Scenario = { tags: readonly { name: string }[] };

const changesGovernance = (scenario: Scenario) =>
  scenario.tags.some((tag) => tag.name === "@governance");

/** Whether `scenario` may start while `running` are under way. */
export function mayStart(scenario: Scenario, running: readonly Scenario[]): boolean {
  return changesGovernance(scenario) ? running.length === 0 : !running.some(changesGovernance);
}
