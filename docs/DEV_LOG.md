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
guessed at. A revision task carries the feedback signal that sent the work back; a task for the
next role does not. An interface impediment from any module role goes to the Programme Architect.
A knowledge gap makes a Research task ready, ahead of anything else reported; when the research
passes, the role that reported the gap gets a revision task; Research failing alerts a PDC
coordinator. A Security & Quality pass marks the module done. Every routing decision is recorded
with its inputs and the rule that decided it. A role re-run more than three times for a module is
escalated to a PDC coordinator, and a coordinator's alert says what was reported and why routing
stopped. Section 1's remaining items wait on later work (metrics, input artefacts). Section 0 under
way. Only Divlab merges (decisions 0005, 0006): Divlab acts as its own GitHub App, validates a
member's pull request as data, records that it is about to merge, merges only the commit it read,
and routes the work; a ruleset set up with each project lets nobody else change main; the push
workflow is the tripwire (anything on main Divlab did not merge is recorded, alerted, never
routed; an interrupted merge is finished from Divlab's record); every run checks main is still
protected. Signals must use plain names. Every scenario's work goes through a real pull request;
the sandbox suite runs them all against the real Action (about 30 minutes), each from a fork in a
second sandbox organisation playing the members, as real members' work will come. A project's event log is
read whole past 1,000 events. Interrupted sandbox runs are swept up before the next. A sandbox run
counts its requests (about 2,000) and does not start without room in GitHub's allowance, and
pushes that change only documents skip it. An event is appended in one request once the log has
been read. Each project is set up with the Actions policy that lets Divlab's pull request
workflow, and no other, run on pull requests once GitHub blocks that event by default. The
sandbox run's scenarios run in four workers: 11 minutes. Divlab's runs queue rather than being
dropped when members submit at once, and interrupted merges are finished in merge order. Routing
and merge records are read back through core. Section 0 is done but for the log's read cost
(deferred). Every event records when Divlab made it; a decision recorded is acted on once, and
its task closed, even if a run stops between; a feedback signal's file must be plainly named; a
pull request's run reads the log once. Section 2 under way: a member claims a ready task by
commenting on it, and Divlab marks it claimed and assigns it to them, in-process and in the
sandbox; a claimed task stays with its holder, and anyone else claiming it is told it has already
been claimed; of claims made together the first made wins, whichever Divlab hears of first
(both in-process: the sandbox needs a second account to play another member); a claim on
anything but an open task is refused; each claim granted is recorded in the log. A lease runs out
24 hours after the last activity on its task, the claim or draft work by its holder, and Divlab's
hourly check makes the task ready again (in-process). Divlab never merges a draft. A member can
give a task back early. Section 3 under way: a member takes one role in a module for its whole
life (decision 0007), and Divlab refuses a claim that breaks it, or that the member's trust level
does not allow; accounts a PDC coordinator linked are one member. Section 3 is built. Every
Divlab run checks every change to main. Section 5 has begun: the CLI offers a member the ready
tasks they may take (in-process). Section 4:
Divlab refuses work that changes files outside its role's place, naming them. Every write Divlab
makes to GitHub now survives a server error without being repeated twice (merges, labels,
closing, event files, issues, comments), each in the way that is safe for it. A task shown as
claimed without a claim in Divlab's log is freed and PDC coordinators alerted; a task the log
shows freed but still shown claimed is freed quietly. The lease check can be run by hand as well
as hourly, and the sandbox does so. Claims on what is not a task (a finished task, an alert, a member's own issue, a
finished module) are refused, in-process and in the sandbox, which plays three members; its
governance scenarios run alone.

---

## 2026-10-27: Work only from the task's holder, and a module's first task

- Bernard decided: Divlab merges work only from the member it shows holding the task the work is
  for, so the checks made at claiming hold for the work too. A holder whose lease has run out
  but who still holds the task has their work accepted; anyone else gets a plain refusal. Work no
  task was posted for (a module's first) cannot meet that, so a module now starts with its first
  task, Specification, ready.
- Scenario (`@wip`, not yet right): "A new project has a Specification task ready for its module".
- RED: posts a ready Specification task, the first role in a module's pipeline -> `startModule is
  not a function`; with the stub, `expected [] to deeply equal [ { project: 'ledger', …(2) } ]`.
  GREEN (159 passed). A first task has no feedback signal that decided it, so `decidedOn` is
  optional.
- RED: says a module's first task was posted as the module began, with no decision behind it ->
  the issue carried an empty decision block. GREEN (170 passed). The fake keeps a decision only
  for a task that has one, as an issue does.
- Wired into the in-process driver, the scenario passed but 37 others failed: they begin a module
  partway along its pipeline (a Reviewer's work in a new project), so its first task was left
  ready. Unwired until the scenarios set the module up as it would stand (test list).
- Holding the task means meeting the claim's checks too: a member takes one role in a module, and
  Architecture, Reviewer, Security & Quality and Programme Architect need more than a new member.
  The DSL now has whoever does a piece of work claim its task first; a member a scenario does not
  name is one of two unnamed members, one for each role in a module, trusted as far as the role
  needs. A module partway along is set up as it would stand: its open tasks closed and the task
  for the work's role posted. No scenario needs more than the sandbox's three accounts.
- In the sandbox, the sandbox token's account plays unnamed members and is recorded as trusted in
  the sandbox's own governance file, a standing record (Bernard agreed, with a run about 10
  minutes longer); named members play the other two accounts, new unless a scenario says
  otherwise. Governance scenarios now put back each record as they found it, not delete it.
- Rewired: in-process, the new scenario passes and loses `@wip`; two scenarios that said no task
  was ready for an untouched module now say its first task, Specification, is.
- Scenario (`@wip`, not yet right: Divlab merged it): "Work that does not say which task it was
  for is not merged, and the member is told why". The pull request tests' shared fixture now names
  a task its author holds (refactored while green); four tests with signals of their own named no
  task, so the refusal was set aside while they were given one, then restored.
- RED: does not merge work that does not say which task it was for, and tells the member ->
  `expected [ [ '7' ], [] ] to deeply equal [ [], …(1) ]`. GREEN (618 passed). The scenario
  passes and loses `@wip` (108 scenarios).
- Scenario (`@wip`, not yet right): "Work from a member who does not hold its task is not
  merged, and they are told why".
- RED: does not merge work from a member who does not hold its task, and tells them ->
  `expected [ [ '7' ], [] ] to deeply equal [ [], …(1) ]`. GREEN (619 passed), once three tests
  whose tasks showed no holder were given one (the refusal set aside meanwhile). The scenario
  passes and loses `@wip`.
- Passed first time, kept as regression tests: work naming an issue that is not an open task (a
  closed one, an alert) is refused, as nobody holds it; and "A member whose lease ran out has
  their work merged while they still hold the task" (`@sandbox-wip`: GitHub's clock).
- REFACTOR: the draft path and the new check share `holds`.
- The bb14939 sandbox run (the lease check scenarios untagged) passed 99 of 100: a claim's
  Divlab run took four minutes, queued behind the project's last run and then waiting for one
  of GitHub's runners, past the driver's four-minute limit (Divlab itself took 13 seconds). Its
  late refusal said "you are new" only because the timed-out scenario had already put its trust
  record back. The limit is now six minutes, and a step may take 15 (a claim and its work).
- The sandbox's governance file now records the sandbox token's account as trusted.
- Passed first time, kept as a regression scenario: "Work for a module that is already done is
  not merged" (Bernard, 2026-10-21): work naming the module's finished task is refused, since
  nobody holds a closed task. The drivers can now name a finished task in a feedback signal.
- Passed first time, kept as a regression scenario: "Each push to a draft extends the lease too"
  (the pull request workflow runs on `synchronize`, and Divlab records the draft as activity
  again). Without the push the same steps fail, so it shows the push. In-process only.
- The sandbox driver forks a project again, once, when its fork stays empty past the wait for a
  new fork (seen 2026-10-23); it logs when it does.
- The 85916f8 sandbox run hit the job's 45-minute limit with about 600 of 624 steps done: each
  claim before submitting waited for a Divlab run of its own, about 80 seconds with GitHub's
  queue for runners, far more than the 10 minutes estimated. One step had failed; the run was
  cut off before Cucumber named it, so a failed sandbox scenario is now logged as it fails.
  (GitHub also started each workflow twice for that push; the second sandbox run was cancelled.)
- Tried: having the driver record set-up claims as Divlab's App would, without a run. It cannot:
  the driver holds the sandbox token, not the App's key, so main's protection refused its event
  writes (rightly). Dropped. Instead the sandbox runs six workers, not four: a claim waits in
  its own project's queue, so more projects side by side shorten the run at the same request
  cost. If that is not enough, a longer limit or fewer scenarios in the sandbox is for Bernard.
- The d1beac1 run (six workers) hit the limit too, and three scenarios in one worker's project
  failed after a Divlab run there sat silent for its 10-minute limit: most likely waiting out
  GitHub's secondary limits, which every sandbox project's runs share through the one App
  installation. Divlab says nothing while it waits, so this is not certain.
- Bernard chose fewer scenarios in the sandbox: each routing-table outline keeps its first row
  there, and the other 24 rows are tagged `@in-process-only`. Back to four workers.
- RED: says in the log when GitHub asks it to wait, for how long and why -> `expected [] to
  deeply equal [ Array(1) ]`. GREEN (621 passed). Then, since the member's CLI makes its requests
  the same way and the plugin reads what the CLI prints: RED, it says so apart from what it
  prints (standard error) -> the same failure; GREEN (637 in the gate).
- The 31f80d2 sandbox run finished inside the limit (38 minutes, 80 scenarios): 77 passed.
  GitHub's server errors were waited out and now say so in the log. Three failures, all the
  harness's: a run cut off earlier had left the second account recorded as established, which
  "putting records back as found" then kept (two scenarios saw Alice as established); and the
  escalation scenario's second unnamed member needed a Reviewer's trust. Each run now sets the
  governance file to its standing state before its workers start, and a second unnamed member is
  recorded at the trust its role needs, in a scenario tagged `@governance`.
- The eb2a206 sandbox run passed all 80 scenarios: work only from the task's holder is shown
  against GitHub. But it took 44 of its 45 minutes, the `@governance` scenarios running alone at
  the end for about 8. Bernard chose both: the escalation "count starts again" scenario runs
  in-process only (routing logic; the fourth re-run shows escalation in the sandbox), and the
  job's limit is 60 minutes, as a margin rather than a budget.

---

## 2026-10-27: The project's own check on Coding work (decision 0010)

- Decision 0010 (Bernard): Coding work is merged only once the project's own check has passed on
  the commit Divlab merges; the template's checks workflow, by a name it fixes; Divlab acts again
  when the check completes; a holder's push to their pull request renews the lease, draft or not.
- Scenario: "Coding work whose tests fail is not merged, and the member is told why" (`@wip`, not
  yet right: Divlab merged it).
- RED: does not merge Coding work the project's tests failed on, and tells the member where ->
  `expected [ [ '7' ], [] ] to deeply equal [ [], …(1) ]`. GREEN (163 in divlab): the pull
  request port gains `check`.
- RED: the adapter's check is what GitHub Actions' run of the template's check found ->
  `adapter.check is not a function`; with the stub, `expected { state: 'passed', url: '' } to
  deeply equal { state: 'failed', …(1) }`. GREEN, hard-coded failed. RED: has passed when the run
  succeeded -> `expected 'failed' to be 'passed'`. GREEN (624).
- The scenario passes in-process and loses `@wip`; `@sandbox-wip` until the sandbox's projects
  have the checks workflow. Not pushed: the adapter reads a commit with no run as failed, which
  would refuse all Coding work in the sandbox.
- Scenario (`@wip`, not yet right): "Coding work is not merged while the project's tests are
  still running". RED: neither merges nor says anything while the project's tests are still
  running -> `expected [ [ '7' ], [] ] to deeply equal [ [], [] ]`. GREEN (625). RED: the
  adapter's check is still running while its run has not completed -> `expected 'failed' to be
  'running'`. GREEN (626). Passed first time, kept: no run started yet is running too. The
  scenario loses `@wip` (`@sandbox-wip`). Still not pushed: in the sandbox, Coding work would
  now wait for a check that never comes, until the template has the checks workflow and Divlab
  acts again when it completes.
- Scenario: "Coding work is merged once the project's tests pass on it" (`@wip`,
  `NotYetImplemented` at the driver).
- RED: acts on the pull requests at a commit when the project's checks finish on it -> "Divlab
  does not act on workflow_run events". GREEN (628). RED: refuses a checks event that does not
  name its commit as GitHub names one -> `expected [Function] to throw an error`. GREEN (629).
- RED: acts on the open pull requests at a commit once the project's checks finish ->
  `onChecked is not a function`, then `expected [] to deeply equal [ '7' ]`. GREEN (630): the
  port gains `openAt`. RED: the adapter's open pull requests at a commit are those whose head it
  is, from every page -> `adapter.openAt is not a function`, then `expected [] to deeply equal [
  '5', '101' ]`. GREEN (631). The Action sends a checks run to `onChecked`.
- The scenario passes in-process and loses `@wip` (`@sandbox-wip`).
- RED: counts only GitHub Actions' run of the check, never another app's of the same name ->
  `expected 'passed' to be 'running'`. GREEN (632). Passed first time, kept: Coding work that
  changes the project's workflows is refused for its scope whatever its check found.
- Bernard: only Coding work that says it passed needs the check; work reporting a failure or
  blocked, and partial work, advances nothing and its tests may well fail. RED: merges Coding
  work reporting failure whatever its check found -> `expected [] to deeply equal [ '7' ]`.
  GREEN (634), with core's `failed` exported, so the rule is stated once. RED: merges partial
  Coding work handed over whatever its check found -> the same failure. GREEN (635).
- The e1740e7 sandbox run passed all 79 scenarios in 35 minutes.
- Passed first time, kept: other roles' work needs no check.
- The template's checks workflow, test-first in `template.test.ts`: RED, it runs on members'
  pull requests as GitHub runs their own code (a missing file, then `expected [
  'workflow_dispatch' ] to deeply equal [ 'pull_request' ]`); GREEN. RED, its token only reads
  the code (`expected undefined to deeply equal { contents: 'read' }`); GREEN. RED, its tests'
  check has the name Divlab reads (`expected [] to include 'project-tests'`, once the name was
  exported); GREEN. RED, it runs the command and image `anarres.yaml` declares, the command as a
  variable (`expected undefined to be true`); GREEN.
- The template's Divlab workflow for the checks finishing: RED, it runs when the checks workflow
  completes and on nothing else; GREEN. Added to the tests every Divlab workflow passes (six
  failing at once, from one cause: it was not yet one); GREEN (45).

---

## 2026-10-28: The project's checks only on code

- Bernard: the checks run only on pull requests changing a module's code, so other work does not
  wake Divlab a second time; Coding work that says it passed must change code, or is refused.
- RED: refuses Coding work that says it passed but changes none of the module's code ->
  `expected [ [ '7' ], [] ] to deeply equal [ [], …(1) ]`. GREEN, once two older tests' Coding
  work was given code and the scenarios' Coding work changes the module's code (the refusal set
  aside meanwhile; 10 scenarios had failed). Gate 665 and 116.
- RED: the checks workflow runs only on pull requests changing a module's code, its path filter
  tied to core's Coding scope -> no filter. GREEN (46).
- The sandbox's projects get the template's checks workflow and a toolchain whose tests fail only
  on work carrying the scenario's marker; "Coding work whose tests fail" runs there now.
- RED: records the holder's Coding work waiting on its check as activity on the task ->
  `expected [] to deeply equal [ { project: 'ledger', …(2) } ]`. GREEN (651). RED: and when its
  check failed, a fix to follow -> the same failure. GREEN (652). REFACTOR: drafts and checked
  work share `recordActivity`.
- The ee92e77 sandbox run passed all 80 scenarios in 38 minutes: Coding work whose tests fail is
  refused with the project's check, and all other Coding work there was merged once its check
  passed.

---

## 2026-10-28: No toolchain, no project

- Scenario (`@wip`, not yet right): "A project that declares no toolchain is not started".
- RED: does not set up a project that declares no toolchain, and says so, protecting nothing ->
  `promise resolved "undefined" instead of rejecting` (the old set-up fakes given a toolchain
  first, as a step of its own). GREEN (653): the set-up port gains `toolchain`.
- Core reads the declaration as data, test by test: the image and the command (RED: `readToolchain
  is not a function`, then `expected undefined to deeply equal …`); none when the file declares
  none (RED: a TypeError); none when the command is not one line; none when either is not text
  (RED: `expected { image: 24, test: 'npm test' } to be undefined`; I first wrote that test's
  second case and the code together, so set the code aside and watched it red); none for an empty
  file; none for a file that is not YAML. Core stays at 100% branch coverage.
- RED: the adapter reads anarres.yaml on main -> `adapter.toolchain is not a function`, then
  `expected undefined to deeply equal …`. GREEN (660). Passed first time, kept: no file, no
  toolchain.
- The scenario passes in-process and, run locally, in the sandbox (a repository of its own,
  declaring none), and loses `@wip`.
- Decision 0011 (Bernard): Test work's new tests, those main does not have by name, must every one
  run and fail on an assertion; the verdict rule is Coding's. Work adding no test is refused too
  (it follows: "every new test fails" would hold of none). Divlab records the tests each piece of
  Test work added, so no run on main is needed.
- Core reads a JUnit report as data, test by test (each RED shown, then GREEN): a passing case by
  class and name; failed; errored; skipped; an element named like a built-in property changes
  nothing (RED: a plain object found `constructor` there; now a Map); not well-formed XML; a
  document type; over 2 MB; no class (named by its name); no name; a name with a control
  character. Parsed by `sax` 1.6.1, chosen for having no dependencies of its own (fast-xml-parser
  now has six), in strict mode. Core stays at 100% branch coverage.
- Divlab's rule for Test work, test by test (each RED shown): a new test that passed is refused,
  named (the old Test-work fixtures given a failing report first, the rule set aside meanwhile);
  while the tests run, nothing is said (RED: a crash reading no report); the holder's work then
  is activity (I wrote that line before its test, so took it out, wrote the test, watched it red,
  and put it back); only tests main lacks are new; merging records `testsAdded`, which the
  adapter validates on reading back; work adding no test is refused; an unreadable report is
  refused, saying why. Passed first time, kept: Test work reporting failure reads no report.
- The adapter reads the report from the checks run's `test-report` artefact, test by test: found
  and read; running until the run finishes; no artefact; over 2 MB, not downloaded; a file whose
  zip directory says it unpacks over 2 MB, not unpacked (a zip bomb's would); an empty artefact.
  Downloads follow GitHub's redirect; Node's fetch keeps the token to GitHub. Unzipped by
  `fflate` 0.8.3, which has no dependencies.
- Protocol slip: for this slice I drove the units before writing the acceptance scenario. Written
  now, "Test work whose new tests pass before any code exists is not merged" passed at once.
- Not pushed: the checks run only on code, so Test work in the sandbox would get no report and
  wait for ever, until the template's checks run on Test work and upload the report.
- The toolchain names its report, required (RED: the declaration without it; then RED: none
  without a report). Two older tests had passed only because their fixtures named no report;
  given one, each tests its own case again. Core stays at 100% branch coverage.
- The template: RED, the checks run on Test work's place too; GREEN. RED, the report is uploaded
  as `test-report`, even when the tests fail; GREEN, once an older test that took the last step
  for the one running the tests looked for it by what it does instead.
- The sandbox's toolchain runs a script at the project's root writing the JUnit report. Tried
  locally: well-formed, a failing case per test file, passing where marked, the run failing on
  marked code. (Biome had removed a needed escape from the script's template literal; doubled.)
- The 70980bf sandbox run passed all 81 scenarios (39 minutes). The 565b8e5 run failed 78 of 82:
  every Divlab run stopped at once with "Identifier 'createRequire' has already been declared".
  fflate's ESM build imports `createRequire`, and the line the bundle step adds at the top
  imported it under the same name, so neither Divlab's bundle nor the member's CLI could load.
  The gate never loads a bundle, so it passed. Now the added line names its import apart, and
  each bundle step checks its bundle parses (`node --check`): RED with the old line (the bundle
  step stops on the SyntaxError), GREEN with the new; the CLI runs again.
- Pushed at once, at Bernard's word, rather than waiting the hour: the 7287478 sandbox run passed
  all 82 scenarios in 41 minutes. Test work's own check is shown against real GitHub.

---

## 2026-10-28: Test counts in the state vector (decision 0012)

- Decision 0012 (Bernard): n_test, n_pass and n_fail from each merged Coding or Test work's
  report, programme-wide, in the merge's event; errored fails, skipped is not counted.
- Scenario first this time (`@wip`, `NotYetImplemented`): "Divlab records how many of the
  project's tests pass as its Test and Coding work is merged", in a project of its own, as counts
  are project-wide; the DSL needed a third unnamed member (Specification, Test, Coding).
- RED: core counts the tests, passing and failing -> `testCounts is not a function`, then the
  zero stub. GREEN. RED: an errored test fails, a skipped one is not counted -> `expected {
  total: 3, … failed: +0 }`. GREEN (215).
- RED: merging Test work records the counts -> `expected undefined to deeply equal …`. GREEN
  (692). RED: and Coding work, from its report -> the same. GREEN (693). RED: the adapter refuses
  counts that are not whole numbers adding up -> `expected [Function] to throw`. GREEN (694).
- Both fakes now model a project's tests alike: a test file passes once its module has code not
  failing on purpose, fails before, unless it passes on purpose. The scenario passes in-process
  and loses `@wip`.

---

## 2026-10-28: modules.yaml (decision 0013), and a module's first task

- Decision 0013 (Bernard): a project starts with one Programme Architect task; merging its work
  starts each module its `modules.yaml` lists; work's role and module must be its task's, so no
  work for a module the project lacks is merged; a module left out goes on, for now.
- A mistake of mine corrected (Bernard): on 2026-10-27 I called Specification the first role of
  a module's pipeline, and `startModule` posted a Specification task. Core's pipeline starts with
  Architecture, and a Programme Architect's pass already routed there. The scenario now says a
  new project's module has an Architecture task ready (`@wip`, not yet right); RED: posts a ready
  Architecture task -> the posted task was Specification. GREEN (694): core exports
  `FIRST_ROLE`, the pipeline's first, so the role is stated once. Three scenarios that took a new
  module's first task to be Specification change for that reason, one now accepting Architecture
  work first.
- Scenario (`@wip`, not yet right): "Work for a module the project does not have is not merged".
  RED: does not merge work for a module other than its task's, and says so -> `expected [ [ '7'
  ], [] ] to deeply equal [ [], …(1) ]`. GREEN (695), once the pull request tests' boards showed
  each work's task for its own role (`heldAs`): they had shown a Specification task for Coding,
  Test and Research work alike, an inconsistency the new check exposed (the rule set aside while
  they were fixed). The scenario loses `@wip`.
- Scenario (`@wip`, `NotYetImplemented`): "A new project starts with a Programme Architect task
  for the programme", in a project of its own (the programme is one per project, so unaliased).
  RED: starting a project posts one ready task, the Programme Architect's, for the programme ->
  `startProject is not a function`, then `expected [] to deeply equal …`. GREEN (696): core's
  `PROGRAMME`, from which the Programme Architect's place `programme/` is made too. The scenario
  passes in-process and, run locally, in the sandbox.
- Scenario (`@wip`, not yet right): "The Programme Architect's modules start once its work is
  merged" (a Programme Architect pass had routed to Architecture for the programme).
- Core reads `modules.yaml` as data, test by test (each RED shown): the names; more than a plain
  name; no modules by name (empty, a string, names missing); not YAML; a module twice; a module
  named `programme`. RED: routing starts each listed module with its first task (`modules_listed`)
  -> it advanced instead. GREEN.
- Divlab: RED, merging the programme's Programme Architect work starts the listed modules (one
  task posted, not two); GREEN (704). RED, only those no earlier modules.yaml started; GREEN, from
  the routing records' `modulesToStart`. RED, an unreadable file refuses the work, saying why (a
  crash, once my fixture's board showed the programme's task, not parser's); GREEN. RED, core
  refuses a record whose `modulesToStart` are not plain names; GREEN (707), core at 100%.
- The scenario passes in-process and loses `@wip`.
- The 8176824 sandbox run: 85 of 86 passed. "The Programme Architect's modules start once its
  work is merged" could not create its project: the name was taken. A defect in the harness, not
  in Divlab: in the sandbox a worker's scenarios share one project's name, and a scenario
  starting a project of its own added a fixed suffix to it, so two scenarios starting new
  projects on one worker asked for the same repository. Only the sandbox shows it (in-process,
  each scenario has a GitHub of its own). Fixed: such a project carries the scenario's alias too.
  Gate 122 scenarios.
- The 44cb30a sandbox run passed all 86 scenarios in 45 minutes.

---

## 2026-10-28: Contracts, and what each role reads of them (decision 0014)

- Decision 0014 (Bernard): `modules.yaml` says which contracts each module provides and uses; a
  contract is a folder of its own, `programme/contracts/<c>/`; a contract provided twice, used but
  provided by none, or used by its own provider makes the file unreadable; Architecture and
  Specification read their module's contracts; `prepare` learns them from `modules.yaml` at the
  pinned commit, never from the issue.
- Scenario (`@wip`): "A member preparing an Architecture task has the contracts its module uses,
  and no others". First `HarnessNotYetBuilt` (my own setup had also left out that Architecture
  needs an established member: a defect in a Given, caught by the judge). The harness now writes
  the contracts into the Programme Architect's work, and each driver sees the contracts a
  prepared task fetched (in-process, main's files in the role's read scope; in the sandbox, the
  checkout's folder). Now not yet right: no contract is fetched.
- Core, test by test (each RED shown): RED, modules.yaml says which module provides each contract
  and which use it -> `expected { modules: [...] } to deeply equal { Object (modules, contracts)
  }`; GREEN (the older test's expectation gains `contracts: []`, as the shape grew). RED/GREEN in
  turn: a contract used but provided by none; provided by two (REFACTOR: one `repeated` helper);
  used by its provider; named in more than a plain name; contracts not given as a list of names
  (RED was a TypeError: a crash on untrusted input, the defect itself).
- Core's read scopes: RED, Architecture reads the contracts its module provides and uses ->
  `expected [ false, false, false ] to deeply equal [ true, true, false ]`; GREEN. RED/GREEN,
  Specification too. No other module role reads one: passed first time, kept as a regression
  test (they never had contracts in scope). `contractsOfModule`: a slip of mine, the empty stub
  written in the same step as its test, before running it; the red shown was the assertion.
  Core at 100%.
- CLI: RED, prepare fetches the module's contracts, as modules.yaml says at the pinned commit;
  GREEN. RED/GREEN, an unreadable modules.yaml refuses, fetching nothing. RED/GREEN, preparation
  says which contracts it fetched (the older test's exact expectation gains `contracts: []`).
  RED/GREEN, the folder's record keeps them; RED/GREEN, a record whose contracts are not plain
  names gives no task, so the hook refuses everything (two rows of one table failed together).
  The hook letting Architecture read its record's contracts passed first time: it hands the
  record to core's `mayRead`; kept as a regression test.
- REFACTOR: `MODULES_FILE` moves from Divlab to core, as the CLI needs it too.
- Adapter: RED, `modulesAt` reads modules.yaml at a commit -> not a function, then the stub's
  `undefined`; GREEN. None at that commit: passed first time (a 404 is none already).
- `prepare` in `main.ts` and both drivers read modules.yaml at the pinned commit and record the
  contracts. The scenario passes in-process and loses `@wip`. Gate 742 and 123.
- The 805efa3 sandbox run: 86 of 87. The new scenario passed. "Accounts a PDC coordinator has
  linked are one member" failed waiting for Divlab: GitHub refused Divlab's App, its hourly
  allowance in the sandbox organisation spent (403 at 21:56, 41 minutes in), and Divlab waited
  for the reset, as built, until the run was cancelled. Not a defect in the scenario; a limit
  nothing measured (test list, section 0).
- Bernard: measure, then reduce. REFACTOR: the sandbox driver's request tally (kinds, summary)
  moves to the GitHub package. RED: counting a run's requests tallies each by kind ->
  `countingRequests is not a function`, then the stub's `0 requests`; GREEN; REFACTOR, the
  sandbox driver counts with it. RED: the adapter reads the token's allowance -> not a function,
  then the stub's zeros; GREEN. Divlab's action prints both at the end of every run (wiring, no
  test: an allowance it cannot read is not said, and never fails the run).
- The 4bc633c sandbox run: 86 of 87, the App's allowance spent again ("An established member can
  take a Reviewer task"). Sampled 51 Divlab runs during it: about 15 requests a run; a quarter of
  them list the event log's Git trees, as most runs read the whole log twice.
- RED: the log is read from GitHub once a run -> `expected 5 to be +0`; GREEN, kept by the
  adapter. RED: read again, it holds the events the run recorded since -> `module-250`, not
  `module-251`; GREEN. RED: read from GitHub again once the run finds another event recorded
  since; GREEN. Then a defect in my own change, caught before it ran: the sandbox driver keeps
  one adapter for a scenario and reads the log while Divlab writes it. A test-only step first
  (the three tests build one run's adapter, an option not yet there, still green); RED: an
  adapter that is not one run's reads from GitHub each time -> 250, not 251; GREEN, `oneRun`,
  which Divlab's action sets. Gate 748 and 123.
- The a7e72fa sandbox run passed all 87 scenarios in 42 minutes, inside the App's allowance.
  Sampled again: about 12.8 requests a Divlab run, from 15.
- Bernard: the sandbox App's key goes into this repository's `sandbox` environment too, so the
  sandbox run can check the App's allowance. RED: names whose allowance it is, Divlab's App's ->
  `Received: "GitHub's hourly allowance has 100 requests left…"`. GREEN (3). Each scenario now
  checks both allowances before it starts, and the run prints both at its end; the job mints the
  App's token reading metadata only. Gate 123 scenarios.
- Scenario: "A member preparing a Test task has its module's architecture and specification,
  and nothing of another module". Red as `HarnessNotYetBuilt` (nothing looked at what preparing
  fetched beyond contracts); then not yet right, the Then failing: the scenarios' Architecture
  and Specification work wrote no artefacts to fetch. Green once they do, with no change to the
  system; checked it fails if preparing fetches every file. Gate 124.
- Scenario: "A member preparing a task has its module's contracts as they were when the task was
  posted", the Programme Architect's work revised after the task was claimed. Not yet right: the
  member had the newer contract too, since the in-process fake kept only main's files as they
  are now. Green once the fake keeps each commit's files (a harness change; the CLI already
  reads at the pinned commit); checked it fails if the latest `modules.yaml` is read. Gate 125.
- The 72fc6cb sandbox run: Divlab Sandbox's token was minted from the key, and each scenario
  checked the App's allowance; 85 of 87 passed. Both failures were in one worker's repository,
  GitHub's doing (a merge answered with a server error, then "already in progress"; a rule that
  timed out), now on the test list. The App's readings disagree between runs, so the check cannot
  yet be relied on.
- Decision 0015 (Bernard): work whose inputs changed since its task was posted is merged, and
  revised by the same role at the new commit; a revised contract sends each module it affects
  back to Architecture. Concept §5 and §8 updated.
- Scenario (`@wip`, not yet right): "Work whose requirement slice changed after its task was
  posted goes back to its role" -> a Coding task was ready, not a Test task.
- RED: the inputs that changed since a task was posted are the changed paths its role reads ->
  `[]`. GREEN (234), through `mayRead`.
- RED: posts a revision for the same role, saying which inputs changed -> Coding, rule `passed`.
  GREEN (235). RED: moves on as usual when none of its inputs changed -> a Test revision. GREEN
  (236).
- RED: Divlab gives work whose inputs changed since its task was posted back to its role -> a Test
  task, not Specification. GREEN (205 in Divlab). The pinned commit comes from Divlab's own log,
  not the issue's text, which anyone who triages can edit.
- RED: the paths changed on main since a commit are the files GitHub compares -> `[]` (first
  `is not a function`, then the stub). GREEN (200 in the GitHub package). The fake compares
  each commit's files with main's.
- The scenario passed; `@wip` removed; checked it fails if nothing is found changed. Gate 754
  and 126.
- The 6bf8438 sandbox run: 87 of 89. The new pinned-contracts scenario's second Programme
  Architect work had merge conflicts (the sandbox branched work from the fork's main as forked;
  it now syncs the fork first, as the plugin does), and a finished task was looked for before
  GitHub's list showed it closed (now asked again). Both the harness's.
- Scenario (`@wip`, not yet right): "A member taking the revision has the work already done to
  read" -> Bob had no tests of the module to read.
- RED: a revision of work whose inputs changed reads its role's own place too -> no
  `modules/parser/tests/`. GREEN (237). RED: the revision task carries `staleRevision` -> missing.
  GREEN. RED: the issue marks it (`inputs-changed`) and reads it back -> label missing. GREEN
  (201). The scenario then passed in-process: `preparation` already gave the whole task to
  `readScope`; a test of it passed first time, kept as a regression. RED: the folder's record
  keeps it for the hook -> missing. GREEN (102). `@wip` removed.
- Scenario (`@wip`, not yet right): "A revised contract sends a module whose task was open back to
  Architecture" -> Coding was ready.
- RED: core sends the module back to Architecture when a contract it provides or uses was
  revised -> Coding. GREEN (238). RED: a module's contracts revised since a commit are those
  with a file changed in their folder -> `[]` (first `is not a function`). GREEN (239); the
  contract folder's path is stated once now (`contractPlace`, `CONTRACTS`).
- RED: Divlab sends a module back to Architecture when a contract it uses was revised -> a Test
  task. GREEN (445 with core): it reads main's `modules.yaml` only when a contract changed. RED:
  the adapter's `modulesOnMain` -> undefined (first `is not a function`). GREEN. `@wip`
  removed; checked the scenario fails without the rule. Gate 762 and 128.
- Scenario (`@wip`, not yet right): "A revised contract sends a module that is done back to
  Architecture at once" -> no task ready.
- RED: core sends each module the Programme Architect's revised contracts name back to
  Architecture -> it sent the programme itself back. GREEN (240). RED: and still starts the
  modules the same work lists anew -> the new module was not started. GREEN (241).
- RED: Divlab sends a module with no task open back to Architecture when its contract is
  revised -> nothing posted. GREEN (207). REFACTOR: the routed work's type named once
  (`RoutedWork`).
- The scenario passed; with the fake then listing a pull request's files as GitHub does (only
  those differing from main's), it failed again: work revising only a contract leaves
  `modules.yaml` out of its files, and Divlab looked for none. RED: reads main's modules.yaml
  then -> the programme advanced. GREEN (208).
- Core's branch coverage fell to 99%: two fallbacks no test needed. REFACTOR: a Programme
  Architect's revision is one field (`contractRevision`), routed with the modules it starts.
  `@wip` removed; checked the scenario fails without the revision. Gate 766 and 129.
- The 53140ea sandbox run: 90 of 91, the stale-work scenarios and the finished-task claim
  passing. The one failure was the harness's: with forks synced, the second Programme Architect
  work replaced a `modules.yaml` the branch already had, and GitHub wants the replaced file's
  version for that; the driver now gives it.
- The b1898b1 sandbox run was cancelled at the job's 60-minute limit, still passing steadily
  (two failures near the end, both while GitHub was slow to start Divlab's runs). The
  scenarios of decision 0015 each go through several merges. The limit is now 90 minutes, a
  margin over a full run's 60 or so (Bernard, 2026-10-29), and a run spends about 3,000 of the
  hourly allowance.
- A revised contract that stops listing a module with a task open sends it back to Architecture
  too. Acceptance: scenario "A revised contract sends a module it no longer serves back to
  Architecture", red as not yet right (the Test work moved on to Coding).
  RED:      sends a module back to Architecture when a revised contract no longer lists it ->
            expected [ { role: 'test', … } ] to deeply equal [ { role: 'architecture', … } ]
  GREEN:    the same (209 passed): Divlab reads `modules.yaml` at the pinned commit as well as
            on main, only when a contract changed (`PullRequests.modulesAt`; the fake's became
            asynchronous to match).
  REFACTOR: the test's listing helper simplified.
  RED:      names a revised contract once in its record, though modules.yaml lists it on main
            and at the pinned commit -> received "tokens" twice
  GREEN:    the same (210 passed).
  REFACTOR: none.
  This also covers Architecture's and Specification's contracts as their inputs: the contract
  rule sends their work back to Architecture. A module with no task open that the revision
  stops listing is still missed: on the test list. Gate 768 and 130.
- A module with no task open that the revision stops listing with a revised contract is sent
  back to Architecture at once. Acceptance: scenario "A revised contract sends a module that is
  done, and that it no longer serves, back to Architecture at once", red as not yet right (no
  task posted).
  RED:      sends a module with no task open back to Architecture when the revision stops
            listing it with the contract -> expected [] to deeply equal [ { role: 'architecture', … } ]
  GREEN:    the same (211 passed): main's `modules.yaml`, which the work replaces, is read too
            when the work changes both it and a contract.
  REFACTOR: `contractsListed`, the contracts a listing names or none, used for both reads.
  Gate 769 and 131.
- Stale work that also failed, or was handed over part done (Bernard: the most upstream wins;
  decision 0015, question 5). Acceptance: scenario "Work that failed after its requirement slice
  changed goes where its failure says", red as not yet right (a Test task, not Specification).
  RED:      sends failed work where its failure says, as the most upstream role wins -> received
            role "test", staleRevision
  GREEN:    the same (242 passed): failure is checked before the stale rule.
  REFACTOR: none.
  RED:      posts part-done work again as a continuation, which reads the work done too ->
            received staleRevision, rule inputs_changed
  GREEN:    the same (243 passed): partial and failed work, in their old order, then stale.
  REFACTOR: none. A revised contract with a failure routed above Architecture is on the test list.
- A revised contract and failed work together, by the same principle. Acceptance: scenario
  "Work reporting a contract that does not work goes to the Programme Architect, though the
  contract was revised since", red as not yet right (an Architecture task).
  RED:      sends failed work to a role above Architecture its failure names, though a contract
            was revised -> received role "architecture", staleRevision
  GREEN:    the same (244 passed): `failedAboveArchitecture`, judged by routing's precedence.
  REFACTOR: none.
  Triangulation: "sends failed work back to Architecture when a contract was revised and its
  failure names a role below" passed first time, as it should; kept, as it pins the comparison.
- More changed than GitHub's comparison lists (Bernard: treat as stale; decision 0015, question
  6). Acceptance: scenario "Work whose inputs cannot be checked, as too much changed since its
  task was posted, goes back to its role" (in-process only), red as not yet right (Coding).
  RED:      the paths changed on main since a commit are too many to list when GitHub lists 300
            -> expected [ …(300) ] to deeply equal { tooMany: true }
  GREEN:    the same (203 passed): `ChangedOnMain`, declared beside Divlab's `PullRequests`.
  RED:      posts a revision for the same role when too much changed to tell whether its inputs
            did -> received role "coding", rule "passed"
  GREEN:    the same (246 passed): core's `inputsUnchecked`, rule `inputs_unchecked`.
  REFACTOR: `staleRevision`, the task both stale rules post.
  RED:      gives work back to its role when too much changed on main to tell whether its inputs
            did -> TypeError: changed.filter is not a function (Divlab could not read the answer)
  GREEN:    the same (212 passed).
  RED:      sends a module with contracts back to Architecture when too much changed to tell
            whether they did -> received a Specification task
  GREEN:    the same (213 passed): each of the module's contracts counts as revised.
  REFACTOR: none. The in-process fake lists a comparison as GitHub does, too many from 300.
- The f12fb4f sandbox run, with the 90-minute limit: 93 of 93 in 58 minutes, the stale-work and
  revised-contract scenarios among them.
- Two GitHub-side failures from 72fc6cb's sandbox run, both in the GitHub adapter's unit tests
  (GitHub's faults, which no scenario can make happen):
  RED:      asks again while GitHub says a merge asked for before is still in progress -> GitHub
            PUT …/pulls/7/merge answered 405: {"message":"Merge already in progress"}
  GREEN:    the same (204 passed): a merge still in progress is asked for again, as after a
            server error.
  REFACTOR: GitHub's message stated once (`MERGE_IN_PROGRESS`).
  RED:      asks again for a write that a repository rule refused without running, as it timed
            out -> expected 409 to be 201
  GREEN:    the same (205 passed): `ruleTimedOut`, a refusal undone, as a rate limit is.
  REFACTOR: the request layer reads GitHub's message once.
- Allowance readings that jump (test list, section 0). GitHub documents no such jumps (an
  installation's allowance is one pool) and advises reading each answer's headers instead of
  `rate_limit`; so each Divlab run now prints both, to compare.
  RED:      gives the allowance GitHub's answer says is used, of which resource, and when it
            resets -> expected undefined to deeply equal { resource: 'core', used: 126, … }
  GREEN:    the same (206 passed).
  RED:      the allowance a run's requests were counted against is what GitHub's last answer
            said -> TypeError: counted.lastAllowance is not a function; with a stub, expected
            undefined to deeply equal { … used: 126 … }
  GREEN:    the same (207 passed).
  REFACTOR: the counting wrapper keeps the request's type.
  RED:      gives no allowance for an answer that does not say, such as a failing gateway's page
            -> expected { resource: '', used: +0, … } to be undefined
  GREEN:    the same (208 passed).
  RED:      stays the last that said, when a later answer does not -> expected undefined to be 125
  GREEN:    the same (209 passed).
  RED:      an allowance, as a run's log says it -> TypeError: allowanceSaid is not a function;
            with a stub, expected '' to be 'core 126 of 5000 used (resets 09:31 UTC)'
  GREEN:    the same; Divlab's entry point prints both readings with it. Gate 784 and 134.
- A Divlab run's tally counts its downloads of test reports too, as GitHub counts them.
  RED:      tallies each download it passes on with the run's requests -> TypeError:
            counted.download is not a function
  GREEN:    the same (211 passed); Divlab's entry point downloads through it.
  REFACTOR: one `count` for requests and downloads.
- The revision after research reads the research brief (Bernard: the module's brief folder).
  Acceptance: scenario "A member taking the revision after research has the research brief to
  read", red as not yet right (no brief fetched); Research work in the scenarios now writes one.
  RED:      lets Research write a brief for its task's module only -> expected [] to deeply equal
            [ …(2) ] (the access table's row for Research changed with it, for that reason)
  GREEN:    the same (773 passed): Research writes `research-briefs/<m>/`.
  RED:      what a revision after research may read -> expected [ …(2) ] to deeply equal [ …(3) ]
  GREEN:    the same (248 passed): core's `afterResearch`.
  RED:      sends research that passes back to the role that reported the gap, to read its brief
            -> received no `afterResearch` (two tests pinned the old task; one change for both)
  GREEN:    the same (774 passed).
  RED:      marks a revision after research, and reads it back -> expected undefined to be true
  GREEN:    the same (775 passed): the `after-research` label.
  The CLI's "fetches the module's research briefs for a revision after research" passed first
  time: preparation hands the task to core's read scope. Kept as a regression test.
  RED:      keeps that the task follows research -> received no `afterResearch`
  GREEN:    the same (777 passed): the task's folder record keeps it, for the hook.
  REFACTOR: none. Concept §6 updated.
- A Reviewer or Security & Quality fail reporting an architecture impediment goes to
  Architecture (Bernard, revisited). Acceptance: two rows of "An architecture impediment goes back
  to Architecture", red as not yet right; "A failed review or security check goes to Coding" now
  reports an implementation impediment, as the architecture one no longer goes there.
  RED:      sends reviewer / security-and-quality reporting an architecture impediment to
            Architecture -> 2 failed (one test, two rows)
  GREEN:    the same (779 passed): two rows in the AutoPM table, in core.
  REFACTOR: none. Concept §9 lists the difference from the AutoPM table.
- The 2828354 sandbox run: 81 of 97. Divlab's App ran out of its hourly allowance: GitHub refused
  its runs ("API rate limit exceeded for installation") from 14:25 until the window reset at
  14:35, and every worker's claims and decisions waited past their scenarios. Meanwhile the
  sandbox's own check of the App read 117 to 139 used, resetting at 14:45: another count. The
  check's token also expired after its hour, failing the last four scenarios. And one Divlab run
  had a log write refused by a rule that timed out (409): fixed in b4c11bc, not yet pushed.
  Bernard: cut Divlab's requests before the next push that runs the sandbox; retire the check.
- The sandbox's check of the App's allowance retired: the job mints no App token, scenarios check
  only the sandbox's own allowance, and `shortfall` names no other (its test for the App's
  wording deleted with the behaviour). Divlab's runs say what they cost the App.
- Cutting Divlab's requests (Bernard): the log is listed in one request, not two. GitHub takes
  `git/trees/main:events` (tried on this repository: a folder listed; 404 for none).
  RED:      is listed in one request, naming the events folder on main, and read in another ->
            expected 3 to be 2
  GREEN:    the same (213 passed, one failing): "is never taken to be empty, when GitHub lists
            the repository only in part" guarded the root listing, which is gone; deleted with
            it, and the fake's answers for the old listings. 212 passed.
  REFACTOR: `wholeTree` removed, unused. Listing trees was 18% of a run's requests.
- Main's protection is checked on the hourly lease check and on runs that may merge work
  (Bernard), not on every run: about 8% of a run's requests on the rest.
  RED:      which runs check that main is still protected -> missing `checksProtection`; with a
            stub, 3 of 6 rows expected false to be true
  GREEN:    the same (219 passed): `checksProtection(run)`, used by the Action and, as it mirrors
            the Action, the in-process driver. Decision 0006 updated.
  REFACTOR: none.
- How far main was checked is recorded only when needed (Bernard): a change not by Divlab, or
  50 commits gone by, so the next check never pages. One write fewer on most runs.
  RED:      does not record how far it checked when it found only its own commits, fewer than 50
            -> expected [ { … mainChecked … } ] to deeply equal [] ("records how far it checked,
            so the next run starts there" became the 50-commit case, as the decision changed it)
  GREEN:    the same (786 passed).
  REFACTOR: none. "records how far it checked when it found a change Divlab did not make" passed
  first time, as it should; kept, since without it no test fails if that half is dropped (tried).
- The 85c7bae sandbox run: 17 of 98, failing from the first scenario with "Divlab's run … did
  not finish", while Divlab's runs all succeeded. The sandbox driver took Divlab's record of how
  far it checked main as the end of a run, and since 0ea73f5 Divlab writes it only now and then:
  my change, its effect on the harness missed. The in-process driver knows when a run ends, so
  the gate could not show it. The driver now waits, once the decision is recorded, until GitHub
  shows none of Divlab's runs in the project still going. Harness only; no production change.
- The 4787128 sandbox run: 97 of 98, in 63 minutes, with no refusals from GitHub: the request
  cuts let a full run fit in the App's hour. 85c7bae's Divlab runs read the App's allowance the
  same by their answers' headers and by `rate_limit` (2,210 of 5,000), so the retired check was
  what read another count. The one failure, "A member taking the revision after research has the
  research brief to read", was the sandbox driver's: it listed only the `modules/` folder of the
  prepared task, and briefs are fetched to `research-briefs/`. It lists both now; run alone
  against the sandbox, the scenario passed. Harness only.
- The 9316522 sandbox run passed: 98 of 98, in 61 minutes.
- Offers are ranked (Bernard: work under way first; Research reads the question and its briefs,
  next). Acceptance: scenario "A member is offered work already under way first, then the
  longest waiting", red as not yet right (offered in the order the projects listed them).
  RED:      puts work already under way ahead of work not yet begun -> expected [ 'begun',
            'under way' ] to deeply equal [ 'under way', 'begun' ] (the empty stub was written in
            the same step as the test, not after seeing it fail for want of the name: a slip)
  GREEN:    the same (251 passed).
  RED:      puts, of tasks alike in that, the one posted longest ago first -> expected [ 'later',
            'earlier' ] to deeply equal [ 'earlier', 'later' ]
  GREEN:    the same (252 passed): core's `rankOffers`.
  RED:      a project's ready tasks, each … whether its work is under way, and when it was posted
            -> expected [ …(2) ] to deeply equal [ …(2) ] (no `underWay`, no `posted`)
  GREEN:    the same (212 passed): the adapter reads the issue's feedback signal line, as Divlab
            writes it, and GitHub's `created_at`.
  RED:      offers them in core's order, across projects -> expected [ 'ledger#4', 'atlas#9',
            'atlas#12' ] to deeply equal [ 'atlas#12', 'atlas#9', 'ledger#4' ]
  GREEN:    the same (105 passed). The fake GitHub gives each issue a posting time rising with
            its number, so needs no clock; the scenario passed, and loses `@wip`.
  REFACTOR: what "under way" means moved to core (`underWay`), used by the adapter and the
            in-process driver alike; its core test passed first time, as a refactor's should.
            Concept §8 updated. Gate 803 and 138.
- What a Research task reads (Bernard: the question and briefs). Acceptance: scenario "A member
  preparing a Research task has the knowledge gap to read, and none of the module's work", red
  as not yet right (no feedback signal fetched); the drivers can now say which signals a prepared
  task fetched.
  RED:      what a Research task may read is its module's research briefs -> expected [] to
            deeply equal [ 'research-briefs/parser/' ]
  GREEN:    the same (254 passed).
  RED:      is also the feedback signal that reported the knowledge gap, and no other ->
            expected [ false, false ] to deeply equal [ true, false ]
  GREEN:    the same (255 passed): the reading task's `question`.
  RED:      is Research's alone -> expected true to be false
  GREEN:    the same (256 passed).
  RED:      widens nothing when the question is not a feedback signal's plain path (five rows:
            a folder, another file, a climb, the feedback folder, a nested signal) -> 5 failed.
            Its examples' names were made plain first (`fb-7`, as Divlab accepts only plainly
            named signals), a test-only change, still passing.
  GREEN:    the same (261 passed): core reads a question only as `feedback/<plain>.md`.
  RED:      is the question's own file, not one whose name only begins with it -> expected true
            to be false
  GREEN:    the same (262 passed): a scope not ending in a slash is one file.
  RED:      the CLI fetches a Research task's question and its module's briefs -> no
            `feedback/fb-7.md` among the paths
  GREEN:    the same (106 passed): the issue's feedback signal, read by the adapter, is passed
            to core as the question.
  RED:      the task record keeps a Research task's question, for the hook -> no `question`
  GREEN:    the same (107 passed); prepare writes it, in the CLI and the sandbox driver. The
            scenario passed and loses `@wip`.
  REFACTOR: none. Concept §6 updated. Gate 814 and 139.
- The 26382fc sandbox run passed: 99 of 99, in 60 minutes.
- A task decided by work Divlab did not merge would have no pinned commit; the CLI already
  refuses to prepare a task without one, saying why (`prepare.test.ts`, "has no pinned
  inputs"), so the item is ticked with no new code.
- The 5c8e3c1 sandbox run passed: 100 of 100, in 59 minutes; a Research task's question is
  fetched as one file by the sparse checkout.
- Bernard, 2026-10-30: a member giving a task back hands over the work done so far as partial
  work (the release skill); `anarres release` gives back a task with nothing done, and refuses
  while unsubmitted work is in the role's place.
- Giving a task back from the member's machine. Acceptance: "A member gives back a task they
  have done nothing on, and it is ready for others" and "A member with work not yet handed over
  is told to hand it over before giving the task back", red with `NotYetImplemented` at the
  drivers (writing work in the folder is the harness's, built first).
  RED:      giving a task back asks Divlab to make it ready again … when nothing has been done on
            it -> `giveBack is not a function`; with the stub, expected [ [], '' ] to deeply
            equal [ …(2) ]
  GREEN:    the same (108 passed).
  RED:      asks for nothing while work done on it is not yet handed over -> Error: asked
  GREEN:    the same (109 passed).
  RED:      a member giving a task back, from their CLI, is the release comment Divlab reads ->
            `askToRelease is not a function`; with the stub, expected [] to deeply equal
            [ { body: '/release' } ]
  GREEN:    the same (434 passed in github and divlab): Divlab's `RELEASE`, stated once beside
            `CLAIM`, and read by Divlab's own check of a comment.
  RED:      its release skill may run two things without asking: release and submit -> ENOENT;
            with a source carrying no tools, expected undefined to be 'Bash(node …'
  GREEN:    the same (110 passed).
  `anarres release` wires them, reading the folder's work as submit does (`changedIn`, now one
  function for both). Both scenarios passed and lose `@wip`.
  REFACTOR: the handover instructions are said once, a shared part (`handing-over`) in the next,
            resume and release skills. Concept §10's command table updated.
- Bernard, 2026-10-30, human review (decision 0016): PDC coordinators name, in the governance
  file, the modules whose contributions need a human's approval; a member at *trusted* or above,
  or a PDC coordinator, independent of the work, approves with GitHub's own review, for the
  commit Divlab merges. A list that cannot be read holds everything, and coordinators are
  alerted; a file with no list names no module. Test-list entries added (section 4).
- Human review, core (decision 0016). Acceptance: four scenarios in "Human review where PDC
  coordinators require it", `@wip`, red with `NotYetImplemented` at the drivers.
  RED:      needs a person's approval when PDC coordinators name the module -> `needsReview is
            not a function`; with the stub, expected false to be true
  GREEN:    the same (1 passed), hard-coded.
  RED:      not for another module, nor another project's; not when no module is named -> 3
            failed (two tests at once, a table and one more: a slip)
  GREEN:    the same (4 passed).
  RED:      holds everything given a list not per project, modules not a list, a module not
            plainly named, or a file not read -> 3 expected false to be true, and a crash on the
            unreadable file
  GREEN:    the same (8 passed): read as data, failing closed.
  RED:      not for a project whose name an object has of itself (`constructor`) -> TypeError
  GREEN:    the same (9 passed): the named modules kept in a Map.
  A module named by something not text: passed first time, as the check that demands it was
  written ahead of its test (a slip); seen to fail with the check taken out, and kept.
  RED:      an approval counts from a trusted member with no part in the module -> expected false
            to be true (the empty stub written in the same step as the test: a slip)
  GREEN:    the same (11 passed), hard-coded.
  RED:      not from an established or a new member; from a PDC coordinator -> 2 failed
  GREEN:    the same (14 passed): *trusted* or above.
  RED:      not from the work's author, however trusted -> expected true to be false
  GREEN:    the same (15 passed).
  RED:      not from the member whose linked account wrote it -> expected true to be false (first
            written the other way round, it passed for the wrong reason: the linked account was
            simply new; corrected)
  GREEN:    the same (16 passed): accounts compared as members.
  RED:      from a trusted member's linked account, at that member's level -> expected false to
            be true (the change that makes it pass had slipped into the last step undemanded;
            taken out to see this fail)
  GREEN:    the same (17 passed).
  RED:      not from a member with a part in the module -> expected true to be false
  GREEN:    the same (18 passed).
  RED:      from a member whose only part was Research -> expected false to be true
  GREEN:    the same (281 passed in core): eligibility's `isRoleInModule`, now exported, said
            once.
  REFACTOR: none. Gate 837 and 141.
- Human review, Divlab, the adapter and the template (decision 0016).
  RED:      leaves work on a module PDC coordinators require reviewed unmerged, saying it waits
            for a reviewer -> expected [ [ '7' ], [] ] to deeply equal [ [], …(1) ]
  GREEN:    the same (222 passed in divlab, once the tests' stand-in for GitHub gave a governance
            file with no review list and no approvals: the interface asks for both now).
  RED:      merges it once a trusted member approves its commit -> expected [] to deeply equal
            [ '7' ]
  GREEN:    the same (223 passed).
  RED:      does not count an approval of an earlier commit -> expected [ '7' ] to deeply equal []
  GREEN:    the same (224 passed): only an approval of the commit Divlab merges.
  RED:      does not count an approval from a member with a part in the module -> expected
            [ '7' ] to deeply equal []
  GREEN:    the same (225 passed): the project's parts, by member.
  REFACTOR: the parts by member, which claims used too, are one function (`membersParts`).
  RED:      approvals are GitHub's Approve reviews, by reviewer and commit -> `approvals is not a
            function`; with the stub, expected [] to deeply equal [ { reviewer: 'carol', …(1) } ]
  GREEN:    the same (214 passed in github).
  RED:      leave out an approval by a deleted account -> TypeError (the guard had been written
            ahead of its test: taken out to see this fail)
  GREEN:    the same (215 passed).
  RED:      are read from every page -> expected [] to deeply equal [ …(1) ]
  GREEN:    the same (216 passed).
  RED:      the template's reviews workflow runs on a review given, and on nothing else -> ENOENT;
            with an empty file, expected {} to deeply equal { pull_request_review: … }
  GREEN:    the same (48 passed). Its permissions and its one step were written with it; their
            test passed first time (a slip: the file was written whole).
  RED:      Divlab's checks workflow runs when the checks or reviews workflow finishes -> expected
            { workflow_run: … } to deeply equal { workflow_run: … }
  GREEN:    the same (227 passed). GitHub runs `pull_request_review` for a fork's pull request
            with no secrets, so the reviews workflow does nothing itself; its finishing starts
            Divlab's checks workflow, which has the App's key, as the project's checks already do.
  The in-process driver approves as GitHub would: the review, then Divlab's checks run for the
  reviewed commit. The four scenarios passed, lose `@wip`, and are `@sandbox-wip` until the
  sandbox driver can name a module for review in its governance file (which it can change, as
  the `@governance` scenarios do, so no account need be set up by hand) and approve as a member.
  Gate 846 and 145.
- Said once (decision 0016).
  RED:      says only once that work waits for a reviewer -> expected [ [], …(1) ] to deeply
            equal [ [], [] ]
  GREEN:    the same (228 passed): Divlab reads what it already said on the pull request.
  RED:      what Divlab has already told a member is each reason in its own refusals, nothing
            anyone else wrote -> `refusalsGiven is not a function`; with the stub, expected [] to
            deeply equal [ 'The work waits.' ]
  GREEN:    the same (217 passed in github): only an App's comments, read back from the quote
            Divlab wrote (`reasonOfRefusal`, beside `commentForRefusal`). Someone else's comment
            in the same words is not Divlab's, so cannot keep it quiet. Gate 848 and 145.
- The sandbox driver for human review: projects get the template's reviews workflow; the driver
  names a scenario's module for review in the sandbox's governance file and takes it out again
  (the file is changed whole now, not only its members), and approves through GitHub's review API
  as the member's account, waiting for Divlab's checks run. The four scenarios are `@governance`,
  run alone, in place of `@sandbox-wip`. SANDBOX.md says so. Harness only.
- The 095293d sandbox run: 97 of 102, in 88 minutes. Divlab acted rightly on every claim; the
  failures were the harness's. One claim's job waited 8 minutes for a GitHub-hosted runner (queued
  08:47:09, started 08:55:07), past the driver's wait, so "Partial work is merged, and its task is
  posted again as a continuation" failed; Divlab gave the task once its run started. The driver,
  having given up, never counted that task claimed, so its worker's claimed list held one more
  than it expected from then on, and every later scenario there took a stale list as settled
  (the four `@governance` eligibility scenarios, each failing with no claim seen though GitHub
  shows each claimed within seconds). The give-back scenarios passed.
  The driver now keeps the tasks it saw claimed, and a claimed listing missing one is not yet
  settled, whatever its count; a task Divlab gave after the driver stopped waiting then only
  slows the later checks to the listing's deadline, rather than failing them. Harness only.
- The 9a34128 sandbox run (human review): 103 of 106, in 77 minutes. "Work on a module PDC
  coordinators require reviewed waits for a reviewer's approval" failed: Divlab merged it. Only
  the claim workflow told Divlab which governance file the organisation keeps; the pull request
  and checks workflows did not, so in the sandbox Divlab read Anarres's own, which names no module
  for review. "Merged once a trusted member approves it" passed for the same wrong reason. A
  project of Anarres's own reads that file anyway, but the sandbox was not testing what it said.
  The other two failures were claims missing from a stale claimed listing, which 9def4dc's
  harness fix covers.
  RED:      each of the project template's Divlab workflows tells Divlab where the organisation
            keeps its governance file -> for the pull request, push, lease and checks
            workflows, expected undefined to be '${{ vars.ANARRES_GOVERNANCE }}'
  GREEN:    the same (54 passed): every Divlab workflow names it.
  REFACTOR: the claim workflow's own test of it removed, now said once for every workflow.
  Gate 852 and 145.
- The 5164e8a sandbox run: 105 of 106, in 70 minutes. The four human review scenarios passed,
  now reading the sandbox's own governance file: a member's approval of a fork's pull request
  wakes Divlab through the reviews workflow, and it merges. No claim went missing from a claimed
  listing (9def4dc). One failure, GitHub's: "A revised contract sends a module that is done back
  to Architecture at once" had its merge answered "Merge already in progress" for the 22
  seconds Divlab asks, though GitHub never made it. Divlab's run failed with its record, as
  designed, but nothing finished it: only the run after a push finished what Divlab began, and
  only once the merge was on main. GitHub never ran the project's 12:17 hourly check; run by
  hand, it did nothing. The pull request stayed open.
- Acceptance: "Work GitHub would not yet merge is merged by Divlab's hourly check", `@wip`
  then `@sandbox-wip` (GitHub cannot be made to put a merge off on cue); the in-process fake
  can now put off Divlab's next merge. Red in its Then: not merged.
  RED:      asks GitHub again for a merge it was about to make, which GitHub put off ->
            expected [] to deeply equal [ [ 'ledger', '7', 'c0ffee' ] ]
  GREEN:    the same (233 passed). Divlab's repository port can merge. "Never routes work it was
            about to merge but did not" now has GitHub put the merge off again, as the property
            it guards, nothing routed unmerged, still holds.
  RED:      routes work GitHub put off once it merges it, from the merge's commit -> expected []
            to deeply equal [ { project: 'ledger', …(4) } ]
  GREEN:    the same (234 passed).
  REFACTOR: comment: begun, not merged.
  RED:      does not ask again for a merge whose pull request was closed since -> Error: Divlab
            should not have acted
  GREEN:    the same (235 passed).
  RED:      does not ask again for a merge whose pull request was pushed to since: that is
            decided afresh -> the same
  GREEN:    the same (236 passed): only a pull request still at the commit Divlab read.
  RED:      the commit an open pull request is at is its head while it is open ->
            `openHead is not a function`; with the stub, expected undefined to be 'c0ffee'
  GREEN:    the same (218 passed in github).
  RED:      is nothing once it is closed -> expected 'c0ffee' to be undefined
  GREEN:    the same (219 passed).
  The scenario passed, but by a run Divlab makes only after a push, which a put-off merge never
  gives. Its When became Divlab's hourly check, and it went back to `@wip`, red in its Then.
  RED:      the hourly check asks GitHub again for a merge it was about to make, which GitHub
            put off -> expected [] to deeply equal [ '7' ]
  GREEN:    the same (237 passed): the hourly check finishes what Divlab began first, the same
            function the run after a push uses (`finishWhatDivlabBegan`, taken out of `onMerge`).
            The scenario passed and lost `@wip`.
  REFACTOR: the DSL's three ways a run stops share how they make the holder's work.
  Gate 859 and 146.
- The ccc85fd sandbox run: 105 of 106, in 78 minutes. "Accounts a PDC coordinator has linked
  are one member" failed in its Given: Alice's Coding work was neither merged nor refused. The
  project's check on it finished at 13:40:42, but the Divlab run its finishing started read it
  at 13:42 as still running (it recorded activity, and a failed check would have been said),
  and no event came after. Seen once; on the test list to watch.
- The hourly check and the task of work it finishes.
  RED:      (none) leaves alone the task of the work it finishes, though its lease ran out by
            the log it read -> passed first run once the test's work named its task, as real
            work does (first written without, it failed for that reason: the test's fault).
            Already so: the lease loop reads each task from the board after finishing, and a
            closed issue is no task. Kept as a regression test.
  Gate 860 and 146.

---

## 2026-10-27: The lease check run by hand in the sandbox

- The 23:00 full sandbox run (604aab8) passed: 98 of 98.
- Bernard gave the sandbox token "Actions: Read and write" (his own token in his own
  organisation, so no approval was needed). Run locally against the sandbox, the two lease-check
  scenarios ("Divlab's check leaves a task with its holder while their lease runs", "A task shown
  as claimed that Divlab never gave anyone is made ready again") passed, and lose `@sandbox-wip`.
  `CONTRIBUTING.md` lists the permission.

---

## 2026-10-26: New scenarios against the sandbox

- Run locally against the sandbox (HEAD 34d62ea pushed): the four "cannot be claimed" scenarios
  (a finished task, an alert, a member's own issue, a finished module) passed and lose
  `@sandbox-wip`. The two lease-check scenarios failed: running the check by hand was refused
  (403), since the sandbox token may not run workflows (it needs "Actions: Read and write";
  Bernard to decide); and an issue can be assigned only to someone who has commented on it, so
  the driver now has Mallory's account comment first (not a claim). Both stay `@sandbox-wip`.
- The 22:00 full run failed 1 of 94: writing a member's file just after making its branch in a
  new fork, GitHub answered "Branch … not found". The driver now waits for the branch, as it
  waits for a new fork.

---

## 2026-10-26: A finished task claimed, as a scenario

- Divlab already refused a claim on an issue that is not an open task (unit-tested). The
  scenario "A task whose work is done cannot be claimed" now shows it end to end: red with
  `HarnessNotYetBuilt` (no driver could claim a closed task), then a dishonest failure (the
  Specification work had no task to close; the scenario now finishes a Test task instead), then
  green in-process once the in-process fake kept closed tasks, as GitHub keeps closed issues.
  The sandbox driver can claim it too; `@sandbox-wip` until it has passed there.
- Then "An alert to PDC coordinators cannot be claimed": red with `HarnessNotYetBuilt`, green
  in-process once the fake numbered alerts in the same sequence as tasks, as GitHub numbers a
  project's issues; `@sandbox-wip` likewise.
- Then "An issue a member opened cannot be claimed" and "A finished module cannot be claimed",
  the same way.

---

## 2026-10-26: Divlab's lease check run by hand

- A project's lease check can now be run by hand (`workflow_dispatch`) as well as every hour:
  by someone who may run the project's workflows, such as a PDC coordinator; members, who work
  from forks, cannot. The check judges leases by Divlab's log and the time, so running it early
  frees nothing early. Divlab acts on such a run as on its schedule.
- The sandbox driver uses it: it marks a task claimed behind Divlab's back, runs the check, and
  reads back the coordinators' alert, which it keeps out of the routing alerts. The scenario
  stays `@sandbox-wip` until it has passed against the sandbox.

RED:      checks the project's leases when someone who may run its workflows asks for it
          -> Error: Divlab does not act on workflow_dispatch events
GREEN:    (158 passed)
RED:      the lease workflow runs every hour, or when someone who may run the project's workflows
          asks, and on nothing else -> expected { Object (schedule) } to deeply equal { …(2) }
GREEN:    (158 passed)
REFACTOR: none

---

## 2026-10-26: Whom a claimed-without-claim record names, checked

- Event files can be edited by people, so what is read back is checked. The record of a task
  shown as claimed without a claim was checked for its task only; whom it names as shown holding
  it is now checked too: an account's name, or nobody.

RED:      is refused when a record of a task shown as claimed names its holder as anything but an account
          -> expected [Function] to throw an error
GREEN:    (629 passed, whole gate)
          reads back a record of a task shown as claimed by nobody -> passed first time (regression
          test for the case the check must let through)
REFACTOR: none

---

## 2026-10-26: Claimed tasks read from every page

- The hourly check's claimed tasks, the ready tasks a member is offered and the tasks a member
  holds were each read from one page of 100, so in a busy project some would be missed. Each is
  now read from every page.

RED:      are read from every page, however many tasks are claimed -> expected [ …(100) ] to have a length of 150 but got 100
GREEN:    (165 passed)
REFACTOR: none (the older test's fake first made to answer the first page however asked, green)
RED:      a project's ready tasks are read from every page -> expected [ …(100) ] to have a length of 150 but got 100
GREEN:    (166 passed)
RED:      the tasks a member holds are read from every page -> expected [ …(100) ] to have a length of 150 but got 100
GREEN:    (167 passed)
REFACTOR: the three listings read through one private `everyPage`

---

## 2026-10-26: A task freed in the log but still shown claimed

- If a run stopped after recording a task given back, or its lease run out, but before the board
  showed it ready, the hourly check left a given-back task claimed, then a day after the claim
  recorded its lease as run out and told the member so; a lease already run out was recorded and
  told twice. The check now makes such a task ready and does nothing else.

RED:      makes a task given back ready, finishing what a stopped run began -> expected [] to deeply equal [ '12' ]
GREEN:    (155 passed)
RED:      frees a task given back long ago without saying its lease ran out -> expected [ …(2) ] to deeply equal [ [], [] ]
GREEN:    (156 passed)
          frees a task whose lease ran out in the log once … -> passed first time (regression test:
          the previous change covers it)
REFACTOR: the freed-in-the-log check moved ahead of the lease's expiry, replacing `stillHeld`

---

## 2026-10-26: An event's number taken while GitHub failed its write

- After a server error, an event file found holding another event was another run's: the event
  now gets the next free number, as when a number is found taken at once, rather than failing
  the run.

RED:      gives the event the next free number when another run took its number while GitHub failed
          -> GitHub PUT …/events/000251.json answered 502
GREEN:    (164 passed)
REFACTOR: none

---

## 2026-10-26: A comment after a server error

- The last of Divlab's writes GitHub's server can fail. A comment cannot simply be repeated, and
  Divlab may rightly post the same reply twice (the same refusal to two claims), so the same text
  being there does not show it was posted. Divlab now counts its own comments saying the same
  before posting; after a server error it counts again: one more, and GitHub posted it; none, and
  it posts again, three times in all. Divlab's runs for a project never overlap, so no other run
  posts meanwhile. Only comments by a bot (Divlab's App) count, read from every page.
- Protocol slip: the bot check went in with the first test, before one demanded it; taken out,
  then demanded by its own test. Two older tests' fakes needed the comment listing: the
  production change was set aside while each fake was updated green, then put back.

RED:      posts it once when GitHub saved it, though it answered with a failure -> GitHub POST …/comments answered 502
GREEN:    (156 passed)
RED:      posts it again when GitHub's server failed before saving it -> GitHub POST …/comments answered 502
GREEN:    (157 passed)
RED:      posts it again, though Divlab rightly said the same before -> expected length 2 but got 1
GREEN:    (158 passed)
RED:      stops asking, and fails, when GitHub's server keeps failing -> promise resolved instead of rejecting
GREEN:    (159 passed)
RED:      posts it once on a busy task, whose newest comments are past the first page -> length 151 but got 152
GREEN:    (160 passed)
RED:      posts it again, though a member said the same words meanwhile -> expected [] to have a length of 1
GREEN:    (161 passed)
RED:      tells a member their lease ran out once … -> GitHub POST …/comments answered 502
GREEN:    (162 passed)
RED:      refuses a pull request once … -> GitHub POST …/comments answered 502
GREEN:    (621 passed, whole gate)
REFACTOR: every comment Divlab posts goes through one private `comment`

---

## 2026-10-26: Governance scenarios run alone

- The full sandbox run for ebdfaa4 failed 2 of 94. In one, Alice's claim was refused: "you have
  worked on it as Specification". A governance scenario running at the same time had just linked
  the account playing the Specification work's member with the account playing Alice, so Divlab
  rightly judged them one member. `@governance` scenarios were kept from each other, but not from
  the rest, though the governance file applies to every scenario. Now a scenario that changes it
  starts only when nothing else is running, and nothing starts while it runs (four scenarios,
  run one by one). The rule is `mayStart`, beside the sweep, with its own tests.
- The other failure was GitHub's server failing (500) the sandbox driver's write of a member's
  file in the fork. That write is now asked again, and a refusal because the file is there
  counts if the file holds the same text.

RED:      wait while any other scenario runs -> expected true to be false
GREEN:    (1 passed)
RED:      leave other scenarios to run alongside each other -> expected false to be true
GREEN:    (2 passed)
RED:      hold back every other scenario while one runs -> expected true to be false
GREEN:    (3 passed)
REFACTOR: none

---

## 2026-10-26: An issue after a server error

- Opening an issue cannot simply be repeated: a repeat after an issue GitHub opened would post
  the task (or alert) twice. After a server error Divlab now looks at the project's open issues,
  newest first: one with the same title and body was this one; none, and it is opened again,
  three times in all. A task, a coordinators' alert and a finished module name the decision
  they came from, a change not by Divlab names its commit, and the unprotected-main alert is
  opened only when none is open, so for these the same title and body is this issue. Two alerts
  can recur with the same words while the first is still open (a task shown claimed without a
  claim, work not accepted): after a server error, coordinators may then see one open alert
  where there were two occurrences. A closed issue saying the same is not counted.
- Protocol slip: the query for open issues went in before a test demanded it. Taken out (all
  issues), the test written and watched red, then put back.

RED:      opens it once when GitHub saved it, though it answered with a failure -> GitHub POST …/issues answered 502
GREEN:    (152 passed)
RED:      opens it again when GitHub's server failed before saving it -> GitHub POST …/issues answered 502
GREEN:    (153 passed)
RED:      stops asking, and fails, when GitHub's server keeps failing -> promise resolved "undefined" instead of rejecting
GREEN:    (154 passed)
RED:      opens it again, though an issue saying the same was opened and closed before
          -> expected [ 'closed' ] to deeply equal [ 'open', 'closed' ]
GREEN:    (155 passed)
REFACTOR: none

---

## 2026-10-26: An event file after a server error

- Writing an event creates a numbered file, so it cannot simply be repeated: a repeat after a
  write GitHub saved would be refused as a number taken, and the event recorded again under the
  next. After a server error Divlab now looks at the file instead: holding this event, it was
  saved; missing, it is asked for again, three times in all (the limit the merge uses, now one
  constant).
- Protocol: reading the file went in with a 404 branch and an error branch no test demanded;
  cut back before the next test. The test for the limit went red by running out of memory (the
  asking never stopped) rather than by assertion.

RED:      carries on when GitHub saved the event, though it answered with a failure
          -> promise rejected "GitHub PUT …/events/000251.json answered 502" instead of resolving
GREEN:    (149 passed)
RED:      records the event when GitHub's server failed before saving it
          -> TypeError (no answer for a missing file: stub), then GitHub PUT … answered 502
GREEN:    (150 passed)
RED:      stops asking, and fails, when GitHub's server keeps failing -> worker out of memory
GREEN:    (151 passed)
REFACTOR: the merge's and the event's attempts share `WRITE_ATTEMPTS`

---

## 2026-10-26: Label and close writes repeated safely

- Marking a task claimed, making it ready again and closing an issue each set values outright
  (the whole set of labels and the assignees, or the state), so each is now asked for as a write
  safe to repeat, and the request layer asks again after a server error. Each is marked
  explicitly rather than every PATCH by default, since a later PATCH may not be safe. Closing had
  no adapter test; its regression test passed first time, as the behaviour existed.

RED:      marking a task claimed > asks for the change as a write safe to repeat -> expected [ undefined ] to equal [ { repeatable: true } ]
GREEN:    (21 passed)
RED:      releasing a claim > asks for the change as a write safe to repeat -> expected [ undefined ] to equal [ { repeatable: true } ]
GREEN:    (22 passed)
          closing a task > closes the task's issue -> passed first time (regression test)
RED:      closing a task > asks for it as a write safe to repeat -> expected [ undefined ] to equal [ { repeatable: true } ]
GREEN:    (24 passed)
RED:      marking a module done > closes the issue saying so as a write safe to repeat -> expected [ undefined ] to equal [ { repeatable: true } ]
GREEN:    (25 passed)
REFACTOR: both closes go through one private `closeIssue`

---

## 2026-10-26: Bundles, and a sweep that raced

- 40704df went to main without its bundles rebuilt, so CI's check that they match their source
  failed and main was red for about 20 minutes. Fixed in ebdfaa4, pushed at once, inside the hour
  since the previous sandbox run. Lesson: `npm run bundle` before committing a change to Divlab
  or the CLI. The gate (`npm test`) now rebuilds the bundles first (about 1.5 seconds), so a
  commit made after a green gate carries them; CI's comparison stays as the backstop.
- That run's sandbox suite stopped before any scenario: two of the four workers' sweeps were
  refused (403) deleting a repository the other workers deleted at the same moment. A refused
  delete is now looked at again, and counts as swept if the repository has gone. Harness only.

---

## 2026-10-26: A merge GitHub is still busy with

- The full sandbox run for 018a939 failed 2 of 94 scenarios. In one, Divlab's merge was refused
  with "Merge already in progress" and the pull request stayed open. The merge's retries went out
  back to back, so a retry could find GitHub still working on an earlier ask. A neighbouring run
  hit a 502 opening an issue, still not retried (on the test list); the other failed scenario
  waited for a run in the same project that never finished. The merge is now asked for as a
  write safe to repeat, so the request layer pauses and asks again after a server error or a
  merge still in progress. And whenever the merge is refused, Divlab first checks whether an
  earlier ask merged it, since a repeat after a merge that went through is refused.
- Protocol slip: the check on GitHub's message went in before a test demanded it. Taken out,
  the test that demands it written and watched red, then put back.

RED:      tries again shortly when GitHub is still busy with a merge -> expected undefined to be 2000
GREEN:    (10 passed)
RED:      does not retry a merge GitHub refuses for good -> expected 2000 to be undefined
GREEN:    (11 passed)
RED:      asks for the merge as a write safe to repeat -> expected [ undefined ] to equal [ { repeatable: true } ]
GREEN:    (7 passed)
RED:      carries on with the merge's commit if GitHub refused a repeat because it merged it already
          -> GitHub PUT …/pulls/7/merge answered 405
GREEN:    (143 passed)
REFACTOR: none

---

## 2026-10-26: Writes after a server error

- GitHub's server failed two writes on 2026-10-26: a merge (500, in Divlab's run) and a member's
  branch in a fork (502, from the sandbox driver). Reads were already retried; writes were not,
  since repeating some could post twice. A merge GitHub did not make is now asked for again, up to
  three times: GitHub merges only the commit Divlab read, so it cannot merge twice. A member's
  branch is asked for as a write safe to repeat (asking again finds it made, which already
  counts), and the sandbox driver's branch the same way. The other writes are on the test list.

RED:      asks again if GitHub did not merge it -> GitHub PUT …/pulls/7/merge answered 500
GREEN:    (138 passed)
RED:      asks for the branch as a write safe to repeat -> expected [ undefined ] to equal [ { repeatable: true } ]
GREEN:    (139 passed)
REFACTOR: none

---

## 2026-10-26: A task shown as claimed without a claim

- Bernard (2026-10-26): a task the board shows as claimed, with no claim in Divlab's log, is made
  ready again by Divlab's hourly check, and PDC coordinators are told. Divlab records a claim
  before the board shows it, so such a task was marked by someone else. The check records what
  it found (`claimedWithoutClaim`, read back like every event), frees the task, and opens an
  alert naming the task and whom it showed as holding it, quoted as text. Divlab's runs for a
  project share one queue, so the check cannot catch a claim between its record and its mark.
- A new scenario shows it in-process; it is `@sandbox-wip` until the harness can run the hourly
  check on cue.

RED:      a task marked claimed with no claim -> expected [] to deeply equal [ '12' ]
GREEN:    makes the task ready again (151 passed)
RED:      tells PDC coordinators which task it was -> expected [] to deeply equal [ { …(4) } ]
GREEN:    (152 passed)
REFACTOR: the board's claimed list carries each task's role, module and holder, so no second read
RED:      says nobody was shown holding the task when nobody was -> expected { …(4) } to equal { …(3) }
GREEN:    (153 passed)
RED:      records what it found, and when, before the board shows the task ready -> [ [ 'released' ], [] ]
GREEN:    (154 passed)
RED:      the alert issue -> TypeError (stub) -> expected { title: '' … } to equal { …(3) }
GREEN:    (132 passed)
RED:      says nobody was shown holding it when nobody was -> expected false to be true
GREEN:    (133 passed)
RED:      the adapter's claimed tasks -> TypeError (stub) -> expected [] to equal [ { task: '12' … } ]
GREEN:    (18 passed)
RED:      name nobody as holding a task nobody is assigned -> expected { …(2) } to equal { …(1) }
GREEN:    (135 passed)
RED:      opens an issue saying which task it was -> TypeError (stub) -> expected [] to equal [ { …(3) } ]
GREEN:    (136 passed)
RED:      reads back a record of a task shown as claimed -> "it is not a routing record"
GREEN:    (137 passed)

- Protocol slips: twice I wrote a branch no test had asked for (for a task nobody is assigned,
  in Divlab and in the adapter). Each time I took it out, watched a new test fail, and put it
  back. Once I changed the test and the code it covers in one step, to show that red.

---

## 2026-10-26: A third member in the sandbox

- Bernard made a third GitHub account, `anarres-sandbox-member-c`, a member of the sandbox
  organisation, with a token that may only comment and open pull requests there
  (`ANARRES_SANDBOX_THIRD_MEMBER_TOKEN`). The sandbox driver gives it to a scenario's third
  member.
- The four claiming scenarios with three members passed in the sandbox: a claimed task cannot be
  claimed by anyone else, the first of two claims made together wins, only the holder can give
  a task back, and a task given back goes to the next claim. They run there now.
- Two of them first failed on the driver, not on Divlab: a member claiming a task someone else
  holds was looked for only among ready tasks, and a claim seen as done when anyone held the
  task; a release by someone else waited for the task to be ready again. The driver now finds
  the open task ready or claimed, takes a claim as granted only when the member is assigned, and
  ends a refused claim or release at Divlab's reply.
- Slip: my first run of them used an unpushed commit, so GitHub could not find the Divlab
  version the projects named. The full run for 5e0792b then failed three scenarios on Divlab's
  runs left pending for minutes, and one local run met a 500 from GitHub's merge; GitHub
  reported no incident. Watching whether that recurs.
- The full run for 668214b, the first with the three-member scenarios: 93 of 94 passed. The one
  failure was GitHub answering 502 when the driver made a member's branch in a fork. Writes are
  not retried on a server error; that is now on the test list.

---

## 2026-10-24: Work so far, back on another machine

- A scenario drives restoring a draft end to end: Alice holds the Test task with a draft open,
  prepares it on another machine, and finds her work so far in its folder. Both drivers now
  play the member's machine closely enough to look in a task's folder (`workInFolder`); the
  in-process driver's prepare now brings the draft back through the CLI's `restoreDraft`, as
  `anarres prepare` does, and the sandbox driver's does it into its temporary folder.
- RED: the scenario, `@wip` -> not yet right: the folder held no feedback signal. GREEN once the
  in-process prepare called `restoreDraft`, which unit tests had already driven; no new
  production code. It passed in the sandbox at 4fa55da (whose full run passed), so it is no
  longer `@sandbox-wip`.
- The sandbox driver's writer repeats the CLI's rule of never overwriting a file already in the
  folder, as the member's machine would apply it; the in-process driver keeps no files to clash.

---

## 2026-10-24: A member's status

- In the sandbox (2026-10-24, at 8a14ec6, whose full run passed 87/87): the merged-work status
  scenario and the missing-verdict scenario both passed, so neither is `@sandbox-wip` now.
- `anarres status`, and the `/anarres:status` skill that may run only it: each task the member
  holds, across Anarres's projects, with when its lease runs out. The lease is worked out by
  Divlab's own rule (`leasesFrom`, now exported), so the rule is stated once. What is shown is
  only plain names, as with offers. A new scenario asks through the CLI in both drivers; it is
  `@sandbox-wip` until it has passed there.
- The projects searched are those where the member holds a task, not those with ready tasks: the
  first wiring used the ready search, which would miss a project whose only task the member
  holds. The drivers name the project themselves, so the scenario could not catch it; the
  adapter's own test now does.
- Protocol slips: twice I wrote an empty stub in the same step as its test (the failures were
  still assertions). Once a test failed for the wrong reason (no claim in its log, so an Invalid
  Date); I gave it the claim, and listed the unrecorded-claim case to drive out properly.

RED:      shows each task the member holds, its lease a day after the claim -> expected [] to deeply equal [...]
GREEN:    (57 passed)
RED:      runs the lease from the member's latest work since the claim -> '2026-10-21T09:00' not '…15:30'
GREEN:    (511 passed, all unit)
RED:      leaves out a held task that is not plain names -> expected [ {...} ] to deeply equal []
GREEN:    (60 passed)
REFACTOR: the status tests share one holdings helper
RED:      the status as the member sees it -> expected '' to be 'ledger#4  Test task for lexer, held…'
GREEN:    (61 passed)
RED:      says so when they hold no task -> expected '' to be 'You hold no tasks just now…'
GREEN:    (62 passed)
RED:      the tasks a member holds in a project -> expected [] to deeply equal [ { id: '4', … } ]
GREEN:    (117 passed)
RED:      leaves out a task someone else holds -> expected [ {...} ] to deeply equal []
GREEN:    (118 passed)
RED:      the status skill may run only status -> expected undefined to be 'Bash(node …status)'
GREEN:    (6 passed)
RED:      the projects where a member holds a task -> expected [] to deeply equal [ 'ledger' ]
GREEN:    (119 passed)
REFACTOR: names and namesHeldBy share one search
RED:      no lease time when the log records no claim -> RangeError: Invalid time value (the bug)
GREEN:    (64 passed)
RED:      says the lease has run out when Divlab cannot tell when it began -> TypeError reading 'slice' (the bug)
GREEN:    (65 passed)
RED:      no lease time when the claim's time cannot be read -> RangeError: Invalid time value
GREEN:    (66 passed)
REFACTOR: when a lease runs out is stated once, in core (`leaseRunsOutAt`), and `leaseHasRunOut`
          and the CLI both use it

Open pull requests in the status: each held task shows the member's open pull request for it, if
any, read from the task's branch name only (the title is the member's to edit): a draft, or
finished work Divlab has not merged, which means it answered there. Status says so without
showing any comment's text. A second scenario (`@sandbox-wip`), in both drivers. The lister is
`pullRequestsOpenBy`, not `openPullRequests`, which would read as the adapter's opener. Slips: I
renamed test rows in the same step as production code; and I wrote the branch-name guard before
a test asked for it, so I replaced it with a crude stand-in, watched its test fail, then
restored it.

RED:      shows the member's open pull request for a task they hold -> expected undefined to deeply equal { number: '17', draft: true }
GREEN:    (67 passed)
REFACTOR: the pull request looked up with find
RED:      says what the member has open for a task (draft, finished) -> expected '…' to be '…; your draft is…'
GREEN:    (69 passed)
RED:      a member's open pull requests in a project -> expected [] to deeply equal [ { number: '17', … } ]
GREEN:    (120 passed)
RED:      leaves out one someone else opened, or not from a task's branch -> expected [ {...} ] to deeply equal []
GREEN:    (122 passed)

Resuming a task: `anarres resume project#number`, and the `/anarres:resume` skill. While the
member holds the task it says the task's folder; once they no longer hold it, it refuses and
says the work is no longer theirs; if the task was never prepared on this machine, it says to
prepare it. `resumption` takes the task already parsed from its name, as the command parses it,
so it needs no branch for a name that is not one. The folder's name is now said once,
`taskFolder`. Two scenarios run in-process, where the driver keeps a record of what the member
prepared on their machine; the sandbox driver has no member's machine yet, so they are
`@sandbox-wip` and raise HarnessNotYetBuilt there. The skills for next and resume now repeat the
instructions for doing the work: listed to say them once.

RED:      resuming is in the task's folder while the member holds it -> expected { refused: '' } to deeply equal { folder: … }
GREEN:    (1 passed, hard-coded)
RED:      is the folder of the task named, for any project and task -> expected 'anarres-work/ledger-4' … 'atlas-12'
GREEN:    (2 passed)
REFACTOR: the commands use `taskFolder`
RED:      is refused for a task the member no longer holds (three rows) -> expected { folder } to deeply equal { refused }
GREEN:    (74 passed)
RED:      is refused for a task not prepared here -> expected { folder } to deeply equal { refused }
GREEN:    (75 passed)
RED:      the resume skill may run resume, prepare and submit -> expected undefined to be 'Bash(…resume *)…'
GREEN:    (76 passed)

The sandbox driver now plays a member's machine: a temporary folder, cleared after each
scenario, where prepare runs git as `anarres prepare` does, fetching a real task's inputs from
the sandbox, and resume looks for the record prepare left. That record is now made in one
place, `taskRecord`, which `anarres prepare` and the driver both use.

RED:      the record is written as prepare writes it, and read back -> expected undefined to deeply equal { role: 'coding', … }
GREEN:    (77 passed)

A member's open pull requests are read from every page GitHub gives, not only the first hundred.
Asking for pages changed the path the first test expected, so I updated it in the same step:
two tests were red at once, both for the missing paging.

RED:      open pull requests are found on every page -> GitHub GET …pulls?state=open&per_page=100 answered 404 (no page asked for)
GREEN:    (123 passed)

The read-scope hook and NotebookEdit: it was denied in a task's folder only by accident (its
file is `notebook_path`, so the hook saw "undefined", outside the folder). It is now judged as a
write of its notebook, and the plugin's matcher sends it to the hook. A tool the hook does not
know is refused in a task's folder, saying why, not by accident. The hook's decision is now a
function of plain `if`s.

RED:      judges a NotebookEdit as a write of its notebook -> expected { hookSpecificOutput } to be undefined
GREEN:    (78 passed)
RED:      denies a tool it does not know, saying why -> reason was "undefined is outside this task's folder"
GREEN:    (79 passed)
REFACTOR: the hook's decision, `toolDecision`, as plain ifs
RED:      the hook's matcher sends NotebookEdit -> expected [ {…} ] to deeply equal [ {…} ]
GREEN:    (79 passed)

Reading back one's own work (decision 0009, Bernard): the hook refused a session's reads of its
role's own place, so a resumed session could not see the work done so far. In the task's folder
a session may now read where its role writes; prepare still fetches only the role's inputs.
Bernard also settled contribution history: the member's merged work, per project.

RED:      lets the session read back its own work, where its role writes -> expected [ {refused}, {refused} ] to deeply equal [ 'allowed', 'allowed' ]
GREEN:    (80 passed)

The status and resume scenarios against the sandbox, run locally by name: the held-task status
and both resume scenarios passed first time, prepare fetching a real task's inputs with git. The
draft-in-status scenario failed: the sandbox driver opened its drafts its own way, from a
`work/…` branch, which the status rightly ignores. The driver now submits drafts through the
CLI's `submit --draft`, sharing one method with its plugin submission; that scenario and "Divlab
does not merge draft work" then passed. All four lose `@sandbox-wip`. (I first started a run
that would have taken in every `@sandbox-wip` scenario, the profile's paths added to mine, as
once before; I stopped it and named the scenarios in a config of their own.)

