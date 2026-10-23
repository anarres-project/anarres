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
- [x] Divlab runs as a GitHub Action: bundled entry point, triggered when a pull request is merged,
      posting tasks as issues through `packages/github` (decision 0004).
  - [x] Divlab acts on a merge: it finds the feedback signals merged since it last ran, reads
        each, closes the task it names and routes it (in-process and against the sandbox, with
        the driver merging a real feedback signal file);
  - [x] the bundled entry point (`action.yml`, one committed file, checked fresh in CI);
  - [x] the project template's workflow (`template/`);
  - [x] the sandbox driver observing the real Action: it installs the template's workflow pinned
        to the commit under test, and waits for Divlab's run on each merge (all 57 scenarios in
        CI, about 22 minutes, 2026-10-21);
  - [x] no Divlab run is dropped: GitHub keeps one run waiting per concurrency group and cancels
        the rest unless the group queues them (`queue: max`); work three members submitted at
        once lost a run in the sandbox without it, and all merged with it;
  - [x] interrupted merges are finished in the order Divlab merged them (its records), not in
        the order the feedback signals are listed;
  - [x] routing in merge order: by Divlab recording each merge it makes, and routing from those
        records rather than by listing the feedback signals (decision 0005), never from Git
        history (section 4). Each merge is routed in the run that makes it, from its record;
        runs queue; interrupted merges are finished in recorded order; the listing serves only
        the tripwire.
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
  - [x] event files validated against the routing record's schema, defined once in core
        (`readRoutingRecord`): what routing reads from past records (the work's role, module and
        verdict, and the roles of the tasks decided) must be there, or the log read fails;
  - [x] the merge record's work (about to merge) is read through core too (`readMergedWork`):
        an interrupted merge is routed from it.
  - [x] Divlab reads a project's whole event log however long it grows: GitHub's contents
        listing stops at 1,000 files, and one request for 1,001 files' text failed (sandbox
        probe, 2026-10-22). The log is listed from main's Git tree and read 100 files at a time;
        a new event is numbered after the last, past 1,000 too.
  - [x] a Git tree GitHub reports as truncated (past 100,000 entries) fails the read rather than
        returning part of the log, or none of it when the top level is listed in part;
  - [ ] reading the log costs a request per 100 events on every run (about 12 at 1,000 events,
        102 at 10,000), from Divlab's App's own allowance. Deferred (Bernard, 2026-10-22) until a
        real project nears a few thousand events; then a checkpoint of what routing needs, or a
        log per module, both changing what the log holds;
  - [x] a sweep deletes sandbox repositories left behind by an interrupted run (older than an
        hour), before each sandbox run, in both sandbox organisations; only repositories a run
        makes, never one a live run may still be using;
  - [x] the adapter retries when GitHub rate-limits it (`retry-after`), so a busy sandbox run
        slows down instead of failing; reads also retry a failing gateway or dropped connection;
  - [x] the sandbox run stays inside the hourly allowance (5,000 requests) with room to spare:
        measured (a full run, 1,804 REST and 206 GraphQL requests, in CI on 2026-10-22), and a
        run does not start when GitHub reports too little left, saying when it resets. The
        allowance is counted per person, not per token, which most likely explains the refusal
        of 2026-10-13 (another loop was using the same account);
  - [ ] a run that GitHub refuses partway (the allowance spent by something else meanwhile)
        fails at once, saying so, rather than waiting out the reset until a step times out:
        between scenarios it now does (each checks first); within a scenario it still waits;
  - [ ] the sandbox driver's waiting costs most of a run's requests (checking pull requests
        while Divlab decides, issue lists while GitHub catches up): poll less often, or ask
        GitHub only once Divlab's run has finished;
  - [ ] GitHub's reading of the allowance used jumps between readings (2,141 then 726 a minute
        later, same window, 2026-10-22): find out why before relying on it more;
  - [x] appending an event costs one request once the log has been read, not a listing plus a
        write; a number another run took since is found and skipped; a write GitHub fails is
        not retried, so an event GitHub saved anyway is not recorded twice;
  - [x] the merge record (about to merge) was appended before any read, so it listed the log
        first: a pull request's run now reads the log once, first, and routing reuses it.

