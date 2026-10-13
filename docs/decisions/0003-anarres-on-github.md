# 0003: How a project looks on GitHub, and the GitHub adapter

**Status:** Proposed, 2026-10-13. The representation may change as the plugin and the site are
built; the adapter (`packages/github`) is the only code that knows it.

## Context

Divlab talks to GitHub through two ports: a task board (post tasks, alert PDC coordinators, mark a
module done) and an event log (append and read routing events). The in-process driver fakes both.
To run Divlab for real, and to run the acceptance scenarios against the GitHub sandbox, something
must implement them on GitHub. GitHub is Anarres's only store (concept §3), so everything Divlab
writes is visible to members and PDC coordinators, and anything people can edit there is untrusted
when Divlab reads it back.

## Decision

**A project is a repository** in its organisation (`anarres-project` in production,
`anarres-sandbox` in tests).

**A task is an issue**, as concept §8 describes:

- labels `role:<role>`, `module:<module>`, `state:ready` (role ids as in `core`, such as
  `role:security-and-quality`);
- a Research task also carries `research-for:<role>`, the role that reported the gap;
- the title names the role and module in members' words ("Specification task for parser");
- the body links the feedback signal that triggered a revision task. Input and output artefacts
  and the size estimate come later, with the items that need them.

**A PDC coordinator alert is an issue labelled `escalation`** (concept §9) and `module:<module>`.
Its body says, in words, what the work reported and why routing stopped, followed by the routing
record as JSON for tools.

**A module that is done** gets an issue labelled `module:<module>` and `state:done`, opened and
closed at once, so the issue list shows when it finished. Provisional: a milestone per module may
suit better once tasks are grouped by module.

**Each routing event is one JSON file** under `events/`, named by a zero-padded sequence number
(`events/000001.json`). One file per event avoids merge conflicts (concept §7). Creating a file
that already exists fails, so two Divlab runs that race for the same number cannot both succeed.
The clock and identifier generator arrive with their own test-list items.

**Reading back is reading untrusted data.** Labels, issue bodies and event files can be edited by
people. The adapter parses them strictly: an issue whose labels do not name exactly one known role
and one module is not a task; an event file that does not parse as a routing record is an error,
never guessed at.

**No GitHub library.** The adapter calls the REST API with Node's built-in `fetch`. It needs a
handful of endpoints; Octokit would add a large dependency tree to code that runs in every project
repository.

**Tested in two ways.** The pure parts (task ↔ issue, record ↔ file) are unit-tested. The HTTP
calls are exercised end to end by the acceptance scenarios through the GitHub sandbox driver,
which observes GitHub directly, as a member would, rather than through the adapter.

## Consequences

- Label names are a public contract: the plugin will search on them. Changing one means changing
  the adapter, the plugin and the sandbox driver together.
- The event log is read in one GraphQL request, checked against a REST listing of the files:
  GraphQL lags behind writes, and Divlab must never decide on a log missing its latest events.
- GitHub's lists lag its writes by about a second, and it limits how fast repositories may be
  created. Tests that run against GitHub must wait for it to catch up, and share a repository
  per run (2026-10-13).
