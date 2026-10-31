# 0018: The sandbox runs the scenarios chosen for it

**Status:** Proposed, 2026-10-31, for Bernard to decide.

## Context

Every scenario runs against the GitHub sandbox unless it is tagged out (`@sandbox-wip`,
`@in-process-only`). With each feature the run has grown: on 31 October it was 109 scenarios and
715 steps, about 70 minutes in four workers, against a job limit of 90. Twice in recent days
scenarios timed out while GitHub's runners were slow, though Divlab worked.

The time is not in the steps as such. A check or a plain arrangement is cheap. What costs is
each piece of work a scenario puts through Divlab ("a member's Coding work … was accepted", "…
submits"): a real pull request from a fork, a claim comment, a Divlab run (15 to 20 seconds, more
when GitHub is slow), sometimes the project's checks, then waiting until GitHub's lists show the
result. A scenario that begins partway along a pipeline does several of these before its When.

The sandbox is there to prove what the in-process run cannot (`docs/SANDBOX.md`, "What it proves
beyond the in-process run"): the bundle works as an Action; the App's permissions are enough; pull
requests from forks are handled without running their code; the adapter uses GitHub's real API
correctly; Divlab's runs take turns; and all of it copes with GitHub's delays. Which role routing
chooses is pure code in `packages/core`, proved by unit tests and in-process on every commit. A
second failure route through the sandbox proves nothing the first did not. The same reasoning
already keeps one row of each routing table in the sandbox (Bernard, 2026-10-27).

Opting out makes the sandbox grow with every feature, whether or not the feature touches GitHub
in a new way, until it hits its limit.

## Proposal

- **Opt in.** A scenario runs in the sandbox only when tagged `@sandbox`. The sandbox profile
  becomes `@sandbox and not @wip`. Every scenario still runs in-process on every commit, so no
  behaviour loses its check.
- **What earns the tag:** the scenario exercises a path to or from GitHub that no other `@sandbox`
  scenario does: a kind of write (merge, refusal, comment, issue, label, close, event log), a
  workflow and its trigger, forks, protection, the governance file, the project's checks and test
  report, reviews, or a timing GitHub alone produces (runs taking turns, claims made together,
  lists lagging). A few scenarios that go through several merges stay as well, as they have
  caught timing bugs before.
- **`@sandbox-wip` and `@in-process-only` go.** Under opt-in, a scenario not in the sandbox needs
  no tag. One that should be but cannot yet keeps a comment saying why, and goes on the test list.
- **Adding to it:** a new feature adds a `@sandbox` scenario only where it reaches GitHub in a new
  way, and the commit says which path.
- **The tags are where the list lives.** The list below is this proposal's starting point; once
  the tags are in, the feature files are the record, and `docs/SANDBOX.md` says what each group
  shows.

## Proposed list (about 40 of the 109)

Each with the path it shows. Everything not listed runs in-process only.

**Members, through the CLI against real GitHub (6)**
- finding-work: *A member is offered the ready tasks they may take* (listing issues across projects).
- finding-work: *A member's work submitted through the plugin is merged* (the CLI's submit, end to end).
- giving-back: *A member gives back a task they have done nothing on, and it is ready for others* (the release comment).
- preparing: *A member preparing a Test task has its module's architecture and specification, and nothing of another module* (reading files as data).
- preparing: *A member preparing a task has its module's contracts as they were when the task was posted* (reading at a pinned commit).
- resuming: *A member preparing a task on another machine gets back their work so far* (the draft branch).

**Projects (8)**
- protected-main: *A change to main from anyone but Divlab is refused* (the ruleset).
- protected-main: *Work that reaches main without Divlab merging it is never routed* (the tripwire).
- protected-main: *Divlab alerts PDC coordinators, once, when a project's main branch is not protected*.
- protected-main: *Divlab's own changes to main raise no alarm*.
- pull-request-checks: *A project is set up to let only Divlab check members' pull requests* (the Actions policy).
- starting: *A new project starts with a Programme Architect task for the programme*.
- starting: *The Programme Architect's modules start once its work is merged*.
- toolchain: *A project that declares no toolchain is not started*.

**Routing (9)**
- next-task: *Passed work makes the next role's task ready*.
- failed-work: *A revision task carries the feedback signal that sent the work back*.
- coordinator-alerts: *An alert for a problem no rule covers says what was reported* (the alert issue).
- decision-record: *The record keeps everything the work reported* (the event log, written and read back).
- module-completion: *A passed security and quality check completes the module* (the done label).
- stale-work: *Work whose requirement slice changed after its task was posted goes back to its role* (comparing commits).
- stale-work: *A revised contract sends a module that is done back to Architecture at once* (modules.yaml at two commits).
- state: *Divlab records how many of the project's tests pass as its Test and Coding work is merged* (the test report artefact).
- integration: *The integration pipeline runs from the last module done to the programme done* (several merges in a project of its own).

**Tasks (17)**
- claiming: *A member claims a ready task*.
- claiming: *Of two claims made together, the first made wins, whichever Divlab hears of first* (GitHub's ordering).
- claiming: *Only the member holding a task can give it back* (a refusal comment).
- claiming: *An alert to PDC coordinators cannot be claimed*.
- eligibility: *A member who wrote a module's code cannot review it* (`@governance`).
- eligibility: *Accounts a PDC coordinator has linked are one member* (`@governance`).
- human-review: *Work on a module PDC coordinators require reviewed waits for a reviewer's approval* (`@governance`).
- human-review: *Work on a module PDC coordinators require reviewed is merged once a trusted member approves it* (GitHub's reviews; `@governance`).
- human-review: *Divlab alerts PDC coordinators, once, when it cannot read which modules need review* (`@governance`).
- leases: *Divlab does not merge draft work*.
- leases: *A task shown as claimed that Divlab never gave anyone is made ready again* (the lease workflow, run by hand).
- merged-work: *Merging a member's work closes the task it was for*.
- project-checks: *Coding work whose tests fail is not merged, and the member is told why* (the project's real checks).
- submitted-work: *Work that passes validation is merged and routed*.
- submitted-work: *Work several members submit at once is all merged* (runs taking turns).
- submitted-work: *Work from a member who does not hold its task is not merged, and they are told why*.
- submitted-work: *Work that changes files outside its role's scope is not merged*.

## Consequences

- **Time:** about 40 scenarios in place of 109. The ones kept are heavier than average, so I
  expect 25 to 35 minutes, not a straight third. That leaves room within the 90-minute limit when
  GitHub is slow, and makes runs cheaper in GitHub's allowance, so the one run an hour Bernard
  set binds less often.
- **What is lost:** repetition against real GitHub. Each routing rule beyond the first, each
  refusal reason beyond the few kept, and most of eligibility run only in-process. They are pure
  code or one adapter path already shown, so a fault in them is caught on every commit. A fault
  that shows only against GitHub, in a path no kept scenario takes, would be missed; the
  selection rule is meant to leave no such path.
- **The cost of keeping it right:** each new feature asks whether it reaches GitHub in a new way.
  That is a judgement, made in the commit that adds the feature and visible in review.
- **The change itself:** tags on about 40 scenarios, the removal of `@sandbox-wip` and
  `@in-process-only` (their comments kept where they explain something), the sandbox profile,
  the run's first step (which today lists the `@sandbox-wip` scenarios), and `docs/SANDBOX.md`.
  No production code changes.
