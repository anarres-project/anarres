/** Anarres cannot yet do what the scenario asks. Honest red for a `@wip` scenario. */
export class NotYetImplemented extends Error {
  override name = "NotYetImplemented";
  constructor(what: string) {
    super(`Not yet implemented: ${what}`);
  }
}

/** The test harness cannot yet arrange or observe what the scenario needs. */
export class HarnessNotYetBuilt extends Error {
  override name = "HarnessNotYetBuilt";
  constructor(what: string) {
    super(`Harness not yet built: ${what}`);
  }
}
