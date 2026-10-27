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
  - [x] writes GitHub answers with a server error (seen 2026-10-26: a 502 making a member's branch
        in a fork, from the sandbox driver; a 500 on Divlab's merge, whose run then failed): a
        merge GitHub did not make is asked for again, up to three times (it merges only the
        commit Divlab read, so never twice); a member's branch is asked for as a write safe to
        repeat, since asking again finds it made; the sandbox driver's branch the same; the
        merge is a write safe to repeat, paused between asks, and a merge still in progress is
        waited out (seen 2026-10-26: retried at once, it was refused as already in progress);
        a refused merge that an earlier ask made carries on with its commit;
  - [x] a task marked claimed or ready again, and an issue closed (a task's, or a finished
        module's), are writes safe to repeat: each sets the whole set of labels and assignees, or
        the state, so repeating it changes nothing more;
  - [x] an event file GitHub's server failed to write: the file is looked at; holding this
        event, it was saved and the run carries on; missing, it is written again, up to three
        times in all, then the run fails;
  - [x] an event file found holding another event after a server error (another run took the
        number meanwhile): the event gets the next free number rather than failing the run;
  - [ ] pause between asking again for an event file, as the merge does, if the sandbox shows
        back-to-back asks failing;
  - [x] an issue GitHub's server failed to open (seen 2026-10-26: a 502 failed a Divlab run):
        the project's open issues are looked at; one with the same title and body means it was
        opened; otherwise it is opened again, three times in all; a closed issue saying the same
        does not count;
  - [x] a comment GitHub's server failed to post (a refusal, a lease run out, a pull request
        refused): Divlab may rightly say the same twice, so it counts its own comments saying
        the same before posting, and after a server error counts again: one more means posted;
        otherwise it posts again, three times in all. Read from every page; a member's comment
        saying the same words does not count. Costs one read of the comments per comment posted;
  - [x] the sandbox run stays inside the hourly allowance (5,000 requests) with room to spare:
        measured (a full run, 1,804 REST and 206 GraphQL requests, in CI on 2026-10-22), and a
        run does not start when GitHub reports too little left, saying when it resets. The
        allowance is counted per person, not per token, which most likely explains the refusal
        of 2026-10-13 (another loop was using the same account);
  - [x] a run that GitHub refuses partway (the allowance spent by something else meanwhile)
        fails at once, saying so, rather than waiting out the reset until a step times out:
        between scenarios each checks first, and within one the driver's requests no longer
        wait out a spent allowance (Divlab's own still do);
  - [x] the sandbox driver's waiting costs most of a run's requests (checking pull requests
        while Divlab decides, issue lists while GitHub catches up): it polls less often since
        c5666a4 (about 3,100 requests a full run before; 2,466 for 83 scenarios after, 2,739 for
        87); asking only once Divlab's run has finished is the next step if it is needed;
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
- [x] Work for a module that is already done is refused, and the member told why: a done module
      has no open task to claim (Bernard, 2026-10-21; validated in section 4, and anything that
      reaches main another way is handled as decision 0005 says). Shown 2026-10-27: work naming
      the module's finished task is refused, since nobody holds a closed task.
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
  - [x] a run that stops between recording a claim and the board showing it is finished by the
        next lease check: a claim the log holds, not given back or run out since, whose task the
        board shows unclaimed, is marked claimed;
  - [x] refused claims are not recorded in the log (Bernard, 2026-10-24): Divlab's reply on the
        task, saying why, is the record; the log holds the decisions that change a task's state;
  - [x] a claim on an issue that is not a task (an alert, a finished module, a member's own
        issue, a closed task) is refused, and the member told why;
  - [x] work whose feedback signal names an issue that is not an open task never closes it
        (found while building the claim check: before, any issue named was closed);
  - [x] an acceptance scenario for a finished task claimed (in-process and in the sandbox);
  - [x] an acceptance scenario for an alert to PDC coordinators claimed (in-process and in the
        sandbox);
  - [x] an acceptance scenario for a member's own issue claimed (in-process and in the sandbox);
  - [x] an acceptance scenario for a finished module's issue claimed (in-process and in the
        sandbox);
  - [x] the claimant's name is checked as a GitHub account name before Divlab uses it (claims
        and releases): anything else, a bot's included, is refused;
  - [ ] comments that are not claims cost Divlab as little as possible and do not hold up its
        other runs (today each one starts a short run that does nothing; filtering earlier needs
        a check on the event in the workflow, which the template tests forbid, so raise it with
        Bernard first);
  - [x] Divlab's own comments (its refusals) never start a claim run that matters: a claim is
        exactly `/claim`, which they never are ("does nothing for a comment that is not a claim");
  - [x] a member submitting work for a task they claimed: the driver finds claimed tasks too
        (both drivers look among claimed tasks as well as ready ones).
