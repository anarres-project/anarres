# Development log

Running history and current status. Newest entry first.

---

## Current status

Walking skeleton green: the first scenario ("a passed specification makes a test task ready")
runs through the in-process driver, the `npm test` gate and `npm run test:wip` run in CI. Mutation
testing is set up (`npm run mutate`, weekly in CI). Next: section 1 (routing). Divlab as a real
Action and the sandbox driver are still open in section 0.

---

## 2026-10-12: Tool versions pinned for contributors

- `CONTRIBUTING.md` says what to install and how. `package.json` + `package-lock.json` play the
  part of a `requirements.txt`: dev tools now pinned to exact versions, and `.npmrc` sets
  `save-exact=true` so new ones are too.
- `engines.node` is now `^24` with `engine-strict=true`, so `npm ci` refuses Node 25 with
  `EBADENGINE` (checked) instead of failing later inside Cucumber.

## 2026-10-12: Mutation testing

- Stryker 10 with the Vitest runner on `packages/core`, break threshold 100%, weekly CI job and
  `npm run mutate`; not in the blocking gate. Details and reasons: decision 0002.
- Two incompatibilities found. TypeScript 7 lacks the compiler API Stryker uses to rewrite the
  tsconfig (worked around: skip the rewrite, which we don't need). On Vitest 5 the runner reports
  every mutant as surviving (stryker-js#6210, open), so **Vitest is pinned to `~4.1`**.
- Checked: 4 of 4 mutants killed on `route`; an untested branch added by hand gave survivors and
  a non-zero exit.
- npm 11 holds back the install scripts of `esbuild` and `fsevents`; everything works without them,
  so they stay unapproved.

## 2026-10-12: Walking skeleton

- Scaffolding: npm workspaces (`packages/core`, `packages/divlab`), strict TypeScript 7, Biome,
  Vitest with 100% coverage thresholds on core, Cucumber.js 13 loaded through `tsx`. CI runs the
  gate on Node 24 (`.nvmrc`).
- **Use Node 24 locally.** Cucumber 13 refuses to run on Node 25 (it supports 22, 24 and ≥26).
- Four Layer harness: `features/` → `acceptance/steps/` → `acceptance/dsl/` (the `Anarres` DSL,
  with per-scenario aliases) → `acceptance/drivers/` (in-process driver, fake GitHub at Divlab's
  `TaskBoard` port).
- `npm run test:wip` (`scripts/wip-judge.ts`) reads Cucumber's message stream and fails if a
  `@wip` scenario passes or fails with anything other than `NotYetImplemented` or
  `HarnessNotYetBuilt`. Checked by hand against a dishonest failure and against a passing
  scenario.
- Cycles:

  ```
  RED:      routing > makes a Test task for the module when its specification passes
            -> AssertionError: expected [] to deeply equal [ { role: 'test', module: 'parser' } ]
  GREEN:    (1 passed), hard-coded
  REFACTOR: none
  RED:      routing > keeps the next task in the same module as the accepted work
            -> expected [ { role: 'test', module: 'parser' } ] to deeply equal [ { ..., module: 'ledger' } ]
  GREEN:    (2 passed)
  REFACTOR: none
  ```

- Acceptance: red with `NotYetImplemented` at the driver; green after wiring Divlab's
  `onWorkAccepted` to core's `route`; `@wip` removed. Confirmed the scenario fails when routing is
  wrong.
- `route` ignores role and verdict for now: no test demands them yet (section 1 will).

## 2026-10-12: Decisions confirmed

- Stack (decision 0001) accepted. It covers Anarres itself only; hosted projects may use any
  language. Recorded in the concept document (§7, "Any language"): projects declare a toolchain,
  their own CI runs their tests, and Divlab reads only the check result and a JUnit XML report.
  Matching cases added to the test list (section 4a).
- Test list order accepted as drafted; first slice is "Divlab posts the next task".
- Building continues in sessions started from this repository, so `CLAUDE.md` applies.

## 2026-10-12: Project set up

- GitHub organisation `anarres-project` and public repository `anarres` created; licence AGPL-3.0.
- Concept document moved from `bernardSolar/csd` (`docs/Arena_Concept.md`) to
  `docs/Anarres_Concept.md` and renamed: router → Divlab, stewards → PDC coordinators, charter →
  Odonian Principles.
- `CLAUDE.md` tailored from Bernard's test-first template: test-first protocol, outside-in ATDD,
  Four Layer acceptance model, with Anarres-specific safety rules.
- Stack chosen: see `docs/decisions/0001-stack.md`.
- Initial test list drafted from the concept document's Phase 1.
