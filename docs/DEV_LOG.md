# Development log

Running history and current status. Newest entry first.

---

## Current status

Walking skeleton green: the first scenario ("a passed specification makes a test task ready")
runs through the in-process driver, the `npm test` gate and `npm run test:wip` run in CI. Mutation
testing is set up (`npm run mutate`, weekly in CI). Section 1 (routing) under way: a pass advances
through the whole module pipeline. A conditional pass advances like a pass. Fail routes under way: an upstream
ambiguity goes back to its owner. An architecture impediment goes to
Architecture. Upstream ambiguity, architecture impediments and Coding's test failures are routed,
with the most upstream winning when several are reported. Failed review and Security & Quality go back
to Coding; a scope gap goes to the Programme Architect. *Blocked* routes as *fail*. Failure routing is
now the AutoPM table, and a failure no rule covers alerts a PDC coordinator instead of being
guessed at. Next in section 1: a revision task carries its feedback signal; interface
impediments; knowledge gaps; module completion; escalation; events. Divlab as a real
Action and the sandbox driver are still open in section 0.

---

## 2026-10-12: A failure no rule covers alerts a PDC coordinator

- Reading of the AutoPM table: each role has rules keyed by impediment; only Reviewer and
  Security & Quality have an unconditional "otherwise → Coding". So a Reviewer or Security &
  Quality fail reporting an architecture impediment now goes to Coding (it used to go to
  Architecture). Flagged to Bernard.
- Acceptance: four alert scenarios (no problem reported; Test reporting an architecture impediment
  or test failures; an implementation impediment), red with `NotYetImplemented` at the driver
  until Divlab could alert; plus the Reviewer / Security & Quality → Coding outline.
- Refactor first: `route` returns a routing decision (`{ tasks }` or `{ alert }`).
- Cycles:

  ```
  RED:      alerts a PDC coordinator, posting no task, when a failure reports no problem
            -> expected { tasks: [ … ] } to deeply equal { alert: … }
  GREEN:    (26 passed)
  RED:      alerts … when a failed test reports an architecture impediment -> { tasks: [ architecture ] }
  GREEN:    (27 passed)
  RED:      alerts … when a failed test reports test failures -> { tasks: [ coding ] }
  GREEN:    (28 passed)
  RED:      alerts … when a failure other than a review reports a scope gap -> { tasks: [ … ] }
  GREEN:    (29 passed)
  RED:      alerts … when failed code reports an upstream ambiguity -> { tasks: [ … ] }
  GREEN:    (30 passed)
  RED:      routes on the impediments a rule covers, letting the others ride along
            -> expected { alert: … } to deeply equal { tasks: [ architecture ] }
  GREEN:    (31 passed), by generalising to the routing table (`FAILURE_ROUTES`)
  REFACTOR: none
  PASSED FIRST TIME: sends a failed architecture back to Architecture when it reports an
            architecture impediment. Written because Stryker found that table row untested at unit
            level (4 survivors); now 95 of 95 killed.
  ```

- Table rows are matched by exact string, never by object key: role and impediment names come
  from untrusted feedback signals, and keys like `constructor` would hit an object's built-ins.
- Divlab's `TaskBoard` port gains `alertCoordinators`; the fake GitHub records alerts. Checked that
  the alert scenarios fail when Divlab doesn't raise the alert.
- A refactor edit missed a spot that Biome had reformatted; the gate caught it before commit.

## 2026-10-12: Blocked routes as fail

- Red showed a real bug: blocked work advanced to the next role.

  ```
  RED:      routes blocked work just as it routes failed work
            -> expected [ { role: 'coding', … } ] to deeply equal [ { role: 'specification', … } ]
  GREEN:    (25 passed)
  REFACTOR: none
  ```

## 2026-10-12: Failed review and Security & Quality go back to Coding

- Acceptance: outline for Reviewer and Security & Quality → Coding (red), and a scope-gap
  scenario that **passed at once** through the no-rule fallback. Put straight into the blocking
  run as a guard, and it worked: the least-code Reviewer change sent scope gaps to Coding and the
  guard went red, which drove the scope-gap unit test. Nothing committed while it was red.
- Cycles:

  ```
  RED:      sends a failed review back to Coding
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ Array(1) ]
  GREEN:    (22 passed), but the scope-gap acceptance guard went red
  RED:      sends a review that finds a scope gap to the Programme Architect
            -> expected [ { role: 'coding', … } ] to deeply equal [ { …(2) } ]
  GREEN:    (23 passed; acceptance green)
  REFACTOR: none
  RED:      sends a failed Security & Quality check back to Coding
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ Array(1) ]
  GREEN:    (24 passed)
  REFACTOR: extracted `ownerOfFailure`, one rule per line
  ```

- Not refactored into a routing table yet: a table would drop the untested guesses, which changes
  behaviour. That is the "no rule matches" item, so the table is built there, test-first.
- The refactor exposed one more guess: test failures from any role go to Coding. Listed.
- Mutation testing: 57 of 57.

## 2026-10-12: Failing tests send the code back to Coding

- Step glue: the impediment parameter carries its own article, so "reporting test failures"
  reads naturally (the judge caught the undefined step first).
- Cycles:

  ```
  RED:      sends failed code back to Coding when it reports test failures
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ Array(1) ]
  GREEN:    (20 passed)
  REFACTOR: none
  PASSED FIRST TIME: ranks an architecture impediment above test failures. Written to kill the
            surviving `some` → `every` mutant, not to drive code; Stryker confirms it does.
  ```

- The "several problems" scenario became an outline with the new row. Mutation testing: 48 of 48.

## 2026-10-12: Several impediments: the most upstream wins (first case)

- Acceptance: Specification failing with an upstream ambiguity *and* an architecture impediment
  leaves only a Programme Architect task.