- [x] **Safety:** a feedback signal's file name is text the member chose, and Divlab writes it
      into issues; it must be plainly named (letters, digits and hyphens, directly in
      `feedback/`, ending `.md`; `readSignalFile` in core), or the pull request is refused, saying
      why.

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
- [x] Several impediments → one revision task, for the most upstream owning role; the others ride
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
  - [x] the event records when Divlab decided (injected clock, UTC): routing decisions carry
        `decidedAt`; the Action's clock is the wall clock, the only place it is read;
  - [x] merges begun and work not accepted record their time too;
  - [x] each event has an identifier (one file per event): its sequence number, the file's name,
        taken from the log itself, never from randomness or the clock, and unique because GitHub
        refuses a second file at the same number (adapter test: "gives a new event the next free
        number when another run has recorded one since"). Nothing to inject;
  - [ ] a conditional pass's open questions and assumptions are kept in its event (needs them in
        the accepted work first);
  - [x] the GitHub adapter writes each event as one file under `events/` in the project
        repository;
  - [x] if acting on a decision fails after it was recorded, a re-run neither duplicates the event
        nor its tasks, nor loses them: Divlab records that it acted; a decision with no such
        record is checked against the board (each issue names its decision) and acted on only if
        missing; the board is asked only then, since its lists lag;
  - [x] closing the task the work was for is finished on a re-run: the routing record keeps the
        task, and acting on a decision closes it first.
- [ ] Once metrics exist: ρ negative for two consecutive steps alerts a PDC coordinator. Until
      then a pass advances regardless of ρ (Bernard, 2026-10-12; differs from the AutoPM table).

## 2. Claiming and leases

- [ ] A member can claim a ready task for a role they are eligible for.
  - [x] a member comments to claim a task, and Divlab marks it claimed by them and assigns it
        to them (GitHub lets an issue be assigned to anyone who has commented on it);
  - [x] the comment is data: only a comment that is exactly a claim, on a task rather than a pull
        request, from a named commenter, about a task GitHub could have numbered, is a claim;
  - [x] a claimed task still shows the decision it came from was acted on;
  - [x] the sandbox runs the claiming scenario;
  - [x] the claim is recorded in the project's log, with when Divlab granted it, before the
        board shows it (auditability); the log's other readers skip claims, which are about no
        feedback signal;
  - [ ] a run that stops between recording a claim and the board showing it is finished by the
        next run;
  - [ ] refused claims are recorded too, with why;
  - [x] a claim on an issue that is not a task (an alert, a finished module, a member's own
        issue, a closed task) is refused, and the member told why;
  - [x] work whose feedback signal names an issue that is not an open task never closes it
        (found while building the claim check: before, any issue named was closed);
  - [ ] an acceptance scenario for each of these, once the harness can name a coordinator's alert
        or a finished task as the thing claimed;
  - [ ] the claimant's name is checked as a GitHub account name before Divlab uses it;
  - [ ] comments that are not claims cost Divlab as little as possible and do not hold up its
        other runs (today each one starts a short run that does nothing; filtering earlier needs
        a check on the event in the workflow, which the template tests forbid, so raise it with
        Bernard first);
  - [ ] Divlab's own comments (its refusals) never start a claim run that matters;
  - [ ] a member submitting work for a task they claimed: the driver finds claimed tasks too.
- [ ] A claimed task cannot be claimed by anyone else.
  - [x] Divlab leaves a claimed task with its holder and tells the other member it has already
        been claimed (in-process);
  - [x] only Divlab's claimed label makes a task held: someone assigned a ready task does not
        hold it;
  - [ ] the sandbox shows it: needs a second account playing another member (Bernard preparing it);
        since one-role-per-module, every scenario where one member works and another claims needs
        it too: claiming, giving back, the claim record and the draft scenario wait for it;
  - [x] a member whose claim was granted by an earlier run (which heard of another claim first)
        is left alone, not told the task is taken;
  - [ ] a member claiming again a task they already hold is told they hold it (today: silence);
  - [ ] a task labelled claimed with nobody assigned is not taken as ready.
- [ ] When several members claim the same task at once, the first valid claim wins and the others
      are told the task is taken, whatever order GitHub delivers the claims in.
  - [x] Divlab gives a ready task to the earliest claim among its issue's comments, whichever
        claim's run comes first, and each member whose claim lost is told by their own run
        (in-process);
  - [x] a task's comments are read from every page;
  - [ ] the sandbox shows it (needs the second account);
  - [x] when the earliest claim is not valid (section 3), the earliest valid one wins;
  - [x] a comment by a deleted account (GitHub gives no user) is left out, not a failure;
  - [ ] if GitHub's comment list lags and shows no claim yet, the member who asked gets the task:
        decided, kept as a test; revisit if the sandbox ever shows a list lagging that far.