- [ ] A claimed task cannot be claimed by anyone else.
  - [x] Divlab leaves a claimed task with its holder and tells the other member it has already
        been claimed (in-process);
  - [x] only Divlab's claimed label makes a task held: someone assigned a ready task does not
        hold it;
  - [x] the sandbox shows it: a second account plays a second member (Bernard, 2026-10-23), and
        a third account (`anarres-sandbox-member-c`, Bernard, 2026-10-26) the third, for the
        scenarios with three members (the earlier work's, Alice and Bob): this one, giving back
        only by the holder, and a task given back going to the next claim;
  - [x] a member whose claim was granted by an earlier run (which heard of another claim first)
        is left alone, not told the task is taken;
  - [x] a member claiming again a task they already hold is told they hold it: by their CLI,
        which reads Divlab's label and assignee (`claimOutcome`), so Divlab need not reply;
  - [x] a task labelled claimed with nobody assigned is not taken as ready: it stays with the
        member Divlab's log says it gave it to, and a new claim is told it is taken;
  - [x] such a task's holder gets it back on the board at the next lease check (Divlab assigns
        it to them again from its log), so their CLI, which reads the assignee, sees it theirs;
  - [x] a task labelled claimed that the log has no claim for (Bernard, 2026-10-26): Divlab's
        hourly check records what it found, makes the task ready again and alerts PDC
        coordinators, naming whom the task showed as holding it, if anyone (in-process; Divlab's
        runs for a project queue one at a time, so the check never sees a claim half made);
  - [x] the sandbox shows it: the driver runs the lease check by hand (the sandbox token has
        "Actions: Read and write", Bernard, 2026-10-27); the task is assigned to Mallory's account
        once it has commented, as GitHub requires;
  - [x] a claim the log shows given back or run out, but still labelled claimed (a run stopped
        between recording and the board): the hourly check makes the task ready, with no alert,
        no new record and no word to the member (before, a task given back was left claimed,
        then reported as a lease run out, and one whose lease ran out was reported twice);
  - [x] the claimed tasks are read from every page, however many are claimed;
  - [x] the ready tasks a member is offered, and the tasks a member holds, are read from every
        page, as the claimed tasks are;
  - [x] the record of a task shown as claimed is read back checking whom it names too: an
        account, or nobody; anything else is refused as unreadable.
- [ ] When several members claim the same task at once, the first valid claim wins and the others
      are told the task is taken, whatever order GitHub delivers the claims in.
  - [x] Divlab gives a ready task to the earliest claim among its issue's comments, whichever
        claim's run comes first, and each member whose claim lost is told by their own run
        (in-process);
  - [x] a task's comments are read from every page;
  - [x] the sandbox shows it (with the third account, 2026-10-26);
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
        clock on 24 hours, so the scenarios that need that stay in-process): "Divlab's check
        leaves a task with its holder while their lease runs" runs the check by hand, without
        moving the clock; passes in-process (first time: a regression scenario there), and is
        `@sandbox-wip` until it has passed against the sandbox;
  - [x] GitHub turns off scheduled workflows in a public repository after 60 days without
        activity: a claim on a task whose lease has run out now ends the lease there and then,
        so no task waits on the hourly check;
  - [x] when a task is free again (given back, or its lease run out), only claims made since
        count: before, a task given back went straight back to its old claimant;
  - [x] work submitted for a task whose lease ran out is merged while its member still holds it
        (Bernard, 2026-10-27; see section 4).
