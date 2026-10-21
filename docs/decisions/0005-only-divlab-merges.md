# 0005: Only Divlab merges

**Status:** Accepted, 2026-10-21 (Bernard).

## Context

Divlab routes the work a merge reports (decision 0004). Its checks on a contribution (the role's
access rules, the task it was claimed for, the feedback signal's header, the project's own CI) are
what make that work trustworthy. A change that reaches a project's main branch without passing
them is unvetted code in the project, whatever its feedback signal says, and a header Divlab
cannot read is only the most visible sign of it.

Until now Divlab stopped with an error on an unreadable signal and recorded nothing, so every later
run met the same signal and stopped again: one bad file would stall routing for the whole project.

## Decision

**Only Divlab merges into a project's main branch.** People review and approve; Divlab merges a
contribution once it passes validation and any human review PDC coordinators require. No person
holds the right to merge or push to main directly. There is then one route to main, and every
change on it has passed Divlab's checks and can be explained from its inputs.

**Something on main that Divlab did not accept is never routed, and never stalls the rest.** If a
change reaches main anyway (a misconfigured project, an outage, a person with rights they should
not have), Divlab records it once as not accepted, with the reason, alerts the project's PDC
coordinators once, and carries on routing everything else. It never repairs or interprets what
it could not read. A corrected contribution arrives as new work.

## Options considered

Kept here in case this decision needs revisiting.

1. **A required Divlab check, with no bypass.** A ruleset on each project's main, set at
   organisation level so a project cannot switch it off, requires Divlab's validation check and
   blocks direct pushes, for everyone, including administrators. People still merge. Simpler than
   this decision and closer to how GitHub is normally used, but every person with merge rights is
   one more route to main. The fallback if Divlab merging proves impractical.
2. **Divlab checks its own protection.** On each run, Divlab confirms the project's main branch is
   still protected as this decision requires, and alerts PDC coordinators if not. This catches a
   misconfiguration or a quiet change before a bad merge does. It complements either option and
   is not yet decided.
3. **What happens to code that got through.**
   - **(a) Divlab reverts it** automatically. Unvetted code leaves main within minutes, and a
     revert can itself be undone; if it does not apply cleanly, a person takes over.
   - **(b) A person reverts it**, prompted by the alert. Simpler, and only people change main
     outside normal work, but unvetted code stays there in the meantime.

   Not yet decided. Until then, (b): Divlab records and alerts, and does not revert.

## Consequences

- Divlab needs to merge pull requests, so a project's workflow needs permission to write pull
  requests as well as contents and issues, and the project template must set up main so that only
  Divlab can change it.
- Validation (test list, section 4) becomes the gate to main, not only a report on a pull request.
- Decision 0004's "anything malformed stops Divlab" no longer holds: an unreadable signal is
  recorded and alerted, and routing continues.
- The sandbox must be able to set up a repository the same way, so that scenarios exercise the
  real route to main.