- [ ] A lease expires after 24 hours without activity, and the task becomes ready again.
  - [x] when a lease runs out (at 24 hours exactly, or later), the task is ready again for anyone,
        assigned to nobody (core holds the 24 hours; Divlab checks every hour, off the hour);
  - [x] only a task's latest claim counts, and only while its member still holds the task: a
        task done, or claimed since by someone else or by the same member again, is left alone;
  - [x] the lease running out is recorded in the log, with when, before the board shows it;
  - [x] the member is told their lease ran out (a reply on the task, giving core's 24 hours);
  - [x] a claim whose recorded time cannot be read is not taken to hold forever: it has run out;
  - [ ] the sandbox shows the hourly check runs and frees nothing early (it cannot move GitHub's
        clock on 24 hours, so the scenarios that need that stay in-process);
  - [ ] GitHub turns off scheduled workflows in a public repository after 60 days without
        activity: a quiet project's leases would stop being checked;
  - [ ] work submitted for a task whose lease ran out (section 4: the task it was claimed for).
- [ ] Submitting draft work extends the lease.
  - [x] Divlab never merges a draft, and says nothing about one with no feedback signal yet;
  - [x] a draft whose feedback signal names a task the draft's author holds is recorded as
        activity on the task, and the lease runs from the latest such activity; a draft from
        anyone else renews nothing;
  - [x] Divlab runs again when a member marks a draft ready, and acts on it as on any work;
  - [x] the sandbox shows a draft is not merged and is recorded;
  - [ ] each push to a draft is activity too (the workflow runs on it; to be shown);
  - [ ] work for a task whose holder is someone else is refused (section 4);
  - [ ] the sandbox re-forks a project whose fork GitHub reports empty (seen 2026-10-23: one
        worker's fork broke mid-run while GitHub was answering 504s, failing its 8 scenarios).
- [ ] A member can release a task early.
  - [x] the member holding a task comments to give it back; Divlab records it and makes the
        task ready again; a release from anyone else changes nothing (in-process);
  - [x] the sandbox shows a release;
  - [x] someone who does not hold the task is told so;
  - [ ] the plugin hands over partial work when a member gives a task back (concept §8, partial
        work: the task is re-queued as a continuation; section 5).

## 3. Eligibility and conflict of interest

- [ ] A new member cannot claim a Reviewer task (decision 0007: what each level may take; trust
      levels and linked accounts in a reviewed file in `governance/`; the sandbox reads its own).
- [x] A member who wrote any artefact in a module cannot review that module (a case of the next).
- [ ] A member may hold at most one role per module (decision 0007: for the module's whole life;
      merged work and a held task count; Research is not a role in a module).
  - [x] core decides it: refused for other work by the member in the module, allowed for others'
        work, other modules, their own role, and Research either way;
  - [x] Divlab records who did each piece of merged work (the pull request's author), through an
        interrupted merge too, and refuses a claim that breaks the rule, saying why;
  - [x] a task is only an issue naming a role Anarres has and a module;
  - [x] a task a member holds now counts too: a claim records the task's role and module, and
        one given back or run out no longer counts; a claim record naming a role Anarres does
        not have makes the log unreadable, as other bad records do;
  - [x] when the earliest claim on a task is not allowed, the earliest that is wins; a member
        barred from the task is told why, whoever holds it;
  - [x] the sandbox shows the refusal, and that a member may revise their own role's work.
- [ ] Linked accounts are treated as one member.

## 4. Validating contributions

- [ ] Divlab merges a contribution that passes validation (decision 0005: only Divlab merges).
  - [x] in-process: a pull request whose feedback signal Divlab can read is merged, and its work
        routed (`onPullRequest`);
  - [x] in the sandbox, as Divlab's App: a real pull request, merged by Divlab Sandbox
        (2026-10-21);
  - [x] the task the work names is closed, and Research work goes back to the role its task was
        for, as when routing a merge;
  - [x] a pull request with no feedback signal is not merged, and the member is told so (in
        the sandbox too).
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
  - [x] the sandbox suite's time with a pull request per merge: all 58 scenarios in 30.5
        minutes in CI (2026-10-21), inside the 45-minute limit;
  - [x] the ruleset: every sandbox repository is set up with it.
- [x] Members' pull requests come from forks; the sandbox driver submits from a fork too, in a
      second sandbox organisation playing the members (Bernard, 2026-10-22).
- [x] **Before 2 December 2026** (GitHub's reference page still says 2 November): GitHub then
      blocks `pull_request_target` on public repositories unless an Actions policy allows it.
      `setUpProject` gives each project a repository policy allowing it for Divlab's pull request
      workflow only (an organisation policy is not enforced on GitHub Free; a repository policy
      is, probed 2026-10-22). Not checked on every run: reading the policy needs administration
      access, which Divlab's App does not hold (Bernard, 2026-10-22); without it Divlab stops
      rather than merging anything unchecked.
- [ ] Projects set up before this change (none outside the sandbox yet) need the policy added
      before 2 November.
- [x] The sandbox job's 45-minute limit was close (39 and 41½ minutes on 2026-10-22): the
      scenarios run in four parallel workers, a repository each; 11 minutes in CI.
- [ ] An intermittent sandbox failure confined to one worker's repository (d5b1284: pull
      requests never decided; 04d85ac: "too many files changed", then no tasks): not reproduced
      on demand. A failed worker now keeps its repositories: inspect them when it recurs.
- [ ] The sandbox run polls less (pull requests every 2 seconds, issue lists every half second):
      about 2,100 requests a run, mostly waiting.
- [x] The allowance check asked every sandbox run for a full run's 2,500 requests, so a run of one
      scenario was stopped too: each scenario now checks for room for itself (200) first.
- [x] A project's main branch admits changes only from Divlab's App; no person is exempt
      (`setUpProject` applies the ruleset; the sandbox refused an administrator's direct change
      while Divlab still merged and recorded, 2026-10-21).
- [x] Divlab alerts PDC coordinators when a project's main branch is not protected as decision 0006
      requires: on every run it reads the rules GitHub applies to main; it alerts once, the open
      alert being its record, and alerts again only after coordinators close it.
- [ ] Divlab cannot see who else may bypass main's rules: GitHub shows that only to those who can
      edit them, far more than Divlab should hold (tried 2026-10-21). Organisation owners and
      PDC coordinators watch for it (governance, not Divlab).
- [x] The tripwire leaves Divlab's own recorded merges alone, and acts as Divlab's App, like the
      pull request workflow (the ruleset admits nothing else).
- [ ] A contribution that fails validation is not merged, and the member is told why.
  - [x] a feedback signal Divlab cannot read (unit tests only so far);
- [ ] A contribution PDC coordinators require reviewed is merged only once a reviewer approves.
- [x] A new project's main branch can be changed only by Divlab (`setUpProject`; a ruleset is a
      repository setting, not a template file).
- [x] Work that reached main without Divlab merging it is not routed; it is recorded once and PDC
      coordinators are alerted (decision 0005). The tripwire never reads it: with no record of a
      Divlab merge, whatever it says, it did not come through Divlab.
- [ ] Anything else that reaches main without Divlab (a change with no feedback signal at all):
      the tripwire today looks only at feedback signals.
- [x] Divlab records each merge as it makes it, and routes from those records, so work is routed
      in the order Divlab merged it.
- [x] A run interrupted between merging and recording is finished by the next run: Divlab records
      that it is about to merge, with the work it checked, before it merges, so the tripwire
      finishes from that record and never reads Git history (in-process; the sandbox cannot stop
      the real Action on cue, so the scenario is `@sandbox-wip`).
- [ ] Work that touches files outside the role's write scope is rejected, naming the offending
      paths.
- [ ] Work without a valid feedback signal is rejected, saying what is missing.
- [ ] Work for a task the member has not claimed is rejected.
- [x] A feedback signal whose role, module, verdict or impediment types are not plain names
      (lower-case letters and digits joined by single hyphens or underscores, at most 40 long) is
      unreadable: Divlab writes them into issue titles, labels and text. The member is told why
      (in the sandbox too).
- [ ] Work naming a module the project does not have is refused (needs the Programme Architect's
      `modules.yaml`; until then a project has one module: concept §5, "start whole").
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