- [ ] Submitting draft work extends the lease.
  - [x] Divlab never merges a draft, and says nothing about one with no feedback signal yet;
  - [x] a draft whose feedback signal names a task the draft's author holds is recorded as
        activity on the task, and the lease runs from the latest such activity; a draft from
        anyone else renews nothing;
  - [x] Divlab runs again when a member marks a draft ready, and acts on it as on any work;
  - [x] the sandbox shows a draft is not merged and is recorded;
  - [x] each push to a draft is activity too: the workflow runs on it (`synchronize`), and
        Divlab records the draft again (in-process; `@sandbox-wip`, GitHub's clock);
  - [ ] work is merged only from the member Divlab shows holding the task it is for, so the
        checks made when a task is claimed (eligibility, conflict of interest) hold for the work
        too (Bernard, 2026-10-27; before, Divlab checked the holder for drafts only):
    - [x] a module starts with its first task ready, Specification, so all work has a task
          (Bernard, 2026-10-27; until the Programme Architect's `modules.yaml` exists, a
          project's modules are named when it is set up). `startModule` posts it, and its issue
          says it was posted as the module began, with no decision behind it;
    - [x] scenarios that begin a module partway along its pipeline have the module set up as it
          would stand: its earlier tasks done and the task for the work's role ready (walking
          the pipeline would cost several Divlab runs a scenario in the sandbox); the member then
          claims it through Divlab before submitting. Work a scenario names no member for is
          done by an unnamed member trusted as far as its role needs, one for each role in a
          module; in the sandbox the sandbox token's account plays them, recorded as trusted in
          the sandbox's governance file as a standing record (Bernard, 2026-10-27);
    - [x] the sandbox shows it (eb2a206: 80 of 80). Claiming first cost far more than the 10
          minutes expected (runs cut off at 45 minutes, 2026-10-27), so routing-table outlines
          keep one row in the sandbox and the rest run in-process only, and the job's limit is
          60 minutes (Bernard, 2026-10-27);
  - [x] Divlab says in its run's log when it waits on GitHub (a rate limit, or a server error),
        and for how long, so a run that sits silent explains itself (2026-10-27: a run sat ten
        minutes without a word, most likely waiting out secondary limits);
    - [x] work that does not say which task it was for is refused, and its member told why;
    - [x] work naming a task Divlab did not post, or has closed, is refused: nobody holds it;
    - [x] work from a member other than the task's holder is refused with a plain refusal (no
          alert unless one turns out to be needed: Bernard, 2026-10-27);
    - [x] a holder whose lease has run out, while Divlab still shows them holding the task, has
          their work accepted (Bernard, 2026-10-27; in-process only, `@sandbox-wip`: the
          sandbox cannot move GitHub's clock);
  - [x] the sandbox re-forks a project whose fork GitHub reports empty (seen 2026-10-23: one
        worker's fork broke mid-run while GitHub was answering 504s, failing its 8 scenarios):
        once the wait for a new fork runs out, the fork is deleted and made again, once. Not
        reproducible on cue; it logs when it happens.
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
  - [x] core holds each role's lowest level, once, and reads a member's level from the file as
        data: unlisted, unknown, malformed or missing all mean new;
  - [x] Divlab refuses a claim the member's level does not allow, saying which level the task
        needs; it reads Anarres's governance file unless the organisation's settings name
        another; a file it cannot read gives nobody any trust;
  - [x] `governance/members.json` exists (empty: everyone new), and CI checks every level in it;
  - [x] the sandbox shows it, with its own governance file (`anarres-sandbox/governance`, named
        by the organisation's `ANARRES_GOVERNANCE`), linked accounts too;
  - [x] an empty setting means Anarres's own file (written with the setting; its test passed
        the first time it ran, kept as a regression test);
  - [ ] risk marking: a PDC coordinator marks a module high-risk, and new members may not code
        it (until then every module is low-risk, decision 0007).
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
- [x] Linked accounts are treated as one member: the governance file lists them under the
      member; Divlab judges every claim by member, for trust and for one role per module; CI
      checks no account is linked twice (in-process; the sandbox needs its governance file and a
      second account).
  - [x] a member's merged work recorded under one account and claims under another, before the
        link was made, are still one member: shown both ways round (the rules read the file at
        claim time; the second test passed first time, kept as a regression test);

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
- [x] Projects set up before this change (none outside the sandbox yet) need the policy added
      before 2 November: none (2026-10-27): the sandbox makes its projects afresh each run, with
      the policy, and no other project exists yet.
- [x] The sandbox job's 45-minute limit was close (39 and 41½ minutes on 2026-10-22): the
      scenarios run in four parallel workers, a repository each; 11 minutes in CI.
- [ ] An intermittent sandbox failure confined to one worker's repository (d5b1284: pull
      requests never decided; 04d85ac: "too many files changed", then no tasks): not reproduced
      on demand. A failed worker now keeps its repositories: inspect them when it recurs.
- [x] The sandbox run polls less: merges and finished runs every 5 seconds, decisions every 3
      (2026-10-24, from about 3,100 requests a run): c5666a4's full run took 2,466 (640, 577,
      599 and 650 across its four workers), and passed.
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
      the tripwire today looks only at feedback signals. Bernard, 2026-10-23: each Divlab run
      checks main's commits since its last check. A commit is Divlab's if GitHub signed it as
      made by Divlab's App (its log writes) or it is a merge Divlab recorded: a merge's commit
      carries the member as author, so only Divlab's record tells it apart (seen in the sandbox).
  - [x] Divlab records the commit each merge made;
  - [x] a merge finished by a later run, after an interrupted one, has its commit recorded too,
        as GitHub gives it;
  - [x] each run checks the commits since the last check, alerting once for any not Divlab's,
        and records how far it checked; a project never checked starts from main as it stands
        (its setting up), with no alert;
  - [x] Divlab knows its App's account name (the template passes the App's slug);
  - [x] "signed by GitHub" means committed as `web-flow` and verified: a member's own signature
        is not GitHub's;
  - [x] the sandbox shows a change caught, and no false alarm from Divlab's own merges and log
        writes (826cbed: all 79 sandbox scenarios passed with the check after every run);
  - [ ] a project's setup records where checking starts, closing the gap before Divlab first runs
        (weighed 2026-10-24 and left for now: setup protects main first, so the gap is narrow,
        and recording means writing an event to main, which in the sandbox starts an extra
        Divlab run in every scenario; revisit with a real setup command);
  - [x] more than 250 commits between checks (GitHub compares no more at once): every page of
        the comparison is read, stopping at an empty page whatever GitHub's count says;
  - [x] a feedback signal put straight onto main raises two alerts (not routed; a change not by
        Divlab): both kept for now (Bernard, 2026-10-24), as they say different things; revisit
        once coordinators have used them;
