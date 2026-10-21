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
      posting tasks as issues through `packages/github` (decision 0004).
  - [x] Divlab acts on a merge: it finds the feedback signals merged since it last ran, reads
        each, closes the task it names and routes it (in-process and against the sandbox, with
        the driver merging a real feedback signal file);
  - [x] the bundled entry point (`action.yml`, one committed file, checked fresh in CI);
  - [x] the project template's workflow (`template/`);
  - [x] the sandbox driver observing the real Action: it installs the template's workflow pinned
        to the commit under test, and waits for Divlab's run on each merge (all 57 scenarios in
        CI, about 22 minutes, 2026-10-21);
  - [ ] routing in merge order: by Divlab recording each merge it makes, and routing from those
        records rather than by listing the feedback signals (decision 0005), never from Git
        history (section 4).
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
  - [x] the sandbox run in CI on `main` (environment `sandbox`) and on demand;
  - [x] the driver waits until a ready list holds no task merged work has closed (a lagging list
        once showed a closed task in place of its replacement: 39 of 55 failed on 2026-10-13);
  - [ ] event files validated against the routing record's schema, defined once in core.
  - [ ] Divlab reads a project's whole event log however long it grows: GitHub lists at most
        1,000 files in a directory, so a busy project's log would otherwise be read in part,
        silently (re-run counts, signals already routed).
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
- [x] Coding reporting an upstream ambiguity → Specification (Bernard, 2026-10-21; the AutoPM has
      no such row, CSD's interface specifications route a specification ambiguity there). If the
      ambiguity lies further up, Specification fails upward in turn.
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
- [ ] Work for a module that is already done is refused, and the member told why: a done module
      has no open task to claim (Bernard, 2026-10-21; validated in section 4, and anything that
      reaches main another way is handled as decision 0005 says).
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
- [ ] When several members claim the same task at once, the first valid claim wins and the others
      are told the task is taken, whatever order GitHub delivers the claims in.
- [ ] A lease expires after 24 hours without activity, and the task becomes ready again.
- [ ] Submitting draft work extends the lease.
- [ ] A member can release a task early.

## 3. Eligibility and conflict of interest

- [ ] A new member cannot claim a Reviewer task.
- [ ] A member who wrote any artefact in a module cannot review that module.
- [ ] A member may hold at most one role per module.
- [ ] Linked accounts are treated as one member.

## 4. Validating contributions

- [ ] Divlab merges a contribution that passes validation (decision 0005: only Divlab merges).
  - [x] in-process: a pull request whose feedback signal Divlab can read is merged, and its work
        routed (`onPullRequest`);
  - [x] in the sandbox, as Divlab's App: a real pull request, merged by Divlab Sandbox
        (2026-10-21);
  - [x] the task the work names is closed, and Research work goes back to the role its task was
        for, as when routing a merge;
  - [x] a pull request with no feedback signal is not merged, and the member is told so
        (in-process; `@sandbox-wip` until tried against the sandbox).
- [x] The project template's pull request workflow never checks out or runs anything from the pull
      request (decision 0006): it runs as main has it, its only steps are the App's token and
      Divlab, its own token gets no permissions, it puts nothing from the event in an expression,
      and it shares the project's Divlab concurrency group (`template.test.ts`).
- [ ] Divlab's Action acts on a pull request event with `onPullRequest`, through `packages/github`
      (changed files read as data, merge, refusal comment).
  - [x] what a run is for, from its event (`whatToActOn`), and the Action's dispatch;
  - [x] the refusal comment quotes the reason so nothing a member wrote acts as Markdown;
  - [x] proved against the sandbox: the pull request merged by `divlab-sandbox[bot]`, its work
        recorded and routed, the push workflow running after it.
- [x] The alert issue's routing record stays inside its code block whatever the member's text
      says: JSON writes line breaks in strings as `\n`, so no line in the block can close it (a
      guard test, passed first time; shown to fail if the line breaks were written raw).
- [x] The sandbox driver submits work as a real pull request and waits for Divlab to merge or
      refuse it.
- [ ] Every scenario submits work as a pull request, not by writing to main directly; then each
      sandbox repository gets the ruleset with Divlab Sandbox as its only bypass (it cannot
      before: the driver's direct writes to main would be refused).
  - [x] accepted work is submitted as a pull request and merged by Divlab, in both drivers;
  - [ ] the sandbox suite's time with a pull request per merge (CI, 2026-10-21);
  - [ ] the ruleset.
- [ ] Members' pull requests come from forks; the sandbox driver submits from a fork too.
- [ ] A project's main branch admits changes only through pull requests Divlab's App merges; no
      person is exempt (template ruleset; the sandbox driver sets it up too).
- [ ] Divlab alerts PDC coordinators when a project's main branch is not protected as decision 0006
      requires.
- [ ] The tripwire leaves Divlab's own recorded merges alone.
- [ ] A contribution that fails validation is not merged, and the member is told why.
  - [x] a feedback signal Divlab cannot read (unit tests only so far);
- [ ] A contribution PDC coordinators require reviewed is merged only once a reviewer approves.
- [ ] A new project's main branch can be changed only by Divlab (project template).
- [ ] Work that reached main without Divlab merging it is not routed; it is recorded once and PDC
      coordinators are alerted (decision 0005).
- [ ] Divlab records each merge as it makes it, and routes from those records, so work is routed
      in the order Divlab merged it.
- [ ] A run interrupted between merging and recording is finished by the next run: Divlab records
      that it is about to merge before it merges, so it never has to read Git history to find out
      what it did.
- [ ] Work that touches files outside the role's write scope is rejected, naming the offending
      paths.
- [ ] Work without a valid feedback signal is rejected, saying what is missing.
- [ ] Work for a task the member has not claimed is rejected.
- [ ] Work naming a module the project does not have is refused, and so is a feedback signal
      whose role, module or impediments are not plain names: Divlab writes them into issue
      titles, labels and text, so member-chosen text must never reach them unchecked.
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
  - [x] Divlab finds the signals merged since it last ran, and routes each once;
  - [ ] work naming a task that does not exist, or is not the member's (section 4);
  - [ ] a signal that reaches `main` unreadable is recorded once as not accepted, with the
        reason, and PDC coordinators are alerted once; the other signals are still routed
        (decision 0005);
- Work from a role Divlab does not recognise is rejected, not routed (today `route` treats an
  unknown role as the start of the pipeline; untested, so section 4 must cover it).
- The task posted on GitHub links to its feedback signal at the merged commit (needs Divlab as an
  Action and `packages/github`).
- Later: a PDC coordinator reopens a done module, for example after a bug report or a Governance
  finding, and Divlab makes the right task ready. Reopening is a coordinator's deliberate step,
  never a side effect of a member's contribution (Bernard, 2026-10-21: revisit if real projects
  need more).
- (add new cases here, then place them)
