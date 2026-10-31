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
tasks, alerts or records. Each scenario starts its modules in the worker's repository as a project
does, with Divlab's App: each gets its first task, Architecture, ready. The repository also gets
the template's checks workflow and a toolchain (`anarres.yaml`) running a script at its root,
where no member's work may write. Its tests fail only on Coding work a scenario makes fail on
purpose, so Coding work is merged once the project's own check passes on it (decision 0010). It
writes a JUnit report with a test case for each test file: passing once its module has code, none
of it failing on purpose, and failing before, as new tests do, unless the file says it passes on
purpose. Divlab reads Test work's new tests from it (decision 0011), and the project's test counts
(decision 0012). The scenario on those counts has a project of its own, as counts are
project-wide.

**Each piece of work a scenario accepts** ("a member's Coding work on parser is accepted with a
fail verdict, reporting test failures"):

1. Divlab accepts work only from the member holding its task, so the member claims it first (see
   below). A scenario that begins a module partway along its pipeline (a Reviewer's work in a new
   project) has the module set up as it would stand there: Divlab's App closes the module's open
   tasks and posts the task for the work's role. Walking the pipeline instead would cost several
   Divlab runs a scenario.
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

**Each claim** ("Alice claims the Test task for parser") is a `/claim` comment on the task's
issue, made with the sandbox token, as a member's plugin will make it. GitHub starts Divlab's claim
workflow, and the driver waits until the issue shows the task claimed and assigned.

**Three accounts play the members.** The sandbox's own token's account plays the members a scenario
does not name ("a member's Coding work"); the sandbox's governance file records it as trusted, a
standing record, so it may take any role. A second account (`anarres-sandbox-member-b`) plays the
first member a scenario names, and a third (`anarres-sandbox-member-c`) the next; neither is in the
governance file unless a scenario puts it there, so a named member is new unless the scenario says
otherwise. A member takes one role in a module, so work by unnamed members in two roles of one
module needs a second unnamed member, played by an account left over. For a role a new member may
not take, the driver records that account at the level needed, so the scenario changes the
governance file and is tagged `@governance`. Each member must be a different account, or Divlab would see them as one person and,
rightly, refuse what one person may not do twice (one role per module, decision 0007). A
scenario with four members fails at once with `HarnessNotYetBuilt`, so none is tagged
`@sandbox`. A claim or a release Divlab refuses ends when Divlab replies; one it grants,
when the issue shows it. Members claiming together comment in order,
but GitHub decides which comment's run starts first, so the sandbox shows the first claim made
winning under real GitHub ordering, not a chosen order.

**Trust levels and linked accounts** ("Alice is an established member") go in the sandbox's own
governance file, `anarres-sandbox/governance`, which the organisation's `ANARRES_GOVERNANCE`
variable points Divlab at, keyed by the account playing the member. Trust belongs to an account,
and every worker's scenarios share the accounts, so a scenario tagged `@governance` runs alone:
it starts only when no other scenario is running, nothing starts while it runs, and it puts each
account's record back as it found it when it ends, pass or fail, so the standing record stays.
A run its job's time limit cuts off never gets that far, so each run starts by setting the file
to its standing state (`acceptance/drivers/sandbox/reset-governance.ts`), once, before its workers
start.

**Human review** ("PDC coordinators require a reviewer's approval for work on parser") names the
scenario's project and module in the same governance file, so those scenarios are `@governance`
too, and the project is taken out of the list again when they end; the standing file has no list.
Each project gets the template's reviews workflow as it is. A member approves with GitHub's own
review, through the API as their account, for the pull request's head. The reviews workflow runs
on that without secrets, and Divlab's checks workflow runs on its finishing: the driver waits for
that run, then for Divlab's decision if it merged the work (decision 0016). "The list of
modules PDC coordinators require reviewed cannot be read" gives the scenario's project an entry
naming a module not plainly, which spoils the whole list, as `@governance` scenarios run alone;
the entry is taken out when the scenario ends, as any other.

**Each check** ("the only task ready for parser is a Coding task") reads GitHub as a member or a
PDC coordinator would: open task issues, escalation issues, finished-module issues, and the event
files. GitHub's lists lag behind its writes, so the driver waits until they show what the event
log says Divlab did.

**At the end** the run's repository and its fork are deleted, unless one of the worker's scenarios
failed: then they are kept for inspection, and the log names them. Set `ANARRES_SANDBOX_KEEP=1` to
keep them anyway. **Before a run starts**, a sweep deletes what interrupted runs left behind in both
sandbox organisations: repositories a run made, more than an hour ago (no run lasts that long), so
a kept repository lasts until a run an hour or more later.

## Which scenarios run here (decision 0018)

The sandbox runs only the scenarios tagged `@sandbox`; every scenario runs in-process on every
commit. A scenario earns the tag when it:

1. calls a GitHub API path or adapter method that no `@sandbox` scenario calls yet;
2. needs a workflow or a trigger the sandbox does not yet run (a new event, a new template
   workflow);
3. depends on what only real GitHub decides: ordering, delays, lagging lists, permissions,
   rulesets, forks;
4. changes the governance file, or relies on it, in a way no `@sandbox` scenario does;
5. is the one end-to-end journey of a new capability, as integration's is.

Otherwise it runs in-process only: routing rules, refusal reasons and eligibility cases are
core's, proved on every commit. The commit adding a `@sandbox` tag says which item earns it.

**The gate checks item 1.** `npm test` runs the `@sandbox` scenarios in-process a second time
(`npm run test:sandbox-coverage`), with the fake GitHub noting which of its methods Divlab and
the CLI call, and fails, naming each method of the GitHub adapter the fake stands in for that
none of them reached. A method the sandbox cannot reach is listed, with why, in
`SANDBOX_UNREACHABLE` (`acceptance/drivers/in-process/sandbox-coverage.ts`): a lease's 24 hours,
the paths that finish interrupted runs or merges GitHub put off, and an unreadable
modules.yaml, which the sandbox could only make with a change protection refuses.

Today 41 scenarios, by capability:

- `members/*`: the CLI against real GitHub: offers, submitting, giving back, preparing (files
  read as data, and at a pinned commit), resuming on another machine.
- `projects/*`: protection and the tripwire, the Actions policy, starting a project and its
  modules, a project without a toolchain.
- `routing/*`: one pass and one revision, an alert, the event log, a module done, inputs
  changed since a task was posted, the test counts, and the integration journey: a project of
  its own listing two modules, from the last module done through a failing Integration Test
  sent back to the module at fault, to Integration Review completing the programme (decision
  0017). The journey makes the third account trusted for Integration Review, so it is
  `@governance` and runs alone.
- `tasks/*`: claims (and two made together), giving back, eligibility read from the governance
  file, human review, drafts, the lease check run by hand, merged work closing its task, the
  project's own checks, and submissions (several at once, from someone not holding the task,
  outside the role's scope).

## What it proves beyond the in-process run

- The Divlab bundle works as a GitHub Action, at the pinned commit.
- Divlab's App, its installation and its permissions are enough to merge, write events and post
  issues, and the template's workflows wire them up correctly.
- Divlab handles pull requests from forks, as members' will come, without running their code.
- `packages/github` uses GitHub's real API correctly: reading a pull request's files, merging only
  at the commit Divlab read, commenting, issues, labels and the event log.
- Divlab's workflows take turns, and the tripwire leaves Divlab's own merges alone.
- All of it copes with GitHub's delays, lagging lists and rate limits.

## Time

The job's limit is 90 minutes. Before decision 0018 every scenario ran here unless tagged out,
109 of them in about 70 minutes; scenarios timed out when GitHub's runners were slow. What costs
is each piece of work a scenario puts through Divlab: a pull request from a fork, a claim, a
Divlab run, perhaps the project's checks, then waiting for GitHub's lists.

## Not covered yet

- Leases running out: they need 24 hours, which the sandbox cannot make happen, so those
  scenarios run in-process only; the sandbox installs the hourly lease workflow with the rest of
  the template, and runs it by hand.

The test list (`docs/TEST_LIST.md`) tracks each of these.

## GitHub's allowance

GitHub allows 5,000 REST requests an hour, counted per person, not per token: the sandbox's two
tokens share it with anything else acting as the same person (the `gh` command, other scripts). A
full run makes about 1,800 REST requests and 200 GraphQL ones (2026-10-22). Each run prints what
it asked of GitHub, by kind, and the allowance at its start and end. A scenario does not start
when GitHub reports too little left for one (200 requests): it fails at once, saying when it
resets.

Divlab's own runs act as its App, which has an allowance of its own, 5,000 requests an hour,
shared by every Divlab run in the sandbox: a full run went past it (2828354, 2026-10-29: GitHub
refused Divlab from 14:25 until the window reset at 14:35). Each Divlab run says how many
requests it made, by kind, and what its App's allowance is, both by its own last answer and as
GitHub's `rate_limit` reads it. The sandbox job no longer checks the App's allowance itself: a
token minted for that read another count than Divlab's runs spend. So a run of one
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
