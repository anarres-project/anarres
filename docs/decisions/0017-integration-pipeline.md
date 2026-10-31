# 0017: The integration pipeline

**Status:** Accepted, 2026-10-31 (Bernard: each recommendation).

## Context

The concept document (§5, §9) has an integration pipeline, Integration Spec → Integration Test →
Review, start once every module's pipeline is done, checking the assembled system against
programme-level acceptance scenarios, with failures "traced back to a module or a contract". The
CSD methodology has no such pipeline (its integration tests sit inside one pipeline's Test role),
so four things were open: what the Review step is, where a failure goes, who may take the roles,
and what happens when a module reopens.

## Decision

- **Three programme-level roles**, in order:
  - **Integration Specification** reads the requirements and the contracts, and writes
    `integration/specifications/`: programme-level acceptance scenarios.
  - **Integration Test** reads the requirements, the contracts and the integration
    specifications, and writes `integration/tests/`. Unlike a module's Test work, its tests run
    against finished code, so they are meant to pass: the project's own check runs them.
  - **Integration Review**, a new role, reads the requirements, the contracts and the
    integration specifications and tests, and writes `integration/reviews/`. When it passes, the
    programme is done.
- **Where a failure goes:** a defect a failing integration test finds in a module, the failure
  naming the module, sends that module back to **Specification**, carrying the integration
  feedback signal, so the missed behaviour becomes a module scenario, then a failing module test,
  then code. Coding never reads integration tests. A problem with a contract
  (`interface_impediment`) goes to the Programme Architect, whose revision reopens the modules
  (decision 0015).
- **Who may take them:** Integration Specification and Integration Test at the trust level a
  module's Specification and Test need; Integration Review at *trusted*, as a module's Reviewer.
  Nobody reviews integration work they wrote (or hold a role in, by decision 0007's rules applied
  to the programme's integration). Work on a module does not bar anyone from integration roles.
- **A module reopened** after integration has begun (a contract revision, or a defect sent back):
  integration work already under way is left to finish, but nothing further in integration is
  posted until every module is done again; then a new Integration Test task runs the integration
  tests again, adding any the revision needs.

## Consequences

- The routing table gains integration rows; "all module pipelines done" is a fact about the
  project, read from Divlab's own records of modules done and reopened, not from one piece of work.
- The access matrix gains the three roles' read and write scopes, in core, once.
- The template's checks run on Integration Test work too, as on Coding and module Test work.
- How a failing integration test names the module at fault is part of the feedback signal: the
  first slice will say how.

## Amendment, 2026-10-31 (Bernard: each recommendation)

- **Naming the module at fault:** the feedback signal gains an optional field naming one module.
  Divlab checks it against main's modules.yaml. A failure naming no module, or one the project
  does not list, goes to a PDC coordinator, saying why; Divlab never guesses.
- **A contract revised while integration work is under way:** this decision's hold wins over
  decision 0015's stale mark. Claimed integration work finishes as it is; once every module is
  done again, a new Integration Test task covers what the revision changed.
- **An integration task posted but unclaimed when a module reopens** is withdrawn.
- **Eligibility** stands as read: the programme counts as one module, so a member holds one role
  among the Programme Architect and the three integration roles.

## Amendment, 2026-10-31 (Bernard: each recommendation)

- **modules.yaml unreadable while integration work passes:** nothing further in integration is
  posted, and PDC coordinators are alerted once, as when a module is done; the work is merged
  and recorded, and integration goes on once the file is fixed.
- **The sandbox** shows integration with one journey scenario in a project of its own; the
  other integration scenarios run in-process only, to keep the sandbox run within its time.
- **How an Integration Test member names the module at fault** goes into the plugin's role
  instructions when those are written.