Contribution history (Bernard: merged work, per project): `contributions` gathers each piece of
the member's work Divlab merged from the projects' logs, plain names only, with the day only
when its time reads as one; `describeContributions` shows it; the adapter finds the projects by
the member's merged pull requests; `anarres status` prints it after the held tasks. Slip: two
text tests written in one step.

RED:      each piece of their merged work, per project -> expected [] to deeply equal [ {...} ]
GREEN:    (81 passed)
RED:      leaves out work that is not plain names -> expected [ {...} ] to deeply equal []
GREEN:    (83 passed)
RED:      gives no day for an unrecorded or unreadable time -> TypeError reading 'slice' (the bug); the raw text shown
GREEN:    (85 passed)
RED:      the history as the member sees it, and none yet (two tests) -> expected '' to be '…'
GREEN:    (87 passed)
RED:      the projects where a member's work has been merged -> expected [] to deeply equal [ 'atlas' ]
GREEN:    (124 passed)
REFACTOR: one search helper for issues and pull requests, `projectsFound`

Bringing back a member's draft when they prepare a task again (another machine, or the folder
lost): from their open pull request for the task, through GitHub's API, only its files in the
role's own place and one feedback signal. Not from the draft's branch with git: the branch
holds whatever its fork's main had in the role's place, which may be others' work, and 0009
rests on the folder holding only the member's own. `anarres prepare` writes a restored file only
where none is there already, so newer work on the same machine is never overwritten.

