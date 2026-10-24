# 0008: Partial work and continuations

**Status:** Accepted, 2026-10-23 (Bernard).

## Context

A member may run out of allowance part way through a task. The concept document (§8, partial
work) has the plugin commit what exists with `status: partial` and a handover note, and Divlab
re-queue the task as a continuation. Three things were open: whether partial work reaches main,
what a continuation may read, and who may take one.

## Decision

- **Partial work is merged**, like any other work Divlab accepts. It lies only in the role's own
  place, so it shows other roles nothing; Divlab does not route it to the next role. Instead it
  posts a **continuation**: a task for the same role and module, carrying the handover feedback
  signal.
- **A continuation reads its role's usual inputs and its role's own place**, so it sees the work
  it continues. Only the same role's work, never another role's: independence between roles holds.
- **Anyone eligible may take a continuation**, the member who handed it over included, as with any
  other task.

## Consequences

- The feedback signal's `status` (complete or partial) is read, and partial work is never routed.
- A continuation is a task of its own kind, marked so, which the plugin and the read-scope hook
  treat as reading the role's own place too.
