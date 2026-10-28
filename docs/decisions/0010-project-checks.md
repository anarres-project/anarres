# 0010: The project's own check on Coding work

**Status:** Accepted, 2026-10-27 (Bernard).

## Context

A project can be written in any language, and Anarres never builds or runs its code (concept §7,
"Any language"). The project's `anarres.yaml` declares its toolchain: the dev container image, the
command that runs the tests, and where the test report is written. The project's own CI runs that
command; Divlab reads only the outcome.

Today Divlab merges Coding work once its feedback signal reads, it changes only Coding's place,
and its member holds the task. Nothing yet asks whether the code passes the module's tests, which
is the point of the Coding role.

Divlab's pull request run starts when the pull request is opened, before any check on it has
finished, so it cannot simply look the result up then.

## Decision

- **Which check.** The project template adds the project's checks workflow, which runs the test
  command `anarres.yaml` declares, in its dev container image, on every pull request that changes
  a module's code (Coding's place, which only Coding writes): other work would only wake Divlab a
  second time for nothing (Bernard, 2026-10-28). Its check is the one Divlab reads, by a name the
  template fixes, not one a project chooses. Coding work that says it passed must change the
  module's code, or Divlab refuses it, saying so: it would otherwise wait for a check that never
  runs.
- **Which work.** Divlab merges Coding work that says it passed (a pass or conditional pass
  verdict) only once that check has passed on exactly the commit Divlab read and will merge.
  Coding work reporting a failure or blocked, and partial work handed over, needs no check: it
  advances nothing (it goes back to the role that can fix it, or is continued), and its tests may
  well fail (Bernard, 2026-10-27). Other roles' work changes no code and needs no check. (Test work's
  own check, that the new tests run and fail, is a separate decision: test list, section 4a.)
- **Hearing the result.** The template's Divlab workflows also run when the checks workflow
  completes. Divlab then acts on the open pull requests at that commit, as it does when one is
  opened. While the check has not finished, Divlab's pull request run does nothing and says
  nothing.
- **A failed check.** Divlab does not merge, and tells the member which check failed, with a link
  to it. The member may push a fix to the same pull request while they hold the task; each push
  runs the check again, and, as any push by the task's holder to their pull request for it, draft
  or not, renews their lease.
- **Trusting the result.** A check counts only if GitHub Actions made it in the project's own
  repository, by the template's checks workflow, for the commit Divlab merges. Work that changes
  the workflow, the test command or the tests is refused already by the write scopes, so the check
  ran the project's own tests on the member's code.

## Consequences

- Divlab still never runs project code: GitHub's runners do, in the project's own workflow, and
  Divlab reads the result through the API.
- The template gains a checks workflow and `anarres.yaml` its toolchain; a project without a
  declared toolchain cannot be started (test list, section 4a).
- Coding work waits for the project's tests. A pull request whose check never finishes stays open
  and unmerged; the member's lease runs on as usual.
- The sandbox needs a project with a toolchain whose tests can be made to pass or fail on cue.
