# Test list

Behaviours still to drive out, smallest useful next step first. Add a case whenever you think of
one; that is where implementation ideas go, not into code. Tick items off as they go green.

Source: `docs/Anarres_Concept.md` (Phase 1: Divlab and plugin). Order agreed with Bernard,
2026-10-12: work top to bottom.

## 0. Walking skeleton

The thinnest slice that goes end to end: one acceptance scenario through the in-process driver,
with the gate (`npm test`) and CI running.

- [x] Divlab posts the next task when work is accepted: after a Specification task for a module is
      merged with a *pass* verdict, a Test task for that module is ready to claim.

Still to finish the skeleton's pipeline (not behaviour, but the route to production):

- [x] `npm run mutate`: Stryker on `packages/core`, weekly in CI (decision 0002).
- [ ] Divlab runs as a GitHub Action: bundled entry point, triggered when a pull request is merged,
      posting tasks as issues through `packages/github`.
- [ ] GitHub sandbox driver: the same scenarios against real repositories in the sandbox
      organisation (`npm run test:acceptance:sandbox`).
  - [x] sandbox organisation and token (2026-10-13);
  - [x] driver creates and deletes a repository per scenario, observes tasks directly;
  - [x] `packages/github` representation: task, alert and finished module as issues; event as a
        file (decision 0003);
  - [x] the adapter's HTTP calls (post, alert, mark done, append, read), so scenarios pass in the
        sandbox;
  - [x] the driver observes alerts, finished modules and the event log, waiting for GitHub's
        issue lists to catch up with what the event log says Divlab did;
  - [x] one repository per run, modules aliased per scenario (one per scenario tripped GitHub's
        limit on creating repositories);
  - [x] the event log is read in one GraphQL request, not one request per event;
  - [ ] the sandbox run in CI on `main` (environment `sandbox`) and on demand;
  - [ ] event files validated against the routing record's schema, defined once in core.
  - [ ] a sweep deletes sandbox repositories left behind by an interrupted run (older than an
        hour), before each sandbox run;
  - [x] the adapter retries when GitHub rate-limits it (`retry-after`), so a busy sandbox run
        slows down instead of failing; reads also retry a failing gateway or dropped connection;
  - [ ] the sandbox run stays inside one token's hourly allowance (5,000 requests) with room to
        spare: measure it, and fail loudly before the limit rather than time out on it. Explain
        the "API rate limit exceeded" refusal of 2026-10-13, which came with allowance left;
  - [ ] appending an event costs one request, not a listing plus a write (the sequence number
        can come from the log Divlab has just read).

## 1. Routing (Divlab)

- [x] Each *pass* verdict advances to the next role in the module pipeline.
- [x] A *conditional pass* advances exactly as a *pass* does (Bernard, 2026-10-12); its open
      questions and assumptions are kept in the routing decision's event record.
- [x] A *fail* verdict reporting an upstream ambiguity sends a revision task to the role that
      owns the ambiguous artefact:
  - [x] from Test → Specification;
  - [x] from Architecture or Specification → Programme Architect, who owns the module's
        requirement slice (Bernard, 2026-10-12; the AutoPM says Requirements, which predates
        modules). If the slice is fine, the Programme Architect fails upward to Requirements.
- [x] An architecture impediment from Architecture, Specification or Coding → Architecture.
- [x] Coding failing with test failures → Coding again (Bernard, 2026-10-12). Once run history
      exists: failures stable for more than two runs → Specification.
- [x] A failed review → Coding; a review reporting a scope gap → Programme Architect.
- [x] A failed Security & Quality check → Coding.
- [x] *Blocked* routes exactly as *fail*.
- [ ] Several impediments → one revision task, for the most upstream owning role; the others ride
      along in the feedback it carries (Bernard, 2026-10-12).
  - [x] an upstream ambiguity outranks an architecture impediment;
  - [x] an architecture impediment outranks Coding's test failures (killed the surviving
        `some` → `every` mutant);
  - [x] a knowledge gap outranks everything: Research first (Bernard, 2026-10-12).
- [x] A failure that matches no rule is never guessed at: a PDC coordinator is alerted and no
      task is posted. Failure routing is now the AutoPM table, adapted for modules
      (`FAILURE_ROUTES` in core); impediments no rule covers ride along.
- [x] The PDC coordinator's alert says what was reported and why no rule matched: the alert is
      the routing record (the work as reported, with its feedback signal, and the reason).
- [ ] Candidate rule: Coding reporting an upstream ambiguity → Specification? (The AutoPM has no
      such row; Bernard, 2026-10-12: alert a PDC coordinator for now.)
- [ ] Revisit (Bernard, 2026-10-12): a Reviewer or Security & Quality fail reporting an
      architecture impediment goes to Coding, as the AutoPM table reads; Architecture may suit
      better.
- [x] A revision task carries the feedback signal that triggered it; a task for the next role
      carries none (only revision tasks receive feedback, concept §8).
- [x] An interface impediment goes to the Programme Architect, never to another module, whichever
      module role reports it and whatever else it reports.
