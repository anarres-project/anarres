# 0009: A session reads back its own work

**Status:** Accepted, 2026-10-24 (Bernard).

## Context

The plugin's read-scope hook let a task's session write its role's own place (and its one
feedback signal) but read only its role's inputs. Within one session that mostly worked, as
Claude Code knows the files it has just written; in a new session, resuming the task
(`/anarres:resume`), Claude could not read the work it had already done.

## Decision

- **In the task's folder, a session may read back what lies where its role writes**: its role's
  own place and its feedback signal. Prepare fetches nothing of anyone else's there (no role's
  inputs include its own place, or feedback signals), so this is only the member's own work. A
  continuation already reads its role's own place (decision 0008).
- **What prepare fetches is unchanged:** a task's inputs are still its role's read scope only.

## Consequences

- Resuming a task in a new session can carry on from the work done so far.
- Bringing back a member's draft on another machine, into the role's own place, becomes
  possible: the session can read it.
