# 0002: Mutation testing, and Vitest pinned to 4.1

**Status:** Accepted, 2026-10-12.

## Context

`CLAUDE.md` asks for mutation testing with Stryker on `packages/core`, before every release and
weekly in CI. Coverage shows that code ran; a surviving mutant shows that no test depended on it,
which is the clearest evidence of code written without a test demanding it.

Setting it up on 2026-10-12 found two incompatibilities with our stack:

1. **TypeScript 7.** Stryker rewrites the tsconfig's `extends` and `references` for its sandbox
   using the TypeScript 5 compiler API (`parseConfigFileTextToJson`), which TypeScript 7 no longer
   provides. Stryker crashes before it starts.
2. **Vitest 5.** Stryker 10's Vitest runner declares `vitest >=2`, but on Vitest 5 it reports
   every mutant as surviving, even mutants the tests plainly kill: 0 of 4 killed on our routing
   code, against 4 of 4 with Vitest 4.1. Upstream:
   [stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210) (open).

## Decision

- **Stryker 10 with the Vitest runner**, mutating `packages/core/src` only. Configured in
  `stryker.config.mjs`; run with `npm run mutate`.
- **Break threshold 100%.** Any surviving or uncovered mutant fails the run. A genuinely equivalent
  mutant is disabled in the source with a `// Stryker disable` comment that says why.
- **Not in the blocking gate.** It runs weekly (`.github/workflows/mutation.yml`, Mondays 06:00
  UTC, also on demand), by hand at the end of each test-list section, and before every release.
- **Skip Stryker's tsconfig rewrite** by pointing `tsconfigFile` at a file that does not exist.
  Our tsconfig has no `extends` or `references`, so there is nothing to rewrite. If we ever add
  either, this workaround stops being safe.
- **Pin Vitest to `~4.1`** (and `@vitest/coverage-v8` with it) until the Vitest runner supports
  Vitest 5.

## Checks made

- Vitest 4.1: 4 of 4 mutants killed on `route`.
- With an untested branch added to `route` by hand, Stryker reported 2 survivors and 1 uncovered
  mutant and exited non-zero.

## Revisit when

- stryker-js#6210 is fixed: move back to the current Vitest and confirm that a known-killable
  mutant is killed (the same hand check as above) before trusting the result.
- We add `extends` or `references` to a tsconfig, or Stryker supports TypeScript 7.
