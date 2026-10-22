# The GitHub sandbox run

The acceptance scenarios run twice. The **in-process** run, part of `npm test`, drives Divlab
against an in-memory fake of GitHub: fast, and on every commit. The **sandbox** run drives the same
scenarios against real GitHub, in a dedicated organisation: real repositories, real pull requests,
the real Divlab Action acting as its GitHub App, and GitHub's real delays. It proves that what the
fake says, GitHub does.

Setting the sandbox up (the token, the organisation's settings, Divlab's App) is in
[`CONTRIBUTING.md`](../CONTRIBUTING.md#the-github-sandbox). Why Divlab works this way is in
decisions [0004](decisions/0004-divlab-as-an-action.md) and
[0006](decisions/0006-how-divlab-merges.md).

## When it runs

- In CI, on every push to `main` (`.github/workflows/sandbox.yml`), one run at a time. A run waiting
  its turn is replaced by a newer one, so only the latest commit is always checked. A push that
  changes only documents (`docs/`, or the Markdown files at the top of the repository) does not
  start a run: the run reads none of them, and it would spend part of GitHub's allowance (below).
- Locally, on demand: `npm run test:acceptance:sandbox`. It reads the sandbox's name and token
  from a git-ignored `.env`. Divlab runs at your checked-out commit, so push it first.

It is not part of the blocking gate: it is slower (tens of minutes) and depends on GitHub.

## What happens in a run

**Setting up.** The scenarios run in four parallel workers. Each creates one public repository,
named after the run and the worker, and sets it up as a project is set up. It
installs both of the project template's workflows, with Divlab pinned to the commit under test, so
a change to Divlab is tested before any project uses it. A worker's scenarios share its
repository, and the four repositories' Divlab runs go at once; each scenario
gives its modules names of its own (`parser` becomes `parser-s17`), so no scenario sees another's
tasks, alerts or records.

**Each piece of work a scenario accepts** ("a member's Coding work on parser is accepted with a
fail verdict, reporting test failures"):

1. The driver finds the ready task for that role and module, as a member's plugin will.
2. It writes the member's feedback signal, naming that task, on a branch of the member's fork of
   the project, and opens a pull request from it, as a real member's plugin will. The forks live
   in a second sandbox organisation playing the members; each project is forked the first time
   work is submitted to it.
3. GitHub starts Divlab's pull request workflow. It runs as `main` has it, never as the pull request
   has it, takes a short-lived token as the sandbox's App, and runs the Divlab Action.
4. Divlab reads the pull request's files through the API, as data, and checks the feedback signal.
   If it can read it, it merges exactly the commit it read; if not, it comments on the pull request
   saying why, and does not merge.
5. Divlab routes the work: records its decision in the event log, closes the task the work was
   for, and posts the next task, alerts a PDC coordinator, or marks the module done.
6. The merge starts the push workflow, the tripwire. Divlab runs again and finds nothing to do.

The driver waits for Divlab to merge or refuse, and for its record. If Divlab's run fails, the
step fails with GitHub's own error messages and a link to the run.

**Each check** ("the only task ready for parser is a Coding task") reads GitHub as a member or a
PDC coordinator would: open task issues, escalation issues, finished-module issues, and the event
files. GitHub's lists lag behind its writes, so the driver waits until they show what the event
log says Divlab did.

**At the end** the run's repository and its fork are deleted, unless one of the worker's scenarios
failed: then they are kept for inspection, and the log names them. Set `ANARRES_SANDBOX_KEEP=1` to
keep them anyway. **Before a run starts**, a sweep deletes what interrupted runs left behind in both
sandbox organisations: repositories a run made, more than an hour ago (no run lasts that long), so
a kept repository lasts until a run an hour or more later.

## What the scenarios cover

The scenarios are in `features/`, one file per capability. Today:

- `routing/next-task`: a pass moves a module to its next role, through the whole pipeline.
- `routing/failed-work`: every route for failed or blocked work, several problems at once (the most
  upstream wins), revision tasks carrying the feedback that sent work back, and failures no rule
  covers, which go to a PDC coordinator rather than being guessed at.
- `routing/knowledge-gaps`: Research comes first, and goes back to the role that asked for it.
- `routing/escalation`: a role re-run a fourth time goes to a PDC coordinator instead.
- `routing/module-completion`: a Security & Quality pass marks a module done.
- `routing/decision-record` and `routing/coordinator-alerts`: every decision is recorded with its
  inputs and rule; an alert says what was reported and why routing stopped.
- `tasks/merged-work`: merged work closes the task it was for.
- `tasks/submitted-work`: Divlab merges the work members submit, and refuses what it cannot accept.
- `projects/protected-main`: only Divlab changes a project's main branch; the tripwire; the alert
  when main is not protected.

## What it proves beyond the in-process run

- The Divlab bundle works as a GitHub Action, at the pinned commit.
- Divlab's App, its installation and its permissions are enough to merge, write events and post
  issues, and the template's workflows wire them up correctly.
- Divlab handles pull requests from forks, as members' will come, without running their code.
- `packages/github` uses GitHub's real API correctly: reading a pull request's files, merging only
  at the commit Divlab read, commenting, issues, labels and the event log.
- Divlab's two workflows take turns, and the tripwire leaves Divlab's own merges alone.
- All of it copes with GitHub's delays, lagging lists and rate limits.

## Scenarios not yet run in the sandbox

A scenario that passes in-process but cannot yet run against the sandbox is tagged
`@sandbox-wip`, with a comment saying why. The sandbox run leaves it out, and its first step lists
every such scenario, so none is forgotten. The tag goes once the scenario passes in the sandbox.

## Not covered yet

- Claiming, leases, eligibility and the plugin, which are not built yet.

The test list (`docs/TEST_LIST.md`) tracks each of these.

## GitHub's allowance

GitHub allows 5,000 REST requests an hour, counted per person, not per token: the sandbox's two
tokens share it with anything else acting as the same person (the `gh` command, other scripts). A
full run makes about 1,800 REST requests and 200 GraphQL ones (2026-10-22); Divlab's own runs act
as its App, which has an allowance of its own. Each run prints what it asked of GitHub, by kind,
and the allowance at its start and end. A scenario does not start when GitHub reports too little
left for one (200 requests): it fails at once, saying when the allowance resets. So a run of one
scenario needs little, and a full run whose allowance runs out partway fails its remaining
scenarios at once rather than stalling. Keep anything that polls GitHub as the
same person, such as watching a CI run, gentle while a run is going.

## Reading a failure

- **A failed step names the Divlab run.** Open its link: the Divlab step's error is Divlab's own
  explanation (an unreadable feedback signal, an event it does not act on, a refusal from GitHub).
- **"Divlab neither merged nor refused"** means no decision arrived in time: look at the
  repository's Actions tab for a run that is stuck, queued, or never started (a workflow or
  permission problem).
- **An assertion failure in a check** is the system answering wrongly, as in-process: run the same
  scenario in-process first, since it is quicker to debug there.
- **Rate limits** slow a run down rather than failing it: the GitHub adapter waits out GitHub's
  `retry-after`.