- [x] A knowledge gap from Architecture, Specification, Test or Coding creates a Research task for
      that module (a Reviewer's or Security & Quality's goes to Coding, as the AutoPM table reads).
- [x] Research *pass* → a revision task for the role that reported the gap, carrying Research's
      feedback signal (Bernard, 2026-10-12). Research naming no such role alerts a PDC coordinator.
- [x] Research *fail* or *blocked* alerts a PDC coordinator, who decides what to do with the
      question (Bernard, 2026-10-12; no AutoPM row). Pinned by a test.
- [ ] The revision task after research lists the research brief among its inputs (needs input
      artefacts on tasks).
- [x] Security & Quality *pass* or *conditional pass* marks the module done, posting no task
      (AutoPM: "pipeline complete", "complete with caveats"; the caveats belong in the event
      record).
- [ ] Work accepted for a module that is already done → ? (ask Bernard: alert, or reopen?)
- [ ] All module pipelines done → the integration pipeline starts (concept §9; Phase 2).
- [x] Escalation: the same role is re-run more than three times → a PDC coordinator is alerted and
      no further task is posted (Bernard, 2026-10-12: per module, revision tasks only, the count
      starting again when that role's work passes).
- [x] The escalation alert names the role that is stuck. (How often is always the limit, three.)
- [ ] Other AutoPM escalations once metrics exist: ω(t) oscillation, d(t) stall, an open question
      unresolved for more than three steps.
- [x] Every routing decision is recorded as an event that names its inputs (the accepted work as
      Divlab received it) and its reason (the rule that decided it).
  - [ ] the event records when Divlab decided (injected clock, UTC);
  - [ ] each event has an identifier from an injected generator (one file per event);
  - [ ] a conditional pass's open questions and assumptions are kept in its event (needs them in
        the accepted work first);
  - [ ] the GitHub adapter writes each event as one file under `events/` in the project
        repository;
  - [ ] if acting on a decision fails after it was recorded, a re-run neither duplicates the event
        nor its tasks (idempotency, once Divlab runs as an Action).
- [ ] Once metrics exist: ρ negative for two consecutive steps alerts a PDC coordinator. Until
      then a pass advances regardless of ρ (Bernard, 2026-10-12; differs from the AutoPM table).

## 2. Claiming and leases

- [ ] A member can claim a ready task for a role they are eligible for.
- [ ] A claimed task cannot be claimed by anyone else.
- [ ] A lease expires after 24 hours without activity, and the task becomes ready again.
- [ ] Submitting draft work extends the lease.
- [ ] A member can release a task early.

## 3. Eligibility and conflict of interest

- [ ] A new member cannot claim a Reviewer task.
- [ ] A member who wrote any artefact in a module cannot review that module.
- [ ] A member may hold at most one role per module.
- [ ] Linked accounts are treated as one member.

## 4. Validating contributions

- [ ] Work that touches files outside the role's write scope is rejected, naming the offending
      paths.
- [ ] Work without a valid feedback signal is rejected, saying what is missing.
- [ ] Work for a task the member has not claimed is rejected.
- [ ] Coding work that changes tests is rejected.
- [ ] Work based on inputs that have since changed is flagged as stale.

## 4a. Any language (hosted projects)

- [ ] Coding work is accepted only when the project's own CI check passes; Divlab never runs
      project code.
- [ ] Test work is accepted when the project's report shows the new tests running and failing.
- [ ] Test counts for metrics come from the project's JUnit XML report, whatever the language.
- [ ] A project without a declared toolchain cannot be started.

## 5. The member's side (CLI and plugin)

- [ ] A member asking for work is offered ready tasks matching their eligible roles.
- [ ] Preparing a task fetches only the files the role may read, at the pinned versions.
- [ ] The read-scope hook refuses a file outside the role's scope.
- [ ] A member who runs out of allowance can hand over partial work.

## Unsorted

- Divlab reads the accepted work's module, role and verdict from the merged feedback signal
  header (today the in-process driver hands them straight to Divlab).
  - [x] reading a feedback signal (`core`): the work its header reports, and the task it names;
        a missing, unterminated or invalid header, a missing role, module or verdict,
        impediments without a type, or a task that is not text or a whole number make it
        unreadable, never guessed at;
  - [ ] a signal written with Windows line endings is read the same;
  - [ ] Divlab finds the signals merged since it last ran, and routes each once;
  - [ ] a signal that reaches `main` unreadable (validation should stop it first: section 4)
        → ? (ask Bernard: alert PDC coordinators once, and record it so it is not retried?)
- Work from a role Divlab does not recognise is rejected, not routed (today `route` treats an
  unknown role as the start of the pipeline; untested, so section 4 must cover it).
- The task posted on GitHub links to its feedback signal at the merged commit (needs Divlab as an
  Action and `packages/github`).
- Merging a member's pull request closes the task it was for (the in-process driver emulates
  GitHub doing this; the GitHub adapter and sandbox driver must show it really happens).
- (add new cases here, then place them)
