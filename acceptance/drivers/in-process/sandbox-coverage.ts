/**
 * The adapter's methods the sandbox cannot reach, each with why: kept here, in one place
 * (decision 0018).
 */
export const SANDBOX_UNREACHABLE: Readonly<Record<string, string>> = {
  tellLeaseRanOut: "a lease runs 24 hours, far longer than a sandbox run",
  actedOn:
    "read only when finishing a run interrupted between recording and acting, which the sandbox cannot cause on cue",
  mergeCommitOf:
    "read only when finishing a merge an interrupted run began, which the sandbox cannot cause on cue",
  openHead:
    "read only when asking GitHub again for a merge it put off, which the sandbox cannot cause on cue",
  alertUnreadableModules:
    "making main's modules.yaml unreadable in the sandbox would be a change not by Divlab, which protection refuses",
  unreadableModulesAlertOpen: "asked only once modules.yaml cannot be read, as above",
  comment:
    "private to the adapter; the fake's comment is a member's own comment, which the harness writes",
};

/** The fake's methods Divlab and the CLI have called in this run. */
export const SYSTEM_CALLS = new Set<string>();

/**
 * The adapter's methods no `@sandbox` scenario called, run in-process, except those the sandbox
 * cannot reach, each with its reason (decision 0018).
 */
export function unreached(
  methods: readonly string[],
  called: ReadonlySet<string>,
  exceptions: Readonly<Record<string, string>>,
): string[] {
  return methods.filter((method) => !called.has(method) && !Object.hasOwn(exceptions, method));
}

/** The fake as the system sees it: each method it calls is noted in `called`. */
export function recording<T extends object>(fake: T, called: Set<string>): T {
  return new Proxy(fake, {
    get(target, name, receiver) {
      const value = Reflect.get(target, name, receiver);
      if (typeof value !== "function" || typeof name !== "string") return value;
      return (...args: unknown[]) => {
        called.add(name);
        return value.apply(target, args);
      };
    },
  });
}

/** The adapter's methods the fake has too: the paths to GitHub the scenarios can reach. */
export function standingIn(adapter: { prototype: object }, fake: { prototype: object }): string[] {
  const methods = (of: { prototype: object }) =>
    Object.getOwnPropertyNames(of.prototype).filter((name) => name !== "constructor");
  const faked = new Set(methods(fake));
  return methods(adapter).filter((name) => faked.has(name));
}
