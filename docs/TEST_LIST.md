# Test list

Behaviours still to drive out, smallest useful next step first. Add a case whenever you think of
one; that is where implementation ideas go, not into code. Tick items off as they go green.

Source: `docs/Anarres_Concept.md` (Phase 1: Divlab and plugin). Order agreed with Bernard,
2026-10-12: work top to bottom.

## 0. Walking skeleton

The thinnest slice that goes end to end: one acceptance scenario through the in-process driver,
with the gate (`npm test`) and CI running.

- [ ] Divlab posts the next task when work is accepted: after a Specification task for a module is
      merged with a *pass* verdict, a Test task for that module is ready to claim.

## 1. Routing (Divlab)

- [ ] Each *pass* verdict advances to the next role in the module pipeline.
- [ ] A *fail* verdict reporting an upstream ambiguity sends a revision task to the role that
      owns the ambiguous artefact.
- [ ] A revision task carries the feedback signal that triggered it.
- [ ] An interface impediment goes to the Programme Architect, never to another module.
- [ ] A knowledge gap creates a Research task.
- [ ] Reviewer *pass* starts Security & Quality; Security & Quality *pass* completes the module.
- [ ] Escalation: the same role is re-run more than three times → a PDC coordinator is alerted and
      no further task is posted.
- [ ] Every routing decision is recorded as an event that names its inputs and its reason.

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

- (add new cases here, then place them)
