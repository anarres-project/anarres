# 0004: Divlab as a GitHub Action

**Status:** Proposed, 2026-10-13.

## Context

Divlab must act whenever a member's work is merged into a project repository (concept §8, step 9),
with no server of its own. Members' pull requests come from forks, so they are untrusted: Divlab
must never run code from a pull request, and must read what was merged as data.

## Decision

**Divlab runs on a push to the project's main branch**, not on a pull request event. A merge is a
push, so Divlab sees exactly what was merged. The workflow runs the Divlab code it names, pinned
to a commit of this repository, with the project repository's own short-lived token and only the
permissions it needs (contents and issues). It never checks out or runs anything from a member's
fork, and it does not use `pull_request_target`.

**Each run routes every feedback signal that has no event yet,** not only the one that triggered
it. GitHub keeps at most one run waiting in a concurrency group and drops older waiting runs, so
two merges close together could otherwise leave one unrouted. A later run catches up. The event
log already records which feedback signal each decision came from, so "routed" is a fact Divlab
reads, not state it keeps. One run per project at a time (a concurrency group) keeps decisions in
order.

**What was merged is untrusted data.** The feedback signal's header is parsed strictly (`core`,
`readFeedbackSignal`); anything malformed stops Divlab with the reason rather than being guessed
at (superseded by decision 0005: it is recorded and alerted, and routing continues). The task a signal names is checked before Divlab uses it in a request.

**The Action is one bundled JavaScript file, committed to this repository.** A JavaScript Action
runs from the repository as it is, with no install step, so its code and dependencies must be in
one file. CI rebuilds the bundle and fails if it differs from what is committed, so the bundle can
never drift from the tested source.

**A project's workflow comes from the project template** (`template/`). The sandbox driver
installs the same workflow in its sandbox repositories, pinned to the commit under test, and
observes the real Action at work.

## Consequences

- The GitHub sandbox needs two settings: the sandbox token may write workflow files (so the driver
  can install the template's workflow), and the sandbox organisation allows Actions from
  `anarres-project`.
- Sandbox repositories are public (Bernard, 2026-10-21): once the driver observes the real
  Action, every merge in a scenario starts an Action run, and on GitHub Free, Actions in public
  repositories cost nothing, while private ones draw on a monthly allowance. They hold only synthetic data and are deleted after each run.
- Every merge in a sandbox scenario starts a real Action run, so the sandbox suite takes
  noticeably longer than when the driver called Divlab directly.
- Order among several signals routed in one run is open (test list). What to do with a signal
  that reaches the main branch unreadable is decided in 0005.