RED:      the draft's files in the role's own place and its signal, nothing else -> expected [] to deeply equal [ … ]
GREEN:    (88 passed)
RED:      brings back one feedback signal only -> expected [ 'feedback/FB-4.md', … ] to deeply equal [ 'feedback/FB-4.md' ]
GREEN:    (89 passed)
RED:      writes back the open pull request's own-place files, and says how many -> expected [ 0, [] ] to deeply equal [ 1, [ … ] ]
GREEN:    (90 passed)
RED:      asks for no files when there is no open pull request for the task -> expected [ 0, [ '' ] ] to deeply equal [ 0, [] ]
GREEN:    (91 passed)

The plugin's skills are now built from sources in `packages/cli/skills/` by `npm run bundle`,
and CI checks them as it does the bundles. The instructions for doing and submitting the work
are said once, in a shared part both next and resume take in. A file the skills read at run time
would have said them once too, but the read-scope hook refuses reads outside a task's folder.
Slip: the stub written in the same step as its test (the module had to exist to import).

RED:      a skill has each shared part in place of the line naming it -> expected '' to be '---…'
GREEN:    (1 passed)
RED:      fails, naming it, when the source names a shared part there is not -> expected [Function] to throw
GREEN:    (2 passed)

A task Divlab marked claimed, with nobody assigned to it now, is no longer taken as free: it
stays with the member Divlab's log says it gave it to, and a new claim is told it is taken. The
board now says whether a task is marked claimed, apart from who is assigned.