- [x] Divlab records each merge as it makes it, and routes from those records, so work is routed
      in the order Divlab merged it.
- [x] A run interrupted between merging and recording is finished by the next run: Divlab records
      that it is about to merge, with the work it checked, before it merges, so the tripwire
      finishes from that record and never reads Git history (in-process; the sandbox cannot stop
      the real Action on cue, so the scenario is `@sandbox-wip`).
- [x] Work that touches files outside the role's write scope is rejected, naming the offending
      paths: core holds the access matrix's write scopes, once, and one feedback signal per task;
      a path with an empty, `.` or `..` part, or a backslash, is outside every scope (in-process);
  - [x] the sandbox shows it;
  - [ ] the read scopes, for the plugin's sparse checkout and hooks (section 5).
- [x] Work without a valid feedback signal is rejected, saying what is missing: no signal, names
      that are not plain, and (a scenario passing first time, kept as a regression test) a
      signal that leaves out its verdict;
  - [x] the sandbox shows the missing-verdict scenario (2026-10-24).
- [x] Work for a task the member has not claimed is rejected (2026-10-27: work is merged only
      from the member Divlab shows holding its task; section 3).
- [x] A feedback signal whose role, module, verdict or impediment types are not plain names
      (lower-case letters and digits joined by single hyphens or underscores, at most 40 long) is
      unreadable: Divlab writes them into issue titles, labels and text. The member is told why
      (in the sandbox too).
