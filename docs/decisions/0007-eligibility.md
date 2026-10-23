# 0007: What "one role per module" means, and where trust levels live

**Status:** Accepted, 2026-10-23 (Bernard).

## Context

The concept document (§6) gives Divlab three conflict-of-interest rules to enforce when a task is
claimed, and §11 gives trust levels that gate the roles. Two of the rules could be read more than
one way, and an eligibility mistake breaks the independence that gives Anarres its value, so they
were settled before any code. Trust levels need a home before the site exists.

## Decision

- **One role per module, for the module's whole life.** Once a member has worked in one role on a
  module, they may not take a different role on it. Revising work in their own role is allowed.
  The rule that a member who produced an artefact may not review the module is a case of this
  one.
- **What counts** towards a member's role in a module: work of theirs that Divlab merged, and a
  task they hold now. A claim they gave back, or whose lease ran out, leaves no mark: they
  produced nothing.
- **Research is not a role in a module.** A Research task answers a knowledge gap and produces a
  brief, not a module artefact. Research work neither counts towards a member's role in the module
  nor is barred by one.
- **Trust levels live in a file in this repository's `governance/` folder**, changed only by PDC
  coordinators through reviewed pull requests. Divlab reads it when a task is claimed. A member
  who is not listed is *new*.

## Consequences

- Divlab must know who did each piece of merged work: the pull request's author is recorded with
  the work.
- A claim names a role and module, so Divlab can tell which roles a member holds in a module from
  the project's log alone.
- Trust levels change only through this repository's pipeline, so every change is reviewed and
  visible.