RED:      leaves a task marked claimed with the member Divlab gave it to, though nobody is assigned -> expected [ [ {alice} ], [] ] …
GREEN:    (143 passed)
RED:      reads a task marked claimed as claimed, though nobody is assigned -> expected { role, module } to deeply equal { …, claimed: true }
GREEN:    (125 passed)

A claim's or release's commenter must be named as GitHub names a member's account before Divlab
uses the name: letters, digits and single hyphens, at most 39. A bot's is refused too.

RED:      refuses a claim whose commenter's name is not an account's (three rows) -> expected [Function] to throw
GREEN:    (146 passed)

A scenario for work whose feedback signal leaves out its verdict passed the first time it ran:
Divlab already refuses it, naming what is missing (core's reading of the signal, unit-tested
before). Kept as a regression test of what the member is told; `@sandbox-wip` until it has run
there.

Main's commits since Divlab last checked are read from every page of GitHub's comparison, which
gives at most 250 at once, so a long gap between checks leaves none unchecked. Asking for pages
changed the first test's path, updated in the same step (two red at once). The stop at an empty
page I wrote before its test: I took it out, watched the test ask for a page too many, and put
it back.

RED:      main's commits on every page -> 404 for compare/…main?per_page=100&page=1 (no page asked for)
GREEN:    (126 passed)
RED:      stops at an empty page, though GitHub's count says more (guard taken out) -> 404 for page 3
GREEN:    (127 passed)

A claim Divlab recorded, but whose run stopped before the board showed it, is finished by the
next hourly lease check: the task is marked claimed for the member the log names, unless it was
given back, or its lease ran out, since. Two items weighed and left: setup recording where
main's checking starts (an event written at setup starts an extra Divlab run in every sandbox
scenario, for a narrow gap), and recording refused claims (each record is a commit, and anyone
who can comment can cause a refusal: for Bernard).

RED:      finishes a claim a run recorded but stopped before the board showed it -> expected [] to deeply equal [ {…} ]
GREEN:    (147 passed)
RED:      leaves ready a task whose claim was given back since -> expected [ {…} ] to deeply equal []
GREEN:    (148 passed)

A task's issue now links to the feedback signal it was decided from, as it was at the merged
commit, so a member can read exactly what decided it.

RED:      links to the feedback signal it was decided from, at the merged commit -> expected body to contain 'Decided by […](…)'
GREEN:    (128 passed)

The hourly lease check also gives a task marked claimed, with nobody assigned now, back to the
member Divlab's log says holds it, so their CLI sees it as theirs again. Bernard decided
refused claims are not logged (the reply is the record) and both alerts for work put onto main
stay for now.

RED:      gives a task marked claimed back to its holder when nobody is assigned -> expected [] to deeply equal [ {…} ]
GREEN:    (149 passed)

Claude Code itself now validates the plugin and its marketplace in CI (pinned 2.1.306; it needs
no login, tried with an empty home folder, and the exact `npx` commands run locally). The
sandbox driver's requests no longer wait out a spent hourly allowance within a scenario: it
stops at once with GitHub's refusal. Divlab's own requests still wait, and a limit that resets
within a minute, such as search's, is waited out either way: I first stopped on any spent
limit, which would have failed runs over search's per-minute one.

RED:      does not wait for the hourly limit to reset when told not to -> expected 90000 to be undefined
GREEN:    (129 passed)
RED:      still waits out a limit that resets within a minute, such as search's -> expected undefined to be 40000
GREEN:    (130 passed)

A test that an empty governance setting means Anarres's own file passed the first time it ran:
the behaviour was written with the setting. Kept as a regression test.
Likewise a test that work merged under a linked account, before the link was made, counts as
the member's own when they claim under their main account: it passed first time, as the rules
read the governance file at claim time. Kept.

---

## 2026-10-24: A draft made ready, and the plugin's handover

- A member who submitted a draft and then the finished work got the same pull request back,
  still a draft, which Divlab never merges. Submitting finished work to it now marks it ready,
  through GitHub's GraphQL API, the only way; GraphQL answers 200 even when it refuses, so its
  errors are checked and fail the submission out loud.
- The skill now tells Claude how to hand over partial work when allowance runs low: the signal
  with `status: partial` and a handover note, submitted, not as a draft (decision 0008).

RED:      marks the member's draft ready on a final submit -> the last request was not the mutation
GREEN:    (115 passed)
RED:      fails, saying why, if GitHub will not mark the draft ready -> resolved '12'
GREEN:    (116 passed)

---

## 2026-10-24: The sandbox polls less

- The full run for 2331549 was refused scenario by scenario: GitHub's hourly allowance had gone.
  A full run had grown to about 3,100 requests (waiting for each Divlab run to finish added
  log reads), so two in an hour no longer fit. Most of a run is the driver asking again while it
  waits: whether a pull request has merged (702, every 2 seconds), Divlab's log (about 1,100,
  every 1 to 3 seconds). Divlab's runs take 20 to 40 seconds, so the driver now asks every 5
  seconds for merges and finished runs, and every 3 for a decision. The run is re-run after the
  allowance resets; pushes stay at one full run an hour.

---

## 2026-10-24: Submitting work from the plugin

- `anarres submit project#number [--draft]` checks the member's work as Divlab will, then, with
  the member's own login and GitHub's API only (no git credentials), makes or finds their fork,
  a branch `anarres/task-<n>` from its main, puts each changed file on it, and opens the pull
  request, reusing a branch or pull request the member already has, as after a draft. It takes
  the changed files from git in the task's folder, leaving out the folder's own record. The skill
  may run it, and tells Claude to write the feedback signal first.
- A new scenario submits through the plugin; both drivers go through the CLI's `submit` for it
  (the sandbox forking into the members' organisation, as its accounts cannot fork into a personal
  account, and opening the pull request as the member's own account).
- A mistake the fake could not show, found writing the sandbox side: the pull request's head was
  `owner/repository:branch`; GitHub's is `owner:branch`. Its test was changed and seen failing first.
- The full sandbox run for 9e23ed3 passed all 82.
- Slips: the two pull request adapter tests failed together, as did the two put-file rows.

RED:      submit puts the work on a branch of the fork and asks the project to merge it -> expected []
GREEN:    (55 passed)
RED:      sends nothing when the work is not ready -> GitHub was asked to fork and branch
GREEN:    (56 passed)
RED:      forks into the member's account, or finds their fork -> expected ''
GREEN:    (108 passed)
RED:      branches from the fork's main -> expected undefined
GREEN:    (109 passed)
RED:      keeps a branch submitted to before -> rejected 422
GREEN:    (110 passed)
RED:      puts a new file / one already there (two rows) -> expected undefined
GREEN:    (112 passed)
RED:      opens the pull request / gives the one already open (two at once) -> expected ''
GREEN:    (114 passed)
RED:      the skill may run submit -> expected three rules to be four
GREEN:    (520 passed)
RED:      the pull request's head is owner:branch -> got "alice/ledger:anarres/task-4"
GREEN:    (56 passed; 94 scenarios)

---

## 2026-10-23: Partial work and continuations

- Bernard settled partial work (decision 0008, concept §8 updated): it is merged; Divlab posts a
  continuation for the same role and module, carrying the handover signal, never routing to the
  next role; a continuation also reads its role's own place; anyone eligible may take it.
- Core reads `status: partial` and routes such work to a continuation (`rule: "partial"`).
  Divlab needed no change of its own: the ruling flows through (its test passed first time, kept
  as a guard). The continuation is labelled on GitHub and read back. `prepare` fetches the
  role's own place for a continuation, and the hook lets its session read it.
- A hole I made and closed: the CLI first let a continuation read its own place by a bare prefix
  check, so a path climbing out of it passed. Its test was written and seen failing; the rule
  moved into core's `mayRead` and `readScope`, under the same path check as every read.
- The sandbox driver now waits out a new fork's "Git Repository is empty" answer (it failed one
  scenario of 81 in the run for 0ae84fa; the race fix itself held).
- Slip: the two continuation hook tests went in together.

RED:      gives work handed over part done as partial -> expected { … } to match { partial: true }
GREEN:    (192 passed)
RED:      routes partial work to a continuation for the same role -> rule is not a function (exported),
          then expected { … } to equal { tasks: [ continuation ], reason: partial }
GREEN:    (193 passed)
RED:      marks a continuation, and reads it back -> expected labels to include 'continuation'
GREEN:    (107 passed)
RED:      writeScope is the role's write place -> expected ''
GREEN:    (194 passed)
RED:      prepare also fetches a continuation's own place -> paths without src/
GREEN:    (45 passed)
RED:      a continuation's session may read its own place / its record says so (two at once)
GREEN:    (47 passed)
RED:      a continuation does not climb out of its own place -> expected 'allowed' not to be
RED:      (core) a continuation reads its own place, and no path that climbs out
GREEN:    (195 core; 48 CLI)

---

## 2026-10-23: The CLI says how a claim went

- `anarres claim` now waits, up to a minute and a half, for Divlab's run, and says how the claim
  went: the member holds it, someone else does, Divlab has not answered yet, or it is no task. It
  reads only what Divlab sets on the task, its claimed label and assignee, never the text of
  replies, which anyone could write.

RED:      held when Divlab gave the task to the member -> expected '' to be 'You hold ledger#4…'
GREEN:    (hard-coded)
RED:      someone else holds it / not yet / no task (three rows)
GREEN:    (44 passed); the someone-else wording changed in the test first, then the code

---

## 2026-10-23: The read-scope hook

- The plugin now declares a PreToolUse hook on Claude's file tools, run by the bundled CLI. In a
  task's folder (found from the session's working folder upward, by the record `prepare` now
  leaves there), it refuses a read outside the role's read scope, a write outside its write
  scope, and any file or search outside the folder, in the JSON form Claude Code documents so
  Claude sees why. A folder whose record cannot be read is refused entirely: the hook fails
  closed. Outside any task folder it says nothing. Tried by hand with the bundle.
- Its limit, from Claude Code's documentation: a hook on the file tools does not see a file read
  through Bash, or one the member names with `@`. It keeps an honest session to its inputs; the
  sandbox and permission rules (concept §10) are what enforce it. On the test list.
- The hook's format was checked against Claude Code's documentation first.

RED:      lets the session read a file its role may read -> expected { refused: '' } to be 'allowed'
GREEN:    (hard-coded)
RED:      refuses a file its role may not read, saying why -> expected 'allowed'
GREEN:    (25 passed)
RED:      refuses the member's own files / a folder that only starts like the task's
GREEN:    (27 passed)
RED:      writes where its role writes, not where it only reads -> wrong decision
GREEN:    (28 passed)
RED:      denies a Read outside the scope, giving Claude the reason -> expected undefined
GREEN:    (29 passed)
RED:      judges a Write / an Edit as a write
GREEN:    (31 passed)
RED:      lets a search of the task's folder go ahead -> denied
GREEN:    (34 passed)
RED:      the record gives the task's role and module -> expected undefined
GREEN:    (38 passed)
RED:      the hook guards the file tools -> ENOENT (hooks.json)
GREEN:    (39 passed)
RED:      denies every call in a folder whose record cannot be read -> TypeError
GREEN:    (40 passed)

---

## 2026-10-23: Preparing a task

- `anarres prepare project#number`, for a task the member holds whose issue names the commit its
  inputs are read at, fetches exactly the places the task's role may read (core's `readScope`)
  as they were at that commit: a sparse checkout, one folder per task, made by git commands each
  run with its arguments and no shell. Otherwise it says why not: not a task, not held by the
  member, or no pinned commit. Tried by hand against this repository: only the listed folders
  arrived, at the commit given. The `next` skill may run it, and tells Claude to treat the files
  as data.

RED:      a role's read scope is listed for the CLI -> expected [] to equal [ …(2) ]
GREEN:    (191 passed)
RED:      fetches only the places the task's role may read, at its pinned commit -> expected { refused: '' }
GREEN:    (18 passed)
RED:      is refused for a task that is not one / someone else holds / nobody holds / has no pinned inputs
GREEN:    (22 passed)
RED:      a sparse checkout of only those places, at only that commit, without a shell -> expected []
GREEN:    (23 passed)
RED:      the skill may run next, claim and prepare -> expected two rules to be three
GREEN:    (474 passed; 92 scenarios)

---

## 2026-10-23: Two sandbox failures from 8df85b3, and their fixes

- The full sandbox run for 8df85b3 failed 5 of 80. One worker's Divlab run got a 502 from GitHub
  on its merge, failing its run; that worker's later scenarios were thrown off by it. Divlab
  now asks GitHub whether a merge it got a server error for happened after all, and carries on
  with its commit if so; if not, it fails as before.
- The scenario catching a change to main saw no alert, though it had passed alone. The kept
  repositories showed why: the driver went on as soon as Divlab recorded its decision, while
  Divlab's run was still writing; the scenario's direct change landed before Divlab's first check
  of main, which took it as the project's starting point. The sandbox driver now waits for each
  Divlab run to finish, marked by the record of how far it checked main that ends every run, and
  waits for GitHub's list of change alerts to show one for each direct change that took.
- (Before the setup records where checking starts, the same gap exists for real projects: a
  change made between setting up and Divlab's first run is not checked. On the test list.)

RED:      carries on with the merge's commit if GitHub merged it after all -> Error: answered 502
GREEN:    (105 passed); not merged still fails: passed first time, kept

---

## 2026-10-23: Read scopes, and tasks pinned to a commit

- Core holds the access matrix's read scopes beside its write scopes: each module role reads
  its own module's places and its requirement slice (taken as `programme/slices/<module>/`,
  mirroring `modules/<module>/`), never another module's and never a path that climbs out.
  Contracts wait for modules.yaml; a Research task's inputs, for its question.
- Divlab now posts each task with the commit its inputs are read at: the merge whose work decided
  it. The task's issue says so in words and in its decision block, read back only if it is a
  commit name, since anyone who can edit the issue can change its text.
- The read-scope table was written whole from the concept's matrix and pinned row by row (passed
  first time); the decision block's `try` was taken out to see its test fail, then put back.

RED:      Coding reads its module's specifications and tests, not its architecture
GREEN:    (18 passed)
RED:      Reviewer reads its slice, specifications and code, not its tests
GREEN:    (183 passed)
RED:      no role reads another module's place, nor climbs out of its own
GREEN:    (190 passed)
RED:      posts each task with the commit its inputs are pinned at -> expected [ undefined ] to equal [ 'm3rg3d' ]
GREEN:    (141 passed; two tests that pinned the posted task now expect its commit)
RED:      a task's issue says which commit its inputs are read at -> body without it
GREEN:    (101 passed)
RED:      reads back the commit, if it is a commit -> expected undefined
GREEN:    (103 passed)
RED:      reads no commit from an edited decision block -> SyntaxError
GREEN:    (104 passed; 92 scenarios)

---

## 2026-10-23: Claiming from the plugin

- `anarres claim project#number` posts Divlab's claim comment on the task's issue, as the member.
  The name is checked strictly first (a repository's name and an issue number GitHub could have
  given), since it comes from offers made of other people's data; a badly named task asks for
  nothing. The comment's text is Divlab's `CLAIM`, defined once. The `next` skill may now run
  `claim` too, and both drivers claim through the CLI, so the scenarios exercise what the plugin
  runs.
- Slip: the two claim tests went in together and failed together.

RED:      the task named project#number is that project and issue -> expected undefined to equal {…}
GREEN:    (1 passed)
RED:      is none for a fractional number / a non-repository project / two tasks / issue 0 (four rows)
GREEN:    (15 passed)
RED:      claiming asks Divlab for it / asks for nothing when badly named (two at once)
GREEN:    (17 passed)
RED:      a member's claim from their CLI is the claim comment Divlab reads -> expected [] to equal [ {…} ]
GREEN:    (438 passed)
RED:      the next skill may run next and claim -> expected the one rule to be two
GREEN:    (451 passed; 92 scenarios)

---

## 2026-10-23: The plugin's `/anarres:next`

- The plugin exists: `.claude-plugin/marketplace.json` makes this repository its marketplace
  (`/plugin marketplace add anarres-project/anarres`), and `plugin/` holds it. Its one skill,
  `next`, runs as `/anarres:next`: it may run exactly one command without asking, the CLI bundled
  inside the plugin, and it shows the offers as printed, treating them as data written by others.
- The plugin's format was checked against Claude Code's documentation first: skills are the
  current form for commands; an installed plugin is a copy of its own folder, so the CLI is
  bundled into `plugin/cli/` (not `plugin/bin/`, which claude.ai and Cowork would skip); CI
  checks the bundle matches its source.
- Tests hold the plugin's shape as the template tests hold the workflows'.