- [ ] Work naming a module the project does not have is refused (needs the Programme Architect's
      `modules.yaml`; until then a project has one module: concept §5, "start whole").
- [x] Coding work that changes tests is rejected (a case of the write scopes).
- [ ] Work based on inputs that have since changed is flagged as stale.

## 4a. Any language (hosted projects)

- [ ] Coding work is accepted only when the project's own CI check passes; Divlab never runs
      project code (decision 0010, Bernard, 2026-10-27: Coding only; the template's check, by a
      name it fixes; a holder's push to their pull request renews the lease, draft or not):
  - [x] Coding work whose check failed on the commit Divlab read is not merged, and the member
        is told, with a link (in-process; `@sandbox-wip` until the sandbox's projects have the
        checks workflow); the adapter reads GitHub Actions' run of `project-tests`;
  - [x] while the check is still running, or has not started, Divlab does nothing and says
        nothing (in-process; `@sandbox-wip`);
  - [x] Divlab acts again when the project's checks workflow completes (`workflow_run`), on the
        open pull requests at that commit, found by their head, as GitHub's event names none for
        a pull request from a fork (in-process; `@sandbox-wip`);
  - [ ] the template's Divlab workflow runs when the checks workflow completes, and only then;
  - [ ] a check counts only if GitHub Actions made it in the project's repository, by the
        template's checks workflow, for the commit Divlab merges;
  - [ ] other roles' work needs no check;
  - [ ] the template's checks workflow runs the test command `anarres.yaml` declares, in its dev
        container image, on every pull request;
  - [ ] a push by the task's holder to their pull request for it renews the lease, draft or not;
  - [ ] the sandbox shows it: a project whose tests pass or fail on cue.
- [ ] Test work is accepted when the project's report shows the new tests running and failing.
- [ ] Test counts for metrics come from the project's JUnit XML report, whatever the language.
- [ ] A project without a declared toolchain cannot be started.

## 5. The member's side (CLI and plugin)

- [ ] A member asking for work is offered ready tasks matching their eligible roles.
  - [x] the CLI (`packages/cli`, `askForWork`) offers the ready tasks across Anarres's projects
        the member may take, by the same rule Divlab applies to claims (`eligibility`, exported
        from Divlab, so the rule is stated once) (in-process);
  - [x] a task naming a role Anarres does not have is left out (shown failing without the check);
  - [x] the CLI reads Anarres's projects from GitHub with the member's own login: which projects
        have ready tasks (one search of the organisation's issues), each one's ready tasks, its
        log, the governance file (the adapter's);
  - [x] the sandbox shows it, the member's own account asking through the CLI;
  - [ ] GitHub's search lags behind new issues: a task posted moments ago may not be offered yet
        (the sandbox driver waits for it; a member would ask again);
  - [x] the `anarres next` command: the member's own GitHub CLI login, one task to a line, and
        a word when nothing is ready (tried against the sandbox as the second account);
  - [x] only tasks with plain module names are offered: what the CLI prints reaches the member's
        Claude session, and labels can be changed by anyone who triages (core's `isPlainName`,
        the rule Divlab applies to feedback signals);
  - [x] `/anarres:next` in the plugin: this repository is the plugin's marketplace, and the
        plugin's `next` skill may run one thing without asking, the CLI bundled inside the plugin
        (an installed plugin reaches nothing outside its folder); it shows the offers as printed
        and treats them as data;
  - [x] the plugin validated by Claude Code itself in CI (`claude plugin validate`, pinned, no
        login needed), the plugin and its marketplace both; its warnings (no icon, no version)
        are for when the plugin is listed;
  - [x] claiming from the plugin: `anarres claim project#number` posts Divlab's claim comment as
        the member (the text defined once, in Divlab), checking the name strictly first; the
        skill may run it, and both drivers now claim through it;
  - [x] the CLI says how a claim went (held by the member, by someone else, not yet, or no
        task), waiting up to a minute and a half, from what Divlab sets on the task, never the
        text of replies;
  - [x] preparing the claimed task (`anarres prepare`, the next item);
  - [ ] offers are ranked by priority and size (concept §8).
- [ ] Preparing a task fetches only the files the role may read, at the pinned versions.
  - [x] core holds the access matrix's read scopes beside its write scopes, once: each module
        role reads its own module's places and its requirement slice (`programme/slices/<m>/`),
        never another module's, and no path that climbs out;
  - [ ] the contracts a module provides and uses (needs the Programme Architect's modules.yaml);
  - [ ] what a Research task reads, as its question names it;
  - [x] Divlab posts each task with the commit its inputs are pinned at, the merge that decided
        it, in the issue's words and its decision block; read back only if it is a commit name;
  - [ ] a task decided by work Divlab did not merge (none yet: only merged work is routed) has no
        pinned commit; the CLI must refuse to prepare one;
  - [x] the CLI's `prepare` fetches those places at that commit, and nothing else: for a task the
        member holds, with a pinned commit (else it says why not), a sparse checkout of exactly
        the role's read scope, by git commands run without a shell (tried by hand against this
        repository); the skill may run it;
  - [ ] an acceptance scenario: a member prepares a task they hold and has only its role's inputs
        (needs the harness to look at what was fetched);
- [ ] The read-scope hook refuses a file outside the role's scope.
  - [x] the plugin's PreToolUse hook, on Claude's file tools (Read, Edit, Write, Glob, Grep),
        refuses, with a reason Claude sees, a read outside the role's read scope, a write outside
        its write scope, and anything outside the task's folder; a folder whose record cannot be
        read is refused entirely; outside any task folder it says nothing (tried by hand with the
        bundle);
  - [x] its limits, stated (concept §10): it judges Claude Code's file tools only; the hard
        boundary is the sandbox or dev container, and permission rules;
  - [x] NotebookEdit is judged as a write of its notebook, and the hook's matcher sends it to
        the hook; a tool the hook does not know is refused in a task's folder, saying so;
  - [ ] a file tool Claude Code adds later reaches the hook only once the matcher names it (the
        matcher cannot be "every tool": Bash must run the CLI): check Claude Code's tools when
        updating it.
- [ ] A member who runs out of allowance can hand over partial work (decision 0008).
  - [x] a feedback signal's `status: partial` is read; core routes partial work to a continuation
        for the same role, carrying its signal, never on to the next role; Divlab merges it and
        posts the continuation, labelled so;
  - [x] a continuation reads its role's own place too: `prepare` fetches it and the hook allows
        it (core's rule, under the same path check: no climbing out);
  - [x] the sandbox shows it (84 requests);
  - [x] the plugin's handover: the skill tells Claude to write the signal with `status: partial`
        and a handover note when allowance runs low, and to submit it, not as a draft;
- [ ] The plugin submits a member's work (concept §8, step 6): writes the feedback signal naming
      the task, commits only the role's write place and the signal to a branch of the member's
      fork, and opens the pull request; a draft early on counts as activity on the lease.
  - [x] before anything is sent, the CLI checks the work as Divlab will: one readable feedback
        signal naming the task, from the task's role and module, and nothing changed outside the
        role's place, saying what is wrong;
  - [x] the fork, the branch and the pull request, through GitHub's API with the member's login
        (no git credentials needed): an existing branch or open pull request is reused, as after
        a draft; `anarres submit project#number [--draft]` takes what changed in the task's
        folder; the skill may run it; both drivers submit through it in a new scenario;
  - [x] the sandbox shows it (75 requests);
  - [x] a draft submitted, then the work finished: the same pull request is marked ready (through
        GitHub's GraphQL API, the only way), failing out loud if GitHub refuses; Divlab's workflow
        runs when a draft is marked ready.
- [ ] `/anarres:status` (concept §10): where the member's work stands.
  - [x] each task the member holds, across Anarres's projects, and when its lease runs out (a day
        from the claim or the member's latest work since, by Divlab's own lease rule); only plain
        names shown; `anarres status`, and the `/anarres:status` skill that may run only it; both
        drivers ask through the CLI;
  - [x] the sandbox shows it, and the draft scenario (2026-10-24, run locally; the sandbox's draft
        now goes through the CLI's `submit --draft`, from the task's branch, as the plugin's does);
  - [x] a held task whose claim the log does not record, or whose time cannot be read: its lease
        has run out and Divlab frees it at its next check, as Divlab takes such a time to be long
        past (it threw before); the lease-end rule is now in core once, `leaseRunsOutAt`;
  - [x] the member's open pull request for each task they hold, from the task's branch: a draft,
        or finished work Divlab has not merged (it answers on it); a new scenario, in both drivers;
  - [x] more than 100 open pull requests in a project: every page is read;
  - [x] the member's contribution history (concept §10; Bernard, 2026-10-24): each piece of
        their work Divlab merged, per project, from the event logs: project, role, module and
        day, plain names only; a scenario in both drivers;
  - [x] the sandbox shows the history (2026-10-24).
- [ ] `/anarres:resume` (concept §10): continuing a held task in a new session.
  - [x] on the same machine: `anarres resume project#number` says the task's folder while the
        member holds it, refuses once they no longer hold it, and says to prepare it if it was
        never prepared here; the `/anarres:resume` skill may run resume, prepare and submit; two
        scenarios, in-process (the sandbox driver has no member's machine yet: `@sandbox-wip`);
  - [x] in a new session, the hook lets Claude read back its own work, where its role writes, in
        the task's folder (decision 0009);
  - [x] on another machine, or after the folder is lost: preparing brings back the member's own
        work so far from their open pull request for the task, through GitHub's API: only its
        files in the role's own place (one feedback signal), never overwriting a file already in
        the folder (`restoreDraft`, `draftToRestore`);
  - [x] an acceptance scenario for it: a member with a draft open prepares the task on another
        machine and finds their work so far in its folder (in-process and in the sandbox, 2026-10-24;
        the drivers now look in the folder);
  - [x] the sandbox driver plays a member's machine (a temporary folder, cleared after each
        scenario), so prepare fetches a real task's inputs with git, and resume runs, there too;
        the record prepare writes is made in one place, `taskRecord`;
  - [x] the sandbox shows them (2026-10-24, run locally);
  - [x] the next and resume skills both carry the instructions for doing and submitting the
        work: now said once, in a shared part the bundle puts into both skills (not a file the
        skills read: the read-scope hook would refuse it inside a task's folder).

## Unsorted

- Divlab reads the accepted work's module, role and verdict from the merged feedback signal
  header (today the in-process driver hands them straight to Divlab).
  - [x] reading a feedback signal (`core`): the work its header reports, and the task it names;
        a missing, unterminated or invalid header, a missing role, module or verdict,
        impediments without a type, or a task that is not text or a whole number make it
        unreadable, never guessed at;
  - [x] a signal written with Windows line endings is read the same;
  - [x] Divlab finds the signals merged since it last ran, and routes each once;
  - [ ] work naming a task that does not exist, or is not the member's (section 4);
  - [x] a signal that reaches `main` unreadable is recorded once as not accepted, with the
        reason, and PDC coordinators are alerted once; the other signals are still routed
        (decision 0005): Divlab refuses an unreadable signal's pull request, so one can reach
        main only without Divlab, which is recorded and alerted once as reaching main without
        Divlab merging it;
- [x] Work from a role Divlab does not recognise is rejected, not routed: the member is told the
  role is not one Anarres has.
- [x] The task posted on GitHub links to its feedback signal at the merged commit.
- Later: a PDC coordinator reopens a done module, for example after a bug report or a Governance
  finding, and Divlab makes the right task ready. Reopening is a coordinator's deliberate step,
  never a side effect of a member's contribution (Bernard, 2026-10-21: revisit if real projects
  need more).
- (add new cases here, then place them)
