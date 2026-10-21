# 0006: How Divlab merges

**Status:** Accepted, 2026-10-21 (Bernard).

## Context

Decision 0005: only Divlab merges into a project's main branch. For that to hold, GitHub must
enforce it; a rule nobody enforces is a hope.

Tried in the sandbox (GitHub Free, public repositories), 2026-10-21:

- A ruleset binds everyone, administrators included: with "changes must be made through a pull
  request" active, an administrator's direct push was refused.
- The token every workflow gets cannot be exempted from a ruleset: GitHub refuses the GitHub
  Actions integration as a bypass actor. A GitHub App installed in the organisation can be.

So while Divlab acts with a workflow's own token, it cannot be the only one able to merge.

Members' pull requests come from forks and are untrusted (decision 0004).

## Decision

**Divlab has its own identity: a GitHub App.** Each project's main branch has a ruleset that
admits changes only through a merged pull request, and only Divlab's App may merge. No person is
exempt. Divlab's runs act as the App, with a short-lived installation token minted at the start of
each run; the App's private key is an organisation secret, never in a repository.

**The App has the least permission that works:** contents, issues and pull requests (read and
write), and metadata. It has no permission over workflows, so it cannot merge a change to a
project's workflows; such a change goes to PDC coordinators.

**Divlab acts on pull requests without running them.** A pull request event starts Divlab's own
workflow, as it is on the project's main branch, not the pull request's. That workflow never
checks out, builds, installs or runs anything from a pull request: it reads the changed files
through the API, as data, and validates them. A test of the project template holds it to this.

**One run per merge, recorded as it goes.** For each contribution, in one run: validate; record
that Divlab is about to merge it; merge; record the merge; route the work. Runs for a project go
one at a time, so the event log's order is the order Divlab merged in. A run that stops part way
is finished by the next, from the records, never from Git history.

**The push-triggered workflow stays as a tripwire.** Anything on main that Divlab did not record
merging is handled as decision 0005 says: recorded once, PDC coordinators alerted, never routed.

**Divlab checks its own protection.** An organisation owner can still switch a ruleset off, so on
each run Divlab confirms that the project's main branch is protected as this decision requires,
and alerts PDC coordinators if it is not (decision 0005, option 2, now chosen).

## Options considered

1. **Merge with the workflow's own token, behind a required Divlab check.** Simpler, no App; but
   anyone with write access could still merge a pull request once it passed, and the token cannot
   be the only one allowed. This is option 1 of decision 0005.
2. **Divlab polls on a schedule** instead of acting on pull request events. Avoids the pull
   request event and its risks, but adds minutes of latency to every step and spends requests
   when nothing has changed.
3. **A webhook service.** The usual home for a GitHub App, but Anarres runs no servers of its own
   (concept, §9).

## Consequences

- Bernard creates two GitHub Apps, one owned by each organisation: Divlab for `anarres-project`
  and Divlab Sandbox for `anarres-sandbox`, with the same permissions. Each is installable only on
  its own organisation, and their keys are separate, so tests never hold a key that can act on
  `anarres-project`.
- Each organisation holds its App's id (a variable) and private key (a secret) for its
  repositories' workflows. Pull request workflows can read secrets, which is one more reason they
  must never run code from a pull request.
- The project template gains the pull request workflow and the ruleset; the sandbox driver sets up
  each sandbox repository the same way.
- Decision 0004 still holds for what a run may do, but Divlab no longer routes from a push to
  main: the push workflow becomes the tripwire, and routing happens in the run that merges.
- Merges made as the App start push workflows (unlike the workflow token's), so the tripwire must
  recognise Divlab's own recorded merges and leave them alone.