RED:      the plugin is listed by this repository's marketplace -> ENOENT
GREEN:    (1 passed)
RED:      it is named as the marketplace names it -> ENOENT
GREEN:    (2 passed)
RED:      its next skill may run one thing without asking -> ENOENT
GREEN:    (3 passed)
RED:      it carries the CLI it runs, bundled -> ENOENT
GREEN:    (442 passed; 92 scenarios)

---

## 2026-10-23: The `anarres next` command

- `packages/cli` has its command, `anarres next`: it reads GitHub with the member's own GitHub
  CLI login (never a token of Anarres's), finds the organisation's projects with work ready in
  one search of their issues, and lists the tasks the member may take, one to a line. It is
  bundled like Divlab, and CI checks both bundles match their source. Run against the sandbox as
  the second account, it listed the tasks of the full run then going.
- The finding-work scenario passed in the sandbox (63 requests), Alice's own account asking. Its
  first try failed on timing: the driver waited only for GitHub's search to see the project,
  which it did once an earlier task was indexed, before the newest was listed. It now also waits
  for the project's ready list to show every task the log says Divlab posted.
- The full sandbox run for 826cbed passed all 79 with the main check after every run, so the
  scenario catching a change runs there too.
- A first bundle failed at start-up: its banner's newline went in literally, hiding the `require`
  setup in the `#!` line. The `#!` line now starts `main.ts`, which esbuild keeps.

RED:      the offers name each task by its project, issue, role and module -> expected '' to be '…'
GREEN:    (3 passed)
RED:      say so when there is nothing the member may take -> expected '' to be 'No tasks you may take…'
GREEN:    (4 passed)
RED:      the projects with work ready are found in one search -> expected [] to equal [ 'ledger', 'atlas' ]
GREEN:    (97 passed)
RED:      a project's ready tasks are its open issues labelled ready -> expected [] to equal [ {…} ]
GREEN:    (98 passed)
RED:      the member a CLI acts for is the account GitHub says -> expected '' to be 'alice'
GREEN:    (430 passed)

---

## 2026-10-23: A member asks for work

- Section 5 begins. A new package, `packages/cli`, will hold the `anarres` CLI the plugin calls.
  Its first piece, `askForWork`, offers a member the ready tasks across Anarres's projects that
  they may take: their trust level, linked accounts and part in each project, from the
  governance file and each project's log.
- The rule for who may take a task was inside Divlab's `onClaim`; it is now Divlab's exported
  `eligibility`, which `onClaim` and the CLI both use, so it is stated once. A filter written in
  core for the same purpose a moment before was deleted, unused.
- The scenario runs in-process; the CLI's reading of GitHub is next.
- The sandbox run for 826cbed (the main check after every run): see the next entry.

RED:      (core) offers what the member may take -> expected [] to deeply equal [ … ] (later deleted)
GREEN:    (175 passed)
REFACTOR: eligibility(governance, events), extracted from onClaim (140 passed)
RED:      offers the ready tasks, across Anarres's projects, that the member may take
          -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (411 passed; the scenario passes in-process)

---

## 2026-10-23: Every change to main is checked

- Bernard chose (2026-10-23) for each Divlab run to check main's commits since its last look,
  over waking Divlab for every push. A commit is Divlab's if GitHub signed it as made by
  Divlab's App (its log writes: committed as `web-flow`, verified, author the App's account) or
  it is a merge Divlab recorded. Looking in the sandbox first showed why the record is needed: a
  merge's commit carries the member as its author, exactly as a person's merge through the
  website would.
- So Divlab records the commit each merge made (and, finishing an interrupted merge, asks
  GitHub for it). Each run checks the commits since its last check, records and alerts once any
  that are not Divlab's (an escalation labelled `change-not-by-divlab`), and records how far it
  checked. A project never checked starts from main as it stands. The template passes Divlab its
  App's slug; the Action runs the check after every run.
- The fake GitHub now has commits: Divlab's log writes, its merges (the member as author, signed
  by GitHub), and anyone else's. A guard scenario checks Divlab's own changes raise no alarm.
- Slips: the "(no account)" wording and some adapter stubs went in with their tests; the
  scenario that catches a change passed first time (built from the unit tests up).

RED:      records the commit its merge made -> expected { … } to match object { mergedAs }
GREEN:    (126 passed)
RED:      merging gives the commit GitHub's merge made -> expected undefined to be 'm3rg3d'
GREEN:    (403 passed)
RED:      records the commit of a merge it finishes after an interrupted run -> expected { … } to match { mergedAs }
GREEN:    (127 passed)
RED:      a merged pull request's commit is the one GitHub says its merge made -> expected '' to be 'm3rg3d'
GREEN:    (405 passed)
RED:      alerts PDC coordinators of a commit on main that Divlab did not make -> expected [] to equal [ {…} ]
GREEN:    (1 passed)
RED:      leaves alone a commit GitHub signed as made by Divlab's account -> expected [ {…} ] to equal []
GREEN:    (2 passed)
RED:      alerts a commit naming Divlab's account that GitHub did not sign -> expected [] to equal [ 'f0f0f0' ]
GREEN:    (3 passed)
RED:      leaves alone a merge Divlab recorded, though its commit carries the member as author
GREEN:    (4 passed)
RED:      records a change it did not make in the project's log -> expected [] to contain { … }
GREEN:    (132 passed)
RED:      alerts a change only once -> expected [ {…} ] to equal []
GREEN:    (133 passed)
RED:      records how far it checked -> expected [] to equal [ { mainChecked } ]
GREEN:    (134 passed)
RED:      checks only the commits since its last check -> expected [ undefined ] to equal [ 'b2' ]
GREEN:    (135 passed)
RED:      starts from main as it stands when it has never checked -> Error: Divlab should not have acted
GREEN:    (136 passed; the earlier check tests now start from a checkpoint, as they describe)
RED:      main's commits since the last check, with author and signer -> expected [] to equal [ … ]
GREEN:    (92 passed)
RED:      main's head is the one main's reference points to -> expected '' to be 'h3ad'
GREEN:    (93 passed)
RED:      reads back a record of a change not by Divlab / of how far Divlab checked -> cannot be read
GREEN:    (95 passed)
RED:      the alert names the commit and its author, quoted as text -> expected { title: '' … }
GREEN:    (96 passed)
RED:      tells Divlab its App's name -> expected undefined (four workflows)
GREEN:    (140 passed; 91 scenarios)

---

## 2026-10-23: Old claims do not win a freed task

- GitHub stops a public repository's scheduled runs after 60 days without activity, so a quiet
  project's hourly lease check could stop and a task whose lease ran out stay held. A claim on
  such a task now ends the lease there and then (recorded, freed, its member told) and goes on
  to give the task out. The lease arithmetic is shared with the hourly check.
- Building that found a bug: a free task goes to the earliest claim among its issue's comments,
  and those include old ones, so a task Alice gave back went straight back to Alice when anyone
  next claimed it, and claims refused while it was held could win it later. Only claims made
  since the task was last free now count: after its latest release or recorded lease end, or,
  for a lease ended by the claim itself, after the moment it ran out. Comments carry GitHub's
  time for this.
- Slip: the two scenarios (a task given back goes to whoever claims next; a run-out lease goes to
  a new claim without the hourly check) were written after the unit tests; with the fake's
  comments untimed they failed, as the bug did, and pass with times.

RED:      gives a task whose lease has run out to a new claim, without waiting for the hourly check
          -> Error: Divlab should not have acted (it refused Bob: the task still looked held)
GREEN:    (123 passed)
REFACTOR: leasesFrom and endLease, shared with the hourly check
RED:      gives a task a member gave back to a claim made since, not to its old claims
          -> Error: Divlab should not have acted (Alice regained it, Carol was refused)
GREEN:    (124 passed)
RED:      gives a task freed by the hourly lease check to a claim made since (the line taken back out
          to show it) -> Error: Divlab should not have acted
GREEN:    (125 passed)
RED:      a task's comments are read with when each was made -> expected [ { member, text } ] to equal [ { …at } ]
GREEN:    (89 passed; 89 scenarios)

---

## 2026-10-23: Two members and trust levels in the sandbox

- Bernard approved the second account's token in the sandbox organisation: the 403s were the
  organisation waiting to approve it. The seven scenarios needing it then passed in the sandbox
  (300 requests): claiming, the claim record, giving a task back, the draft, a new member
  refused a Reviewer task, an established member given one, and linked accounts as one member.
  They run there now. Three scenarios have three members and wait for a third account.
- The full sandbox run for 46cb1c2 passed all 78, the `@governance` scenarios one at a time
  across the four workers.

---

## 2026-10-23: The sandbox's governance file

- `anarres-sandbox/governance` holds the sandbox's governance file, empty to start (created with
  the sandbox token, Bernard agreeing); Bernard adds the organisation variable naming it.