- Cycle:

  ```
  RED:      sends a failure with several impediments to the most upstream role that owns one
            -> expected [ { role: 'architecture', … } ] to deeply equal [ { …(2) } ]
  GREEN:    (19 passed)
  REFACTOR: none yet; a general ranking would be ahead of the tests with two impediment types
  ```

- Fixed the wrong route that the previous mutant pointed at. The `some` → `every` mutant still
  survives: only a mix of an architecture impediment with a *non*-ambiguity impediment tells them
  apart, and those types (test failures, knowledge gap) have no routes yet. Planned next.

## 2026-10-12: An architecture impediment goes back to Architecture

- Acceptance: a second outline in `failed-work.feature` (Architecture, Specification, Coding).
- Refactor first, while green: `impediments` is required on accepted work (feedback signals
  always carry the list) and now flows from the driver through Divlab to core.
- Cycle:

  ```
  RED:      sends a failed specification back to Architecture when it reports an architecture impediment
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ { role: 'architecture', … } ]
  GREEN:    (18 passed)
  REFACTOR: none
  ```

- The check ignores the failing role, so Test or Reviewer reporting an architecture impediment
  also goes to Architecture: a guess the AutoPM table doesn't make. Listed under "a failure that
  matches no rule" on the test list, with the other known guesses.
- Mutation testing: 1 survivor (`some` → `every` on the impediments). No test mixes impediments,
  and today a mix of upstream ambiguity and architecture impediment wrongly goes to Architecture
  rather than the more upstream Programme Architect. Next item ("several impediments") fixes it.

## 2026-10-12: An upstream ambiguity goes back to its owner

- Decisions (Bernard): an ambiguity in a module's requirements goes to the Programme Architect
  (owner of the requirement slice), not Requirements; several impediments route on the most
  upstream one only; Coding test failures re-run Coding until run history exists. The fail table
  is now concrete items on the test list.
- Acceptance: `features/routing/failed-work.feature`, an outline (Test → Specification;
  Specification and Architecture → Programme Architect) asserting the revision is the *only* ready
  task. Red showed the bug: a failed Test was advancing to Coding.
- Cycles:

  ```
  RED:      sends a failed test back to Specification when it reports an upstream ambiguity
            -> expected [ { role: 'coding', … } ] to deeply equal [ { role: 'specification', … } ]
  GREEN:    (14 passed), hard-coded
  REFACTOR: none
  RED:      names the Programme Architect role as members know it
            -> expected undefined to be 'Programme Architect'
  GREEN:    (15 passed)
  REFACTOR: none
  RED:      sends a failed specification back to the Programme Architect …
            -> expected [ { role: 'specification', … } ] to deeply equal [ { …(2) } ]
  GREEN:    (16 passed)
  REFACTOR: none
  PASSED FIRST TIME: sends a failed architecture back to the Programme Architect … (the ternary
            already covered it; kept to pin the decision for Architecture)
  ```

- **Impediments are not read yet**: core ignores them and the driver doesn't pass them through
  Divlab. With one impediment type nothing demanded it; the architecture impediment item will.
- A stray `cat` in a compound shell command hung; killing it let the rest of the command run and
  insert a test twice. Removed the duplicate before going on.
- Mutation testing: 26 of 26 killed.

## 2026-10-12: A conditional pass advances like a pass

- Acceptance scenario and unit test both **passed the first time they ran**: `route` ignores the
  verdict, so the behaviour already existed. Kept as regression tests, to guard against a naive
  `verdict === "pass"` once fail routing arrives; checked by hand that exactly that change makes
  both fail.
- Step glue gained a `{verdict}` parameter ("conditional pass"); the in-process driver turns it
  into the feedback signal's `conditional_pass`.
- Not yet: keeping the open questions and assumptions in the event record (section 1, "Every
  routing decision is recorded as an event").

## 2026-10-12: A pass advances through the module pipeline

- Decisions (Bernard): a pass always advances, ignoring ρ until metrics exist; a conditional pass
  routes as a pass. Both recorded in the concept document, §9, and the test list.
- `@wip` rule widened (Bernard): a scenario failing on an assertion in a Then step is honest ("not
  yet right"). Judge and `CLAUDE.md` updated; checked that crashes in When or Then still fail it.
- Acceptance: the skeleton's scenario became an outline over the whole pipeline; new rows went in
  a `@wip` Examples block, red on their Then, then green and untagged.
- Cycles:

  ```
  RED:      makes a Specification task when the module's architecture passes
            -> expected [ { role: 'test', … } ] to deeply equal [ { role: 'specification', … } ]
  GREEN:    (3 passed), conditional on architecture
  REFACTOR: none
  RED:      makes a Coding task when the module's tests pass
            -> expected [ { role: 'test', … } ] to deeply equal [ Array(1) ]
  GREEN:    (4 passed), generalised to the pipeline order
  REFACTOR: none
  RED:      makes a Reviewer task when the module's code passes -> expected [] to deeply equal …
  GREEN:    (5 passed)
  REFACTOR: none
  RED:      makes a Security & Quality task when the module's review passes -> expected [] …
  GREEN:    (6 passed)
  REFACTOR: none
  RED:      names the Security & Quality role as members know it
            -> expected undefined to be 'Security & Quality'
  GREEN:    (7 passed)
  REFACTOR: none
  RED:      names the <role> role <name> (one table test, 5 cases)
            -> expected undefined to be 'Architecture' (and 4 more)
  GREEN:    (12 passed)
  REFACTOR: typed `Role`; the pipeline and posted tasks can only name real roles
  ```

- The in-process driver now takes role names from core's `ROLE_NAMES`, not a hand mapping.
- Mutation testing: 13 of 13 mutants killed.

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
