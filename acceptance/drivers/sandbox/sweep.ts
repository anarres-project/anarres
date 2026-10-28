/** What a sandbox run names its repository (its members' fork has the same name). */
export const runRepository = (run: string) => `${RUN_PREFIX}${run}`;
const RUN_PREFIX = "ledger-";

/** As long as any run takes (CI stops one at 60 minutes). */
const RUN_LIMIT = 3_600_000;

/**
 * The repositories in a sandbox organisation that an interrupted run left behind: made by a run,
 * long enough ago that the run must be over.
 */
export function leftBehind(
  repositories: { name: string; created_at: string }[],
  now: number,
): string[] {
  return repositories
    .filter((repository) => repository.name.startsWith(RUN_PREFIX))
    .filter((repository) => now - Date.parse(repository.created_at) > RUN_LIMIT)
    .map((repository) => repository.name);
}

/** Whether GitHub's answer to deleting a left-behind repository means it is gone or going. */
export const sweptBy = (status: number): boolean => [204, 404, 409].includes(status);