- The sandbox driver records trust levels and linked accounts there, for the account playing the
  member. Trust belongs to an account the four workers share, so scenarios that set it are
  tagged `@governance` and run one at a time (Cucumber's `atMostOnePicklePerTag`), and each
  takes out what it recorded when it ends.
- With the variable set, "a member who wrote a module's code cannot review it" passed in the
  sandbox, Alice made established in the sandbox's file, so it runs there. The scenarios needing
  the second account still fail at its first write (403 "Resource not accessible by personal
  access token"); Bernard to check the token's approval, then the organisation's base permission.

---

## 2026-10-23: A second account plays a second member in the sandbox

- Bernard made a second GitHub account, `anarres-sandbox-member-b`, a member of the sandbox
  organisation, with a token that may only comment and open pull requests there. The sandbox
  driver now gives each scenario member an account as they first act: the sandbox's own, then
  the second. Claims, releases and a member's pull requests are made as that member's account,
  and Divlab's replies, assignees and claim records are mapped back by account name.
- Scenarios with two members come back to the sandbox once each has passed there: claiming,
  the claim record, giving a task back, the draft. Three have three members (whoever did the
  earlier work, Alice and Bob) and wait for a third account.
- The write-scope scenario passed in the sandbox, so it runs there. The two-member scenarios
  failed at the second account's first comment: GitHub answered 403 "Resource not accessible by
  personal access token", though the account can read the repositories; most likely the
  organisation is waiting to approve the token (Bernard to check).
- Correction: the commits held for the allowance's reset at 10:39 were not pushed then, as said;
  they go out with this one.

---

## 2026-10-23: Windows line endings

- A feedback signal written with Windows line endings was unreadable: its first line was "---"
  and a carriage return. Lines now end at a line feed with or without one.

RED:      reads a signal written with Windows line endings the same -> expected { unreadable } to equal { … }
GREEN:    (174 passed)

---

## 2026-10-23: Each role writes only its own place

- Divlab merged whatever files a pull request held, so a member's work could have changed
  anything in the project, Divlab's own workflows included. Core now holds the access matrix's
  write scopes (concept §6), once: each module role writes its own folder in its own module,
  the Programme Architect `programme/`, Research `research-briefs/`, and every role one feedback
  signal. Divlab refuses work that changes anything else before recording or merging it, naming
  the paths. A path with an empty, `.` or `..` part, or a backslash, is outside every scope.
- Work naming a role Anarres does not have is refused, saying so (it would have crashed the
  scope check, and before that been routed as the start of a pipeline).
- The scenarios can now give work files besides its signal (`workFiles`), in both drivers.
- The write-scope table was written whole from the concept's matrix, then pinned row by row
  (passed first time).

RED:      does not let Coding change its module's tests -> expected [] to deeply equal [ Array(1) ]
GREEN:    (hard-coded)
RED:      lets work add its one feedback signal -> expected [ 'feedback/FB-7.md' ] to deeply equal []
GREEN:    (2 passed)
RED:      does not let work change a second feedback signal -> expected [] to deeply equal [ 'feedback/FB-3.md' ]
GREEN:    (3 passed)
RED:      lets Specification change its module's specifications, and not its code -> wrong paths
GREEN:    (4 passed; 13 with every role pinned)
RED:      counts as outside a path that climbs out / names its place oddly / has an empty part / uses
          the other slash -> (four rows) expected [] to deeply equal [ path ]
GREEN:    (173 passed; core branches 100%)
RED:      does not merge work that changes files outside its role's place, and names them
          -> Error: Divlab should not have acted
GREEN:    (121 passed)
RED:      does not merge work from a role Anarres does not have, and says so
          -> TypeError: WRITE_SCOPES[role] is not a function
GREEN:    (122 passed; 86 scenarios)

---

## 2026-10-23: Linked accounts are one member

- The governance file lists a member's linked accounts under them. Core's `memberFor` gives the
  member an account belongs to, reading the file as data (an account nobody links is itself).
  Divlab resolves every account to its member before applying any rule, so a linked account
  shares its member's trust level and history.
- CI checks the governance file links each account to one member at most (seen failing on an
  account linked twice).

RED:      is the member a PDC coordinator linked it to -> expected 'alice-2' to be 'alice'
GREEN:    (17 passed)
RED:      is the account itself when … (four rows) -> TypeError
GREEN:    (156 passed)
RED:      treats an account a PDC coordinator linked to a member as that member
          -> refused as new, not for one role per module
GREEN:    (119 passed; 86 scenarios)

---

## 2026-10-23: Trust levels

- Core holds what each trust level may take, each role's lowest level stated once, and reads a
  member's level from the governance file as data: a member it does not list, a level Anarres
  does not have, a malformed or missing file all mean *new*. The trust check is part of
  `mayTake`, so core has one statement of who may take a task.
- Divlab reads the governance file when a member claims a task, through a new port, `Members`.
  The adapter reads `governance/members.json` from Anarres's repository unless the organisation's
  `ANARRES_GOVERNANCE` variable names another (the claim workflow passes it; nothing in a
  member's pull request reaches it). A file it cannot read gives nobody any trust.
- `governance/members.json` is in the repository, empty for now, with a README; CI checks every
  level in it, seen failing on a bad one.
- The scenario where Alice may not review her own code now makes her established first, or she
  would be refused as new rather than for the reason it is about.
- Slips: the role table was written whole from decision 0007, then pinned row by row (passed
  first time); the "a trusted member" wording was written with the first refusal, caught by the
  coverage gate, then tested (passed first time); the adapter's line for other GitHub errors was
  taken out, its test watched fail, and put back.

RED:      does not let a new member take a Reviewer task -> expected true to be false
GREEN:    (hard-coded)
RED:      lets a new member take a Coding task -> expected false to be true
GREEN:    (2 passed)
RED:      is the level PDC coordinators recorded for them -> expected 'new' to be 'established'
GREEN:    (11 passed)
RED:      is new for a level Anarres does not have / a file that is not what Divlab writes / no file
GREEN:    (148 passed)
RED:      is refused to a member whose trust level is too low for the role -> expected 'allowed' to equal { refused }
GREEN:    (149 passed)
RED:      refuses a member whose trust level is too low for the task, saying why
          -> (every claim test failed: Divlab still called mayTake without a level)
GREEN:    (116 passed)
RED:      is read from Anarres's own repository unless the organisation names another -> expected undefined
GREEN:    (84 passed)
RED:      is nothing when there is no such file -> Error: GitHub GET … answered 404
GREEN:    (85 passed)
RED:      fails, saying what GitHub answered, when GitHub will not give it -> got 'The first argument must be…'
GREEN:    (86 passed)
RED:      is nothing when the file is not JSON -> SyntaxError
GREEN:    (87 passed)
RED:      is read from the repository the organisation names instead -> expected undefined
GREEN:    (88 passed)
RED:      tells Divlab where the organisation keeps its governance file -> expected undefined
GREEN:    (117 passed; 85 scenarios)

---

## 2026-10-23: The eligibility scenarios run in the sandbox

- The sandbox driver's claim waited only for the task to show as claimed, so a claim Divlab
  refused timed out. It now ends on Divlab's reply too. The three eligibility scenarios passed in
  the sandbox (two at 80 requests, after one at 331 that showed the gap), so they run in both.
- Bernard settled trust levels (decision 0007, concept §11): new members take Specification,
  Test, Coding and Research; established add Architecture and Reviewer; trusted add Security &
  Quality and Programme Architect; every module counts as low-risk until risk can be marked; the
  governance file also records linked accounts; the sandbox reads a file of its own, named only
  by its organisation's settings.

---

## 2026-10-23: The earliest allowed claim wins

- If the earliest claim on a free task came from a member the rules bar, a later member's run
  refused the later member with the earlier one's reason, and nobody got the task. Divlab now
  judges the member asking first (barred: told why), then gives a free task to the earliest claim
  that is allowed.
- Slip: a local sandbox run started before the commit it tests was pushed, so GitHub could not
  find that version of Divlab (73 requests, no result). Pushed first from now on, as
  `docs/SANDBOX.md` says; and a run of chosen scenarios is named with `--name`, since a file path
  is added to the configured paths, not put in their place (one such run started every scenario).

RED:      gives the task to the earliest claim that is allowed, passing over one that is not
          -> Error: Divlab should not have acted
GREEN:    (115 passed)
REFACTOR: onClaim judges the asker, then the claimants in order

---

## 2026-10-23: A task a member holds counts towards their role

- A claim now records the role and module of its task, so the log alone says which tasks a
  member holds. Their part in a module is their merged work and the tasks whose latest claim is
  theirs and was neither given back nor ran out.
- A claim record's role is checked when read back, since the log can be edited: one naming a role
  Anarres does not have is refused. `isRole` is core's, used wherever a role is read from outside.
- Slip: the lines dropping a given-back or run-out claim were written before their test; taken
  out, both rows failed for the right reason, and they went back.

RED:      refuses a member who holds a task in the module in another role
          -> Error: Divlab should not have acted (it granted the claim)
GREEN:    (112 passed; the claim record's test now expects its role and module)
RED:      does not count a task the member gave back / let run out -> Error: Divlab should not have acted
GREEN:    (324 passed)
RED:      is refused, saying why, when a claim names a role Anarres does not have -> expected to throw
GREEN:    (325 passed)
RED:      is for a role Anarres has -> expected false to be true
GREEN:    (hard-coded)
RED:      is not for "bystander" / 12 / "toString" -> expected true to be false
GREEN:    (329 passed)
REFACTOR: isRole in both places the representation reads a role

---

## 2026-10-23: One role per module

- Bernard settled what the conflict-of-interest rules mean (decision 0007, concept §6 updated): a
  member takes one role in a module for its whole life; their merged work and any task they hold
  count; revising their own role's work is allowed; Research is not a role in a module; trust
  levels will live in a file in `governance/`.
- Core decides it (`mayTake`). Divlab now records who did each piece of merged work, the pull
  request's author, in the about-to-merge record and the decision, so an interrupted merge keeps
  it too. When it gives a free task to a member, it checks the rule against the log and refuses,
  saying why, if the member has worked on the module in another role.
- A task is now only an issue naming a role Anarres has and a module: anyone who triages can
  change labels.
- The scenarios had cast one member twice: unnamed work was done by the DSL's default member,
  "alice", the same member as the scenarios' Alice, so the rule refused her claims. The default
  member is now "someone". One scenario ("give a task back early") had passed for nothing, its
  claim refused unnoticed: a Given that a member has claimed a task now checks the claim took.
- In the sandbox one account plays every member, so scenarios with two members cannot run there
  until a second account exists; the claiming, giving-back, claim-record and draft scenarios are
  tagged again. The sandbox driver now reads Divlab's replies on tasks, for the one-member
  eligibility scenarios.
- "A member may revise work in their own role" passed first time: nothing refused anything yet.
  Kept as a guard against the rule reaching too far.
- Slip: two table tests failed several rows at once (the label checks).

RED:      is refused to a member who has done other work in the module -> expected 'allowed' to deeply equal { refused }
GREEN:    (hard-coded on any part)
RED:      is allowed when the other work in the module is someone else's -> expected { refused } to be 'allowed'
GREEN:    (2 passed)
RED:      is allowed when the member's other work is on another module -> expected { refused } to be 'allowed'
GREEN:    (3 passed)
RED:      is allowed for more work in the member's own role -> expected { refused } to be 'allowed'
GREEN:    (4 passed)
RED:      is allowed for Research, which is not a role in the module -> expected { refused } to be 'allowed'
GREEN:    (5 passed)
RED:      is allowed after Research on the module -> expected { refused } to be 'allowed'
GREEN:    (128 passed)
REFACTOR: isRoleInModule, one statement of what Research is
RED:      records who did the work in its decision -> expected { … } to match object { member: 'alice' }
GREEN:    (109 passed)
RED:      keeps who did the work when it finishes an interrupted merge -> expected { … } to match object { member }
GREEN:    (110 passed)
RED:      records that it is about to merge, with the work and who did it -> deep equality failed
GREEN:    (316 passed)
RED:      refuses a member who has done other work in the module, saying why
          -> expected [ [ {…} ], [] ] to deeply equal [ [], [ {…} ] ]
GREEN:    (111 passed)
RED:      reads back the role and module a task is for -> expected {} to match object { role, module }
GREEN:    (318 passed); four tests that pinned the whole task now check what each was about
RED:      is no task when the issue names no role / a role Anarres does not have / no module
          -> expected {…} to be undefined
GREEN:    (321 passed; 83 scenarios)

---

## 2026-10-23: Two small gaps in claims and leases

- A comment by a deleted account comes from GitHub with no user, and reading the task's comments
  failed on it. It is now left out: such a claim can win nothing.
- A lease whose start cannot be read (the log is files people can edit) compared as never
  running out, holding its task for ever. It now counts as run out.

RED:      leave out a comment whose account has been deleted
          -> TypeError: Cannot read properties of null (reading 'login')
GREEN:    (78 passed)
RED:      has run out if when it began cannot be read -> expected false to be true
GREEN:    (122 passed)

---

## 2026-10-23: Someone who does not hold a task cannot give it back, and is told

- A release from anyone but the task's holder now gets a reply saying only the holder can give it
  back. Claim refusals became refusals in general: Divlab words the whole reason, and the adapter
  addresses it to the member.
- The release scenario passed in the sandbox on its own (59 requests), so it runs in both. The
  full run for e237b29 passed all 70 with the sweep fix.
- The release fixture in the unit tests now lets a refusal happen, as the claim fixture does:
  the test it broke checks the task stays with its holder, which still holds.

RED:      (acceptance) Bob is told only the member holding the task can give it back -> AssertionError
RED:      tells someone who asks to give back a task they do not hold that only its holder can
          -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (319 passed; 80 scenarios)
REFACTOR: refuseClaim became refuseMember, its reasons whole sentences

---

## 2026-10-23: A member is told their lease ran out

- When Divlab frees a task whose lease ran out, it replies on the task to the member who held it.
  The message gives the lease's length from core, not a second copy of the number.
- Slip: driven from the unit tests first; the acceptance scenario's new step was added after, and
  watched fail on its assertion (the fake told nobody) before the fake kept the message.

RED:      tells the member their lease ran out, on the task -> expected [] to deeply equal [ {…} ]
GREEN:    (107 passed)
RED:      replies on the task's issue to the member, saying the task is ready again
          -> expected [] to deeply equal [ Array(1) ]
GREEN:    (305 passed)
RED:      (acceptance) Alice is told the lease on the task ran out -> AssertionError: expected [ 'alice-s…' ], got []
GREEN:    (80 scenarios passed)

---

## 2026-10-23: A member gives a task back

- A member holding a task comments `/release` on it; Divlab records the release and makes the
  task ready again. A release from anyone but the holder changes nothing. The comment is read as
  a claim is, exactly the command, on a task, from a named commenter.
- The sandbox sweep: all four workers sweep as a run starts, and once a failed run had left
  repositories, they deleted the same ones at once; GitHub answered 409 to all but one, failing
  every worker's setup (e71e805). A 409 or 404 now counts as swept (e237b29, committed on its
  own ahead of this).
- Slip: the sweep's 204 and 404 rows were one table, so two rows failed at once.

RED:      acts on a release when a member comments to give a task back
          -> expected { nothing: true } to deeply equal { release: … }
GREEN:    (103 passed)
RED:      makes the task ready again when the member holding it gives it back -> expected [] to deeply equal [ '12' ]
GREEN:    (104 passed)
RED:      leaves the task with its holder when someone else asks to give it back
          -> expected [ '12' ] to deeply equal []
GREEN:    (105 passed)
RED:      records that the member gave the task back, and when, before the board shows it
          -> expected [ [ 'released' ], [] ] to deeply equal [ [ 'recorded', 'released' ], …(1) ]
GREEN:    (106 passed)
RED:      reads back a record that a member gave a task back -> Error: The event file cannot be read
GREEN:    (303 passed)
RED:      the sweep is done when GitHub says another operation is deleting it -> expected false to be true
GREEN:    (hard-coded on 409)
RED:      is done when GitHub answers 204 / 404 -> expected false to be true (two rows)
GREEN:    (6 passed); refusing (403) is not done: passed first time, kept

---

## 2026-10-23: Draft work renews the lease

- Divlab merged a draft like any other pull request, though a draft is the member saying the work
  is not finished. Now it never merges one. A draft whose feedback signal names a task the
  draft's author holds is recorded as activity on that task, and a lease runs from the latest
  activity by its holder. A draft with no signal yet is passed over in silence. The pull request
  workflow now also runs when a draft is marked ready, which by default it did not.
- `PullRequests.head` became `pullRequest`: the head, the draft flag and the author from one read
  of GitHub, not three.
- `signalOf` now names only the kinds of event that carry a feedback signal, so a new kind is about
  none by default: three kinds in a row had needed a test to stop them crashing it.
- The sandbox runs: 88d9088 passed all 69. f7a16eb failed 8, all in one worker whose fork GitHub
  then reported as an empty repository, while GitHub was answering requests with 504s. Not
  Anarres; on the test list in case it recurs.
- The draft scenario passed in the sandbox on its own (66 requests), so it runs in both.
- The sandbox runs for 32f814a and 98e136e were refused scenario by scenario by the allowance
  check: GitHub's hourly 5,000 had gone. Pushing every commit started more full runs (about 2,200
  requests each) than an hour holds, on top of single-scenario runs and watching. So pushes are
  spaced now: at most two full sandbox runs an hour.
- Slip: the lease check's member test on activity was written before its test; taken out, the
  test failed for the right reason, and it went back.

RED:      does not merge a draft: its member has not finished the work -> expected [ '7' ] to deeply equal []
GREEN:    (95 passed)
RED:      records a draft from the member holding its task as activity on the task
          -> expected [] to deeply equal [ { project: 'ledger', …(2) } ]
GREEN:    (96 passed)
RED:      reads past activity on tasks in the log -> TypeError: Cannot read properties of undefined
GREEN:    (97 passed)
REFACTOR: signalOf names only the kinds with a signal; the "reads past" tests are one table
RED:      records no activity for a draft from someone who does not hold its task
          -> expected [ {…} ] to deeply equal []
GREEN:    (98 passed)
          A draft with no feedback signal yet: passed first time (its early return came with the
          first draft test, for the types); kept as a regression test.
RED:      judges a lease by the latest activity on its task, such as draft work
          -> expected [ '12' ] to deeply equal []
GREEN:    (100 passed)
RED:      renews a lease only with activity by the member holding it -> expected [] to deeply equal [ '12' ]
GREEN:    (101 passed)
REFACTOR: PullRequests.pullRequest, one read for head, draft and author
RED:      is read as the commit it is at, whether it is a draft, and who opened it
          -> expected { …draft: false… } to deeply equal { …draft: true… }
GREEN:    (296 passed)
RED:      reads back a record of activity on a task -> Error: The event file cannot be read
GREEN:    (297 passed)
REFACTOR: claims, leases and activity share one check when read back
RED:      runs when a member marks a draft ready, as well as when work is opened or pushed to
          -> TypeError: Cannot read properties of null (reading 'types')
GREEN:    (102 passed)

---

## 2026-10-23: Leases run out

- A lease runs out 24 hours after the last activity on its task: today that is the claim, until
  draft work counts as activity (next). The 24 hours are core's, defined once; at exactly 24 hours
  the lease has run out.
- A new template workflow runs Divlab every hour, at 17 minutes past (GitHub may delay or drop
  scheduled runs at the start of the hour). Divlab reads the log for each task's latest claim,
  and where that lease has run out and its member still holds the task, records that the lease
  ran out and makes the task ready again, assigned to nobody. A task whose work is done, or that
  has been claimed since, by anyone, is left alone.
- The lease record, like the claim record, is about no feedback signal; Divlab and the adapter
  read past it, each shown failing first.
- The in-process driver's clock now moves when a scenario says time passes; before, every run
  used one fixed time. The sandbox cannot move GitHub's clock, so both lease scenarios are
  `@sandbox-wip`.
- Template tests: the check that each workflow waits its turn with the others moved into the
  checks every Divlab workflow shares (group and no cancelling, as comparing with the push
  workflow had checked).
- Slip: `signalOf`'s new branch was written before a test asked for it; taken out, its test failed
  for the right reason, and it went back.

RED:      has run out 25 hours after the last activity on its task -> expected false to be true
GREEN:    (hard-coded)
RED:      still holds 23 hours after the last activity -> expected true to be false
GREEN:    (120 passed)
RED:      has run out at exactly 24 hours: that is when it expires -> expected false to be true
GREEN:    (121 passed)
RED:      makes a task ready again when its lease has run out -> expected [] to deeply equal [ '12' ]
GREEN:    (1 passed)
RED:      leaves alone a task the claim no longer holds, such as one whose work is done
          -> expected [ '12' ] to deeply equal []
GREEN:    (2 passed)
RED:      leaves alone a task another member has claimed since -> expected [ '12' ] to deeply equal []
GREEN:    (3 passed)
RED:      judges a task's lease by its latest claim, so a member who claimed again keeps it
          -> expected [ '12' ] to deeply equal []
GREEN:    (83 passed)
REFACTOR: each task's latest claim is found first, then judged
RED:      records that the lease ran out, and when it found it had, before the board shows it
          -> expected [ [ 'released' ], [] ] to deeply equal [ [ 'recorded', 'released' ], …(1) ]
GREEN:    (84 passed)
RED:      reads past leases that ran out in the log -> TypeError: Cannot read properties of undefined
GREEN:    (85 passed)
RED:      labels its issue ready instead of claimed, and assigns it to nobody
          -> expected [] to deeply equal [ { …(2) } ]
GREEN:    (72 passed)
RED:      reads back a record that a member's lease ran out
          -> Error: The event file cannot be read: it is not a routing record
GREEN:    (279 passed)
RED:      checks the project's leases when its schedule comes round
          -> Error: Divlab does not act on schedule events
GREEN:    (86 passed)
RED:      the lease workflow runs every hour, and on nothing else
          -> expected { schedule: [ { cron: '0 * * * *' } ] } to deeply equal { Object (schedule) }
GREEN:    (92 passed)
REFACTOR: the template's shared workflow checks include waiting a turn

---

## 2026-10-23: Claims are recorded

- Divlab records each claim it grants in the project's log, with when by its clock, before the
  board shows it, as it records a routing decision before acting on it.
- A claim is about no feedback signal, and the log's readers took every event to be about one: a
  claim in the log would have crashed the next run on a push (in Divlab) and been refused as
  unreadable (in the adapter). Both now read past it, each driven by a failing test first.
- It passed in-process, then in the sandbox on its own (48 requests), so it runs in both.
- The sandbox run for 9c59aef failed one scenario of 67, in escalation: after the fourth re-run a
  Coding task still showed as ready. The run for c48cb7f then failed two (both rows of "a failed
  review or security check sends the code back to Coding", in two workers, in the same minute):
  the Coding task was not listed. Its kept repository shows Divlab posted it correctly and every
  Divlab run succeeded; GitHub's ready list had not shown it within the driver's 30-second wait.
  So the driver now waits up to two minutes for the lists, polling every two seconds instead of
  every half second, so the longer wait costs no more requests.

RED:      records the claim it grants, saying when by its clock -> expected [] to deeply equal [ {…} ]
GREEN:    (78 passed)
RED:      reads past the claims in the log, which are about no feedback signal
          -> TypeError: Cannot read properties of undefined (reading 'feedbackSignal')
GREEN:    (79 passed)
RED:      reads back a record of a claim Divlab granted
          -> Error: The event file cannot be read: it is not a routing record
GREEN:    (268 passed)

---

## 2026-10-23: Only a task is a task

- Divlab asked the board for "the task" an issue number names, and the adapter answered for any
  issue in the project: an alert, a finished task, anyone's own issue. So a claim on an alert
  would have marked it claimed, and, older than claiming, work whose feedback signal named any
  issue as its task closed that issue once merged. An issue is now a task only while it is open
  and carries Divlab's ready or claimed label. A claim on anything else is refused, saying it is
  not a task anyone can claim; merged work that names something else is routed as usual but
  closes nothing, and its record names no task. Refusing such work outright is section 4's.
- Covered by unit tests only, for now: the scenarios cannot yet name an alert or a finished task
  as the thing claimed or worked on (on the test list).

RED:      is no task when the issue is an alert to PDC coordinators -> expected {} to be undefined
GREEN:    (262 passed)
RED:      is no task when the task's issue has been closed: it is done -> expected {} to be undefined
GREEN:    (263 passed)
RED:      refuses a claim on something that is not a task, such as an alert or a finished task
          -> expected [ [ {…} ], [] ] to deeply equal [ [], [ {…} ] ]
GREEN:    (76 passed)
RED:      never closes an issue the work names that is not a task, such as an alert
          -> expected [ '3' ] to deeply equal []
GREEN:    (265 passed)

---

## 2026-10-23: The first claim made wins

- Divlab's runs for a project go one at a time, but GitHub need not start them in the order the
  comments were made. So Divlab does not trust the order it hears of claims in: a claim's run
  reads the task's comments, and if nobody holds the task, gives it to the earliest claim there.
  Any earlier claim already exists when a later claim's run starts, so the outcome does not hang
  on which run comes first. Each member whose claim lost is told by their own claim's run; a
  member given the task by an earlier run is left alone when their own run comes.
- What counts as a claim is defined once (`isClaim`), for the event and for the comments.
- If GitHub's comment list does not show a claim yet, the member who asked gets the task. The
  fallback was written for the types before a test asked for it; its test passed first time.
- The sandbox driver cannot play two members, so this scenario is `@sandbox-wip` too.

RED:      gives the task to the member who claimed it first, even when it hears a later claim first
          -> expected [ { …member: 'bob' } ] to deeply equal [ { …member: 'alice' } ]
GREEN:    (72 passed)
          (the test's board was first given only the earlier claim's comment; it now lists every
          claim on the issue, as GitHub would, before any code was written)
RED:      tells a member whose claim came second, though heard first, that it has already been
          claimed -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (74 passed)
RED:      leaves alone a member's claim on a task already given to them, as a later run finds it
          -> expected [ [], [ {…} ] ] to deeply equal [ [], [] ]
GREEN:    (75 passed)
REFACTOR: onClaim finds the holder, giving the task to the first claim if nobody holds it, then
          tells anyone else
RED:      a task's comments are read earliest first, each with who made it
          -> expected [] to deeply equal [ { member: 'alice', …(1) }, …(1) ]
GREEN:    (67 passed)
RED:      are read from every page, so no claim is missed on a busy task
          -> expected a length of 150 but got 100
GREEN:    (68 passed)

---

## 2026-10-23: A claimed task stays with its holder

- Assigning an issue replaces its assignees, so a second claim would have taken the task. Divlab
  now reads who holds the task first; if someone does, it leaves the task with them and replies
  on the task's issue to the other member that it has already been claimed.
- Who holds a task is read from the issue: its assignee, but only while Divlab's claimed label is
  on it, since anyone who triages can assign a ready task.
- The harness: the in-process driver finds a task to claim among claimed tasks too, as a member
  can still comment on a claimed task's issue. The sandbox has one account playing every member,
  so it cannot show two members; its driver says so (`HarnessNotYetBuilt`) and the scenario is
  tagged `@sandbox-wip` until there is a second account.
- Slips: the first test of the taken-task check passed only once the claimed-label check was
  taken back out; it had been written before a test asked for it, and its test then failed for
  the right reason. The refusal adapter test and its empty stub went in one step again.

RED:      leaves a task another member holds with them -> expected [ { … } ] to deeply equal []
GREEN:    (70 passed)
RED:      tells a member who claims a task another member holds that it has already been claimed
          -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (71 passed)
RED:      reads back who holds a claimed task -> expected {} to deeply equal { claimedBy: 'alice' }
GREEN:    (64 passed)
RED:      reads a ready task as held by nobody, even if someone has been assigned it
          -> expected { claimedBy: 'carol' } to deeply equal {}
GREEN:    (65 passed)
RED:      replies on the task's issue to the member, saying why -> expected [] to deeply equal [ Array(1) ]
GREEN:    (66 passed)
REFACTOR: the claim refusal's wording lives with the pull request refusal's, in the representation

---

## 2026-10-23: A member claims a task

- Section 2 starts. A member claims a ready task by commenting `/claim` on it, as the concept
  document has it (§8). A new template workflow runs Divlab on each new comment; Divlab reads the
  comment from the event as data, and acts only on a comment that is exactly a claim, on a task
  rather than a pull request, from a named commenter. Divlab marks the task claimed instead of
  ready and assigns it to the member: GitHub lets an issue be assigned to anyone who has
  commented on it, so strangers can claim (GitHub Docs, "Assigning issues and pull requests to
  other GitHub users").
- A claimed task's issue no longer carries the ready label, so the board's fallback for decisions
  acted on would have missed it, and a re-run could have posted the task again. It now counts
  claimed tasks too.
- The scenario passed in-process, then in the sandbox on its own (about a minute, 50 requests),
  so it runs in both. The sandbox driver claims with the sandbox token: one account plays every
  member.
- Slip: the first `onClaim` test and its empty stub went in one step, so the missing-symbol
  failure was not shown before the stub; the assertion failure was.
- The test that used comments as its example of an event Divlab does not act on now uses
  discussions: that example stopped being true, not the behaviour.

RED:      marks the task claimed by the member who asked -> expected [] to deeply equal [ {…} ]
GREEN:    marks the task claimed by the member who asked (56 passed)
REFACTOR: none
RED:      labels its issue claimed instead of ready, and assigns it to the member
          -> expected [] to deeply equal [ { …(2) } ]
GREEN:    (62 passed)
REFACTOR: the ready label named once; labelsWhenClaimed
RED:      include the decision a claimed task came from -> expected [] to deeply equal [ 'feedback/FB-4.md' ]
GREEN:    (63 passed)
RED:      acts on a claim when a member comments to claim a task
          -> Error: Divlab does not act on issue_comment events
GREEN:    (57 passed)
RED:      does nothing for a comment that is not a claim -> expected { claim: … } to deeply equal { nothing: true }
GREEN:    (58 passed)
RED:      refuses a claim that does not name its task by a whole number -> expected [Function] to throw an error
GREEN:    (59 passed)
RED:      refuses a claim naming a task GitHub could not have numbered -> expected [Function] to throw an error
GREEN:    (60 passed)
REFACTOR: numberedByGitHub, one rule for pull requests and tasks
RED:      does nothing for a claim commented on a pull request, which is not a task
          -> expected { claim: … } to deeply equal { nothing: true }
GREEN:    (61 passed)
RED:      refuses a claim that does not say who commented
          -> got 'Cannot read properties of undefined (…'
GREEN:    (62 passed)
RED:      runs when someone comments on one of the project's issues, and on nothing else
          -> expected undefined to deeply equal { Object (issue_comment) }
GREEN:    (68 passed)
          The claim workflow waits its turn with the other Divlab runs: passed first time, since
          the workflow's shared shape was written with the file; kept as a regression test.

---

## 2026-10-22: One read of the log per pull request

- Divlab wrote its merge record before reading the log, so the adapter listed the log to number
  it (two requests more), and routing read the whole log again after. A pull request's run now
  reads the log once, before recording anything, and routing reuses that history, adding each
  decision it records. Runs for a project go one at a time, so nothing else writes meanwhile.
- Slip: the line adding each decision to the run's history was written before a test asked for
  it; the test that does (two interrupted merges, the second escalating) passed first time and
  fails with the line taken out. Its first version named the impediment wrongly and failed for
  that reason, not the behaviour.

RED:      reads the project's log before recording anything, so each record costs one request
          -> expected 'append' to be 'read'
GREEN:    (53 passed)
RED:      reads the project's log once for a pull request, however much it records -> expected 2
          to be 1
GREEN:    (54 passed)
Passed first time: counts the decisions it records in a run when routing the next work in that
          run (see the slip)
REFACTOR: none

## 2026-10-22: The allowance checked for each scenario

- The check asked every sandbox run for a full run's 2,500 requests before starting, so a run of
  one scenario was stopped too. A worker cannot know how many scenarios it will be given, so each
  scenario now checks for room for itself (200 requests; a full run averages about 36) before it
  starts. A full run whose allowance runs out partway fails its remaining scenarios at once,
  saying when it resets; asking GitHub for the allowance costs nothing.
- One scenario in the sandbox at aebea07: passed, the check before it. Not a proof (GitHub's
  reading left room under the old check too, and went from 1,293 to 988 during the run).

RED:      is too little when less is left than a scenario needs, and says when it resets
          -> Received "...and a sandbox run needs about 200..."
GREEN:    (9 passed)
REFACTOR: none

## 2026-10-22: A re-run closes the task the work was for

- A run stopped after recording a decision left the task the work was for open, ready to claim
  though done. The routing record now keeps that task, and acting on a decision closes it before
  anything else, on the first run or a later one.

Acceptance: the task the work was for is closed by Divlab's next run, if it stopped first -> RED
          (not yet right): the Test task still ready beside the Coding task; GREEN in-process
          (@sandbox-wip, as the real Action cannot be stopped on cue).
RED:      records which task the work was for in its decision -> expected { project: 'ledger', …(4) }
          to match object { task: '3' }
GREEN:    (51 passed)
RED:      closes the task a recorded decision was for, when it acts on it later -> expected [] to
          deeply equal [ '3' ]
GREEN:    (52 passed)
REFACTOR: routing records and acts on one event; closing moved into acting on it

## 2026-10-22: Intermittent sandbox failures, kept for inspection

- Two CI sandbox runs failed in one worker's repository while the others passed: d5b1284 (its
  first four pull requests never decided) and 04d85ac (GitHub refused to show a pull request,
  "too many files changed", after which no task appeared in that repository). The same features
  at 04d85ac on demand: 32 of 32, all 82 of Divlab's runs successful. Not yet explained; both
  failures came with four workers at once.
- The repository was gone before anyone could look. A worker whose scenario failed now keeps
  its repositories and names them in the log; the sweep removes them after an hour.
- Slip: a local reproduction ran with an unpushed commit checked out, so Divlab could not be
  found at that version (SANDBOX.md says to push first): about 600 requests spent for nothing.
- dabca7f's CI sandbox run had been stopped by the allowance check, unnoticed at the time; its
  change passed in the next run (41f1897).
- The next CI run (3836c72, with the plain file names): 67 of 67 in 12 minutes, 2,284 requests.

## 2026-10-22: A feedback signal's file must be plainly named

- The file name after `feedback/` is the member's own text, and revision tasks wrote it into
  issues as it was. Divlab now refuses a pull request whose signal file is not plainly named
  (letters, digits and hyphens, directly in `feedback/`, ending `.md`), telling the member why.
  Capitals are allowed, unlike the signal's fields: a file name never becomes a label. The rule
  lives in core (`readSignalFile`), beside the signal's other rules.
- Harness fix on the way: in-process, merged work was found by its file's name, so a renamed
  file made "Divlab has not merged" pass whether or not it had; the scenarios' name for a signal
  now ignores the decoration, and the step went red as it should.
- Slip: the first pattern carried a length limit and rules for joining parts that no test asked
  for; cut back to what the tests demanded. Stryker then found the anchors untested: two cases
  added (passed first time), and the score is back to 100 (384 mutants).

Acceptance: work whose feedback signal's file is not named plainly is not merged -> RED (not yet
          right): "Divlab has not merged" failed, once the harness could see the merge; GREEN.
RED:      is a plainly named file in feedback/ -> not a function (then the stub) -> expected
          { unreadable: '' } to deeply equal { path: 'feedback/FB-1.md' }
GREEN:    (114 passed)
RED:      is unreadable when the file's name is more than a plain name -> expected { path: … }
GREEN:    (115 passed)
Passed first time: is unreadable when the file is in a folder within feedback/ (regression);
          the two anchor cases (added for Stryker)
RED:      (Divlab) does not merge work whose feedback signal's file is not plainly named, and says
          why -> Divlab should not have acted
GREEN:    (50 passed)
REFACTOR: none

## 2026-10-22: A decision recorded is acted on, once

- Divlab recorded each routing decision and then acted on it (a task, an alert, a finished
  module). A run stopped in between left the decision recorded but never acted on, and later runs
  skipped it as routed: the module stalled, with nobody told.
- Each issue Divlab posts now closes with a JSON block naming the decision it came from, and
  after acting Divlab records that it did (`actedOn`). A later run finds decisions with no such
  record, asks the board which it shows, records those, and acts on the rest. The board's lists
  lag behind writes (seen in the sandbox), so asking it after every merge would post tasks twice;
  the log is read whole and up to date, so it is asked only for decisions the log cannot confirm.
- Only issues carrying Divlab's labels count, since anyone may open an issue on a public
  repository but only those who triage can label one. A path with a newline or a fence stays
  inside the block (first design used a plain fenced line; two existing alert tests showed a path
  can hold a newline, and the format became JSON).
- Found on the way, a safety gap: a feedback signal's file name is the member's own text, and
  revision tasks write it into issues unquoted. On the test list as the next item.
- Closing the task the work was for is not finished on a re-run (the record lacks the task's id):
  on the test list.
- Slips: two failing tests written in one step (tasks and finished modules naming their decision);
  one older test's expected body changed in the same step as the production code.
- The first sandbox run with all of today's records (d5b1284) failed 4 of 66: one worker's first
  four pull requests were never decided within four minutes each, after which the same
  repository worked normally; the other workers passed. It did not happen again on demand (6 of 6).
  The repository was gone before it could be looked at, so the driver now says what state
  Divlab's runs were in when it gives up on a pull request.

Acceptance: a decision Divlab recorded but did not act on is acted on by its next run, once
          -> RED (not yet right): no task ready, expected one Test task; GREEN in-process (the
          sandbox cannot stop the real Action on cue: @sandbox-wip).
RED:      acts on a decision it recorded but never acted on -> expected [] to deeply equal
          [ { role: 'test', module: 'parser' } ]
GREEN:    (43 passed)
RED:      never acts twice on a decision: one the board shows it acted on is left alone
          -> expected [ { project: 'ledger', …(2) } ] to deeply equal []
GREEN:    (44 passed, after the shared board fixture gained `actedOn`, a separate step)
RED:      tells the board which decision each task / a finished module comes from (both at once,
          a slip) -> expected [ undefined ]; expected { …(1) } to deeply equal { …(2) }
GREEN:    (46 passed, after two tests comparing whole posted tasks were updated)
RED:      (adapter) is read back from a task's issue -> not a function (then the stub) -> expected
          undefined to be 'feedback/FB-1.md'
GREEN:    (54 passed, after the older task tests were given decisions)
RED:      is read back from a finished module's issue -> expected undefined
GREEN:    (55 passed)
RED:      is read back from a PDC coordinators' alert -> expected undefined; the first fix broke
          two alert tests, which showed paths may hold newlines: redesigned as a closing JSON block
GREEN:    (56 passed)
Passed first time: is read back whole, and stays inside its code block, whatever the path is
          called (regression for the redesign)
RED:      (adapter) are the decisions its tasks, alerts and finished modules came from -> not a
          function (then the stub) -> expected [] to deeply equal [ … ]
GREEN:    (58 passed)
RED:      are only those on issues Divlab posted, which carry its labels -> expected
          [ 'feedback/FB-3.md' ] to deeply equal []
GREEN:    (59 passed)
RED:      are read from every page of the project's issues -> got 100, expected 150
GREEN:    (60 passed)
RED:      records that it acted on its decision, once it has -> expected [ { … }, …(1) ] to deeply
          equal [ 'posted test', …(1) ]
GREEN:    (47 passed, after the time test looked for the routing record rather than the last event)
RED:      trusts its own record of having acted, never asking the board, whose lists lag
          -> Divlab should not have acted
GREEN:    (48 passed)
RED:      records having acted when the board shows it did, so it need not ask again -> expected []
GREEN:    (49 passed)
RED:      (adapter) reads back a record that Divlab acted on a decision -> cannot be read: it is
          not a routing record
GREEN:    (61 passed)
REFACTOR: acting on a decision moved out of routing into one helper, used by both

## 2026-10-22: Every event records its time

- Merge records and records of work not accepted now carry `decidedAt` too, from the same clock.
- An event's identifier is its sequence number (its file name), taken from the log, never from
  randomness or the clock, and unique because GitHub refuses a second file at a number: ticked,
  with nothing to inject.

RED:      records when it decided to merge, by its clock -> expected { project: 'ledger', …(1) } to
          match object { …(2) }
GREEN:    (41 passed, after the older test comparing the whole merge record expected the time,
          a separate step: the record now holds it)
RED:      records when it found work that reached main without it, by its clock -> expected
          [ { project: 'ledger', …(1) } ] to match object [ Array(1) ]
GREEN:    (42 passed, likewise for the two tests comparing the whole record)
REFACTOR: none

## 2026-10-22: Divlab records when it decided

- Each routing decision now records when Divlab made it, in UTC (`decidedAt`). Divlab takes its
  clock as a parameter: the Action passes the wall clock, the one place it is read; the
  in-process driver and unit tests pass a fixed time. Events from before have no time, so the
  field is optional when read back. Merges begun and work not accepted: on the test list.
- Section 0 is done apart from the log's read cost, deferred by Bernard until a real project
  nears a few thousand events. Two section 1 items were already done and are ticked: one file
  per event under `events/`, and several impediments making one revision task.

Acceptance: the record says when Divlab decided -> RED (not yet right): "expected the record to
          say when Divlab decided, as a UTC time"; GREEN in-process.
RED:      records when it decided, by its clock, in UTC -> expected { project: 'ledger', …(3) } to
          match object { decidedAt }
GREEN:    (40 passed, after the older tests' calls were given the fixed clock, a separate step)
REFACTOR: none

## 2026-10-22: Merge records read back through core

- An interrupted merge is routed from the work Divlab recorded as about to merge, so that work is
  now read back through core as well (`readMergedWork`), with the same check of role, module and
  verdict as a routing record's work, written once.
- The sandbox run for 586ab71 (the 500 retry and routing records through core): 65 of 65 in 10½
  minutes, 2,209 requests.
- Stryker on core: 373 mutants, all killed.

RED:      gives the work as Divlab recorded it -> not a function (then the stub) -> expected
          { unreadable: '' } to deeply equal { fromRole: 'test', …(3) }
GREEN:    (112 passed)
RED:      is unreadable when it gives no verdict, rather than routed as passed -> expected
          { fromRole: 'test', …(2) } to deeply equal { unreadable }
GREEN:    (113 passed)
REFACTOR: one check of the work's fields, shared by both readers
RED:      (adapter) is refused, saying why, when the work it was about to merge could not be
          routed -> expected [Function] to throw an error
GREEN:    (53 passed)

## 2026-10-22: A server error from GitHub is retried

- The sandbox run for f9be2f5 failed 1 of 65: GitHub answered 500 to a listing of ready tasks.
  The request helper retried a failing gateway (502, 503, 504) but not GitHub's own errors. A 500
  is now retried the same way, and still only for requests safe to repeat: a write GitHub may
  have carried out is never retried.

RED:      tries again shortly when GitHub fails with an error of its own -> expected undefined to
          be 2000
GREEN:    (52 passed)
REFACTOR: none

## 2026-10-22: Routing records read back through core

- Event files were checked only for the shape of a routing record. Routing's re-run count reads
  the work's role, module and verdict and the roles of the tasks decided; a record missing its
  verdict would have been taken as passed work, quietly resetting the count that escalates to a
  PDC coordinator. `readRoutingRecord` in core now checks what routing relies on, and the adapter
  refuses an event file it cannot read, so the log read fails rather than mislead.
- Slip: the reader's case for a decision with no tasks (an alert, a finished module) was written
  without a test asking for it; the coverage gate found it, and its test passed first time.
- Stryker on core: 369 mutants, all killed (93 in routing-record.ts).

RED:      gives the record as routing wrote it -> not a function (then the stub) -> expected
          { unreadable: '' } to deeply equal { …(3) }
GREEN:    (100 passed)
RED:      is unreadable when its work gives no verdict, rather than taken as passed
          -> expected { …(3) } to deeply equal { unreadable }
GREEN:    (101 passed)
RED:      is unreadable when its work gives no fromRole / module -> expected { …(3) } (both)
GREEN:    (103 passed)
RED:      is unreadable when a task it decided on names no role Anarres has -> expected { …(3) }
GREEN:    (104 passed)
RED:      is unreadable when it is not a routing record at all -> Cannot read properties of null
          (and of undefined; two gave the wrong reason)
GREEN:    (108 passed)
RED:      is unreadable when its decision's tasks are not a list of tasks -> decided.every is not a
          function; Cannot read properties of null
GREEN:    (110 passed)
Passed first time: gives a record whose decision was an alert, which has no tasks (see the slip)
RED:      (adapter) is refused, saying why, when its record is one routing could not rely on
          -> expected [Function] to throw an error
GREEN:    (51 passed)
REFACTOR: the adapter's own shape check gave way to core's reader

## 2026-10-22: Interrupted merges finished in merge order

- When a run finds merges Divlab began but did not route, it finished them in the order the
  feedback signals were listed (by name). It now follows Divlab's own records, in the order it
  merged; the tripwire then takes whatever on main it has no record of.
- With that, routing follows merge order everywhere: each merge is routed in the run that makes
  it, runs queue one at a time, and anything left over is finished in recorded order.

RED:      finishes interrupted merges in the order it merged them, not the order they are listed
          -> expected [ 'parser', 'lexer' ] to deeply equal [ 'lexer', 'parser' ]
GREEN:    (38 passed)
REFACTOR: none
Regression test, passed first time: never routes work it was about to merge but did not, whose
          signal is not on main (keeps what the listing loop did; fails with the check removed)

## 2026-10-22: No Divlab run is dropped

- Divlab's two workflows share a concurrency group per project, so its runs go one at a time.
  GitHub keeps at most one run waiting in a group and cancels any earlier waiting run when
  another arrives (its documentation), so work members submit at nearly the same time could be
  left unmerged with nobody told. The sandbox submitted one pull request at a time, so never saw
  it. `queue: max` keeps up to 100 waiting, in order.
- Slip: the template change came before the acceptance scenario. To keep the outer loop honest,
  the scenario was then run in the sandbox with the change set aside, and was red: one of three
  pull requests opened together was never decided (its run dropped). It failed in the When step,
  waiting past the step's limit, rather than in a Then.
- A sandbox run of one scenario was then stopped by the allowance check, which asks every run for
  a full run's 2,500 requests: on the test list.

Acceptance: work several members submit at once is all merged -> RED in the sandbox without
          `queue: max` (one run dropped: "Divlab neither merged nor refused pull request 2");
          GREEN in the sandbox with it (5 of 5 steps, 69 requests), and in-process.
RED:      keeps every run waiting its turn: none is dropped when members submit at once
          -> expected undefined to be 'max' (both workflows)
GREEN:    (37 passed)
REFACTOR: the sandbox driver's submission split into opening the pull request and awaiting
          Divlab's decision, shared by one submission and several at once

## 2026-10-22: The event log is never read in part

- GitHub lists a Git tree only in part past 100,000 entries, and says so. Read in part, the log
  would undercount re-runs and misnumber new events; with the repository's top level in part, it
  could even look empty. Either now fails the read, as a log GraphQL has not caught up with does.

RED:      is never read in part, when GitHub lists only part of it -> promise resolved
          "[ … 249 events ]" instead of rejecting
GREEN:    (49 passed)
RED:      is never taken to be empty, when GitHub lists the repository only in part
          -> promise resolved "[]" instead of rejecting
GREEN:    (50 passed)
REFACTOR: one helper reads a tree whole or fails, for both levels (written as the second fix)

## 2026-10-22: The sandbox run in parallel

- A run's time is Divlab's: 77 pull requests, each waiting for a real Divlab run of 25 to 30
  seconds, one after another. Polling less would save requests, not minutes.
- The scenarios now run in four Cucumber workers. Each worker is a process of its own, so each
  has its own repository (named after the run and the worker number); Divlab's runs queue only
  within a repository, so four go at once. Harness configuration, no behaviour: no test cycle.
- Locally, the project features: 4 of 4 in 1 minute 13 seconds (1 minute 48 one at a time); both
  sandbox organisations empty afterwards. Each worker prints its own request tally.
- In CI (aca7a1a): 64 of 64, the job in 11 minutes (42 before); 2,141 requests across the four
  workers (531, 523, 559, 528), the same as one at a time, spent in a quarter of the time.

## 2026-10-22: Divlab may check members' pull requests

- GitHub blocks `pull_request_target` on public repositories from 2 December 2026 (changelog,
  revised 21 October; a reference page still says 2 November) unless an Actions policy allows
  it. Bernard made an organisation policy in `anarres-sandbox`; GitHub warns that organisation
  policies are not enforced on the Free plan, and its insights need Enterprise.
- Probes in the sandbox: a repository policy can be made with the API on Free, and is enforced
  (a workflow outside its allowed events failed to start; the same workflow with the event
  allowed was queued). Reading or writing one needs administration (write).
- So `setUpProject` makes the policy, with the setting-up token; Divlab's App does not check it
  on its runs, which would need administration (Bernard, 2026-10-22). Recorded in decision 0006
  (addendum) and CONTRIBUTING.
- The sandbox run with one request per event (3539cd1): 63 of 63, 1,889 requests (2,023 before);
  41½ minutes, close to the job's 45-minute limit: on the test list.

Acceptance: only Divlab may check members' pull requests to the project -> RED (not yet right):
          expected [ "Divlab" ], got []; GREEN after the cycles below; passes in the sandbox too.
RED:      lets Divlab, and nothing else, check members' pull requests -> expected [] to deeply
          equal [ 'ledger' ]
GREEN:    (35 passed, after the older test's stand-in gained the new method, a separate step)
RED:      allows pull request events for Divlab's pull request workflow, and no other
          -> not a function (then the stub) -> expected {} to deeply equal { …(4) }
GREEN:    (48 passed)
REFACTOR: none. The adapter's one-line POST has no unit test of its own, like `protectMain`'s;
          the sandbox scenario checks it against GitHub.

- In CI (02b3fbe): 64 of 64 in 42 minutes, 2,146 requests. More than the run before (1,889),
  almost all in waiting: 535 pull request checks and 521 issue lists, against 502 and 423. How
  much a run waits depends on how quickly GitHub and Divlab answer that day; polling less is
  on the test list with the time limit.

## 2026-10-22: Appending an event in one request

- Each event cost three requests: two Git tree reads to count the log, then the write. Divlab
  reads the log before almost every event it records, so the adapter now remembers how many
  events it saw (and counts each one it writes) and numbers the next from that: one request.
- Numbering still cannot collide: creating a file that exists fails (422), and then the log is
  listed again and the next free number taken. Any other failure is not retried: GitHub may
  have saved the file despite failing, and a retry would record the event twice.
- The merge record is appended before Divlab reads the log, so it still lists first; on the test
  list.

RED:      records a new event in one request once the log has been read -> expected 3 to be 1
GREEN:    (44 passed)
RED:      numbers each event a run records after reading the log -> GitHub PUT …/000251.json
          answered 422 (the second event took the first's number: an error from the fake's
          GitHub, not an assertion, but the behaviour under test)
GREEN:    (45 passed)
RED:      gives a new event the next free number when another run has recorded one since
          -> answered 422
GREEN:    (46 passed)
REFACTOR: the second write's failure reports GitHub's own answer, not a made-up 422
RED:      records an event once, when GitHub saves it but answers with a failure
          -> expected 252 to be 251
GREEN:    (47 passed)
REFACTOR: one helper creates the event's file and says whether its number was taken

## 2026-10-22: The sandbox run's request budget

- GitHub's hourly allowance is counted per person, not per token: the sandbox token, the
  members' token and Bernard's own `gh` showed the same use. My CI watcher (`gh run watch`, every
  3 seconds, about 1,200 requests an hour) was spending it; I now check every two minutes. A
  loop sharing the account most likely explains the refusal of 2026-10-13.
- The driver counts every request it makes, by kind (pure helpers, unit tested), and prints the
  tally and the allowance at the start and end of each run. A full run in CI (1f31b64): 2,010
  requests in 36½ minutes, 1,804 of them REST; most are waiting (502 pull request checks, 423
  issue lists, 313 Git tree reads of the event log). Divlab's runs act as its App, on an
  allowance of their own.
- GitHub's reading of the allowance used is not steady: in one window it went 736 to 697 across a
  full run, and 2,141 to 726 within a minute. The count is the driver's own; the reading is kept
  only as what GitHub says, since that is what it refuses on.
- Before a run starts, the driver checks the reading against 2,500 REST requests (the measured
  run with room to spare) and fails at once, saying when the allowance resets.
- Both CI sandbox runs passed, 63 of 63: the event log fix against real GitHub, and the run
  above.
- The first run with the check (4d292ab) passed, 63 of 63: 2,023 requests counted, while GitHub's
  reading of the allowance used rose only from 0 to 445 in the same window. Whatever that
  reading counts, it is not simply the run's requests; on the test list.
- A push that changes only documents no longer starts a sandbox run (the run reads none of them):
  the dev log commit after the check cost a full run, about 2,000 requests, for nothing. A CI
  setting, not behaviour, so no test cycle; checked by the next pushes, below.

RED:      the kind of request is its method and what it asks for, without the repository
          -> Cannot find module (then the stub) -> expected '' to be 'GET issues'
GREEN:    (1 passed)
RED:      requests about different issues or runs are one kind -> 'GET actions/runs/39747493613/jobs'
GREEN:    (2 passed)
RED:      requests about different files or commits are one kind -> 'PUT contents/feedback/…'
GREEN:    (3 passed)
RED:      the total, then each kind, most made first -> expected [] (the stub was written in the
          same step as the test: the same slip as the sweep's, again)
GREEN:    (4 passed)
RED:      too little allowance, saying when it resets -> Cannot find module (then the stub)
          -> expected undefined
GREEN:    (1 passed)
RED:      enough when more is left than a run needs -> expected '…has 2000 r…' to be undefined
GREEN:    (2 passed)
REFACTOR: comments; the allowance reading returned for the check

## 2026-10-22: The sandbox sweep

- Before each sandbox run, both sandbox organisations are swept of repositories an interrupted run
  left behind. Which ones is a pure choice beside the driver, unit tested (Vitest now finds the
  harness's own tests under `acceptance/` too): a run's repositories, made more than an hour ago.
- Tried while CI's run was live: the sweep left its repositories alone.

RED:      finds a run's repository made more than an hour ago -> expected [] to deeply equal
          [ 'ledger-mvj9zaqb' ] (the empty stub was written in the same step as the test, before
          the missing symbol had been seen fail: a slip)
GREEN:    every repository (1 passed)
RED:      leaves a repository made within the hour -> expected [ 'ledger-mvjb11k0' ] to deeply
          equal []
GREEN:    older than an hour (2 passed)
RED:      leaves any repository a run did not make -> expected [ 'notes' ] to deeply equal []
GREEN:    a run's name only (3 passed)
REFACTOR: a run's repository named in one place, for the run and the sweep

## 2026-10-22: The event log past 1,000 events

- A sandbox probe, one commit of 1,001 event files: GitHub's contents listing gave 1,000; the Git
  tree gave all 1,001, untruncated; one GraphQL request for all their text failed with a 502. So a
  busy project's log was not just read in part: from the 1,001st event, Divlab would have numbered
  each new event as one that already existed, and every run would have failed.
- The adapter now takes the function it sends requests through (a refactor, no change in
  behaviour), so its unit tests can run against a fake that answers as GitHub did in the probe.

RED:      a project's event log is read whole, however many events it holds
          -> expected [ …(1000) ] to have a length of 1001 but got 1000
          (then the fake answered Git trees too, a test-only step: still the same failure)
GREEN:    listed from main's Git tree (41 passed)
RED:      is read a part at a time, never asking GitHub for too much at once
          -> GitHub POST graphql answered 502 (the probe's failure, from a fake told to fail above
          100 texts; then the fake answered objects asked for by ID, a test-only step: the same)
GREEN:    text fetched by Git object ID, 100 at a time (42 passed)
REFACTOR: the test's typing; the fake's unused whole-folder query removed
TEST:     gives a new event the next number past 1,000: passed first time, since appending
          already counted through the tree listing; kept as a regression test.

## 2026-10-22: Work submitted from forks

- Bernard set up `anarres-sandbox-members`, a second sandbox organisation playing the members:
  Free plan, two-factor authentication required, Actions disabled, and a token that can act only
  there (CONTRIBUTING lists its permissions).
- A throwaway probe first: the members' token forked a sandbox repository into the members'
  organisation and pushed a branch; the sandbox token opened a pull request from it and read its
  files. Nothing on GitHub needed changing.
- The sandbox driver now submits every member's work from the members' fork of the project, made
  the first time it is needed and deleted with the run. The fork's main is never brought up to
  date: it falls behind only by other feedback signals, each in a file of its own, so a branch
  from it still merges cleanly and shows only its own file. Harness only: Divlab is unchanged.
- Sandbox, locally: the submission and merged-work scenarios passed from forks (4 of 4); both
  organisations empty afterwards.
- GitHub's notice: from 2 December 2026 `pull_request_target` is restricted on public repositories
  unless an organisation's Actions policy allows it. Divlab's pull request workflow needs it; on
  the test list.

## 2026-10-21: Divlab checks its own protection

- Tried as the App in the sandbox: it can see that main's rules are in force and that it may
  bypass them, but not who else may, even with administration read access (GitHub shows that only
  to those who can edit the rules). Bernard removed that permission again: it bought nothing.
- `checkProtection` runs after every Divlab run: if the rules GitHub applies to main are not all
  there, it alerts PDC coordinators once; the open alert is the record, and closing it re-arms the
  check. Decision 0006 says what it cannot see.

OUTER RED: Divlab alerts PDC coordinators, once, when main is not protected (@wip) ->
           NotYetImplemented, then not yet right (no alert)
RED:      alerts when main is not protected -> TypeError; stub -> expected [] to equal [ 'ledger' ]
GREEN:    (1 passed)
RED:      says nothing while main is protected -> expected [ 'ledger' ] to equal []
GREEN:    (2 passed)
RED:      does not alert again while its earlier alert is open -> expected [ 'ledger' ] to equal []
GREEN:    (34 passed in Divlab); OUTER GREEN in-process
RED:      protection not in force when a rule no longer applies -> expected true to be false (this
          test was written in the same step as the hard-coded green before it: a slip)
GREEN:    (39 passed in packages/github); REFACTOR: main's rules listed once
RED:      the unprotected-main alert issue -> expected { title: '' … } to equal { …(3) }
GREEN:    (173 passed)

---

## 2026-10-21: About to merge

- Before merging a pull request, Divlab records that it is about to, with the work it read and
  checked. The tripwire now tells three cases apart: a routing decision (Divlab's merge, done); a
  merge begun but not routed (an interrupted run: finished from the record, not from Git history
  or the file); no record (not through Divlab: not accepted, alerted).
- The event log holds three kinds of record; readers of routing history still see only decisions,
  and the sandbox driver waits for the kind it expects.
- The scenario runs in-process, where the fake can stop Divlab just after a merge; it is
  `@sandbox-wip` because the real Action cannot be stopped on cue.

OUTER RED: A merge Divlab was interrupted in is finished by its next run (@wip) -> not yet right:
           no task ready
RED:      records that it is about to merge, with the work, before it merges -> expected
          [ 'merged 7', … ] to equal [ { aboutToMerge }, 'merged 7' ]
GREEN:    (165 passed)
RED:      finishes routing work it merged but was interrupted before routing -> expected [ [], [] ]
          to equal [ [ { … } ], [] ]
GREEN:    (166 passed); OUTER GREEN in-process
RED:      reads back a record that Divlab was about to merge -> Error: not a routing record
GREEN:    (167 passed)

---

## 2026-10-21: The tripwire

- The push workflow is now the tripwire (decisions 0005, 0006). A feedback signal on main with no
  record of Divlab merging it is never read or routed: Divlab records it once as not accepted,
  saying why, and alerts PDC coordinators once, and routing carries on. An unreadable signal on
  main no longer stops Divlab.
- The event log holds two kinds of record: routing decisions, and what Divlab did not accept.
  Routing history reads only the decisions.
- The push workflow acts as Divlab's App with no permissions of its own, like the pull request
  workflow: the template test now holds both to that. `Repository.readFile` went, unused.

OUTER RED: Work that reaches main without Divlab merging it is never routed (@wip) -> not yet
           right: Divlab routed it
RED:      never routes work that reached main without Divlab merging it -> expected [ … ] to
          equal []
GREEN:    (22 passed)
RED:      records it as not accepted, saying why -> expected [] to equal [ … ]
GREEN:    (23 passed)
RED:      alerts PDC coordinators of it -> expected [] to equal [ … ]
GREEN:    (24 passed); OUTER GREEN in-process
RED:      records an unreadable signal on main like any other, without stopping (rewritten from
          "refuses to route a feedback signal it cannot read", per decision 0005) -> Error: The
          feedback signal … cannot be read
GREEN:    (24 passed); REFACTOR: Repository.readFile removed, unused
PASSED FIRST TIME: records and alerts it only once (guard; shown to fail without the check)
RED:      reads back a record of work Divlab did not accept -> Error: not a routing record
GREEN:    (159 passed)
RED:      tells PDC coordinators what reached main without Divlab -> expected { title: '' … }
GREEN:    (160 passed); REFACTOR: one quoting helper for refusals and alerts
RED:      the push workflow acts as the App, with no permissions of its own -> 3 failing at once
          (the pull request workflow's three rules, applied to the push workflow; one change)
GREEN:    (164 passed)

---

## 2026-10-21: Only Divlab changes main

- `setUpProject` protects a new project's main branch: a ruleset lets nobody but Divlab's App
  update, delete or rewrite it, administrators included. A ruleset is a repository setting, so it
  is applied when a project is set up, not carried in the template. Project set-up has no other
  home yet; this is its seam.
- The sandbox driver sets every repository up that way. Against the sandbox: an administrator's
  direct change to main was refused, and Divlab Sandbox still merged, recorded and routed through
  the escalation scenarios (6 of 6).
- GitHub hides a private App from its public API, so the driver holds Divlab Sandbox's App ID.

OUTER RED: A change to main from anyone but Divlab is refused (@wip) -> NotYetImplemented
RED:      protects the project's main branch so that only Divlab can change it -> TypeError;
          stub -> expected [] to equal [ 'ledger' ]
GREEN:    (21 passed)
RED:      lets nobody but Divlab's App change, delete or rewrite main -> expected undefined to
          equal { …(6) }
GREEN:    (34 passed in packages/github)
SANDBOX:  first tries failed for harness reasons (a private App is not visible by name; a short
          commit SHA cannot pin an Action), each reported with GitHub's own reason; then 6 of 6.

---

## 2026-10-21: Plain names only

- `readFeedbackSignal` finds a signal unreadable unless its role, module, verdict and impediment
  types are plain names: lower-case letters and digits joined by single hyphens or underscores, at
  most 40 long (GitHub labels hold 50 characters, and Divlab writes `module:<name>`). Both of
  Divlab's paths read signals there, so both refuse; a refused pull request is told why.
- Mutation testing on core: 318 mutants, all killed.

OUTER RED: Work whose feedback signal does not use plain names is not merged (@wip) -> not yet
           right: Divlab merged it
RED:      module not a plain name -> expected { fromRole: 'test', … } to equal { unreadable }
GREEN:    (94 passed)
RED:      role not a plain name -> same; GREEN: one loop over role and module (95 passed)
RED:      verdict not a plain name -> same; GREEN: (96 passed)
RED:      impediment type not a plain name -> same; GREEN: (97 passed)
RED:      a name too long to be a name -> same; GREEN: at most 40 (98 passed)
PASSED FIRST TIME: a name as long as a name may be (pins the boundary)
OUTER GREEN: @wip removed; @sandbox-wip until tried against the sandbox

---

## 2026-10-21: Start whole, split when it hurts

- Bernard asked whether a module list written at set-up would smuggle a big up-front design into
  CSD. It would. The concept document (§5) now says decomposition is earned by evidence: a project
  starts as one module, and splits only when the sizing rule fails or feedback shows the
  boundaries do not work; requirements start as a first slice too.
- So the check that work names a module the project has waits for the Programme Architect's
  `modules.yaml`; the safety half (plain names only) does not.

---

## 2026-10-21: Work without a feedback signal; text members choose

- A pull request with no feedback signal is refused, and Divlab's comment says the work needs one
  (in-process; `@sandbox-wip` until tried in the sandbox). This drives out the guard TypeScript
  had forced in without a test.
- The sandbox driver looks for refusals and failed runs on every third check only.
- The alert issue's routing record is safe inside its code block (JSON escapes line breaks); a
  guard test holds it. The exposure is elsewhere: module names and impediment types from the
  member's signal reach issue titles, labels and text unchecked (test list, section 4).

OUTER RED: Work without a feedback signal is not merged, and the member is told why (@wip)
           -> not yet right at "the member is told their work has no feedback signal"
RED:      tells the member when their pull request has no feedback signal -> expected [] to
          equal [ Array(1) ]
GREEN:    (20 passed); OUTER GREEN, @wip removed
PASSED FIRST TIME: keeps the routing record inside its code block (guard; shown to fail with raw
          line breaks, then restored)

---

## 2026-10-21: Every scenario's work goes through a pull request

- Accepted work now means work a member submitted as a pull request and Divlab merged, in both
  drivers. Nothing in the scenarios changed.
- First full sandbox run with a pull request for every merge: 58 of 58 in 30.5 minutes (22
  before), inside the 45-minute limit, so no need yet to run scenarios in parallel.
- `onPullRequest` closes the task the work names and sends Research back to the role its task was
  for, as the merge path does; both now share `acceptSignal`.

OUTER RED: 6 of 58 scenarios (tasks left open, so escalation counts and closed tasks failed;
           Research not sent back)
RED:      closes the task the work in the pull request was for -> expected [] to equal [ '3' ]
GREEN:    (18 passed)
RED:      sends passed Research back to the role its task was for -> Error: Divlab should not
          have acted (it escalated)
GREEN:    (19 passed)
REFACTOR: acceptSignal, shared by onPullRequest and onMerge
OUTER GREEN: 58 of 58 in-process

---

## 2026-10-21: Divlab merges a real pull request as its App

- `packages/github` implements Divlab's side of a pull request: its head, its changed files read
  through the API as data (blobs from the project's own copy, no links followed), a squash merge
  only at the commit Divlab read, and a refusal comment.
- The Action decides from its event whether it is acting on a pull request or a push.
- The sandbox driver installs both template workflows and submits work as a branch and a pull
  request, then waits for Divlab to merge or refuse it and for Divlab's record.
- Sandbox: the pull request was merged by `divlab-sandbox[bot]`, its work recorded and routed,
  and the push workflow ran after it. The scenario lost its `@sandbox-wip` tag; the tag and the
  sandbox run's listing of it stay for the next scenario that needs them.
- The ruleset waits until every scenario submits work as a pull request: the driver still writes
  to main directly for the older steps, which a ruleset would refuse.

RED:      says why, quoting the reason as text, never as Markdown -> expected '' to be '…'
          (stub written with the test)
GREEN:    (31 passed in packages/github)
RED:      keeps the reason inside its code block even when the reason contains a fence
          -> strings differ
GREEN:    (32 passed)
SANDBOX:  first run failed: the driver read the log between Divlab's merge and its record; it
          now waits for the record. Then 1 passed, and 9 of 9 across two features.
REFACTOR: GitHub expressions in the template test written through a helper (lint warnings)

---

## 2026-10-21: Merging only what was checked; what a run is for

- Divlab reads a pull request at one commit and merges only that commit, so anything pushed after
  it read the pull request is never merged unchecked.
- `whatToActOn`: from the event that started a run, a merge (push) or a pull request (by its
  number, which must be a whole number GitHub could have given); any other event, or a pull
  request event that does not name its pull request properly, is refused.

RED:      merges exactly the version of the pull request it read -> expected [ '7 at undefined' ]
          to equal [ '7 at c0ffee' ]
GREEN:    (12 passed)
RED:      acts on a merge when something is pushed -> module not found; stub -> expected undefined
GREEN:    (1 passed)
RED:      acts on the pull request a pull request event is about -> expected { merge: true }
GREEN:    (2 passed)
RED:      refuses a pull request event that does not name its pull request by a whole number
          -> expected [Function] to throw
GREEN:    (3 passed)
RED:      refuses a pull request number GitHub could not have given -> expected [Function] to
          throw (the check had been written early; taken out, then demanded)
GREEN:    (4 passed)
RED:      refuses to act on an event it was not made for -> expected [Function] to throw
GREEN:    (17 passed in Divlab)

---

## 2026-10-21: The template's pull request workflow

- Checked the sandbox App end to end with a throwaway workflow: it minted a token as Divlab
  Sandbox from the organisation's variable and secret, and acted as the App.
- `template/.github/workflows/divlab-pull-request.yml`: runs as main has it
  (`pull_request_target`), takes the App's token (GitHub's token action pinned to v3.2.0 by commit)
  and runs Divlab with it; nothing else. `template.test.ts` holds it to that.
- GitHub's token action has deprecated the App ID for the Client ID, so the template reads
  `DIVLAB_APP_CLIENT_ID`.

RED:      runs only as the project's main branch has it -> ENOENT; skeleton -> expected [] to
          equal [ 'pull_request_target' ]
GREEN:    (1 passed)
RED:      does nothing but take the App's token and run Divlab -> TypeError (no jobs); empty jobs
          -> expected [] to equal [ …(2) ]
GREEN:    (2 passed)
RED:      runs Divlab as its App -> expected undefined to equal { …(2) }
GREEN:    (3 passed); REFACTOR: steps parsed once
RED:      gives the workflow's own token no permissions -> expected undefined to equal {}
GREEN:    (4 passed)
RED:      waits its turn with the project's other Divlab runs -> expected undefined to equal
          { group: 'divlab', … }
GREEN:    (5 passed)
PASSED FIRST TIME: never puts anything from the event in an expression (kept as a guard; shown
          to fail by adding a pull request title expression, then restored)
REFACTOR: Divlab declares the YAML library its tests use

---

## 2026-10-21: Divlab merges submitted work (in-process)

- Bernard created the sandbox's GitHub App, Divlab Sandbox (IDs in `CONTRIBUTING.md`).
- `onPullRequest`: Divlab reads a pull request's feedback signal as data, merges the pull request
  if it can read it and routes its work; if it cannot, it does not merge and tells the member why.
- The new scenario runs in-process. It is tagged `@sandbox-wip` until Divlab merges as its App in
  the sandbox; the sandbox profile leaves such scenarios out and the sandbox run lists them.

OUTER RED: Work that passes validation is merged and routed (@wip)
           -> NotYetImplemented: Divlab merging submitted work
RED:      merges a pull request whose feedback signal it can read
          -> TypeError: onPullRequest is not a function; stubbed -> expected [] to equal [ '7' ]
GREEN:    (2 passed)
RED:      routes the work in the pull request it merges -> expected [] to equal [ { … } ]
GREEN:    (3 passed); REFACTOR: shared test fixtures
RED:      does not merge a pull request whose feedback signal it cannot read
          -> expected [ '8' ] to deeply equal []
GREEN:    (4 passed)
RED:      tells the member why it did not merge their pull request -> expected [] to equal [ … ]
GREEN:    (5 passed); REFACTOR: the "cannot be read" reason written once, shared with onMerge
OUTER GREEN: the scenario passes in-process; 128 unit tests, 58 scenarios

---

## 2026-10-21: How Divlab merges

- Tried in the sandbox: a ruleset binds even administrators on a public repository under GitHub
  Free, but a workflow's own token cannot be exempted from one; a GitHub App can.
- Decision 0006 (Bernard): Divlab acts as its own GitHub App, the only actor a project's ruleset
  lets merge. It acts on pull request events without running anything from the pull request,
  merges and routes in one recorded run, keeps the push workflow as a tripwire, and checks its own
  protection on every run. Two Apps, one per organisation, so tests never hold a key for
  `anarres-project`.
- Routing in merge order now comes from Divlab recording its own merges (test list).

---

## 2026-10-21: The sandbox driver observes the real Action

- The sandbox driver no longer calls Divlab itself. Each sandbox repository gets the project
  template's workflow, pinned to the commit under test, and on each merge the driver waits for
  Divlab's real run, failing with GitHub's reason if the run fails or never starts.
- Sandbox settings confirmed by a real run: the token installs workflows, and the sandbox allows
  `anarres-project/anarres/*`, which covers Divlab in its subfolder.
- About 19 seconds a merge, some 25 minutes for the suite, so the sandbox job's limit rises from 30
  to 45 minutes.
- First full CI run against the real Action: all 57 scenarios green in about 22 minutes.

RED:      A failure that reports no problem is never guessed at (sandbox, driver waiting for the
          real Action, no workflow yet) -> Error: No Divlab run started for 75d6a0b…
GREEN:    the same scenario with the template's workflow installed (1 passed); the failed-work
          feature (29 passed, 9m 10s)
REFACTOR: none

---

## 2026-10-21: Security reports and a private side repository

- Bernard: `anarres` stays public (on GitHub Free, a private repository would lose the sandbox
  environment and branch protection), and so do sandbox repositories (decision 0004).
- A private side repository, `anarres-project/anarres-private`, now holds what must not be public:
  the detailed threat model, known weaknesses not yet fixed, security findings and incident
  notes. Safeguard code and its tests stay public. CLAUDE.md's discretion rule points to it.
- `SECURITY.md`: how to report a problem privately, through GitHub's private vulnerability
  reporting.
- The sandbox driver now creates its repositories public (they were private), ready for the real
  Action. Checked by running a scenario against the sandbox and watching the new repository.

---

## 2026-10-21: Coding's upstream ambiguity goes to Specification

- Bernard: Coding reporting an upstream ambiguity now goes back to Specification, as Test's does,
  instead of alerting a PDC coordinator. If the ambiguity lies further up, Specification fails
  upward to the Programme Architect. One new row in `FAILURE_ROUTES`; the concept document (§9)
  lists it among Divlab's extensions to the AutoPM table.

RED:      An upstream ambiguity goes back to the role that owns the ambiguous artefact (Coding)
          -> AssertionError: no task ready, expected a Specification task
RED:      sends failed code back to Specification when it reports an upstream ambiguity
          -> AssertionError: expected { alert } to deeply equal { tasks: [ … ] }
GREEN:    124 unit tests, 57 scenarios passed
REFACTOR: before the cycle, the "ride along" test now uses a scope gap from Coding as its
          impediment no rule covers, since Coding's upstream ambiguity is now routed

---

## 2026-10-21: Only Divlab merges

- Decision 0005 (Bernard): only Divlab merges into a project's main branch, so every change there
  has passed validation. Anything that reaches main another way, an unreadable feedback signal
  among them, is recorded once, alerted to PDC coordinators and never routed, and routing carries
  on. The options not taken (a required check with no bypass, Divlab checking its own protection,
  reverting automatically) are recorded there. The concept document (§8, step 8) and the test list
  (sections 4 and Unsorted) follow.
- Sandbox set up for the real Action: the sandbox token may now write workflows and read Action
  runs, and the sandbox organisation allows actions from `anarres-project/anarres`. The steps are
  in `CONTRIBUTING.md`.
- Bernard: work for a module that is already done is refused, not routed. Reopening a done module
  is a PDC coordinator's deliberate step, for later (test list).

---

## 2026-10-21: Anarres beside Claude Code's Projects

- Claude Code's Projects (public beta) runs parallel sessions under one coordinating
  conversation, for one user. The concept document (§2) now says how Anarres differs from it and
  from Claude Tag: pooled capacity from many members, independence between roles that the system
  enforces, deterministic routing and governance for strangers working together.
- `docs/LATER.md`: running tasks in a cloud sandbox, with the open question of whether the
  plugin's protections take effect there.
- `CONTRIBUTING.md`: installing Node 24 with Homebrew, which leaves it unlinked beside a newer
  `node`. The full gate now runs locally on Node 24 again (124 unit tests, 56 scenarios).

## 2026-10-13: Divlab's Action: entry point, bundle and project workflow

- `packages/divlab/action.yml` and `src/action.ts`: the Action wires Divlab to the GitHub adapter
  with the project repository's own token and calls `onMerge`; nothing else. It is bundled by
  esbuild 0.28.2 into one committed file, `packages/divlab/dist/index.js` (276 kB, mostly the
  YAML parser). CI rebuilds it and fails if it differs from what is committed. esbuild's install
  script is not approved and is not needed (its platform binary comes as a package).
- The first bundle failed at start-up: `yaml` ships CommonJS for Node, and an ES module bundle has
  no `require`. Fixed with esbuild's usual `createRequire` banner. Smoke-tested by hand: it
  reports a missing setting, and fails cleanly with a bad token.
- `@anarres/github` now needs Divlab only for its port types (a development dependency), so the
  Action can depend on the adapter without a cycle between packages.
- `template/.github/workflows/anarres.yml`: a project's Divlab workflow, as decision 0004
  describes (push to main touching `feedback/`; contents and issues only; one run at a time).
- Not yet exercised end to end: the sandbox driver must install this workflow and observe the
  real Action, which needs two sandbox settings from Bernard.

## 2026-10-13: Divlab acts on a merge

- New scenario, "Merging a member's work closes the task it was for". It **passed the first time**,
  because both drivers closed the task themselves, standing in for the system. With that taken
  out of the in-process driver it went red for the right reason (the Test task still ready), as did
  three escalation scenarios. Divlab now closes the task the merged work names.
- Divlab acts on a merge (`onMerge`): it lists the project's feedback signals, routes each that
  has no event yet (the event log records which signal each decision came from), reads its
  header with `readFeedbackSignal`, closes the task it names, and takes the Research link from
  that task. The in-process driver now merges a feedback signal file into the fake and calls
  `onMerge`; so does the sandbox driver, committing the file to the real repository. Driving it
  out found a DSL defect: the same role's repeated work reused one feedback signal name, which
  Divlab now rightly routes only once. Each piece of work has its own signal.
- Unit cycles:

  ```
  RED:      (divlab) refuses to route a feedback signal it cannot read, naming it and why -> promise resolved "undefined" instead of rejecting
  GREEN:    (1 passed)
  RED:      (github) reads back from a Research task which role it is for -> TypeError: taskFromIssue is not a function; (stub) expected {} to deeply equal { researchFor: 'coding' }
  GREEN:    (21 passed), hard-coded
  RED:      reads back nothing more from a task that is not Research -> expected { researchFor: 'coding' } to deeply equal {}
  GREEN:    (22 passed)
  REFACTOR: the research-for label prefix named once
  RED:      the task a feedback signal names is the issue with that number -> TypeError: issueNumber is not a function; (stub) expected undefined to be 12
  GREEN:    (23 passed), hard-coded
  RED:      is no issue at all when the id is … not a plain issue number (7 rows) -> expected 12 to be undefined
  GREEN:    (30 passed)
  ```

  The task id comes from the member's header, so the adapter uses only a plain issue number in a
  request.
- The CI sandbox run for `ff3b4d5` (a docs-only commit) failed 39 of 55: tasks that had been
  closed still listed as ready. GitHub reported no incident. Cause: a race in the sandbox driver.
  It waited until a ready list held the expected *number* of tasks, and a lagging list can show a
  closed task in place of the one that replaced it; the driver then named the stale task in the
  next merge. The driver now also waits until the list holds no task merged work has closed.
- Decision 0004 (proposed): Divlab as a GitHub Action, run on a push to the main branch, never on
  a pull request; each run routes every signal with no event yet; one committed bundle, checked
  fresh in CI.

## 2026-10-13: Reading a feedback signal

- Started on Divlab as a GitHub Action (Bernard). First piece: `core` reads the work a merged
  feedback signal reports from its YAML header (`readFeedbackSignal`), so Divlab can act on what
  was merged rather than on what a driver hands it. The header is untrusted: anything malformed is
  `unreadable`, with the reason, never guessed at. YAML is parsed by `yaml` 2.9.1 (no
  dependencies; it builds plain data and runs nothing).
- Cycles:

  ```
  RED:      gives the work its header reports… -> TypeError: readFeedbackSignal is not a function; (stub) expected undefined to deeply equal {…}
  GREEN:    (71 passed), hard-coded
  RED:      gives the problems failed work reports, and no task when it names none -> expected { fromRole: 'specification', …(4) } to deeply equal { fromRole: 'coding', …(3) }
  GREEN:    (72 passed)
  RED:      finds a file with no feedback signal header unreadable -> TypeError: Cannot destructure property 'feedback_signal' of 'parse(...)' as it is null
  GREEN:    (73 passed)
  RED:      finds a header that is not valid YAML unreadable -> YAMLParseError
  GREEN:    (74 passed)
  RED:      finds a header that … with no feedback signal in it, unreadable (3 rows) -> TypeError: Cannot read properties of undefined (reading 'from_role')
  GREEN:    (77 passed)
  RED:      finds a feedback signal without a … in words unreadable (5 rows) -> expected { fromRole: undefined, …(3) } to deeply equal { Object (unreadable) }
  GREEN:    (82 passed)
  RED:      finds a feedback signal whose impediments … unreadable (3 rows) -> TypeError: … .map is not a function
  GREEN:    (85 passed)
  REFACTOR: removed an optional chain no test demanded
  RED:      … impediments include an empty entry unreadable -> TypeError: Cannot read properties of null (reading 'type')
  GREEN:    (86 passed)
  RED:      gives the task as text when the header gives it as a number -> expected {…} to match object { task: '12' }
  GREEN:    (87 passed)
  RED:      finds a feedback signal whose task is … unreadable (3 rows) -> expected {…} to deeply equal { Object (unreadable) }
  GREEN:    (90 passed)
  ```

- Mutation testing then left three survivors: the header pattern (nothing said the header must
  start the file) and a null check. Driven out:

  ```
  RED:      finds a header that does not start the file no header at all -> expected { fromRole: 'test', …(3) } to deeply equal { Object (unreadable) }
  GREEN:    (91 passed); the header is now found line by line, with no pattern
  RED:      finds a header that never ends unreadable -> expected { Object (unreadable) } to deeply equal { unreadable: 'its header never ends' }
  GREEN:    (92 passed)
  PASSED FIRST TIME: an empty feedback signal is unreadable (the null check), kept to pin it down (93 passed)
  ```

  Mutation score 100% (284 of 284).

## 2026-10-13: Discretion in public until release

- The repository stays public (Bernard). New hard rule in `CLAUDE.md`: nothing here spells out
  how a safeguard could be got round; threat notes stay general, and specifics go to Bernard
  first.
- The public documents were reviewed against the rule, and Bernard chose what to trim. The concept
  document now says in general terms what Divlab checks before merging, how members gain trust
  and when the Governance role looks; it no longer dwells on large numbers of sessions; and
  unattended running is out of the roadmap and the later list (Research instrumentation is now
  Phase 5). The fuller text stays in the history; specifics will live in private documents when
  they are needed.

## 2026-10-13: Divlab acts on real GitHub; the sandbox suite runs

- The adapter's HTTP calls (`GitHubAdapter`: post, alert, mark done, append, read). The sandbox
  driver plays GitHub's part on merge (closes the task issue) and calls Divlab with the real
  adapter; it observes GitHub directly.
- What real GitHub taught us, in order:
  1. **Issue lists lag writes by about a second.** The driver now waits until GitHub shows what
     the event log says Divlab did (counts of ready tasks, escalations, finished modules), with a
     30-second limit so a real defect still fails.
  2. **One repository per scenario trips GitHub's secondary limit on creating repositories**
     (about 130 in half an hour). Now one repository per run; the DSL aliases module names per
     scenario ("parser-s7"), as `CLAUDE.md` asks. A planted routing fault still fails 9 scenarios
     in-process, so the aliasing did not hollow out the assertions.
  3. **Rate limits and blips.** `retryAfter` (test first, 6 cycles) says how long to wait:
     `retry-after`, a secondary limit (a minute), the hourly reset, a failing gateway (2 s); never
     a request that succeeded. `requestGitHub` retries only what is safe: any request after a
     rate-limit refusal (GitHub did nothing), but only reads and deletes after a gateway failure
     or dropped connection (a repeated create could post a task twice).
  4. **Reading the log one file per request made each decision O(n)**: runs took 30 to 47
     minutes and exhausted the hourly allowance. (Also my fault: a capture loop for Bernard's
     dashboard polled with the same token.) The log is now read in one GraphQL request.
  5. **GraphQL lags writes too**, and a stale log would make Divlab miscount re-runs. The adapter
     lists the files with REST (which reflects writes at once) and accepts the GraphQL contents
     only when they hold every listed file, else retries, then fails rather than decide on a
     short log. Driven test first as `logFrom`.
- Cycles (`packages/github`):

  ```
  RED:   waits as long as GitHub asks when it says how long -> undefined (stub written in the
         same step as the test: a slip in the protocol, though the red was on the assertion)
  GREEN: (13)
  RED:   does not retry a refusal that is not about rate limits -> +0
  GREEN: (14)
  RED:   waits a minute out of a secondary rate limit that does not say how long -> undefined
  GREEN: (15)
  RED:   waits until the hourly limit resets when it is used up -> undefined
  GREEN: (16), with the clock injected
  RED:   never retries a request that succeeded, even the last one the limit allowed
         -> a negative wait
  GREEN: (17)
  RED:   tries again shortly when GitHub's gateway fails -> undefined
  GREEN: (18)
  RED:   makes a log only when every listed event file has been read
         -> TypeError (stub) -> expected [] to be undefined
  GREEN: (19)
  RED:   reads the listed events oldest first, ignoring any other file -> []
  GREEN: (20)
  REFACTOR: the adapter reads through `logFrom`; one `requestGitHub` shared by adapter and driver
  ```

- Final sandbox run (13:44 for 55 scenarios, one repository): 54 passed. The failure: GitHub
  answered one issue-list read with "API rate limit exceeded" while the token showed its
  allowance almost unused afterwards, and without the headers the retry looks for. Not
  explained; on the test list with measuring a run's requests.
- `ANARRES_SANDBOX_KEEP=1` keeps the run's repository to inspect. Bernard's dashboard of that
  run's 68 routing decisions was built from it; the repository was then deleted.
- CI: `.github/workflows/sandbox.yml` runs the sandbox suite on `main` and on demand, in the
  `sandbox` environment, one run at a time.
- Gate: 90 unit tests, 55 scenarios in-process; `@wip` judge clean.

## 2026-10-13: The GitHub sandbox, the sandbox driver and the adapter's representation

- Sandbox set up with Bernard: organisation `anarres-sandbox` (2FA with secure methods only, base
  permission none, classic tokens blocked, fine-grained tokens need approval, Actions limited to
  the organisation's and GitHub's own, no self-hosted runners). A fine-grained token scoped to it
  (Administration, Contents, Issues, Pull requests: read and write; 90 days, to 2027-01-11), in a
  git-ignored `.env` locally and in the `sandbox` environment (deployable from `main` only) in CI.
  Checked: it creates, uses and deletes a repository in the sandbox, and is refused (403) writing
  to `anarres-project`.
- Decision 0003 (proposed): how a project looks on GitHub. Tasks are issues labelled `role:`,
  `module:`, `state:ready` (plus `research-for:`); alerts are `escalation` issues with the record
  as JSON; a finished module is a closed `state:done` issue; each event is one file
  `events/NNNNNN.json`. The adapter uses `fetch`, no Octokit.
- Sandbox driver (`ANARRES_DRIVER=sandbox`, `npm run test:acceptance:sandbox`): one private
  repository per scenario, deleted afterwards; observes GitHub directly rather than through the
  adapter. First run: all 49 scenarios red with `NotYetImplemented` (Divlab acting on GitHub),
  about 4 s each, nothing left behind. Translation into scenario words now shared by both drivers.
- `packages/github`, pure representation, test first:

  ```
  RED:   a task … is labelled with its role, its module and as ready, and links its feedback signal
         -> TypeError: issueForTask is not a function (stub) -> expected undefined to deeply equal …
  GREEN: (1)
  RED:   says nothing of a feedback signal when it has none -> 'Feedback signal: undefined'
  GREEN: (2)
  RED:   records on a Research task which role it is for -> 3 labels, expected 4
  GREEN: (3)
  RED:   an event is one file under events/, named by its place in the log -> '' (stub)
  GREEN: (4)
  RED:   reads back as the event that was written -> undefined (stub)
  GREEN: (5)
  RED:   is refused when it is not a routing record -> expected [Function] to throw
  GREEN: (6), a shallow shape check; full validation goes with the schema in core
  RED:   an alert is an escalation for the module, saying what was reported … -> undefined (stub)
  GREEN: (7)
  RED:   names the role that has been re-run more than three times -> no-rule wording
  GREEN: (8)
  RED:   carries the routing record for tools, after the words -> null
  GREEN: (9)
  RED:   says blocked work was blocked -> "failed"
  GREEN: (10)
  RED:   says when the work reported no problem -> "reporting ."
  GREEN: (11)
  RED:   a finished module is an issue labelled with the module and as done -> undefined (stub)
  GREEN: (12)
  REFACTOR: none
  ```

- Gate: 82 unit tests, 55 scenarios (in-process); `@wip` judge clean.

## 2026-10-12: A PDC coordinator's alert says what happened

- The alert is now the routing event itself: the work as reported (role, verdict, impediments,
  feedback signal) and the reason (no rule covers it, or which role hit the re-run limit). One
  definition, no new decisions, so no core change and no unit cycle: driven by acceptance alone.
- Acceptance: `features/routing/coordinator-alerts.feature`, 2 scenarios, red as *not yet right*
  (alerts carried only the module).
- Driver: one translation from routing records into scenario words, shared by the event log and
  the alerts.
- Gate: 70 unit tests, 55 scenarios; `@wip` judge clean; core unchanged (mutation 201 of 201).

## 2026-10-12: A role re-run more than three times is escalated

- Bernard, 2026-10-12: within one module, each revision task for a role is a re-run; the count
  starts again when that role's work passes (a conditional pass too); the fourth re-run alerts a
  PDC coordinator and posts nothing. Recorded in concept §9.
- Divlab reads the project's event log and hands it to core: `routingRecord(work, history)`.
  Revision tasks are recognised by carrying a feedback signal.
- Harness: the fake GitHub now closes the task a merged pull request was for, as GitHub does.
  Existing scenarios unaffected.
- Acceptance: `features/routing/escalation.feature`. "A fourth re-run…" red as *not yet right* (no
  alert). The other two ("a third re-run is still sent back", "the count starts again") passed
  first time, since nothing escalated yet; checked once built by planting a limit of 2 and a
  count that never resets (each failed as it should).
- Cycles:

  ```
  RED:      alerts a PDC coordinator instead of re-running a role a fourth time
            -> expected { …(3) } to deeply equal { …(3) }
  GREEN:    (62 passed), `history.length >= 3` with Coding hard-coded; then the seven earlier
            record tests given an empty history (signature change only)
  PASSED FIRST TIME: still re-runs a role the third time (boundary)
  RED:      counts only the re-runs of the role being sent back -> { alert: re_run_limit }
  GREEN:    (64 passed), counted per role
  RED:      does not count the task that first brought the work to the role as a re-run
  GREEN:    (65 passed), revision tasks only
  RED:      starts counting again once the role's work passes
  GREEN:    (66 passed), "pass" only
  RED:      starts counting again once the role's work passes conditionally
  GREEN:    (67 passed), via routing's own `failed` (one definition of passing)
  RED:      counts only the re-runs in the module the work belongs to
  GREEN:    (68 passed)
  REFACTOR: module history named; doc comment corrected
  PASSED FIRST TIME (to kill 2 surviving mutants): keeps counting when another role's work passes
            in between; keeps alerting for what no rule covers, however often it happens
  ```

- Gate: 70 unit tests, 53 scenarios; `@wip` judge clean; mutation 201 of 201 killed.

## 2026-10-12: Every routing decision is recorded

- Core: `routingRecord(work)` gives the accepted work as received, the decision and the reason
  (`passed`, `pipeline_complete`, `reported` + the impediment that decided it, `failed`,
  `research_returned`, `no_matching_rule`). `route` keeps its shape, so the routing tests are
  untouched; internally each rule returns a *ruling* (decision and reason).
- Divlab: a separate `EventLog` port (to become one file per event under `events/`); Divlab records
  the decision, then acts on it. The fake GitHub keeps the log; the driver translates it back into
  scenario words.
- Acceptance: `features/routing/decision-record.feature`, 5 scenarios, red with
  `NotYetImplemented` at the driver. Since they never went red on an assertion, checked by
  planting a record that always says "passed" and drops the reported problems: the 4 scenarios
  that should fail did.
- Cycles:

  ```
  RED:      records passed work with the task it made and that it passed
            -> TypeError: routingRecord is not a function (stub added)
            -> expected undefined to deeply equal { …(3) }
  GREEN:    (55 passed), reason hard-coded "passed"
  RED:      records failed work with the problem that decided where it went
            -> expected { …(3) } to deeply equal { …(3) } (reason "passed")
  GREEN:    (56 passed), rules return rulings; the failure route found is the one that decided
  RED:      records that no rule covers a failure that reports no problem -> { rule: 'passed' }
  GREEN:    (57 passed)
  RED:      records that a passed Security & Quality check completed the module's pipeline
            -> { rule: 'passed' }
  GREEN:    (58 passed)
  RED:      records that a failed review went back to Coding because it failed -> { rule: 'passed' }
  GREEN:    (59 passed)
  RED:      records that research went back to the role that reported the gap -> { rule: 'passed' }
  GREEN:    (60 passed), hard-coded for all research
  RED:      records that no rule covers research that names no role it was for
            -> { rule: 'research_returned' }
  GREEN:    (61 passed)
  REFACTOR: `Reason` is the exact set of rules; a single `NO_RULE_COVERS_IT` ruling
  ```

- When two matching rules name the same owner (a review reporting a scope gap and an interface
  impediment), the reason names the first in the table. Either explains the decision.
- Gate: 61 unit tests, 50 scenarios; `@wip` judge clean; mutation 158 of 158 killed.

## 2026-10-12: A passed Security & Quality check marks the module done

- AutoPM: Security & Quality *pass* → "pipeline complete"; *conditional pass* → "complete with
  caveats" (routes as a pass, per Bernard's earlier rule). Until now a Security & Quality pass
  silently posted nothing.
- Acceptance: `features/routing/module-completion.feature`, red with `NotYetImplemented` at the
  driver until Divlab could mark a module done.
- Cycles:

  ```
  RED:      completes the module when its Security & Quality check passes
            -> expected { tasks: [] } to deeply equal { moduleDone: true }
  GREEN:    (53 passed)
  REFACTOR: none
  PASSED FIRST TIME: completes the module when its Security & Quality check passes conditionally
            (`advance` ignores the verdict). Checked by planting a pass-only condition (1 red).
  ```

- Divlab's `TaskBoard` port gains `markModuleDone`; the fake GitHub records it. The scenario "A
  module is not done before its security and quality check" was only ever red with
  `NotYetImplemented`, so checked by planting completion one role early: it failed (as did the
  Reviewer row of the pipeline outline).
- Gate: 54 unit tests, 45 scenarios; `@wip` judge clean; mutation 125 of 125 killed.

## 2026-10-12: Research that fails alerts a PDC coordinator

- Bernard: keep the alert. Pinned with a unit test, which passed first time (no rule covers
  Research failing); checked by planting a knowledge-gap row for Research (1 red).

## 2026-10-12: Research that passes goes back to the role that reported the gap

- A Research task records which role reported the gap (`researchFor`), as the GitHub issue will.
  When Research work is accepted, Divlab reads that from the task the work was for; the in-process
  driver plays the plugin's part, submitting against the open task for that role and module.
- The revision task carries Research's feedback signal (which points to the brief).
- Research that names no role it was for alerts a PDC coordinator: no guessing. This also ends the
  wrong guess noted last entry (a Research pass advancing to Architecture).
- Acceptance: outline over Test and Coding, red as *not yet right* (no revision task).
- Cycles:

  ```
  RED:      records on a Research task which role reported the gap
            -> expected { tasks: [ { …(3) } ] } to strictly equal { tasks: [ { …(4) } ] }
  GREEN:    (48 passed), after updating the five earlier Research-task expectations, which were
            incomplete once every Research task names who asked (went red, as they should)
  RED:      sends research that passes back to the role that reported the gap
            -> expected { tasks: [ { …(2) } ] } to strictly equal { tasks: [ { role: 'test', … } ] }
  GREEN:    (49 passed), hard-coded Test
  RED:      sends research for Coding that passes back to Coding
            -> expected { tasks: [ { role: 'test', … } ] } to strictly equal { … role: 'coding' … }
  GREEN:    (50 passed), by exact match against the module pipeline
  RED:      alerts a PDC coordinator when research that passes names no role it was for
            -> expected { tasks: [] } to deeply equal { Object (alert) }
  GREEN:    (51 passed)
  REFACTOR: `route` split into `revise`, `returnResearch` and `advance`
  ```

- Gate: 51 unit tests, 42 scenarios; `@wip` judge clean; mutation 120 of 120 killed.

## 2026-10-12: A knowledge gap makes a Research task ready

- Bernard, 2026-10-12: a Research task belongs to the module that reported the gap; Research
  outranks every other owner; when Research passes, the role that reported the gap gets a revision
  task carrying the brief (next slice). Precedence recorded in concept §9.
- The AutoPM table sends a knowledge gap to Research from Architecture, Specification, Test and
  Coding only. Reviewer and Security & Quality keep their "otherwise → Coding", the same literal
  reading Bernard accepted for architecture impediments; pinned by a test.
- Acceptance: `features/routing/knowledge-gaps.feature`, 5 scenarios, all red as *not yet right*
  (alerted with no task, or the Programme Architect instead of Research).
- Cycles:

  ```
  RED:      names the Research role as members know it -> expected undefined to be 'Research'
  GREEN:    (41 passed)
  RED:      makes a Research task when a failed test reports a knowledge gap
            -> expected { Object (alert) } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (42 passed), one row; Research placed last in the order
  RED:      puts research before anything else a failure reports
            -> expected { tasks: [ { …(3) } ] } to deeply equal { tasks: [ { …(3) } ] }
               (went to the Programme Architect)
  GREEN:    (43 passed), Research first
  REFACTOR: `UPSTREAM_ORDER` → `PRECEDENCE`: Research is not upstream of anyone
  RED:      makes a Research task when failed code reports a knowledge gap -> { Object (alert) }
  GREEN:    (44 passed), by generalising to the AutoPM's four roles
  PASSED FIRST TIME: Architecture and Specification (`it.each`), and a Reviewer's knowledge gap
            → Coding. Checked by planting a wrong role list (3 red).
  ```

- Known wrong guess, next slice: a Research *pass* today advances to Architecture, because
  Research is not in the module pipeline.
- Gate: 47 unit tests, 40 scenarios; `@wip` judge clean; mutation 102 of 102 killed.

## 2026-10-12: An interface impediment goes to the Programme Architect

- Concept §5 and §9: a module agent whose contract does not work raises an interface impediment;
  Divlab sends it to the Programme Architect, never to the other module. A rule for every module
  role, so it also overrides the Reviewer's and Security & Quality's "otherwise → Coding", and,
  the Programme Architect being most upstream, it outranks anything reported with it.
- Acceptance (`@wip`, all 8 red as *not yet right*: alerted with no task, or Coding / Architecture
  instead of the Programme Architect): an outline over the six module roles; a two-module project
  where the module on the other side gets no task; and a "several problems" row (Coding, an
  architecture and an interface impediment → Programme Architect).
- Cycles:

  ```
  RED:      sends a failed test reporting an interface impediment to the Programme Architect
            -> expected { Object (alert) } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (35 passed), one table row
  RED:      sends a review reporting an interface impediment to the Programme Architect, not Coding
            -> expected { tasks: [ { role: 'coding', …(2) } ] } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (36 passed), by generalising: one row per module role
  REFACTOR: none
  PASSED FIRST TIME: the same for Architecture, Specification, Coding and Security & Quality
            (`it.each`), as the generalisation implied. Checked by planting a gap that dropped two
            roles from the rule (2 red).
  ```

- The "other module gets no task" scenario guards against a future change; nothing today could
  post a task for another module, so it went red only on its Programme Architect step.
- Gate: 40 unit tests, 35 scenarios; `@wip` judge clean; mutation 98 of 98 killed.

## 2026-10-12: A revision task carries its feedback signal

- Bernard confirmed for now: Reviewer / Security & Quality fails go to Coding whatever else they
  report (may be revisited); Coding reporting an upstream ambiguity alerts a PDC coordinator;
  knowledge gaps and interface impediments alert until their own items are built.
- Concept §8: only Divlab and PDC coordinators read feedback signals; agents receive feedback as
  an input to a revision task. So a revision task carries the signal, and a task for the next role
  must not.
- Accepted work now names its feedback signal (an opaque reference; in GitHub it will be the
  merged signal's location). Core puts it on revision tasks only; Divlab passes it through.
- Acceptance: "A revision task carries the feedback signal that sent the work back", red as *not
  yet right* (a Specification task was posted, without a signal); green once Divlab carried it.
- Cycles:

  ```
  RED:      gives a revision task the feedback signal that sent the work back
            -> expected { tasks: [ { …(2) } ] } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (33 passed)
  REFACTOR: every routing test's input names a feedback signal (now required), and the expected
            revision tasks in the failure tests carry it: those expectations were incomplete once
            the input had a signal (13 went red, as they should).
  PASSED FIRST TIME: keeps the feedback signal from the next role, which only revision tasks
            receive. Guards the access rule; checked by planting the leak in `route` (8 red).
  ```

- Acceptance guard "The next role does not see the feedback signal" also passed first time;
  checked by planting the same leak (it was the only scenario to fail). The DSL's "only task"
  checks now compare role and module only.
- Gate: 34 unit tests, 27 scenarios; `@wip` judge clean; mutation 95 of 95 killed.

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
