# Development log

Running history and current status. Newest entry first.

---

## Current status

Walking skeleton green: the first scenario ("a passed specification makes a test task ready")
runs through the in-process driver, the `npm test` gate and `npm run test:wip` run in CI. Mutation
testing is set up (`npm run mutate`, weekly in CI). Section 1 (routing) under way: a pass advances
through the whole module pipeline. A conditional pass advances like a pass. Fail routes under way: an upstream
ambiguity goes back to its owner. An architecture impediment goes to
Architecture. Upstream ambiguity, architecture impediments and Coding's test failures are routed,
with the most upstream winning when several are reported. Failed review and Security & Quality go back
to Coding; a scope gap goes to the Programme Architect. *Blocked* routes as *fail*. Failure routing is
now the AutoPM table, and a failure no rule covers alerts a PDC coordinator instead of being
guessed at. A revision task carries the feedback signal that sent the work back; a task for the
next role does not. An interface impediment from any module role goes to the Programme Architect.
A knowledge gap makes a Research task ready, ahead of anything else reported; when the research
passes, the role that reported the gap gets a revision task; Research failing alerts a PDC
coordinator. A Security & Quality pass marks the module done. Every routing decision is recorded
with its inputs and the rule that decided it. A role re-run more than three times for a module is
escalated to a PDC coordinator, and a coordinator's alert says what was reported and why routing
stopped. Section 1's remaining items wait on later work (metrics, input artefacts). Section 0 under
way. Only Divlab merges (decisions 0005, 0006): Divlab acts as its own GitHub App, validates a
member's pull request as data, records that it is about to merge, merges only the commit it read,
and routes the work; a ruleset set up with each project lets nobody else change main; the push
workflow is the tripwire (anything on main Divlab did not merge is recorded, alerted, never
routed; an interrupted merge is finished from Divlab's record); every run checks main is still
protected. Signals must use plain names. Every scenario's work goes through a real pull request;
the sandbox suite runs them all against the real Action (about 30 minutes), each from a fork in a
second sandbox organisation playing the members, as real members' work will come. A project's event log is
read whole past 1,000 events. Interrupted sandbox runs are swept up before the next. A sandbox run
counts its requests (about 2,000) and does not start without room in GitHub's allowance, and
pushes that change only documents skip it. An event is appended in one request once the log has
been read. Each project is set up with the Actions policy that lets Divlab's pull request
workflow, and no other, run on pull requests once GitHub blocks that event by default. The
sandbox run's scenarios run in four workers: 11 minutes. Divlab's runs queue rather than being
dropped when members submit at once, and interrupted merges are finished in merge order. Routing
and merge records are read back through core. Section 0 is done but for the log's read cost
(deferred). Every event records when Divlab made it; a decision recorded is acted on once, and
its task closed, even if a run stops between; a feedback signal's file must be plainly named; a
pull request's run reads the log once. Section 2 under way: a member claims a ready task by
commenting on it, and Divlab marks it claimed and assigns it to them, in-process and in the
sandbox; a claimed task stays with its holder, and anyone else claiming it is told it has already
been claimed; of claims made together the first made wins, whichever Divlab hears of first
(both in-process: the sandbox needs a second account to play another member); a claim on
anything but an open task is refused; each claim granted is recorded in the log. A lease runs out
24 hours after the last activity on its task, the claim or draft work by its holder, and Divlab's
hourly check makes the task ready again (in-process). Divlab never merges a draft. A member can
give a task back early. Section 3 under way: a member takes one role in a module for its whole
life (decision 0007), and Divlab refuses a claim that breaks it, or that the member's trust level
does not allow; accounts a PDC coordinator linked are one member. Section 3 is built. Every
Divlab run checks every change to main. Section 5 has begun: the CLI offers a member the ready
tasks they may take (in-process). Section 4:
Divlab refuses work that changes files outside its role's place, naming them.

---

## 2026-10-24: A member's status

- `anarres status`, and the `/anarres:status` skill that may run only it: each task the member
  holds, across Anarres's projects, with when its lease runs out. The lease is worked out by
  Divlab's own rule (`leasesFrom`, now exported), so the rule is stated once. What is shown is
  only plain names, as with offers. A new scenario asks through the CLI in both drivers; it is
  `@sandbox-wip` until it has passed there.
- The projects searched are those where the member holds a task, not those with ready tasks: the
  first wiring used the ready search, which would miss a project whose only task the member
  holds. The drivers name the project themselves, so the scenario could not catch it; the
  adapter's own test now does.
- Protocol slips: twice I wrote an empty stub in the same step as its test (the failures were
  still assertions). Once a test failed for the wrong reason (no claim in its log, so an Invalid
  Date); I gave it the claim, and listed the unrecorded-claim case to drive out properly.

RED:      shows each task the member holds, its lease a day after the claim -> expected [] to deeply equal [...]
GREEN:    (57 passed)
RED:      runs the lease from the member's latest work since the claim -> '2026-10-21T09:00' not '…15:30'
GREEN:    (511 passed, all unit)
RED:      leaves out a held task that is not plain names -> expected [ {...} ] to deeply equal []
GREEN:    (60 passed)
REFACTOR: the status tests share one holdings helper
RED:      the status as the member sees it -> expected '' to be 'ledger#4  Test task for lexer, held…'
GREEN:    (61 passed)
RED:      says so when they hold no task -> expected '' to be 'You hold no tasks just now…'
GREEN:    (62 passed)
RED:      the tasks a member holds in a project -> expected [] to deeply equal [ { id: '4', … } ]
GREEN:    (117 passed)
RED:      leaves out a task someone else holds -> expected [ {...} ] to deeply equal []
GREEN:    (118 passed)
RED:      the status skill may run only status -> expected undefined to be 'Bash(node …status)'
GREEN:    (6 passed)
RED:      the projects where a member holds a task -> expected [] to deeply equal [ 'ledger' ]
GREEN:    (119 passed)
REFACTOR: names and namesHeldBy share one search
RED:      no lease time when the log records no claim -> RangeError: Invalid time value (the bug)
GREEN:    (64 passed)
RED:      says the lease has run out when Divlab cannot tell when it began -> TypeError reading 'slice' (the bug)
GREEN:    (65 passed)
RED:      no lease time when the claim's time cannot be read -> RangeError: Invalid time value
GREEN:    (66 passed)
REFACTOR: when a lease runs out is stated once, in core (`leaseRunsOutAt`), and `leaseHasRunOut`
          and the CLI both use it

Open pull requests in the status: each held task shows the member's open pull request for it, if
any, read from the task's branch name only (the title is the member's to edit): a draft, or
finished work Divlab has not merged, which means it answered there. Status says so without
showing any comment's text. A second scenario (`@sandbox-wip`), in both drivers. The lister is
`pullRequestsOpenBy`, not `openPullRequests`, which would read as the adapter's opener. Slips: I
renamed test rows in the same step as production code; and I wrote the branch-name guard before
a test asked for it, so I replaced it with a crude stand-in, watched its test fail, then
restored it.

RED:      shows the member's open pull request for a task they hold -> expected undefined to deeply equal { number: '17', draft: true }
GREEN:    (67 passed)
REFACTOR: the pull request looked up with find
RED:      says what the member has open for a task (draft, finished) -> expected '…' to be '…; your draft is…'
GREEN:    (69 passed)
RED:      a member's open pull requests in a project -> expected [] to deeply equal [ { number: '17', … } ]
GREEN:    (120 passed)
RED:      leaves out one someone else opened, or not from a task's branch -> expected [ {...} ] to deeply equal []
GREEN:    (122 passed)

Resuming a task: `anarres resume project#number`, and the `/anarres:resume` skill. While the
member holds the task it says the task's folder; once they no longer hold it, it refuses and
says the work is no longer theirs; if the task was never prepared on this machine, it says to
prepare it. `resumption` takes the task already parsed from its name, as the command parses it,
so it needs no branch for a name that is not one. The folder's name is now said once,
`taskFolder`. Two scenarios run in-process, where the driver keeps a record of what the member
prepared on their machine; the sandbox driver has no member's machine yet, so they are
`@sandbox-wip` and raise HarnessNotYetBuilt there. The skills for next and resume now repeat the
instructions for doing the work: listed to say them once.

RED:      resuming is in the task's folder while the member holds it -> expected { refused: '' } to deeply equal { folder: … }
GREEN:    (1 passed, hard-coded)
RED:      is the folder of the task named, for any project and task -> expected 'anarres-work/ledger-4' … 'atlas-12'
GREEN:    (2 passed)
REFACTOR: the commands use `taskFolder`
RED:      is refused for a task the member no longer holds (three rows) -> expected { folder } to deeply equal { refused }
GREEN:    (74 passed)
RED:      is refused for a task not prepared here -> expected { folder } to deeply equal { refused }
GREEN:    (75 passed)
RED:      the resume skill may run resume, prepare and submit -> expected undefined to be 'Bash(…resume *)…'
GREEN:    (76 passed)

---

## 2026-10-24: A draft made ready, and the plugin's handover

- A member who submitted a draft and then the finished work got the same pull request back,
  still a draft, which Divlab never merges. Submitting finished work to it now marks it ready,
  through GitHub's GraphQL API, the only way; GraphQL answers 200 even when it refuses, so its
  errors are checked and fail the submission out loud.
- The skill now tells Claude how to hand over partial work when allowance runs low: the signal
  with `status: partial` and a handover note, submitted, not as a draft (decision 0008).

RED:      marks the member's draft ready on a final submit -> the last request was not the mutation
GREEN:    (115 passed)
RED:      fails, saying why, if GitHub will not mark the draft ready -> resolved '12'
GREEN:    (116 passed)

---

## 2026-10-24: The sandbox polls less

- The full run for 2331549 was refused scenario by scenario: GitHub's hourly allowance had gone.
  A full run had grown to about 3,100 requests (waiting for each Divlab run to finish added
  log reads), so two in an hour no longer fit. Most of a run is the driver asking again while it
  waits: whether a pull request has merged (702, every 2 seconds), Divlab's log (about 1,100,
  every 1 to 3 seconds). Divlab's runs take 20 to 40 seconds, so the driver now asks every 5
  seconds for merges and finished runs, and every 3 for a decision. The run is re-run after the
  allowance resets; pushes stay at one full run an hour.

---

## 2026-10-24: Submitting work from the plugin

- `anarres submit project#number [--draft]` checks the member's work as Divlab will, then, with
  the member's own login and GitHub's API only (no git credentials), makes or finds their fork,
  a branch `anarres/task-<n>` from its main, puts each changed file on it, and opens the pull
  request, reusing a branch or pull request the member already has, as after a draft. It takes
  the changed files from git in the task's folder, leaving out the folder's own record. The skill
  may run it, and tells Claude to write the feedback signal first.
- A new scenario submits through the plugin; both drivers go through the CLI's `submit` for it
  (the sandbox forking into the members' organisation, as its accounts cannot fork into a personal
  account, and opening the pull request as the member's own account).
- A mistake the fake could not show, found writing the sandbox side: the pull request's head was
  `owner/repository:branch`; GitHub's is `owner:branch`. Its test was changed and seen failing first.
- The full sandbox run for 9e23ed3 passed all 82.
- Slips: the two pull request adapter tests failed together, as did the two put-file rows.

RED:      submit puts the work on a branch of the fork and asks the project to merge it -> expected []
GREEN:    (55 passed)
RED:      sends nothing when the work is not ready -> GitHub was asked to fork and branch
GREEN:    (56 passed)
RED:      forks into the member's account, or finds their fork -> expected ''
GREEN:    (108 passed)
RED:      branches from the fork's main -> expected undefined
GREEN:    (109 passed)
RED:      keeps a branch submitted to before -> rejected 422
GREEN:    (110 passed)
RED:      puts a new file / one already there (two rows) -> expected undefined
GREEN:    (112 passed)
RED:      opens the pull request / gives the one already open (two at once) -> expected ''
GREEN:    (114 passed)
RED:      the skill may run submit -> expected three rules to be four
GREEN:    (520 passed)
RED:      the pull request's head is owner:branch -> got "alice/ledger:anarres/task-4"
GREEN:    (56 passed; 94 scenarios)

---

## 2026-10-23: Partial work and continuations

- Bernard settled partial work (decision 0008, concept §8 updated): it is merged; Divlab posts a
  continuation for the same role and module, carrying the handover signal, never routing to the
  next role; a continuation also reads its role's own place; anyone eligible may take it.
- Core reads `status: partial` and routes such work to a continuation (`rule: "partial"`).
  Divlab needed no change of its own: the ruling flows through (its test passed first time, kept
  as a guard). The continuation is labelled on GitHub and read back. `prepare` fetches the
  role's own place for a continuation, and the hook lets its session read it.
- A hole I made and closed: the CLI first let a continuation read its own place by a bare prefix
  check, so a path climbing out of it passed. Its test was written and seen failing; the rule
  moved into core's `mayRead` and `readScope`, under the same path check as every read.
- The sandbox driver now waits out a new fork's "Git Repository is empty" answer (it failed one
  scenario of 81 in the run for 0ae84fa; the race fix itself held).
- Slip: the two continuation hook tests went in together.

RED:      gives work handed over part done as partial -> expected { … } to match { partial: true }
GREEN:    (192 passed)
RED:      routes partial work to a continuation for the same role -> rule is not a function (exported),
          then expected { … } to equal { tasks: [ continuation ], reason: partial }
GREEN:    (193 passed)
RED:      marks a continuation, and reads it back -> expected labels to include 'continuation'
GREEN:    (107 passed)
RED:      writeScope is the role's write place -> expected ''
GREEN:    (194 passed)
RED:      prepare also fetches a continuation's own place -> paths without src/
GREEN:    (45 passed)
RED:      a continuation's session may read its own place / its record says so (two at once)
GREEN:    (47 passed)
RED:      a continuation does not climb out of its own place -> expected 'allowed' not to be
RED:      (core) a continuation reads its own place, and no path that climbs out
GREEN:    (195 core; 48 CLI)

---

## 2026-10-23: The CLI says how a claim went

- `anarres claim` now waits, up to a minute and a half, for Divlab's run, and says how the claim
  went: the member holds it, someone else does, Divlab has not answered yet, or it is no task. It
  reads only what Divlab sets on the task, its claimed label and assignee, never the text of
  replies, which anyone could write.

RED:      held when Divlab gave the task to the member -> expected '' to be 'You hold ledger#4…'
GREEN:    (hard-coded)
RED:      someone else holds it / not yet / no task (three rows)
GREEN:    (44 passed); the someone-else wording changed in the test first, then the code

---

## 2026-10-23: The read-scope hook

- The plugin now declares a PreToolUse hook on Claude's file tools, run by the bundled CLI. In a
  task's folder (found from the session's working folder upward, by the record `prepare` now
  leaves there), it refuses a read outside the role's read scope, a write outside its write
  scope, and any file or search outside the folder, in the JSON form Claude Code documents so
  Claude sees why. A folder whose record cannot be read is refused entirely: the hook fails
  closed. Outside any task folder it says nothing. Tried by hand with the bundle.
- Its limit, from Claude Code's documentation: a hook on the file tools does not see a file read
  through Bash, or one the member names with `@`. It keeps an honest session to its inputs; the
  sandbox and permission rules (concept §10) are what enforce it. On the test list.
- The hook's format was checked against Claude Code's documentation first.

RED:      lets the session read a file its role may read -> expected { refused: '' } to be 'allowed'
GREEN:    (hard-coded)
RED:      refuses a file its role may not read, saying why -> expected 'allowed'
GREEN:    (25 passed)
RED:      refuses the member's own files / a folder that only starts like the task's
GREEN:    (27 passed)
RED:      writes where its role writes, not where it only reads -> wrong decision
GREEN:    (28 passed)
RED:      denies a Read outside the scope, giving Claude the reason -> expected undefined
GREEN:    (29 passed)
RED:      judges a Write / an Edit as a write
GREEN:    (31 passed)
RED:      lets a search of the task's folder go ahead -> denied
GREEN:    (34 passed)
RED:      the record gives the task's role and module -> expected undefined
GREEN:    (38 passed)
RED:      the hook guards the file tools -> ENOENT (hooks.json)
GREEN:    (39 passed)
RED:      denies every call in a folder whose record cannot be read -> TypeError
GREEN:    (40 passed)

---

## 2026-10-23: Preparing a task

- `anarres prepare project#number`, for a task the member holds whose issue names the commit its
  inputs are read at, fetches exactly the places the task's role may read (core's `readScope`)
  as they were at that commit: a sparse checkout, one folder per task, made by git commands each
  run with its arguments and no shell. Otherwise it says why not: not a task, not held by the
  member, or no pinned commit. Tried by hand against this repository: only the listed folders
  arrived, at the commit given. The `next` skill may run it, and tells Claude to treat the files
  as data.

RED:      a role's read scope is listed for the CLI -> expected [] to equal [ …(2) ]
GREEN:    (191 passed)
RED:      fetches only the places the task's role may read, at its pinned commit -> expected { refused: '' }
GREEN:    (18 passed)
RED:      is refused for a task that is not one / someone else holds / nobody holds / has no pinned inputs
GREEN:    (22 passed)
RED:      a sparse checkout of only those places, at only that commit, without a shell -> expected []
GREEN:    (23 passed)
RED:      the skill may run next, claim and prepare -> expected two rules to be three
GREEN:    (474 passed; 92 scenarios)

---

## 2026-10-23: Two sandbox failures from 8df85b3, and their fixes

- The full sandbox run for 8df85b3 failed 5 of 80. One worker's Divlab run got a 502 from GitHub
  on its merge, failing its run; that worker's later scenarios were thrown off by it. Divlab
  now asks GitHub whether a merge it got a server error for happened after all, and carries on
  with its commit if so; if not, it fails as before.
- The scenario catching a change to main saw no alert, though it had passed alone. The kept
  repositories showed why: the driver went on as soon as Divlab recorded its decision, while
  Divlab's run was still writing; the scenario's direct change landed before Divlab's first check
  of main, which took it as the project's starting point. The sandbox driver now waits for each
  Divlab run to finish, marked by the record of how far it checked main that ends every run, and
  waits for GitHub's list of change alerts to show one for each direct change that took.
- (Before the setup records where checking starts, the same gap exists for real projects: a
  change made between setting up and Divlab's first run is not checked. On the test list.)

RED:      carries on with the merge's commit if GitHub merged it after all -> Error: answered 502
GREEN:    (105 passed); not merged still fails: passed first time, kept

---

## 2026-10-23: Read scopes, and tasks pinned to a commit

- Core holds the access matrix's read scopes beside its write scopes: each module role reads
  its own module's places and its requirement slice (taken as `programme/slices/<module>/`,
  mirroring `modules/<module>/`), never another module's and never a path that climbs out.
  Contracts wait for modules.yaml; a Research task's inputs, for its question.
- Divlab now posts each task with the commit its inputs are read at: the merge whose work decided
  it. The task's issue says so in words and in its decision block, read back only if it is a
  commit name, since anyone who can edit the issue can change its text.
- The read-scope table was written whole from the concept's matrix and pinned row by row (passed
  first time); the decision block's `try` was taken out to see its test fail, then put back.

RED:      Coding reads its module's specifications and tests, not its architecture
GREEN:    (18 passed)
RED:      Reviewer reads its slice, specifications and code, not its tests
GREEN:    (183 passed)
RED:      no role reads another module's place, nor climbs out of its own
GREEN:    (190 passed)
RED:      posts each task with the commit its inputs are pinned at -> expected [ undefined ] to equal [ 'm3rg3d' ]
GREEN:    (141 passed; two tests that pinned the posted task now expect its commit)
RED:      a task's issue says which commit its inputs are read at -> body without it
GREEN:    (101 passed)
RED:      reads back the commit, if it is a commit -> expected undefined
GREEN:    (103 passed)
RED:      reads no commit from an edited decision block -> SyntaxError
GREEN:    (104 passed; 92 scenarios)

---

## 2026-10-23: Claiming from the plugin

- `anarres claim project#number` posts Divlab's claim comment on the task's issue, as the member.
  The name is checked strictly first (a repository's name and an issue number GitHub could have
  given), since it comes from offers made of other people's data; a badly named task asks for
  nothing. The comment's text is Divlab's `CLAIM`, defined once. The `next` skill may now run
  `claim` too, and both drivers claim through the CLI, so the scenarios exercise what the plugin
  runs.
- Slip: the two claim tests went in together and failed together.

RED:      the task named project#number is that project and issue -> expected undefined to equal {…}
GREEN:    (1 passed)
RED:      is none for a fractional number / a non-repository project / two tasks / issue 0 (four rows)
GREEN:    (15 passed)
RED:      claiming asks Divlab for it / asks for nothing when badly named (two at once)
GREEN:    (17 passed)
RED:      a member's claim from their CLI is the claim comment Divlab reads -> expected [] to equal [ {…} ]
GREEN:    (438 passed)
RED:      the next skill may run next and claim -> expected the one rule to be two
GREEN:    (451 passed; 92 scenarios)

---

## 2026-10-23: The plugin's `/anarres:next`

- The plugin exists: `.claude-plugin/marketplace.json` makes this repository its marketplace
  (`/plugin marketplace add anarres-project/anarres`), and `plugin/` holds it. Its one skill,
  `next`, runs as `/anarres:next`: it may run exactly one command without asking, the CLI bundled
  inside the plugin, and it shows the offers as printed, treating them as data written by others.
- The plugin's format was checked against Claude Code's documentation first: skills are the
  current form for commands; an installed plugin is a copy of its own folder, so the CLI is
  bundled into `plugin/cli/` (not `plugin/bin/`, which claude.ai and Cowork would skip); CI
  checks the bundle matches its source.
- Tests hold the plugin's shape as the template tests hold the workflows'.

RED:      the plugin is listed by this repository's marketplace -> ENOENT
GREEN:    (1 passed)
RED:      it is named as the marketplace names it -> ENOENT
GREEN:    (2 passed)
RED:      its next skill may run one thing without asking -> ENOENT
GREEN:    (3 passed)
RED:      it carries the CLI it runs, bundled -> ENOENT
GREEN:    (442 passed; 92 scenarios)

---

## 2026-10-23: The `anarres next` command

- `packages/cli` has its command, `anarres next`: it reads GitHub with the member's own GitHub
  CLI login (never a token of Anarres's), finds the organisation's projects with work ready in
  one search of their issues, and lists the tasks the member may take, one to a line. It is
  bundled like Divlab, and CI checks both bundles match their source. Run against the sandbox as
  the second account, it listed the tasks of the full run then going.
- The finding-work scenario passed in the sandbox (63 requests), Alice's own account asking. Its
  first try failed on timing: the driver waited only for GitHub's search to see the project,
  which it did once an earlier task was indexed, before the newest was listed. It now also waits
  for the project's ready list to show every task the log says Divlab posted.
- The full sandbox run for 826cbed passed all 79 with the main check after every run, so the
  scenario catching a change runs there too.
- A first bundle failed at start-up: its banner's newline went in literally, hiding the `require`
  setup in the `#!` line. The `#!` line now starts `main.ts`, which esbuild keeps.

RED:      the offers name each task by its project, issue, role and module -> expected '' to be '…'
GREEN:    (3 passed)
RED:      say so when there is nothing the member may take -> expected '' to be 'No tasks you may take…'
GREEN:    (4 passed)
RED:      the projects with work ready are found in one search -> expected [] to equal [ 'ledger', 'atlas' ]
GREEN:    (97 passed)
RED:      a project's ready tasks are its open issues labelled ready -> expected [] to equal [ {…} ]
GREEN:    (98 passed)
RED:      the member a CLI acts for is the account GitHub says -> expected '' to be 'alice'
GREEN:    (430 passed)

---

## 2026-10-23: A member asks for work

- Section 5 begins. A new package, `packages/cli`, will hold the `anarres` CLI the plugin calls.
  Its first piece, `askForWork`, offers a member the ready tasks across Anarres's projects that
  they may take: their trust level, linked accounts and part in each project, from the
  governance file and each project's log.
- The rule for who may take a task was inside Divlab's `onClaim`; it is now Divlab's exported
  `eligibility`, which `onClaim` and the CLI both use, so it is stated once. A filter written in
  core for the same purpose a moment before was deleted, unused.
- The scenario runs in-process; the CLI's reading of GitHub is next.
- The sandbox run for 826cbed (the main check after every run): see the next entry.

RED:      (core) offers what the member may take -> expected [] to deeply equal [ … ] (later deleted)
GREEN:    (175 passed)
REFACTOR: eligibility(governance, events), extracted from onClaim (140 passed)
RED:      offers the ready tasks, across Anarres's projects, that the member may take
          -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (411 passed; the scenario passes in-process)

---

## 2026-10-23: Every change to main is checked

- Bernard chose (2026-10-23) for each Divlab run to check main's commits since its last look,
  over waking Divlab for every push. A commit is Divlab's if GitHub signed it as made by
  Divlab's App (its log writes: committed as `web-flow`, verified, author the App's account) or
  it is a merge Divlab recorded. Looking in the sandbox first showed why the record is needed: a
  merge's commit carries the member as its author, exactly as a person's merge through the
  website would.
- So Divlab records the commit each merge made (and, finishing an interrupted merge, asks
  GitHub for it). Each run checks the commits since its last check, records and alerts once any
  that are not Divlab's (an escalation labelled `change-not-by-divlab`), and records how far it
  checked. A project never checked starts from main as it stands. The template passes Divlab its
  App's slug; the Action runs the check after every run.
- The fake GitHub now has commits: Divlab's log writes, its merges (the member as author, signed
  by GitHub), and anyone else's. A guard scenario checks Divlab's own changes raise no alarm.
- Slips: the "(no account)" wording and some adapter stubs went in with their tests; the
  scenario that catches a change passed first time (built from the unit tests up).

RED:      records the commit its merge made -> expected { … } to match object { mergedAs }
GREEN:    (126 passed)
RED:      merging gives the commit GitHub's merge made -> expected undefined to be 'm3rg3d'
GREEN:    (403 passed)
RED:      records the commit of a merge it finishes after an interrupted run -> expected { … } to match { mergedAs }
GREEN:    (127 passed)
RED:      a merged pull request's commit is the one GitHub says its merge made -> expected '' to be 'm3rg3d'
GREEN:    (405 passed)
RED:      alerts PDC coordinators of a commit on main that Divlab did not make -> expected [] to equal [ {…} ]
GREEN:    (1 passed)
RED:      leaves alone a commit GitHub signed as made by Divlab's account -> expected [ {…} ] to equal []
GREEN:    (2 passed)
RED:      alerts a commit naming Divlab's account that GitHub did not sign -> expected [] to equal [ 'f0f0f0' ]
GREEN:    (3 passed)
RED:      leaves alone a merge Divlab recorded, though its commit carries the member as author
GREEN:    (4 passed)
RED:      records a change it did not make in the project's log -> expected [] to contain { … }
GREEN:    (132 passed)
RED:      alerts a change only once -> expected [ {…} ] to equal []
GREEN:    (133 passed)
RED:      records how far it checked -> expected [] to equal [ { mainChecked } ]
GREEN:    (134 passed)
RED:      checks only the commits since its last check -> expected [ undefined ] to equal [ 'b2' ]
GREEN:    (135 passed)
RED:      starts from main as it stands when it has never checked -> Error: Divlab should not have acted
GREEN:    (136 passed; the earlier check tests now start from a checkpoint, as they describe)
RED:      main's commits since the last check, with author and signer -> expected [] to equal [ … ]
GREEN:    (92 passed)
RED:      main's head is the one main's reference points to -> expected '' to be 'h3ad'
GREEN:    (93 passed)
RED:      reads back a record of a change not by Divlab / of how far Divlab checked -> cannot be read
GREEN:    (95 passed)
RED:      the alert names the commit and its author, quoted as text -> expected { title: '' … }
GREEN:    (96 passed)
RED:      tells Divlab its App's name -> expected undefined (four workflows)
GREEN:    (140 passed; 91 scenarios)

---

## 2026-10-23: Old claims do not win a freed task

- GitHub stops a public repository's scheduled runs after 60 days without activity, so a quiet
  project's hourly lease check could stop and a task whose lease ran out stay held. A claim on
  such a task now ends the lease there and then (recorded, freed, its member told) and goes on
  to give the task out. The lease arithmetic is shared with the hourly check.
- Building that found a bug: a free task goes to the earliest claim among its issue's comments,
  and those include old ones, so a task Alice gave back went straight back to Alice when anyone
  next claimed it, and claims refused while it was held could win it later. Only claims made
  since the task was last free now count: after its latest release or recorded lease end, or,
  for a lease ended by the claim itself, after the moment it ran out. Comments carry GitHub's
  time for this.
- Slip: the two scenarios (a task given back goes to whoever claims next; a run-out lease goes to
  a new claim without the hourly check) were written after the unit tests; with the fake's
  comments untimed they failed, as the bug did, and pass with times.

RED:      gives a task whose lease has run out to a new claim, without waiting for the hourly check
          -> Error: Divlab should not have acted (it refused Bob: the task still looked held)
GREEN:    (123 passed)
REFACTOR: leasesFrom and endLease, shared with the hourly check
RED:      gives a task a member gave back to a claim made since, not to its old claims
          -> Error: Divlab should not have acted (Alice regained it, Carol was refused)
GREEN:    (124 passed)
RED:      gives a task freed by the hourly lease check to a claim made since (the line taken back out
          to show it) -> Error: Divlab should not have acted
GREEN:    (125 passed)
RED:      a task's comments are read with when each was made -> expected [ { member, text } ] to equal [ { …at } ]
GREEN:    (89 passed; 89 scenarios)

---

## 2026-10-23: Two members and trust levels in the sandbox

- Bernard approved the second account's token in the sandbox organisation: the 403s were the
  organisation waiting to approve it. The seven scenarios needing it then passed in the sandbox
  (300 requests): claiming, the claim record, giving a task back, the draft, a new member
  refused a Reviewer task, an established member given one, and linked accounts as one member.
  They run there now. Three scenarios have three members and wait for a third account.
- The full sandbox run for 46cb1c2 passed all 78, the `@governance` scenarios one at a time
  across the four workers.

---

## 2026-10-23: The sandbox's governance file

- `anarres-sandbox/governance` holds the sandbox's governance file, empty to start (created with
  the sandbox token, Bernard agreeing); Bernard adds the organisation variable naming it.
- The sandbox driver records trust levels and linked accounts there, for the account playing the
  member. Trust belongs to an account the four workers share, so scenarios that set it are
  tagged `@governance` and run one at a time (Cucumber's `atMostOnePicklePerTag`), and each
  takes out what it recorded when it ends.
- With the variable set, "a member who wrote a module's code cannot review it" passed in the
  sandbox, Alice made established in the sandbox's file, so it runs there. The scenarios needing
  the second account still fail at its first write (403 "Resource not accessible by personal
  access token"); Bernard to check the token's approval, then the organisation's base permission.

---

## 2026-10-23: A second account plays a second member in the sandbox

- Bernard made a second GitHub account, `anarres-sandbox-member-b`, a member of the sandbox
  organisation, with a token that may only comment and open pull requests there. The sandbox
  driver now gives each scenario member an account as they first act: the sandbox's own, then
  the second. Claims, releases and a member's pull requests are made as that member's account,
  and Divlab's replies, assignees and claim records are mapped back by account name.
- Scenarios with two members come back to the sandbox once each has passed there: claiming,
  the claim record, giving a task back, the draft. Three have three members (whoever did the
  earlier work, Alice and Bob) and wait for a third account.
- The write-scope scenario passed in the sandbox, so it runs there. The two-member scenarios
  failed at the second account's first comment: GitHub answered 403 "Resource not accessible by
  personal access token", though the account can read the repositories; most likely the
  organisation is waiting to approve the token (Bernard to check).
- Correction: the commits held for the allowance's reset at 10:39 were not pushed then, as said;
  they go out with this one.

---

## 2026-10-23: Windows line endings

- A feedback signal written with Windows line endings was unreadable: its first line was "---"
  and a carriage return. Lines now end at a line feed with or without one.

RED:      reads a signal written with Windows line endings the same -> expected { unreadable } to equal { … }
GREEN:    (174 passed)

---

## 2026-10-23: Each role writes only its own place

- Divlab merged whatever files a pull request held, so a member's work could have changed
  anything in the project, Divlab's own workflows included. Core now holds the access matrix's
  write scopes (concept §6), once: each module role writes its own folder in its own module,
  the Programme Architect `programme/`, Research `research-briefs/`, and every role one feedback
  signal. Divlab refuses work that changes anything else before recording or merging it, naming
  the paths. A path with an empty, `.` or `..` part, or a backslash, is outside every scope.
- Work naming a role Anarres does not have is refused, saying so (it would have crashed the
  scope check, and before that been routed as the start of a pipeline).
- The scenarios can now give work files besides its signal (`workFiles`), in both drivers.
- The write-scope table was written whole from the concept's matrix, then pinned row by row
  (passed first time).

RED:      does not let Coding change its module's tests -> expected [] to deeply equal [ Array(1) ]
GREEN:    (hard-coded)
RED:      lets work add its one feedback signal -> expected [ 'feedback/FB-7.md' ] to deeply equal []
GREEN:    (2 passed)
RED:      does not let work change a second feedback signal -> expected [] to deeply equal [ 'feedback/FB-3.md' ]
GREEN:    (3 passed)
RED:      lets Specification change its module's specifications, and not its code -> wrong paths
GREEN:    (4 passed; 13 with every role pinned)
RED:      counts as outside a path that climbs out / names its place oddly / has an empty part / uses
          the other slash -> (four rows) expected [] to deeply equal [ path ]
GREEN:    (173 passed; core branches 100%)
RED:      does not merge work that changes files outside its role's place, and names them
          -> Error: Divlab should not have acted
GREEN:    (121 passed)
RED:      does not merge work from a role Anarres does not have, and says so
          -> TypeError: WRITE_SCOPES[role] is not a function
GREEN:    (122 passed; 86 scenarios)

---

## 2026-10-23: Linked accounts are one member

- The governance file lists a member's linked accounts under them. Core's `memberFor` gives the
  member an account belongs to, reading the file as data (an account nobody links is itself).
  Divlab resolves every account to its member before applying any rule, so a linked account
  shares its member's trust level and history.
- CI checks the governance file links each account to one member at most (seen failing on an
  account linked twice).

RED:      is the member a PDC coordinator linked it to -> expected 'alice-2' to be 'alice'
GREEN:    (17 passed)
RED:      is the account itself when … (four rows) -> TypeError
GREEN:    (156 passed)
RED:      treats an account a PDC coordinator linked to a member as that member
          -> refused as new, not for one role per module
GREEN:    (119 passed; 86 scenarios)

---

## 2026-10-23: Trust levels

- Core holds what each trust level may take, each role's lowest level stated once, and reads a
  member's level from the governance file as data: a member it does not list, a level Anarres
  does not have, a malformed or missing file all mean *new*. The trust check is part of
  `mayTake`, so core has one statement of who may take a task.
- Divlab reads the governance file when a member claims a task, through a new port, `Members`.
  The adapter reads `governance/members.json` from Anarres's repository unless the organisation's
  `ANARRES_GOVERNANCE` variable names another (the claim workflow passes it; nothing in a
  member's pull request reaches it). A file it cannot read gives nobody any trust.
- `governance/members.json` is in the repository, empty for now, with a README; CI checks every
  level in it, seen failing on a bad one.
- The scenario where Alice may not review her own code now makes her established first, or she
  would be refused as new rather than for the reason it is about.
- Slips: the role table was written whole from decision 0007, then pinned row by row (passed
  first time); the "a trusted member" wording was written with the first refusal, caught by the
  coverage gate, then tested (passed first time); the adapter's line for other GitHub errors was
  taken out, its test watched fail, and put back.

RED:      does not let a new member take a Reviewer task -> expected true to be false
GREEN:    (hard-coded)
RED:      lets a new member take a Coding task -> expected false to be true
GREEN:    (2 passed)
RED:      is the level PDC coordinators recorded for them -> expected 'new' to be 'established'
GREEN:    (11 passed)
RED:      is new for a level Anarres does not have / a file that is not what Divlab writes / no file
GREEN:    (148 passed)
RED:      is refused to a member whose trust level is too low for the role -> expected 'allowed' to equal { refused }
GREEN:    (149 passed)
RED:      refuses a member whose trust level is too low for the task, saying why
          -> (every claim test failed: Divlab still called mayTake without a level)
GREEN:    (116 passed)
RED:      is read from Anarres's own repository unless the organisation names another -> expected undefined
GREEN:    (84 passed)
RED:      is nothing when there is no such file -> Error: GitHub GET … answered 404
GREEN:    (85 passed)
RED:      fails, saying what GitHub answered, when GitHub will not give it -> got 'The first argument must be…'
GREEN:    (86 passed)
RED:      is nothing when the file is not JSON -> SyntaxError
GREEN:    (87 passed)
RED:      is read from the repository the organisation names instead -> expected undefined
GREEN:    (88 passed)
RED:      tells Divlab where the organisation keeps its governance file -> expected undefined
GREEN:    (117 passed; 85 scenarios)

---

## 2026-10-23: The eligibility scenarios run in the sandbox

- The sandbox driver's claim waited only for the task to show as claimed, so a claim Divlab
  refused timed out. It now ends on Divlab's reply too. The three eligibility scenarios passed in
  the sandbox (two at 80 requests, after one at 331 that showed the gap), so they run in both.
- Bernard settled trust levels (decision 0007, concept §11): new members take Specification,
  Test, Coding and Research; established add Architecture and Reviewer; trusted add Security &
  Quality and Programme Architect; every module counts as low-risk until risk can be marked; the
  governance file also records linked accounts; the sandbox reads a file of its own, named only
  by its organisation's settings.

---

## 2026-10-23: The earliest allowed claim wins

- If the earliest claim on a free task came from a member the rules bar, a later member's run
  refused the later member with the earlier one's reason, and nobody got the task. Divlab now
  judges the member asking first (barred: told why), then gives a free task to the earliest claim
  that is allowed.
- Slip: a local sandbox run started before the commit it tests was pushed, so GitHub could not
  find that version of Divlab (73 requests, no result). Pushed first from now on, as
  `docs/SANDBOX.md` says; and a run of chosen scenarios is named with `--name`, since a file path
  is added to the configured paths, not put in their place (one such run started every scenario).

RED:      gives the task to the earliest claim that is allowed, passing over one that is not
          -> Error: Divlab should not have acted
GREEN:    (115 passed)
REFACTOR: onClaim judges the asker, then the claimants in order

---

## 2026-10-23: A task a member holds counts towards their role

- A claim now records the role and module of its task, so the log alone says which tasks a
  member holds. Their part in a module is their merged work and the tasks whose latest claim is
  theirs and was neither given back nor ran out.
- A claim record's role is checked when read back, since the log can be edited: one naming a role
  Anarres does not have is refused. `isRole` is core's, used wherever a role is read from outside.
- Slip: the lines dropping a given-back or run-out claim were written before their test; taken
  out, both rows failed for the right reason, and they went back.

RED:      refuses a member who holds a task in the module in another role
          -> Error: Divlab should not have acted (it granted the claim)
GREEN:    (112 passed; the claim record's test now expects its role and module)
RED:      does not count a task the member gave back / let run out -> Error: Divlab should not have acted
GREEN:    (324 passed)
RED:      is refused, saying why, when a claim names a role Anarres does not have -> expected to throw
GREEN:    (325 passed)
RED:      is for a role Anarres has -> expected false to be true
GREEN:    (hard-coded)
RED:      is not for "bystander" / 12 / "toString" -> expected true to be false
GREEN:    (329 passed)
REFACTOR: isRole in both places the representation reads a role

---

## 2026-10-23: One role per module

- Bernard settled what the conflict-of-interest rules mean (decision 0007, concept §6 updated): a
  member takes one role in a module for its whole life; their merged work and any task they hold
  count; revising their own role's work is allowed; Research is not a role in a module; trust
  levels will live in a file in `governance/`.
- Core decides it (`mayTake`). Divlab now records who did each piece of merged work, the pull
  request's author, in the about-to-merge record and the decision, so an interrupted merge keeps
  it too. When it gives a free task to a member, it checks the rule against the log and refuses,
  saying why, if the member has worked on the module in another role.
- A task is now only an issue naming a role Anarres has and a module: anyone who triages can
  change labels.
- The scenarios had cast one member twice: unnamed work was done by the DSL's default member,
  "alice", the same member as the scenarios' Alice, so the rule refused her claims. The default
  member is now "someone". One scenario ("give a task back early") had passed for nothing, its
  claim refused unnoticed: a Given that a member has claimed a task now checks the claim took.
- In the sandbox one account plays every member, so scenarios with two members cannot run there
  until a second account exists; the claiming, giving-back, claim-record and draft scenarios are
  tagged again. The sandbox driver now reads Divlab's replies on tasks, for the one-member
  eligibility scenarios.
- "A member may revise work in their own role" passed first time: nothing refused anything yet.
  Kept as a guard against the rule reaching too far.
- Slip: two table tests failed several rows at once (the label checks).

RED:      is refused to a member who has done other work in the module -> expected 'allowed' to deeply equal { refused }
GREEN:    (hard-coded on any part)
RED:      is allowed when the other work in the module is someone else's -> expected { refused } to be 'allowed'
GREEN:    (2 passed)
RED:      is allowed when the member's other work is on another module -> expected { refused } to be 'allowed'
GREEN:    (3 passed)
RED:      is allowed for more work in the member's own role -> expected { refused } to be 'allowed'
GREEN:    (4 passed)
RED:      is allowed for Research, which is not a role in the module -> expected { refused } to be 'allowed'
GREEN:    (5 passed)
RED:      is allowed after Research on the module -> expected { refused } to be 'allowed'
GREEN:    (128 passed)
REFACTOR: isRoleInModule, one statement of what Research is
RED:      records who did the work in its decision -> expected { … } to match object { member: 'alice' }
GREEN:    (109 passed)
RED:      keeps who did the work when it finishes an interrupted merge -> expected { … } to match object { member }
GREEN:    (110 passed)
RED:      records that it is about to merge, with the work and who did it -> deep equality failed
GREEN:    (316 passed)
RED:      refuses a member who has done other work in the module, saying why
          -> expected [ [ {…} ], [] ] to deeply equal [ [], [ {…} ] ]
GREEN:    (111 passed)
RED:      reads back the role and module a task is for -> expected {} to match object { role, module }
GREEN:    (318 passed); four tests that pinned the whole task now check what each was about
RED:      is no task when the issue names no role / a role Anarres does not have / no module
          -> expected {…} to be undefined
GREEN:    (321 passed; 83 scenarios)

---

## 2026-10-23: Two small gaps in claims and leases

- A comment by a deleted account comes from GitHub with no user, and reading the task's comments
  failed on it. It is now left out: such a claim can win nothing.
- A lease whose start cannot be read (the log is files people can edit) compared as never
  running out, holding its task for ever. It now counts as run out.

RED:      leave out a comment whose account has been deleted
          -> TypeError: Cannot read properties of null (reading 'login')
GREEN:    (78 passed)
RED:      has run out if when it began cannot be read -> expected false to be true
GREEN:    (122 passed)

---

## 2026-10-23: Someone who does not hold a task cannot give it back, and is told

- A release from anyone but the task's holder now gets a reply saying only the holder can give it
  back. Claim refusals became refusals in general: Divlab words the whole reason, and the adapter
  addresses it to the member.
- The release scenario passed in the sandbox on its own (59 requests), so it runs in both. The
  full run for e237b29 passed all 70 with the sweep fix.
- The release fixture in the unit tests now lets a refusal happen, as the claim fixture does:
  the test it broke checks the task stays with its holder, which still holds.

RED:      (acceptance) Bob is told only the member holding the task can give it back -> AssertionError
RED:      tells someone who asks to give back a task they do not hold that only its holder can
          -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (319 passed; 80 scenarios)
REFACTOR: refuseClaim became refuseMember, its reasons whole sentences

---

## 2026-10-23: A member is told their lease ran out

- When Divlab frees a task whose lease ran out, it replies on the task to the member who held it.
  The message gives the lease's length from core, not a second copy of the number.
- Slip: driven from the unit tests first; the acceptance scenario's new step was added after, and
  watched fail on its assertion (the fake told nobody) before the fake kept the message.

RED:      tells the member their lease ran out, on the task -> expected [] to deeply equal [ {…} ]
GREEN:    (107 passed)
RED:      replies on the task's issue to the member, saying the task is ready again
          -> expected [] to deeply equal [ Array(1) ]
GREEN:    (305 passed)
RED:      (acceptance) Alice is told the lease on the task ran out -> AssertionError: expected [ 'alice-s…' ], got []
GREEN:    (80 scenarios passed)

---

## 2026-10-23: A member gives a task back

- A member holding a task comments `/release` on it; Divlab records the release and makes the
  task ready again. A release from anyone but the holder changes nothing. The comment is read as
  a claim is, exactly the command, on a task, from a named commenter.
- The sandbox sweep: all four workers sweep as a run starts, and once a failed run had left
  repositories, they deleted the same ones at once; GitHub answered 409 to all but one, failing
  every worker's setup (e71e805). A 409 or 404 now counts as swept (e237b29, committed on its
  own ahead of this).
- Slip: the sweep's 204 and 404 rows were one table, so two rows failed at once.

RED:      acts on a release when a member comments to give a task back
          -> expected { nothing: true } to deeply equal { release: … }
GREEN:    (103 passed)
RED:      makes the task ready again when the member holding it gives it back -> expected [] to deeply equal [ '12' ]
GREEN:    (104 passed)
RED:      leaves the task with its holder when someone else asks to give it back
          -> expected [ '12' ] to deeply equal []
GREEN:    (105 passed)
RED:      records that the member gave the task back, and when, before the board shows it
          -> expected [ [ 'released' ], [] ] to deeply equal [ [ 'recorded', 'released' ], …(1) ]
GREEN:    (106 passed)
RED:      reads back a record that a member gave a task back -> Error: The event file cannot be read
GREEN:    (303 passed)
RED:      the sweep is done when GitHub says another operation is deleting it -> expected false to be true
GREEN:    (hard-coded on 409)
RED:      is done when GitHub answers 204 / 404 -> expected false to be true (two rows)
GREEN:    (6 passed); refusing (403) is not done: passed first time, kept

---

## 2026-10-23: Draft work renews the lease

- Divlab merged a draft like any other pull request, though a draft is the member saying the work
  is not finished. Now it never merges one. A draft whose feedback signal names a task the
  draft's author holds is recorded as activity on that task, and a lease runs from the latest
  activity by its holder. A draft with no signal yet is passed over in silence. The pull request
  workflow now also runs when a draft is marked ready, which by default it did not.
- `PullRequests.head` became `pullRequest`: the head, the draft flag and the author from one read
  of GitHub, not three.
- `signalOf` now names only the kinds of event that carry a feedback signal, so a new kind is about
  none by default: three kinds in a row had needed a test to stop them crashing it.
- The sandbox runs: 88d9088 passed all 69. f7a16eb failed 8, all in one worker whose fork GitHub
  then reported as an empty repository, while GitHub was answering requests with 504s. Not
  Anarres; on the test list in case it recurs.
- The draft scenario passed in the sandbox on its own (66 requests), so it runs in both.
- The sandbox runs for 32f814a and 98e136e were refused scenario by scenario by the allowance
  check: GitHub's hourly 5,000 had gone. Pushing every commit started more full runs (about 2,200
  requests each) than an hour holds, on top of single-scenario runs and watching. So pushes are
  spaced now: at most two full sandbox runs an hour.
- Slip: the lease check's member test on activity was written before its test; taken out, the
  test failed for the right reason, and it went back.

RED:      does not merge a draft: its member has not finished the work -> expected [ '7' ] to deeply equal []
GREEN:    (95 passed)
RED:      records a draft from the member holding its task as activity on the task
          -> expected [] to deeply equal [ { project: 'ledger', …(2) } ]
GREEN:    (96 passed)
RED:      reads past activity on tasks in the log -> TypeError: Cannot read properties of undefined
GREEN:    (97 passed)
REFACTOR: signalOf names only the kinds with a signal; the "reads past" tests are one table
RED:      records no activity for a draft from someone who does not hold its task
          -> expected [ {…} ] to deeply equal []
GREEN:    (98 passed)
          A draft with no feedback signal yet: passed first time (its early return came with the
          first draft test, for the types); kept as a regression test.
RED:      judges a lease by the latest activity on its task, such as draft work
          -> expected [ '12' ] to deeply equal []
GREEN:    (100 passed)
RED:      renews a lease only with activity by the member holding it -> expected [] to deeply equal [ '12' ]
GREEN:    (101 passed)
REFACTOR: PullRequests.pullRequest, one read for head, draft and author
RED:      is read as the commit it is at, whether it is a draft, and who opened it
          -> expected { …draft: false… } to deeply equal { …draft: true… }
GREEN:    (296 passed)
RED:      reads back a record of activity on a task -> Error: The event file cannot be read
GREEN:    (297 passed)
REFACTOR: claims, leases and activity share one check when read back
RED:      runs when a member marks a draft ready, as well as when work is opened or pushed to
          -> TypeError: Cannot read properties of null (reading 'types')
GREEN:    (102 passed)

---

## 2026-10-23: Leases run out

- A lease runs out 24 hours after the last activity on its task: today that is the claim, until
  draft work counts as activity (next). The 24 hours are core's, defined once; at exactly 24 hours
  the lease has run out.
- A new template workflow runs Divlab every hour, at 17 minutes past (GitHub may delay or drop
  scheduled runs at the start of the hour). Divlab reads the log for each task's latest claim,
  and where that lease has run out and its member still holds the task, records that the lease
  ran out and makes the task ready again, assigned to nobody. A task whose work is done, or that
  has been claimed since, by anyone, is left alone.
- The lease record, like the claim record, is about no feedback signal; Divlab and the adapter
  read past it, each shown failing first.
- The in-process driver's clock now moves when a scenario says time passes; before, every run
  used one fixed time. The sandbox cannot move GitHub's clock, so both lease scenarios are
  `@sandbox-wip`.
- Template tests: the check that each workflow waits its turn with the others moved into the
  checks every Divlab workflow shares (group and no cancelling, as comparing with the push
  workflow had checked).
- Slip: `signalOf`'s new branch was written before a test asked for it; taken out, its test failed
  for the right reason, and it went back.

RED:      has run out 25 hours after the last activity on its task -> expected false to be true
GREEN:    (hard-coded)
RED:      still holds 23 hours after the last activity -> expected true to be false
GREEN:    (120 passed)
RED:      has run out at exactly 24 hours: that is when it expires -> expected false to be true
GREEN:    (121 passed)
RED:      makes a task ready again when its lease has run out -> expected [] to deeply equal [ '12' ]
GREEN:    (1 passed)
RED:      leaves alone a task the claim no longer holds, such as one whose work is done
          -> expected [ '12' ] to deeply equal []
GREEN:    (2 passed)
RED:      leaves alone a task another member has claimed since -> expected [ '12' ] to deeply equal []
GREEN:    (3 passed)
RED:      judges a task's lease by its latest claim, so a member who claimed again keeps it
          -> expected [ '12' ] to deeply equal []
GREEN:    (83 passed)
REFACTOR: each task's latest claim is found first, then judged
RED:      records that the lease ran out, and when it found it had, before the board shows it
          -> expected [ [ 'released' ], [] ] to deeply equal [ [ 'recorded', 'released' ], …(1) ]
GREEN:    (84 passed)
RED:      reads past leases that ran out in the log -> TypeError: Cannot read properties of undefined
GREEN:    (85 passed)
RED:      labels its issue ready instead of claimed, and assigns it to nobody
          -> expected [] to deeply equal [ { …(2) } ]
GREEN:    (72 passed)
RED:      reads back a record that a member's lease ran out
          -> Error: The event file cannot be read: it is not a routing record
GREEN:    (279 passed)
RED:      checks the project's leases when its schedule comes round
          -> Error: Divlab does not act on schedule events
GREEN:    (86 passed)
RED:      the lease workflow runs every hour, and on nothing else
          -> expected { schedule: [ { cron: '0 * * * *' } ] } to deeply equal { Object (schedule) }
GREEN:    (92 passed)
REFACTOR: the template's shared workflow checks include waiting a turn

---

## 2026-10-23: Claims are recorded

- Divlab records each claim it grants in the project's log, with when by its clock, before the
  board shows it, as it records a routing decision before acting on it.
- A claim is about no feedback signal, and the log's readers took every event to be about one: a
  claim in the log would have crashed the next run on a push (in Divlab) and been refused as
  unreadable (in the adapter). Both now read past it, each driven by a failing test first.
- It passed in-process, then in the sandbox on its own (48 requests), so it runs in both.
- The sandbox run for 9c59aef failed one scenario of 67, in escalation: after the fourth re-run a
  Coding task still showed as ready. The run for c48cb7f then failed two (both rows of "a failed
  review or security check sends the code back to Coding", in two workers, in the same minute):
  the Coding task was not listed. Its kept repository shows Divlab posted it correctly and every
  Divlab run succeeded; GitHub's ready list had not shown it within the driver's 30-second wait.
  So the driver now waits up to two minutes for the lists, polling every two seconds instead of
  every half second, so the longer wait costs no more requests.

RED:      records the claim it grants, saying when by its clock -> expected [] to deeply equal [ {…} ]
GREEN:    (78 passed)
RED:      reads past the claims in the log, which are about no feedback signal
          -> TypeError: Cannot read properties of undefined (reading 'feedbackSignal')
GREEN:    (79 passed)
RED:      reads back a record of a claim Divlab granted
          -> Error: The event file cannot be read: it is not a routing record
GREEN:    (268 passed)

---

## 2026-10-23: Only a task is a task

- Divlab asked the board for "the task" an issue number names, and the adapter answered for any
  issue in the project: an alert, a finished task, anyone's own issue. So a claim on an alert
  would have marked it claimed, and, older than claiming, work whose feedback signal named any
  issue as its task closed that issue once merged. An issue is now a task only while it is open
  and carries Divlab's ready or claimed label. A claim on anything else is refused, saying it is
  not a task anyone can claim; merged work that names something else is routed as usual but
  closes nothing, and its record names no task. Refusing such work outright is section 4's.
- Covered by unit tests only, for now: the scenarios cannot yet name an alert or a finished task
  as the thing claimed or worked on (on the test list).

RED:      is no task when the issue is an alert to PDC coordinators -> expected {} to be undefined
GREEN:    (262 passed)
RED:      is no task when the task's issue has been closed: it is done -> expected {} to be undefined
GREEN:    (263 passed)
RED:      refuses a claim on something that is not a task, such as an alert or a finished task
          -> expected [ [ {…} ], [] ] to deeply equal [ [], [ {…} ] ]
GREEN:    (76 passed)
RED:      never closes an issue the work names that is not a task, such as an alert
          -> expected [ '3' ] to deeply equal []
GREEN:    (265 passed)

---

## 2026-10-23: The first claim made wins

- Divlab's runs for a project go one at a time, but GitHub need not start them in the order the
  comments were made. So Divlab does not trust the order it hears of claims in: a claim's run
  reads the task's comments, and if nobody holds the task, gives it to the earliest claim there.
  Any earlier claim already exists when a later claim's run starts, so the outcome does not hang
  on which run comes first. Each member whose claim lost is told by their own claim's run; a
  member given the task by an earlier run is left alone when their own run comes.
- What counts as a claim is defined once (`isClaim`), for the event and for the comments.
- If GitHub's comment list does not show a claim yet, the member who asked gets the task. The
  fallback was written for the types before a test asked for it; its test passed first time.
- The sandbox driver cannot play two members, so this scenario is `@sandbox-wip` too.

RED:      gives the task to the member who claimed it first, even when it hears a later claim first
          -> expected [ { …member: 'bob' } ] to deeply equal [ { …member: 'alice' } ]
GREEN:    (72 passed)
          (the test's board was first given only the earlier claim's comment; it now lists every
          claim on the issue, as GitHub would, before any code was written)
RED:      tells a member whose claim came second, though heard first, that it has already been
          claimed -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (74 passed)
RED:      leaves alone a member's claim on a task already given to them, as a later run finds it
          -> expected [ [], [ {…} ] ] to deeply equal [ [], [] ]
GREEN:    (75 passed)
REFACTOR: onClaim finds the holder, giving the task to the first claim if nobody holds it, then
          tells anyone else
RED:      a task's comments are read earliest first, each with who made it
          -> expected [] to deeply equal [ { member: 'alice', …(1) }, …(1) ]
GREEN:    (67 passed)
RED:      are read from every page, so no claim is missed on a busy task
          -> expected a length of 150 but got 100
GREEN:    (68 passed)

---

## 2026-10-23: A claimed task stays with its holder

- Assigning an issue replaces its assignees, so a second claim would have taken the task. Divlab
  now reads who holds the task first; if someone does, it leaves the task with them and replies
  on the task's issue to the other member that it has already been claimed.
- Who holds a task is read from the issue: its assignee, but only while Divlab's claimed label is
  on it, since anyone who triages can assign a ready task.
- The harness: the in-process driver finds a task to claim among claimed tasks too, as a member
  can still comment on a claimed task's issue. The sandbox has one account playing every member,
  so it cannot show two members; its driver says so (`HarnessNotYetBuilt`) and the scenario is
  tagged `@sandbox-wip` until there is a second account.
- Slips: the first test of the taken-task check passed only once the claimed-label check was
  taken back out; it had been written before a test asked for it, and its test then failed for
  the right reason. The refusal adapter test and its empty stub went in one step again.

RED:      leaves a task another member holds with them -> expected [ { … } ] to deeply equal []
GREEN:    (70 passed)
RED:      tells a member who claims a task another member holds that it has already been claimed
          -> expected [] to deeply equal [ { project: 'ledger', …(3) } ]
GREEN:    (71 passed)
RED:      reads back who holds a claimed task -> expected {} to deeply equal { claimedBy: 'alice' }
GREEN:    (64 passed)
RED:      reads a ready task as held by nobody, even if someone has been assigned it
          -> expected { claimedBy: 'carol' } to deeply equal {}
GREEN:    (65 passed)
RED:      replies on the task's issue to the member, saying why -> expected [] to deeply equal [ Array(1) ]
GREEN:    (66 passed)
REFACTOR: the claim refusal's wording lives with the pull request refusal's, in the representation

---

## 2026-10-23: A member claims a task

- Section 2 starts. A member claims a ready task by commenting `/claim` on it, as the concept
  document has it (§8). A new template workflow runs Divlab on each new comment; Divlab reads the
  comment from the event as data, and acts only on a comment that is exactly a claim, on a task
  rather than a pull request, from a named commenter. Divlab marks the task claimed instead of
  ready and assigns it to the member: GitHub lets an issue be assigned to anyone who has
  commented on it, so strangers can claim (GitHub Docs, "Assigning issues and pull requests to
  other GitHub users").
- A claimed task's issue no longer carries the ready label, so the board's fallback for decisions
  acted on would have missed it, and a re-run could have posted the task again. It now counts
  claimed tasks too.
- The scenario passed in-process, then in the sandbox on its own (about a minute, 50 requests),
  so it runs in both. The sandbox driver claims with the sandbox token: one account plays every
  member.
- Slip: the first `onClaim` test and its empty stub went in one step, so the missing-symbol
  failure was not shown before the stub; the assertion failure was.
- The test that used comments as its example of an event Divlab does not act on now uses
  discussions: that example stopped being true, not the behaviour.

RED:      marks the task claimed by the member who asked -> expected [] to deeply equal [ {…} ]
GREEN:    marks the task claimed by the member who asked (56 passed)
REFACTOR: none
RED:      labels its issue claimed instead of ready, and assigns it to the member
          -> expected [] to deeply equal [ { …(2) } ]
GREEN:    (62 passed)
REFACTOR: the ready label named once; labelsWhenClaimed
RED:      include the decision a claimed task came from -> expected [] to deeply equal [ 'feedback/FB-4.md' ]
GREEN:    (63 passed)
RED:      acts on a claim when a member comments to claim a task
          -> Error: Divlab does not act on issue_comment events
GREEN:    (57 passed)
RED:      does nothing for a comment that is not a claim -> expected { claim: … } to deeply equal { nothing: true }
GREEN:    (58 passed)
RED:      refuses a claim that does not name its task by a whole number -> expected [Function] to throw an error
GREEN:    (59 passed)
RED:      refuses a claim naming a task GitHub could not have numbered -> expected [Function] to throw an error
GREEN:    (60 passed)
REFACTOR: numberedByGitHub, one rule for pull requests and tasks
RED:      does nothing for a claim commented on a pull request, which is not a task
          -> expected { claim: … } to deeply equal { nothing: true }
GREEN:    (61 passed)
RED:      refuses a claim that does not say who commented
          -> got 'Cannot read properties of undefined (…'
GREEN:    (62 passed)
RED:      runs when someone comments on one of the project's issues, and on nothing else
          -> expected undefined to deeply equal { Object (issue_comment) }
GREEN:    (68 passed)
          The claim workflow waits its turn with the other Divlab runs: passed first time, since
          the workflow's shared shape was written with the file; kept as a regression test.

---

## 2026-10-22: One read of the log per pull request

- Divlab wrote its merge record before reading the log, so the adapter listed the log to number
  it (two requests more), and routing read the whole log again after. A pull request's run now
  reads the log once, before recording anything, and routing reuses that history, adding each
  decision it records. Runs for a project go one at a time, so nothing else writes meanwhile.
- Slip: the line adding each decision to the run's history was written before a test asked for
  it; the test that does (two interrupted merges, the second escalating) passed first time and
  fails with the line taken out. Its first version named the impediment wrongly and failed for
  that reason, not the behaviour.

RED:      reads the project's log before recording anything, so each record costs one request
          -> expected 'append' to be 'read'
GREEN:    (53 passed)
RED:      reads the project's log once for a pull request, however much it records -> expected 2
          to be 1
GREEN:    (54 passed)
Passed first time: counts the decisions it records in a run when routing the next work in that
          run (see the slip)
REFACTOR: none

## 2026-10-22: The allowance checked for each scenario

- The check asked every sandbox run for a full run's 2,500 requests before starting, so a run of
  one scenario was stopped too. A worker cannot know how many scenarios it will be given, so each
  scenario now checks for room for itself (200 requests; a full run averages about 36) before it
  starts. A full run whose allowance runs out partway fails its remaining scenarios at once,
  saying when it resets; asking GitHub for the allowance costs nothing.
- One scenario in the sandbox at aebea07: passed, the check before it. Not a proof (GitHub's
  reading left room under the old check too, and went from 1,293 to 988 during the run).

RED:      is too little when less is left than a scenario needs, and says when it resets
          -> Received "...and a sandbox run needs about 200..."
GREEN:    (9 passed)
REFACTOR: none

## 2026-10-22: A re-run closes the task the work was for

- A run stopped after recording a decision left the task the work was for open, ready to claim
  though done. The routing record now keeps that task, and acting on a decision closes it before
  anything else, on the first run or a later one.

Acceptance: the task the work was for is closed by Divlab's next run, if it stopped first -> RED
          (not yet right): the Test task still ready beside the Coding task; GREEN in-process
          (@sandbox-wip, as the real Action cannot be stopped on cue).
RED:      records which task the work was for in its decision -> expected { project: 'ledger', …(4) }
          to match object { task: '3' }
GREEN:    (51 passed)
RED:      closes the task a recorded decision was for, when it acts on it later -> expected [] to
          deeply equal [ '3' ]
GREEN:    (52 passed)
REFACTOR: routing records and acts on one event; closing moved into acting on it

## 2026-10-22: Intermittent sandbox failures, kept for inspection

- Two CI sandbox runs failed in one worker's repository while the others passed: d5b1284 (its
  first four pull requests never decided) and 04d85ac (GitHub refused to show a pull request,
  "too many files changed", after which no task appeared in that repository). The same features
  at 04d85ac on demand: 32 of 32, all 82 of Divlab's runs successful. Not yet explained; both
  failures came with four workers at once.
- The repository was gone before anyone could look. A worker whose scenario failed now keeps
  its repositories and names them in the log; the sweep removes them after an hour.
- Slip: a local reproduction ran with an unpushed commit checked out, so Divlab could not be
  found at that version (SANDBOX.md says to push first): about 600 requests spent for nothing.
- dabca7f's CI sandbox run had been stopped by the allowance check, unnoticed at the time; its
  change passed in the next run (41f1897).
- The next CI run (3836c72, with the plain file names): 67 of 67 in 12 minutes, 2,284 requests.

## 2026-10-22: A feedback signal's file must be plainly named

- The file name after `feedback/` is the member's own text, and revision tasks wrote it into
  issues as it was. Divlab now refuses a pull request whose signal file is not plainly named
  (letters, digits and hyphens, directly in `feedback/`, ending `.md`), telling the member why.
  Capitals are allowed, unlike the signal's fields: a file name never becomes a label. The rule
  lives in core (`readSignalFile`), beside the signal's other rules.
- Harness fix on the way: in-process, merged work was found by its file's name, so a renamed
  file made "Divlab has not merged" pass whether or not it had; the scenarios' name for a signal
  now ignores the decoration, and the step went red as it should.
- Slip: the first pattern carried a length limit and rules for joining parts that no test asked
  for; cut back to what the tests demanded. Stryker then found the anchors untested: two cases
  added (passed first time), and the score is back to 100 (384 mutants).

Acceptance: work whose feedback signal's file is not named plainly is not merged -> RED (not yet
          right): "Divlab has not merged" failed, once the harness could see the merge; GREEN.
RED:      is a plainly named file in feedback/ -> not a function (then the stub) -> expected
          { unreadable: '' } to deeply equal { path: 'feedback/FB-1.md' }
GREEN:    (114 passed)
RED:      is unreadable when the file's name is more than a plain name -> expected { path: … }
GREEN:    (115 passed)
Passed first time: is unreadable when the file is in a folder within feedback/ (regression);
          the two anchor cases (added for Stryker)
RED:      (Divlab) does not merge work whose feedback signal's file is not plainly named, and says
          why -> Divlab should not have acted
GREEN:    (50 passed)
REFACTOR: none

## 2026-10-22: A decision recorded is acted on, once

- Divlab recorded each routing decision and then acted on it (a task, an alert, a finished
  module). A run stopped in between left the decision recorded but never acted on, and later runs
  skipped it as routed: the module stalled, with nobody told.
- Each issue Divlab posts now closes with a JSON block naming the decision it came from, and
  after acting Divlab records that it did (`actedOn`). A later run finds decisions with no such
  record, asks the board which it shows, records those, and acts on the rest. The board's lists
  lag behind writes (seen in the sandbox), so asking it after every merge would post tasks twice;
  the log is read whole and up to date, so it is asked only for decisions the log cannot confirm.
- Only issues carrying Divlab's labels count, since anyone may open an issue on a public
  repository but only those who triage can label one. A path with a newline or a fence stays
  inside the block (first design used a plain fenced line; two existing alert tests showed a path
  can hold a newline, and the format became JSON).
- Found on the way, a safety gap: a feedback signal's file name is the member's own text, and
  revision tasks write it into issues unquoted. On the test list as the next item.
- Closing the task the work was for is not finished on a re-run (the record lacks the task's id):
  on the test list.
- Slips: two failing tests written in one step (tasks and finished modules naming their decision);
  one older test's expected body changed in the same step as the production code.
- The first sandbox run with all of today's records (d5b1284) failed 4 of 66: one worker's first
  four pull requests were never decided within four minutes each, after which the same
  repository worked normally; the other workers passed. It did not happen again on demand (6 of 6).
  The repository was gone before it could be looked at, so the driver now says what state
  Divlab's runs were in when it gives up on a pull request.

Acceptance: a decision Divlab recorded but did not act on is acted on by its next run, once
          -> RED (not yet right): no task ready, expected one Test task; GREEN in-process (the
          sandbox cannot stop the real Action on cue: @sandbox-wip).
RED:      acts on a decision it recorded but never acted on -> expected [] to deeply equal
          [ { role: 'test', module: 'parser' } ]
GREEN:    (43 passed)
RED:      never acts twice on a decision: one the board shows it acted on is left alone
          -> expected [ { project: 'ledger', …(2) } ] to deeply equal []
GREEN:    (44 passed, after the shared board fixture gained `actedOn`, a separate step)
RED:      tells the board which decision each task / a finished module comes from (both at once,
          a slip) -> expected [ undefined ]; expected { …(1) } to deeply equal { …(2) }
GREEN:    (46 passed, after two tests comparing whole posted tasks were updated)
RED:      (adapter) is read back from a task's issue -> not a function (then the stub) -> expected
          undefined to be 'feedback/FB-1.md'
GREEN:    (54 passed, after the older task tests were given decisions)
RED:      is read back from a finished module's issue -> expected undefined
GREEN:    (55 passed)
RED:      is read back from a PDC coordinators' alert -> expected undefined; the first fix broke
          two alert tests, which showed paths may hold newlines: redesigned as a closing JSON block
GREEN:    (56 passed)
Passed first time: is read back whole, and stays inside its code block, whatever the path is
          called (regression for the redesign)
RED:      (adapter) are the decisions its tasks, alerts and finished modules came from -> not a
          function (then the stub) -> expected [] to deeply equal [ … ]
GREEN:    (58 passed)
RED:      are only those on issues Divlab posted, which carry its labels -> expected
          [ 'feedback/FB-3.md' ] to deeply equal []
GREEN:    (59 passed)
RED:      are read from every page of the project's issues -> got 100, expected 150
GREEN:    (60 passed)
RED:      records that it acted on its decision, once it has -> expected [ { … }, …(1) ] to deeply
          equal [ 'posted test', …(1) ]
GREEN:    (47 passed, after the time test looked for the routing record rather than the last event)
RED:      trusts its own record of having acted, never asking the board, whose lists lag
          -> Divlab should not have acted
GREEN:    (48 passed)
RED:      records having acted when the board shows it did, so it need not ask again -> expected []
GREEN:    (49 passed)
RED:      (adapter) reads back a record that Divlab acted on a decision -> cannot be read: it is
          not a routing record
GREEN:    (61 passed)
REFACTOR: acting on a decision moved out of routing into one helper, used by both

## 2026-10-22: Every event records its time

- Merge records and records of work not accepted now carry `decidedAt` too, from the same clock.
- An event's identifier is its sequence number (its file name), taken from the log, never from
  randomness or the clock, and unique because GitHub refuses a second file at a number: ticked,
  with nothing to inject.

RED:      records when it decided to merge, by its clock -> expected { project: 'ledger', …(1) } to
          match object { …(2) }
GREEN:    (41 passed, after the older test comparing the whole merge record expected the time,
          a separate step: the record now holds it)
RED:      records when it found work that reached main without it, by its clock -> expected
          [ { project: 'ledger', …(1) } ] to match object [ Array(1) ]
GREEN:    (42 passed, likewise for the two tests comparing the whole record)
REFACTOR: none

## 2026-10-22: Divlab records when it decided

- Each routing decision now records when Divlab made it, in UTC (`decidedAt`). Divlab takes its
  clock as a parameter: the Action passes the wall clock, the one place it is read; the
  in-process driver and unit tests pass a fixed time. Events from before have no time, so the
  field is optional when read back. Merges begun and work not accepted: on the test list.
- Section 0 is done apart from the log's read cost, deferred by Bernard until a real project
  nears a few thousand events. Two section 1 items were already done and are ticked: one file
  per event under `events/`, and several impediments making one revision task.

Acceptance: the record says when Divlab decided -> RED (not yet right): "expected the record to
          say when Divlab decided, as a UTC time"; GREEN in-process.
RED:      records when it decided, by its clock, in UTC -> expected { project: 'ledger', …(3) } to
          match object { decidedAt }
GREEN:    (40 passed, after the older tests' calls were given the fixed clock, a separate step)
REFACTOR: none

## 2026-10-22: Merge records read back through core

- An interrupted merge is routed from the work Divlab recorded as about to merge, so that work is
  now read back through core as well (`readMergedWork`), with the same check of role, module and
  verdict as a routing record's work, written once.
- The sandbox run for 586ab71 (the 500 retry and routing records through core): 65 of 65 in 10½
  minutes, 2,209 requests.
- Stryker on core: 373 mutants, all killed.

RED:      gives the work as Divlab recorded it -> not a function (then the stub) -> expected
          { unreadable: '' } to deeply equal { fromRole: 'test', …(3) }
GREEN:    (112 passed)
RED:      is unreadable when it gives no verdict, rather than routed as passed -> expected
          { fromRole: 'test', …(2) } to deeply equal { unreadable }
GREEN:    (113 passed)
REFACTOR: one check of the work's fields, shared by both readers
RED:      (adapter) is refused, saying why, when the work it was about to merge could not be
          routed -> expected [Function] to throw an error
GREEN:    (53 passed)

## 2026-10-22: A server error from GitHub is retried

- The sandbox run for f9be2f5 failed 1 of 65: GitHub answered 500 to a listing of ready tasks.
  The request helper retried a failing gateway (502, 503, 504) but not GitHub's own errors. A 500
  is now retried the same way, and still only for requests safe to repeat: a write GitHub may
  have carried out is never retried.

RED:      tries again shortly when GitHub fails with an error of its own -> expected undefined to
          be 2000
GREEN:    (52 passed)
REFACTOR: none

## 2026-10-22: Routing records read back through core

- Event files were checked only for the shape of a routing record. Routing's re-run count reads
  the work's role, module and verdict and the roles of the tasks decided; a record missing its
  verdict would have been taken as passed work, quietly resetting the count that escalates to a
  PDC coordinator. `readRoutingRecord` in core now checks what routing relies on, and the adapter
  refuses an event file it cannot read, so the log read fails rather than mislead.
- Slip: the reader's case for a decision with no tasks (an alert, a finished module) was written
  without a test asking for it; the coverage gate found it, and its test passed first time.
- Stryker on core: 369 mutants, all killed (93 in routing-record.ts).

RED:      gives the record as routing wrote it -> not a function (then the stub) -> expected
          { unreadable: '' } to deeply equal { …(3) }
GREEN:    (100 passed)
RED:      is unreadable when its work gives no verdict, rather than taken as passed
          -> expected { …(3) } to deeply equal { unreadable }
GREEN:    (101 passed)
RED:      is unreadable when its work gives no fromRole / module -> expected { …(3) } (both)
GREEN:    (103 passed)
RED:      is unreadable when a task it decided on names no role Anarres has -> expected { …(3) }
GREEN:    (104 passed)
RED:      is unreadable when it is not a routing record at all -> Cannot read properties of null
          (and of undefined; two gave the wrong reason)
GREEN:    (108 passed)
RED:      is unreadable when its decision's tasks are not a list of tasks -> decided.every is not a
          function; Cannot read properties of null
GREEN:    (110 passed)
Passed first time: gives a record whose decision was an alert, which has no tasks (see the slip)
RED:      (adapter) is refused, saying why, when its record is one routing could not rely on
          -> expected [Function] to throw an error
GREEN:    (51 passed)
REFACTOR: the adapter's own shape check gave way to core's reader

## 2026-10-22: Interrupted merges finished in merge order

- When a run finds merges Divlab began but did not route, it finished them in the order the
  feedback signals were listed (by name). It now follows Divlab's own records, in the order it
  merged; the tripwire then takes whatever on main it has no record of.
- With that, routing follows merge order everywhere: each merge is routed in the run that makes
  it, runs queue one at a time, and anything left over is finished in recorded order.

RED:      finishes interrupted merges in the order it merged them, not the order they are listed
          -> expected [ 'parser', 'lexer' ] to deeply equal [ 'lexer', 'parser' ]
GREEN:    (38 passed)
REFACTOR: none
Regression test, passed first time: never routes work it was about to merge but did not, whose
          signal is not on main (keeps what the listing loop did; fails with the check removed)

## 2026-10-22: No Divlab run is dropped

- Divlab's two workflows share a concurrency group per project, so its runs go one at a time.
  GitHub keeps at most one run waiting in a group and cancels any earlier waiting run when
  another arrives (its documentation), so work members submit at nearly the same time could be
  left unmerged with nobody told. The sandbox submitted one pull request at a time, so never saw
  it. `queue: max` keeps up to 100 waiting, in order.
- Slip: the template change came before the acceptance scenario. To keep the outer loop honest,
  the scenario was then run in the sandbox with the change set aside, and was red: one of three
  pull requests opened together was never decided (its run dropped). It failed in the When step,
  waiting past the step's limit, rather than in a Then.
- A sandbox run of one scenario was then stopped by the allowance check, which asks every run for
  a full run's 2,500 requests: on the test list.

Acceptance: work several members submit at once is all merged -> RED in the sandbox without
          `queue: max` (one run dropped: "Divlab neither merged nor refused pull request 2");
          GREEN in the sandbox with it (5 of 5 steps, 69 requests), and in-process.
RED:      keeps every run waiting its turn: none is dropped when members submit at once
          -> expected undefined to be 'max' (both workflows)
GREEN:    (37 passed)
REFACTOR: the sandbox driver's submission split into opening the pull request and awaiting
          Divlab's decision, shared by one submission and several at once

## 2026-10-22: The event log is never read in part

- GitHub lists a Git tree only in part past 100,000 entries, and says so. Read in part, the log
  would undercount re-runs and misnumber new events; with the repository's top level in part, it
  could even look empty. Either now fails the read, as a log GraphQL has not caught up with does.

RED:      is never read in part, when GitHub lists only part of it -> promise resolved
          "[ … 249 events ]" instead of rejecting
GREEN:    (49 passed)
RED:      is never taken to be empty, when GitHub lists the repository only in part
          -> promise resolved "[]" instead of rejecting
GREEN:    (50 passed)
REFACTOR: one helper reads a tree whole or fails, for both levels (written as the second fix)

## 2026-10-22: The sandbox run in parallel

- A run's time is Divlab's: 77 pull requests, each waiting for a real Divlab run of 25 to 30
  seconds, one after another. Polling less would save requests, not minutes.
- The scenarios now run in four Cucumber workers. Each worker is a process of its own, so each
  has its own repository (named after the run and the worker number); Divlab's runs queue only
  within a repository, so four go at once. Harness configuration, no behaviour: no test cycle.
- Locally, the project features: 4 of 4 in 1 minute 13 seconds (1 minute 48 one at a time); both
  sandbox organisations empty afterwards. Each worker prints its own request tally.
- In CI (aca7a1a): 64 of 64, the job in 11 minutes (42 before); 2,141 requests across the four
  workers (531, 523, 559, 528), the same as one at a time, spent in a quarter of the time.

## 2026-10-22: Divlab may check members' pull requests

- GitHub blocks `pull_request_target` on public repositories from 2 December 2026 (changelog,
  revised 21 October; a reference page still says 2 November) unless an Actions policy allows
  it. Bernard made an organisation policy in `anarres-sandbox`; GitHub warns that organisation
  policies are not enforced on the Free plan, and its insights need Enterprise.
- Probes in the sandbox: a repository policy can be made with the API on Free, and is enforced
  (a workflow outside its allowed events failed to start; the same workflow with the event
  allowed was queued). Reading or writing one needs administration (write).
- So `setUpProject` makes the policy, with the setting-up token; Divlab's App does not check it
  on its runs, which would need administration (Bernard, 2026-10-22). Recorded in decision 0006
  (addendum) and CONTRIBUTING.
- The sandbox run with one request per event (3539cd1): 63 of 63, 1,889 requests (2,023 before);
  41½ minutes, close to the job's 45-minute limit: on the test list.

Acceptance: only Divlab may check members' pull requests to the project -> RED (not yet right):
          expected [ "Divlab" ], got []; GREEN after the cycles below; passes in the sandbox too.
RED:      lets Divlab, and nothing else, check members' pull requests -> expected [] to deeply
          equal [ 'ledger' ]
GREEN:    (35 passed, after the older test's stand-in gained the new method, a separate step)
RED:      allows pull request events for Divlab's pull request workflow, and no other
          -> not a function (then the stub) -> expected {} to deeply equal { …(4) }
GREEN:    (48 passed)
REFACTOR: none. The adapter's one-line POST has no unit test of its own, like `protectMain`'s;
          the sandbox scenario checks it against GitHub.

- In CI (02b3fbe): 64 of 64 in 42 minutes, 2,146 requests. More than the run before (1,889),
  almost all in waiting: 535 pull request checks and 521 issue lists, against 502 and 423. How
  much a run waits depends on how quickly GitHub and Divlab answer that day; polling less is
  on the test list with the time limit.

## 2026-10-22: Appending an event in one request

- Each event cost three requests: two Git tree reads to count the log, then the write. Divlab
  reads the log before almost every event it records, so the adapter now remembers how many
  events it saw (and counts each one it writes) and numbers the next from that: one request.
- Numbering still cannot collide: creating a file that exists fails (422), and then the log is
  listed again and the next free number taken. Any other failure is not retried: GitHub may
  have saved the file despite failing, and a retry would record the event twice.
- The merge record is appended before Divlab reads the log, so it still lists first; on the test
  list.

RED:      records a new event in one request once the log has been read -> expected 3 to be 1
GREEN:    (44 passed)
RED:      numbers each event a run records after reading the log -> GitHub PUT …/000251.json
          answered 422 (the second event took the first's number: an error from the fake's
          GitHub, not an assertion, but the behaviour under test)
GREEN:    (45 passed)
RED:      gives a new event the next free number when another run has recorded one since
          -> answered 422
GREEN:    (46 passed)
REFACTOR: the second write's failure reports GitHub's own answer, not a made-up 422
RED:      records an event once, when GitHub saves it but answers with a failure
          -> expected 252 to be 251
GREEN:    (47 passed)
REFACTOR: one helper creates the event's file and says whether its number was taken

## 2026-10-22: The sandbox run's request budget

- GitHub's hourly allowance is counted per person, not per token: the sandbox token, the
  members' token and Bernard's own `gh` showed the same use. My CI watcher (`gh run watch`, every
  3 seconds, about 1,200 requests an hour) was spending it; I now check every two minutes. A
  loop sharing the account most likely explains the refusal of 2026-10-13.
- The driver counts every request it makes, by kind (pure helpers, unit tested), and prints the
  tally and the allowance at the start and end of each run. A full run in CI (1f31b64): 2,010
  requests in 36½ minutes, 1,804 of them REST; most are waiting (502 pull request checks, 423
  issue lists, 313 Git tree reads of the event log). Divlab's runs act as its App, on an
  allowance of their own.
- GitHub's reading of the allowance used is not steady: in one window it went 736 to 697 across a
  full run, and 2,141 to 726 within a minute. The count is the driver's own; the reading is kept
  only as what GitHub says, since that is what it refuses on.
- Before a run starts, the driver checks the reading against 2,500 REST requests (the measured
  run with room to spare) and fails at once, saying when the allowance resets.
- Both CI sandbox runs passed, 63 of 63: the event log fix against real GitHub, and the run
  above.
- The first run with the check (4d292ab) passed, 63 of 63: 2,023 requests counted, while GitHub's
  reading of the allowance used rose only from 0 to 445 in the same window. Whatever that
  reading counts, it is not simply the run's requests; on the test list.
- A push that changes only documents no longer starts a sandbox run (the run reads none of them):
  the dev log commit after the check cost a full run, about 2,000 requests, for nothing. A CI
  setting, not behaviour, so no test cycle; checked by the next pushes, below.

RED:      the kind of request is its method and what it asks for, without the repository
          -> Cannot find module (then the stub) -> expected '' to be 'GET issues'
GREEN:    (1 passed)
RED:      requests about different issues or runs are one kind -> 'GET actions/runs/39747493613/jobs'
GREEN:    (2 passed)
RED:      requests about different files or commits are one kind -> 'PUT contents/feedback/…'
GREEN:    (3 passed)
RED:      the total, then each kind, most made first -> expected [] (the stub was written in the
          same step as the test: the same slip as the sweep's, again)
GREEN:    (4 passed)
RED:      too little allowance, saying when it resets -> Cannot find module (then the stub)
          -> expected undefined
GREEN:    (1 passed)
RED:      enough when more is left than a run needs -> expected '…has 2000 r…' to be undefined
GREEN:    (2 passed)
REFACTOR: comments; the allowance reading returned for the check

## 2026-10-22: The sandbox sweep

- Before each sandbox run, both sandbox organisations are swept of repositories an interrupted run
  left behind. Which ones is a pure choice beside the driver, unit tested (Vitest now finds the
  harness's own tests under `acceptance/` too): a run's repositories, made more than an hour ago.
- Tried while CI's run was live: the sweep left its repositories alone.

RED:      finds a run's repository made more than an hour ago -> expected [] to deeply equal
          [ 'ledger-mvj9zaqb' ] (the empty stub was written in the same step as the test, before
          the missing symbol had been seen fail: a slip)
GREEN:    every repository (1 passed)
RED:      leaves a repository made within the hour -> expected [ 'ledger-mvjb11k0' ] to deeply
          equal []
GREEN:    older than an hour (2 passed)
RED:      leaves any repository a run did not make -> expected [ 'notes' ] to deeply equal []
GREEN:    a run's name only (3 passed)
REFACTOR: a run's repository named in one place, for the run and the sweep

## 2026-10-22: The event log past 1,000 events

- A sandbox probe, one commit of 1,001 event files: GitHub's contents listing gave 1,000; the Git
  tree gave all 1,001, untruncated; one GraphQL request for all their text failed with a 502. So a
  busy project's log was not just read in part: from the 1,001st event, Divlab would have numbered
  each new event as one that already existed, and every run would have failed.
- The adapter now takes the function it sends requests through (a refactor, no change in
  behaviour), so its unit tests can run against a fake that answers as GitHub did in the probe.

RED:      a project's event log is read whole, however many events it holds
          -> expected [ …(1000) ] to have a length of 1001 but got 1000
          (then the fake answered Git trees too, a test-only step: still the same failure)
GREEN:    listed from main's Git tree (41 passed)
RED:      is read a part at a time, never asking GitHub for too much at once
          -> GitHub POST graphql answered 502 (the probe's failure, from a fake told to fail above
          100 texts; then the fake answered objects asked for by ID, a test-only step: the same)
GREEN:    text fetched by Git object ID, 100 at a time (42 passed)
REFACTOR: the test's typing; the fake's unused whole-folder query removed
TEST:     gives a new event the next number past 1,000: passed first time, since appending
          already counted through the tree listing; kept as a regression test.

## 2026-10-22: Work submitted from forks

- Bernard set up `anarres-sandbox-members`, a second sandbox organisation playing the members:
  Free plan, two-factor authentication required, Actions disabled, and a token that can act only
  there (CONTRIBUTING lists its permissions).
- A throwaway probe first: the members' token forked a sandbox repository into the members'
  organisation and pushed a branch; the sandbox token opened a pull request from it and read its
  files. Nothing on GitHub needed changing.
- The sandbox driver now submits every member's work from the members' fork of the project, made
  the first time it is needed and deleted with the run. The fork's main is never brought up to
  date: it falls behind only by other feedback signals, each in a file of its own, so a branch
  from it still merges cleanly and shows only its own file. Harness only: Divlab is unchanged.
- Sandbox, locally: the submission and merged-work scenarios passed from forks (4 of 4); both
  organisations empty afterwards.
- GitHub's notice: from 2 December 2026 `pull_request_target` is restricted on public repositories
  unless an organisation's Actions policy allows it. Divlab's pull request workflow needs it; on
  the test list.

## 2026-10-21: Divlab checks its own protection

- Tried as the App in the sandbox: it can see that main's rules are in force and that it may
  bypass them, but not who else may, even with administration read access (GitHub shows that only
  to those who can edit the rules). Bernard removed that permission again: it bought nothing.
- `checkProtection` runs after every Divlab run: if the rules GitHub applies to main are not all
  there, it alerts PDC coordinators once; the open alert is the record, and closing it re-arms the
  check. Decision 0006 says what it cannot see.

OUTER RED: Divlab alerts PDC coordinators, once, when main is not protected (@wip) ->
           NotYetImplemented, then not yet right (no alert)
RED:      alerts when main is not protected -> TypeError; stub -> expected [] to equal [ 'ledger' ]
GREEN:    (1 passed)
RED:      says nothing while main is protected -> expected [ 'ledger' ] to equal []
GREEN:    (2 passed)
RED:      does not alert again while its earlier alert is open -> expected [ 'ledger' ] to equal []
GREEN:    (34 passed in Divlab); OUTER GREEN in-process
RED:      protection not in force when a rule no longer applies -> expected true to be false (this
          test was written in the same step as the hard-coded green before it: a slip)
GREEN:    (39 passed in packages/github); REFACTOR: main's rules listed once
RED:      the unprotected-main alert issue -> expected { title: '' … } to equal { …(3) }
GREEN:    (173 passed)

---

## 2026-10-21: About to merge

- Before merging a pull request, Divlab records that it is about to, with the work it read and
  checked. The tripwire now tells three cases apart: a routing decision (Divlab's merge, done); a
  merge begun but not routed (an interrupted run: finished from the record, not from Git history
  or the file); no record (not through Divlab: not accepted, alerted).
- The event log holds three kinds of record; readers of routing history still see only decisions,
  and the sandbox driver waits for the kind it expects.
- The scenario runs in-process, where the fake can stop Divlab just after a merge; it is
  `@sandbox-wip` because the real Action cannot be stopped on cue.

OUTER RED: A merge Divlab was interrupted in is finished by its next run (@wip) -> not yet right:
           no task ready
RED:      records that it is about to merge, with the work, before it merges -> expected
          [ 'merged 7', … ] to equal [ { aboutToMerge }, 'merged 7' ]
GREEN:    (165 passed)
RED:      finishes routing work it merged but was interrupted before routing -> expected [ [], [] ]
          to equal [ [ { … } ], [] ]
GREEN:    (166 passed); OUTER GREEN in-process
RED:      reads back a record that Divlab was about to merge -> Error: not a routing record
GREEN:    (167 passed)

---

## 2026-10-21: The tripwire

- The push workflow is now the tripwire (decisions 0005, 0006). A feedback signal on main with no
  record of Divlab merging it is never read or routed: Divlab records it once as not accepted,
  saying why, and alerts PDC coordinators once, and routing carries on. An unreadable signal on
  main no longer stops Divlab.
- The event log holds two kinds of record: routing decisions, and what Divlab did not accept.
  Routing history reads only the decisions.
- The push workflow acts as Divlab's App with no permissions of its own, like the pull request
  workflow: the template test now holds both to that. `Repository.readFile` went, unused.

OUTER RED: Work that reaches main without Divlab merging it is never routed (@wip) -> not yet
           right: Divlab routed it
RED:      never routes work that reached main without Divlab merging it -> expected [ … ] to
          equal []
GREEN:    (22 passed)
RED:      records it as not accepted, saying why -> expected [] to equal [ … ]
GREEN:    (23 passed)
RED:      alerts PDC coordinators of it -> expected [] to equal [ … ]
GREEN:    (24 passed); OUTER GREEN in-process
RED:      records an unreadable signal on main like any other, without stopping (rewritten from
          "refuses to route a feedback signal it cannot read", per decision 0005) -> Error: The
          feedback signal … cannot be read
GREEN:    (24 passed); REFACTOR: Repository.readFile removed, unused
PASSED FIRST TIME: records and alerts it only once (guard; shown to fail without the check)
RED:      reads back a record of work Divlab did not accept -> Error: not a routing record
GREEN:    (159 passed)
RED:      tells PDC coordinators what reached main without Divlab -> expected { title: '' … }
GREEN:    (160 passed); REFACTOR: one quoting helper for refusals and alerts
RED:      the push workflow acts as the App, with no permissions of its own -> 3 failing at once
          (the pull request workflow's three rules, applied to the push workflow; one change)
GREEN:    (164 passed)

---

## 2026-10-21: Only Divlab changes main

- `setUpProject` protects a new project's main branch: a ruleset lets nobody but Divlab's App
  update, delete or rewrite it, administrators included. A ruleset is a repository setting, so it
  is applied when a project is set up, not carried in the template. Project set-up has no other
  home yet; this is its seam.
- The sandbox driver sets every repository up that way. Against the sandbox: an administrator's
  direct change to main was refused, and Divlab Sandbox still merged, recorded and routed through
  the escalation scenarios (6 of 6).
- GitHub hides a private App from its public API, so the driver holds Divlab Sandbox's App ID.

OUTER RED: A change to main from anyone but Divlab is refused (@wip) -> NotYetImplemented
RED:      protects the project's main branch so that only Divlab can change it -> TypeError;
          stub -> expected [] to equal [ 'ledger' ]
GREEN:    (21 passed)
RED:      lets nobody but Divlab's App change, delete or rewrite main -> expected undefined to
          equal { …(6) }
GREEN:    (34 passed in packages/github)
SANDBOX:  first tries failed for harness reasons (a private App is not visible by name; a short
          commit SHA cannot pin an Action), each reported with GitHub's own reason; then 6 of 6.

---

## 2026-10-21: Plain names only

- `readFeedbackSignal` finds a signal unreadable unless its role, module, verdict and impediment
  types are plain names: lower-case letters and digits joined by single hyphens or underscores, at
  most 40 long (GitHub labels hold 50 characters, and Divlab writes `module:<name>`). Both of
  Divlab's paths read signals there, so both refuse; a refused pull request is told why.
- Mutation testing on core: 318 mutants, all killed.

OUTER RED: Work whose feedback signal does not use plain names is not merged (@wip) -> not yet
           right: Divlab merged it
RED:      module not a plain name -> expected { fromRole: 'test', … } to equal { unreadable }
GREEN:    (94 passed)
RED:      role not a plain name -> same; GREEN: one loop over role and module (95 passed)
RED:      verdict not a plain name -> same; GREEN: (96 passed)
RED:      impediment type not a plain name -> same; GREEN: (97 passed)
RED:      a name too long to be a name -> same; GREEN: at most 40 (98 passed)
PASSED FIRST TIME: a name as long as a name may be (pins the boundary)
OUTER GREEN: @wip removed; @sandbox-wip until tried against the sandbox

---

## 2026-10-21: Start whole, split when it hurts

- Bernard asked whether a module list written at set-up would smuggle a big up-front design into
  CSD. It would. The concept document (§5) now says decomposition is earned by evidence: a project
  starts as one module, and splits only when the sizing rule fails or feedback shows the
  boundaries do not work; requirements start as a first slice too.
- So the check that work names a module the project has waits for the Programme Architect's
  `modules.yaml`; the safety half (plain names only) does not.

---

## 2026-10-21: Work without a feedback signal; text members choose

- A pull request with no feedback signal is refused, and Divlab's comment says the work needs one
  (in-process; `@sandbox-wip` until tried in the sandbox). This drives out the guard TypeScript
  had forced in without a test.
- The sandbox driver looks for refusals and failed runs on every third check only.
- The alert issue's routing record is safe inside its code block (JSON escapes line breaks); a
  guard test holds it. The exposure is elsewhere: module names and impediment types from the
  member's signal reach issue titles, labels and text unchecked (test list, section 4).

OUTER RED: Work without a feedback signal is not merged, and the member is told why (@wip)
           -> not yet right at "the member is told their work has no feedback signal"
RED:      tells the member when their pull request has no feedback signal -> expected [] to
          equal [ Array(1) ]
GREEN:    (20 passed); OUTER GREEN, @wip removed
PASSED FIRST TIME: keeps the routing record inside its code block (guard; shown to fail with raw
          line breaks, then restored)

---

## 2026-10-21: Every scenario's work goes through a pull request

- Accepted work now means work a member submitted as a pull request and Divlab merged, in both
  drivers. Nothing in the scenarios changed.
- First full sandbox run with a pull request for every merge: 58 of 58 in 30.5 minutes (22
  before), inside the 45-minute limit, so no need yet to run scenarios in parallel.
- `onPullRequest` closes the task the work names and sends Research back to the role its task was
  for, as the merge path does; both now share `acceptSignal`.

OUTER RED: 6 of 58 scenarios (tasks left open, so escalation counts and closed tasks failed;
           Research not sent back)
RED:      closes the task the work in the pull request was for -> expected [] to equal [ '3' ]
GREEN:    (18 passed)
RED:      sends passed Research back to the role its task was for -> Error: Divlab should not
          have acted (it escalated)
GREEN:    (19 passed)
REFACTOR: acceptSignal, shared by onPullRequest and onMerge
OUTER GREEN: 58 of 58 in-process

---

## 2026-10-21: Divlab merges a real pull request as its App

- `packages/github` implements Divlab's side of a pull request: its head, its changed files read
  through the API as data (blobs from the project's own copy, no links followed), a squash merge
  only at the commit Divlab read, and a refusal comment.
- The Action decides from its event whether it is acting on a pull request or a push.
- The sandbox driver installs both template workflows and submits work as a branch and a pull
  request, then waits for Divlab to merge or refuse it and for Divlab's record.
- Sandbox: the pull request was merged by `divlab-sandbox[bot]`, its work recorded and routed,
  and the push workflow ran after it. The scenario lost its `@sandbox-wip` tag; the tag and the
  sandbox run's listing of it stay for the next scenario that needs them.
- The ruleset waits until every scenario submits work as a pull request: the driver still writes
  to main directly for the older steps, which a ruleset would refuse.

RED:      says why, quoting the reason as text, never as Markdown -> expected '' to be '…'
          (stub written with the test)
GREEN:    (31 passed in packages/github)
RED:      keeps the reason inside its code block even when the reason contains a fence
          -> strings differ
GREEN:    (32 passed)
SANDBOX:  first run failed: the driver read the log between Divlab's merge and its record; it
          now waits for the record. Then 1 passed, and 9 of 9 across two features.
REFACTOR: GitHub expressions in the template test written through a helper (lint warnings)

---

## 2026-10-21: Merging only what was checked; what a run is for

- Divlab reads a pull request at one commit and merges only that commit, so anything pushed after
  it read the pull request is never merged unchecked.
- `whatToActOn`: from the event that started a run, a merge (push) or a pull request (by its
  number, which must be a whole number GitHub could have given); any other event, or a pull
  request event that does not name its pull request properly, is refused.

RED:      merges exactly the version of the pull request it read -> expected [ '7 at undefined' ]
          to equal [ '7 at c0ffee' ]
GREEN:    (12 passed)
RED:      acts on a merge when something is pushed -> module not found; stub -> expected undefined
GREEN:    (1 passed)
RED:      acts on the pull request a pull request event is about -> expected { merge: true }
GREEN:    (2 passed)
RED:      refuses a pull request event that does not name its pull request by a whole number
          -> expected [Function] to throw
GREEN:    (3 passed)
RED:      refuses a pull request number GitHub could not have given -> expected [Function] to
          throw (the check had been written early; taken out, then demanded)
GREEN:    (4 passed)
RED:      refuses to act on an event it was not made for -> expected [Function] to throw
GREEN:    (17 passed in Divlab)

---

## 2026-10-21: The template's pull request workflow

- Checked the sandbox App end to end with a throwaway workflow: it minted a token as Divlab
  Sandbox from the organisation's variable and secret, and acted as the App.
- `template/.github/workflows/divlab-pull-request.yml`: runs as main has it
  (`pull_request_target`), takes the App's token (GitHub's token action pinned to v3.2.0 by commit)
  and runs Divlab with it; nothing else. `template.test.ts` holds it to that.
- GitHub's token action has deprecated the App ID for the Client ID, so the template reads
  `DIVLAB_APP_CLIENT_ID`.

RED:      runs only as the project's main branch has it -> ENOENT; skeleton -> expected [] to
          equal [ 'pull_request_target' ]
GREEN:    (1 passed)
RED:      does nothing but take the App's token and run Divlab -> TypeError (no jobs); empty jobs
          -> expected [] to equal [ …(2) ]
GREEN:    (2 passed)
RED:      runs Divlab as its App -> expected undefined to equal { …(2) }
GREEN:    (3 passed); REFACTOR: steps parsed once
RED:      gives the workflow's own token no permissions -> expected undefined to equal {}
GREEN:    (4 passed)
RED:      waits its turn with the project's other Divlab runs -> expected undefined to equal
          { group: 'divlab', … }
GREEN:    (5 passed)
PASSED FIRST TIME: never puts anything from the event in an expression (kept as a guard; shown
          to fail by adding a pull request title expression, then restored)
REFACTOR: Divlab declares the YAML library its tests use

---

## 2026-10-21: Divlab merges submitted work (in-process)

- Bernard created the sandbox's GitHub App, Divlab Sandbox (IDs in `CONTRIBUTING.md`).
- `onPullRequest`: Divlab reads a pull request's feedback signal as data, merges the pull request
  if it can read it and routes its work; if it cannot, it does not merge and tells the member why.
- The new scenario runs in-process. It is tagged `@sandbox-wip` until Divlab merges as its App in
  the sandbox; the sandbox profile leaves such scenarios out and the sandbox run lists them.

OUTER RED: Work that passes validation is merged and routed (@wip)
           -> NotYetImplemented: Divlab merging submitted work
RED:      merges a pull request whose feedback signal it can read
          -> TypeError: onPullRequest is not a function; stubbed -> expected [] to equal [ '7' ]
GREEN:    (2 passed)
RED:      routes the work in the pull request it merges -> expected [] to equal [ { … } ]
GREEN:    (3 passed); REFACTOR: shared test fixtures
RED:      does not merge a pull request whose feedback signal it cannot read
          -> expected [ '8' ] to deeply equal []
GREEN:    (4 passed)
RED:      tells the member why it did not merge their pull request -> expected [] to equal [ … ]
GREEN:    (5 passed); REFACTOR: the "cannot be read" reason written once, shared with onMerge
OUTER GREEN: the scenario passes in-process; 128 unit tests, 58 scenarios

---

## 2026-10-21: How Divlab merges

- Tried in the sandbox: a ruleset binds even administrators on a public repository under GitHub
  Free, but a workflow's own token cannot be exempted from one; a GitHub App can.
- Decision 0006 (Bernard): Divlab acts as its own GitHub App, the only actor a project's ruleset
  lets merge. It acts on pull request events without running anything from the pull request,
  merges and routes in one recorded run, keeps the push workflow as a tripwire, and checks its own
  protection on every run. Two Apps, one per organisation, so tests never hold a key for
  `anarres-project`.
- Routing in merge order now comes from Divlab recording its own merges (test list).

---

## 2026-10-21: The sandbox driver observes the real Action

- The sandbox driver no longer calls Divlab itself. Each sandbox repository gets the project
  template's workflow, pinned to the commit under test, and on each merge the driver waits for
  Divlab's real run, failing with GitHub's reason if the run fails or never starts.
- Sandbox settings confirmed by a real run: the token installs workflows, and the sandbox allows
  `anarres-project/anarres/*`, which covers Divlab in its subfolder.
- About 19 seconds a merge, some 25 minutes for the suite, so the sandbox job's limit rises from 30
  to 45 minutes.
- First full CI run against the real Action: all 57 scenarios green in about 22 minutes.

RED:      A failure that reports no problem is never guessed at (sandbox, driver waiting for the
          real Action, no workflow yet) -> Error: No Divlab run started for 75d6a0b…
GREEN:    the same scenario with the template's workflow installed (1 passed); the failed-work
          feature (29 passed, 9m 10s)
REFACTOR: none

---

## 2026-10-21: Security reports and a private side repository

- Bernard: `anarres` stays public (on GitHub Free, a private repository would lose the sandbox
  environment and branch protection), and so do sandbox repositories (decision 0004).
- A private side repository, `anarres-project/anarres-private`, now holds what must not be public:
  the detailed threat model, known weaknesses not yet fixed, security findings and incident
  notes. Safeguard code and its tests stay public. CLAUDE.md's discretion rule points to it.
- `SECURITY.md`: how to report a problem privately, through GitHub's private vulnerability
  reporting.
- The sandbox driver now creates its repositories public (they were private), ready for the real
  Action. Checked by running a scenario against the sandbox and watching the new repository.

---

## 2026-10-21: Coding's upstream ambiguity goes to Specification

- Bernard: Coding reporting an upstream ambiguity now goes back to Specification, as Test's does,
  instead of alerting a PDC coordinator. If the ambiguity lies further up, Specification fails
  upward to the Programme Architect. One new row in `FAILURE_ROUTES`; the concept document (§9)
  lists it among Divlab's extensions to the AutoPM table.

RED:      An upstream ambiguity goes back to the role that owns the ambiguous artefact (Coding)
          -> AssertionError: no task ready, expected a Specification task
RED:      sends failed code back to Specification when it reports an upstream ambiguity
          -> AssertionError: expected { alert } to deeply equal { tasks: [ … ] }
GREEN:    124 unit tests, 57 scenarios passed
REFACTOR: before the cycle, the "ride along" test now uses a scope gap from Coding as its
          impediment no rule covers, since Coding's upstream ambiguity is now routed

---

## 2026-10-21: Only Divlab merges

- Decision 0005 (Bernard): only Divlab merges into a project's main branch, so every change there
  has passed validation. Anything that reaches main another way, an unreadable feedback signal
  among them, is recorded once, alerted to PDC coordinators and never routed, and routing carries
  on. The options not taken (a required check with no bypass, Divlab checking its own protection,
  reverting automatically) are recorded there. The concept document (§8, step 8) and the test list
  (sections 4 and Unsorted) follow.
- Sandbox set up for the real Action: the sandbox token may now write workflows and read Action
  runs, and the sandbox organisation allows actions from `anarres-project/anarres`. The steps are
  in `CONTRIBUTING.md`.
- Bernard: work for a module that is already done is refused, not routed. Reopening a done module
  is a PDC coordinator's deliberate step, for later (test list).

---

## 2026-10-21: Anarres beside Claude Code's Projects

- Claude Code's Projects (public beta) runs parallel sessions under one coordinating
  conversation, for one user. The concept document (§2) now says how Anarres differs from it and
  from Claude Tag: pooled capacity from many members, independence between roles that the system
  enforces, deterministic routing and governance for strangers working together.
- `docs/LATER.md`: running tasks in a cloud sandbox, with the open question of whether the
  plugin's protections take effect there.
- `CONTRIBUTING.md`: installing Node 24 with Homebrew, which leaves it unlinked beside a newer
  `node`. The full gate now runs locally on Node 24 again (124 unit tests, 56 scenarios).

## 2026-10-13: Divlab's Action: entry point, bundle and project workflow

- `packages/divlab/action.yml` and `src/action.ts`: the Action wires Divlab to the GitHub adapter
  with the project repository's own token and calls `onMerge`; nothing else. It is bundled by
  esbuild 0.28.2 into one committed file, `packages/divlab/dist/index.js` (276 kB, mostly the
  YAML parser). CI rebuilds it and fails if it differs from what is committed. esbuild's install
  script is not approved and is not needed (its platform binary comes as a package).
- The first bundle failed at start-up: `yaml` ships CommonJS for Node, and an ES module bundle has
  no `require`. Fixed with esbuild's usual `createRequire` banner. Smoke-tested by hand: it
  reports a missing setting, and fails cleanly with a bad token.
- `@anarres/github` now needs Divlab only for its port types (a development dependency), so the
  Action can depend on the adapter without a cycle between packages.
- `template/.github/workflows/anarres.yml`: a project's Divlab workflow, as decision 0004
  describes (push to main touching `feedback/`; contents and issues only; one run at a time).
- Not yet exercised end to end: the sandbox driver must install this workflow and observe the
  real Action, which needs two sandbox settings from Bernard.

## 2026-10-13: Divlab acts on a merge

- New scenario, "Merging a member's work closes the task it was for". It **passed the first time**,
  because both drivers closed the task themselves, standing in for the system. With that taken
  out of the in-process driver it went red for the right reason (the Test task still ready), as did
  three escalation scenarios. Divlab now closes the task the merged work names.
- Divlab acts on a merge (`onMerge`): it lists the project's feedback signals, routes each that
  has no event yet (the event log records which signal each decision came from), reads its
  header with `readFeedbackSignal`, closes the task it names, and takes the Research link from
  that task. The in-process driver now merges a feedback signal file into the fake and calls
  `onMerge`; so does the sandbox driver, committing the file to the real repository. Driving it
  out found a DSL defect: the same role's repeated work reused one feedback signal name, which
  Divlab now rightly routes only once. Each piece of work has its own signal.
- Unit cycles:

  ```
  RED:      (divlab) refuses to route a feedback signal it cannot read, naming it and why -> promise resolved "undefined" instead of rejecting
  GREEN:    (1 passed)
  RED:      (github) reads back from a Research task which role it is for -> TypeError: taskFromIssue is not a function; (stub) expected {} to deeply equal { researchFor: 'coding' }
  GREEN:    (21 passed), hard-coded
  RED:      reads back nothing more from a task that is not Research -> expected { researchFor: 'coding' } to deeply equal {}
  GREEN:    (22 passed)
  REFACTOR: the research-for label prefix named once
  RED:      the task a feedback signal names is the issue with that number -> TypeError: issueNumber is not a function; (stub) expected undefined to be 12
  GREEN:    (23 passed), hard-coded
  RED:      is no issue at all when the id is … not a plain issue number (7 rows) -> expected 12 to be undefined
  GREEN:    (30 passed)
  ```

  The task id comes from the member's header, so the adapter uses only a plain issue number in a
  request.
- The CI sandbox run for `ff3b4d5` (a docs-only commit) failed 39 of 55: tasks that had been
  closed still listed as ready. GitHub reported no incident. Cause: a race in the sandbox driver.
  It waited until a ready list held the expected *number* of tasks, and a lagging list can show a
  closed task in place of the one that replaced it; the driver then named the stale task in the
  next merge. The driver now also waits until the list holds no task merged work has closed.
- Decision 0004 (proposed): Divlab as a GitHub Action, run on a push to the main branch, never on
  a pull request; each run routes every signal with no event yet; one committed bundle, checked
  fresh in CI.

## 2026-10-13: Reading a feedback signal

- Started on Divlab as a GitHub Action (Bernard). First piece: `core` reads the work a merged
  feedback signal reports from its YAML header (`readFeedbackSignal`), so Divlab can act on what
  was merged rather than on what a driver hands it. The header is untrusted: anything malformed is
  `unreadable`, with the reason, never guessed at. YAML is parsed by `yaml` 2.9.1 (no
  dependencies; it builds plain data and runs nothing).
- Cycles:

  ```
  RED:      gives the work its header reports… -> TypeError: readFeedbackSignal is not a function; (stub) expected undefined to deeply equal {…}
  GREEN:    (71 passed), hard-coded
  RED:      gives the problems failed work reports, and no task when it names none -> expected { fromRole: 'specification', …(4) } to deeply equal { fromRole: 'coding', …(3) }
  GREEN:    (72 passed)
  RED:      finds a file with no feedback signal header unreadable -> TypeError: Cannot destructure property 'feedback_signal' of 'parse(...)' as it is null
  GREEN:    (73 passed)
  RED:      finds a header that is not valid YAML unreadable -> YAMLParseError
  GREEN:    (74 passed)
  RED:      finds a header that … with no feedback signal in it, unreadable (3 rows) -> TypeError: Cannot read properties of undefined (reading 'from_role')
  GREEN:    (77 passed)
  RED:      finds a feedback signal without a … in words unreadable (5 rows) -> expected { fromRole: undefined, …(3) } to deeply equal { Object (unreadable) }
  GREEN:    (82 passed)
  RED:      finds a feedback signal whose impediments … unreadable (3 rows) -> TypeError: … .map is not a function
  GREEN:    (85 passed)
  REFACTOR: removed an optional chain no test demanded
  RED:      … impediments include an empty entry unreadable -> TypeError: Cannot read properties of null (reading 'type')
  GREEN:    (86 passed)
  RED:      gives the task as text when the header gives it as a number -> expected {…} to match object { task: '12' }
  GREEN:    (87 passed)
  RED:      finds a feedback signal whose task is … unreadable (3 rows) -> expected {…} to deeply equal { Object (unreadable) }
  GREEN:    (90 passed)
  ```

- Mutation testing then left three survivors: the header pattern (nothing said the header must
  start the file) and a null check. Driven out:

  ```
  RED:      finds a header that does not start the file no header at all -> expected { fromRole: 'test', …(3) } to deeply equal { Object (unreadable) }
  GREEN:    (91 passed); the header is now found line by line, with no pattern
  RED:      finds a header that never ends unreadable -> expected { Object (unreadable) } to deeply equal { unreadable: 'its header never ends' }
  GREEN:    (92 passed)
  PASSED FIRST TIME: an empty feedback signal is unreadable (the null check), kept to pin it down (93 passed)
  ```

  Mutation score 100% (284 of 284).

## 2026-10-13: Discretion in public until release

- The repository stays public (Bernard). New hard rule in `CLAUDE.md`: nothing here spells out
  how a safeguard could be got round; threat notes stay general, and specifics go to Bernard
  first.
- The public documents were reviewed against the rule, and Bernard chose what to trim. The concept
  document now says in general terms what Divlab checks before merging, how members gain trust
  and when the Governance role looks; it no longer dwells on large numbers of sessions; and
  unattended running is out of the roadmap and the later list (Research instrumentation is now
  Phase 5). The fuller text stays in the history; specifics will live in private documents when
  they are needed.

## 2026-10-13: Divlab acts on real GitHub; the sandbox suite runs

- The adapter's HTTP calls (`GitHubAdapter`: post, alert, mark done, append, read). The sandbox
  driver plays GitHub's part on merge (closes the task issue) and calls Divlab with the real
  adapter; it observes GitHub directly.
- What real GitHub taught us, in order:
  1. **Issue lists lag writes by about a second.** The driver now waits until GitHub shows what
     the event log says Divlab did (counts of ready tasks, escalations, finished modules), with a
     30-second limit so a real defect still fails.
  2. **One repository per scenario trips GitHub's secondary limit on creating repositories**
     (about 130 in half an hour). Now one repository per run; the DSL aliases module names per
     scenario ("parser-s7"), as `CLAUDE.md` asks. A planted routing fault still fails 9 scenarios
     in-process, so the aliasing did not hollow out the assertions.
  3. **Rate limits and blips.** `retryAfter` (test first, 6 cycles) says how long to wait:
     `retry-after`, a secondary limit (a minute), the hourly reset, a failing gateway (2 s); never
     a request that succeeded. `requestGitHub` retries only what is safe: any request after a
     rate-limit refusal (GitHub did nothing), but only reads and deletes after a gateway failure
     or dropped connection (a repeated create could post a task twice).
  4. **Reading the log one file per request made each decision O(n)**: runs took 30 to 47
     minutes and exhausted the hourly allowance. (Also my fault: a capture loop for Bernard's
     dashboard polled with the same token.) The log is now read in one GraphQL request.
  5. **GraphQL lags writes too**, and a stale log would make Divlab miscount re-runs. The adapter
     lists the files with REST (which reflects writes at once) and accepts the GraphQL contents
     only when they hold every listed file, else retries, then fails rather than decide on a
     short log. Driven test first as `logFrom`.
- Cycles (`packages/github`):

  ```
  RED:   waits as long as GitHub asks when it says how long -> undefined (stub written in the
         same step as the test: a slip in the protocol, though the red was on the assertion)
  GREEN: (13)
  RED:   does not retry a refusal that is not about rate limits -> +0
  GREEN: (14)
  RED:   waits a minute out of a secondary rate limit that does not say how long -> undefined
  GREEN: (15)
  RED:   waits until the hourly limit resets when it is used up -> undefined
  GREEN: (16), with the clock injected
  RED:   never retries a request that succeeded, even the last one the limit allowed
         -> a negative wait
  GREEN: (17)
  RED:   tries again shortly when GitHub's gateway fails -> undefined
  GREEN: (18)
  RED:   makes a log only when every listed event file has been read
         -> TypeError (stub) -> expected [] to be undefined
  GREEN: (19)
  RED:   reads the listed events oldest first, ignoring any other file -> []
  GREEN: (20)
  REFACTOR: the adapter reads through `logFrom`; one `requestGitHub` shared by adapter and driver
  ```

- Final sandbox run (13:44 for 55 scenarios, one repository): 54 passed. The failure: GitHub
  answered one issue-list read with "API rate limit exceeded" while the token showed its
  allowance almost unused afterwards, and without the headers the retry looks for. Not
  explained; on the test list with measuring a run's requests.
- `ANARRES_SANDBOX_KEEP=1` keeps the run's repository to inspect. Bernard's dashboard of that
  run's 68 routing decisions was built from it; the repository was then deleted.
- CI: `.github/workflows/sandbox.yml` runs the sandbox suite on `main` and on demand, in the
  `sandbox` environment, one run at a time.
- Gate: 90 unit tests, 55 scenarios in-process; `@wip` judge clean.

## 2026-10-13: The GitHub sandbox, the sandbox driver and the adapter's representation

- Sandbox set up with Bernard: organisation `anarres-sandbox` (2FA with secure methods only, base
  permission none, classic tokens blocked, fine-grained tokens need approval, Actions limited to
  the organisation's and GitHub's own, no self-hosted runners). A fine-grained token scoped to it
  (Administration, Contents, Issues, Pull requests: read and write; 90 days, to 2027-01-11), in a
  git-ignored `.env` locally and in the `sandbox` environment (deployable from `main` only) in CI.
  Checked: it creates, uses and deletes a repository in the sandbox, and is refused (403) writing
  to `anarres-project`.
- Decision 0003 (proposed): how a project looks on GitHub. Tasks are issues labelled `role:`,
  `module:`, `state:ready` (plus `research-for:`); alerts are `escalation` issues with the record
  as JSON; a finished module is a closed `state:done` issue; each event is one file
  `events/NNNNNN.json`. The adapter uses `fetch`, no Octokit.
- Sandbox driver (`ANARRES_DRIVER=sandbox`, `npm run test:acceptance:sandbox`): one private
  repository per scenario, deleted afterwards; observes GitHub directly rather than through the
  adapter. First run: all 49 scenarios red with `NotYetImplemented` (Divlab acting on GitHub),
  about 4 s each, nothing left behind. Translation into scenario words now shared by both drivers.
- `packages/github`, pure representation, test first:

  ```
  RED:   a task … is labelled with its role, its module and as ready, and links its feedback signal
         -> TypeError: issueForTask is not a function (stub) -> expected undefined to deeply equal …
  GREEN: (1)
  RED:   says nothing of a feedback signal when it has none -> 'Feedback signal: undefined'
  GREEN: (2)
  RED:   records on a Research task which role it is for -> 3 labels, expected 4
  GREEN: (3)
  RED:   an event is one file under events/, named by its place in the log -> '' (stub)
  GREEN: (4)
  RED:   reads back as the event that was written -> undefined (stub)
  GREEN: (5)
  RED:   is refused when it is not a routing record -> expected [Function] to throw
  GREEN: (6), a shallow shape check; full validation goes with the schema in core
  RED:   an alert is an escalation for the module, saying what was reported … -> undefined (stub)
  GREEN: (7)
  RED:   names the role that has been re-run more than three times -> no-rule wording
  GREEN: (8)
  RED:   carries the routing record for tools, after the words -> null
  GREEN: (9)
  RED:   says blocked work was blocked -> "failed"
  GREEN: (10)
  RED:   says when the work reported no problem -> "reporting ."
  GREEN: (11)
  RED:   a finished module is an issue labelled with the module and as done -> undefined (stub)
  GREEN: (12)
  REFACTOR: none
  ```

- Gate: 82 unit tests, 55 scenarios (in-process); `@wip` judge clean.

## 2026-10-12: A PDC coordinator's alert says what happened

- The alert is now the routing event itself: the work as reported (role, verdict, impediments,
  feedback signal) and the reason (no rule covers it, or which role hit the re-run limit). One
  definition, no new decisions, so no core change and no unit cycle: driven by acceptance alone.
- Acceptance: `features/routing/coordinator-alerts.feature`, 2 scenarios, red as *not yet right*
  (alerts carried only the module).
- Driver: one translation from routing records into scenario words, shared by the event log and
  the alerts.
- Gate: 70 unit tests, 55 scenarios; `@wip` judge clean; core unchanged (mutation 201 of 201).

## 2026-10-12: A role re-run more than three times is escalated

- Bernard, 2026-10-12: within one module, each revision task for a role is a re-run; the count
  starts again when that role's work passes (a conditional pass too); the fourth re-run alerts a
  PDC coordinator and posts nothing. Recorded in concept §9.
- Divlab reads the project's event log and hands it to core: `routingRecord(work, history)`.
  Revision tasks are recognised by carrying a feedback signal.
- Harness: the fake GitHub now closes the task a merged pull request was for, as GitHub does.
  Existing scenarios unaffected.
- Acceptance: `features/routing/escalation.feature`. "A fourth re-run…" red as *not yet right* (no
  alert). The other two ("a third re-run is still sent back", "the count starts again") passed
  first time, since nothing escalated yet; checked once built by planting a limit of 2 and a
  count that never resets (each failed as it should).
- Cycles:

  ```
  RED:      alerts a PDC coordinator instead of re-running a role a fourth time
            -> expected { …(3) } to deeply equal { …(3) }
  GREEN:    (62 passed), `history.length >= 3` with Coding hard-coded; then the seven earlier
            record tests given an empty history (signature change only)
  PASSED FIRST TIME: still re-runs a role the third time (boundary)
  RED:      counts only the re-runs of the role being sent back -> { alert: re_run_limit }
  GREEN:    (64 passed), counted per role
  RED:      does not count the task that first brought the work to the role as a re-run
  GREEN:    (65 passed), revision tasks only
  RED:      starts counting again once the role's work passes
  GREEN:    (66 passed), "pass" only
  RED:      starts counting again once the role's work passes conditionally
  GREEN:    (67 passed), via routing's own `failed` (one definition of passing)
  RED:      counts only the re-runs in the module the work belongs to
  GREEN:    (68 passed)
  REFACTOR: module history named; doc comment corrected
  PASSED FIRST TIME (to kill 2 surviving mutants): keeps counting when another role's work passes
            in between; keeps alerting for what no rule covers, however often it happens
  ```

- Gate: 70 unit tests, 53 scenarios; `@wip` judge clean; mutation 201 of 201 killed.

## 2026-10-12: Every routing decision is recorded

- Core: `routingRecord(work)` gives the accepted work as received, the decision and the reason
  (`passed`, `pipeline_complete`, `reported` + the impediment that decided it, `failed`,
  `research_returned`, `no_matching_rule`). `route` keeps its shape, so the routing tests are
  untouched; internally each rule returns a *ruling* (decision and reason).
- Divlab: a separate `EventLog` port (to become one file per event under `events/`); Divlab records
  the decision, then acts on it. The fake GitHub keeps the log; the driver translates it back into
  scenario words.
- Acceptance: `features/routing/decision-record.feature`, 5 scenarios, red with
  `NotYetImplemented` at the driver. Since they never went red on an assertion, checked by
  planting a record that always says "passed" and drops the reported problems: the 4 scenarios
  that should fail did.
- Cycles:

  ```
  RED:      records passed work with the task it made and that it passed
            -> TypeError: routingRecord is not a function (stub added)
            -> expected undefined to deeply equal { …(3) }
  GREEN:    (55 passed), reason hard-coded "passed"
  RED:      records failed work with the problem that decided where it went
            -> expected { …(3) } to deeply equal { …(3) } (reason "passed")
  GREEN:    (56 passed), rules return rulings; the failure route found is the one that decided
  RED:      records that no rule covers a failure that reports no problem -> { rule: 'passed' }
  GREEN:    (57 passed)
  RED:      records that a passed Security & Quality check completed the module's pipeline
            -> { rule: 'passed' }
  GREEN:    (58 passed)
  RED:      records that a failed review went back to Coding because it failed -> { rule: 'passed' }
  GREEN:    (59 passed)
  RED:      records that research went back to the role that reported the gap -> { rule: 'passed' }
  GREEN:    (60 passed), hard-coded for all research
  RED:      records that no rule covers research that names no role it was for
            -> { rule: 'research_returned' }
  GREEN:    (61 passed)
  REFACTOR: `Reason` is the exact set of rules; a single `NO_RULE_COVERS_IT` ruling
  ```

- When two matching rules name the same owner (a review reporting a scope gap and an interface
  impediment), the reason names the first in the table. Either explains the decision.
- Gate: 61 unit tests, 50 scenarios; `@wip` judge clean; mutation 158 of 158 killed.

## 2026-10-12: A passed Security & Quality check marks the module done

- AutoPM: Security & Quality *pass* → "pipeline complete"; *conditional pass* → "complete with
  caveats" (routes as a pass, per Bernard's earlier rule). Until now a Security & Quality pass
  silently posted nothing.
- Acceptance: `features/routing/module-completion.feature`, red with `NotYetImplemented` at the
  driver until Divlab could mark a module done.
- Cycles:

  ```
  RED:      completes the module when its Security & Quality check passes
            -> expected { tasks: [] } to deeply equal { moduleDone: true }
  GREEN:    (53 passed)
  REFACTOR: none
  PASSED FIRST TIME: completes the module when its Security & Quality check passes conditionally
            (`advance` ignores the verdict). Checked by planting a pass-only condition (1 red).
  ```

- Divlab's `TaskBoard` port gains `markModuleDone`; the fake GitHub records it. The scenario "A
  module is not done before its security and quality check" was only ever red with
  `NotYetImplemented`, so checked by planting completion one role early: it failed (as did the
  Reviewer row of the pipeline outline).
- Gate: 54 unit tests, 45 scenarios; `@wip` judge clean; mutation 125 of 125 killed.

## 2026-10-12: Research that fails alerts a PDC coordinator

- Bernard: keep the alert. Pinned with a unit test, which passed first time (no rule covers
  Research failing); checked by planting a knowledge-gap row for Research (1 red).

## 2026-10-12: Research that passes goes back to the role that reported the gap

- A Research task records which role reported the gap (`researchFor`), as the GitHub issue will.
  When Research work is accepted, Divlab reads that from the task the work was for; the in-process
  driver plays the plugin's part, submitting against the open task for that role and module.
- The revision task carries Research's feedback signal (which points to the brief).
- Research that names no role it was for alerts a PDC coordinator: no guessing. This also ends the
  wrong guess noted last entry (a Research pass advancing to Architecture).
- Acceptance: outline over Test and Coding, red as *not yet right* (no revision task).
- Cycles:

  ```
  RED:      records on a Research task which role reported the gap
            -> expected { tasks: [ { …(3) } ] } to strictly equal { tasks: [ { …(4) } ] }
  GREEN:    (48 passed), after updating the five earlier Research-task expectations, which were
            incomplete once every Research task names who asked (went red, as they should)
  RED:      sends research that passes back to the role that reported the gap
            -> expected { tasks: [ { …(2) } ] } to strictly equal { tasks: [ { role: 'test', … } ] }
  GREEN:    (49 passed), hard-coded Test
  RED:      sends research for Coding that passes back to Coding
            -> expected { tasks: [ { role: 'test', … } ] } to strictly equal { … role: 'coding' … }
  GREEN:    (50 passed), by exact match against the module pipeline
  RED:      alerts a PDC coordinator when research that passes names no role it was for
            -> expected { tasks: [] } to deeply equal { Object (alert) }
  GREEN:    (51 passed)
  REFACTOR: `route` split into `revise`, `returnResearch` and `advance`
  ```

- Gate: 51 unit tests, 42 scenarios; `@wip` judge clean; mutation 120 of 120 killed.

## 2026-10-12: A knowledge gap makes a Research task ready

- Bernard, 2026-10-12: a Research task belongs to the module that reported the gap; Research
  outranks every other owner; when Research passes, the role that reported the gap gets a revision
  task carrying the brief (next slice). Precedence recorded in concept §9.
- The AutoPM table sends a knowledge gap to Research from Architecture, Specification, Test and
  Coding only. Reviewer and Security & Quality keep their "otherwise → Coding", the same literal
  reading Bernard accepted for architecture impediments; pinned by a test.
- Acceptance: `features/routing/knowledge-gaps.feature`, 5 scenarios, all red as *not yet right*
  (alerted with no task, or the Programme Architect instead of Research).
- Cycles:

  ```
  RED:      names the Research role as members know it -> expected undefined to be 'Research'
  GREEN:    (41 passed)
  RED:      makes a Research task when a failed test reports a knowledge gap
            -> expected { Object (alert) } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (42 passed), one row; Research placed last in the order
  RED:      puts research before anything else a failure reports
            -> expected { tasks: [ { …(3) } ] } to deeply equal { tasks: [ { …(3) } ] }
               (went to the Programme Architect)
  GREEN:    (43 passed), Research first
  REFACTOR: `UPSTREAM_ORDER` → `PRECEDENCE`: Research is not upstream of anyone
  RED:      makes a Research task when failed code reports a knowledge gap -> { Object (alert) }
  GREEN:    (44 passed), by generalising to the AutoPM's four roles
  PASSED FIRST TIME: Architecture and Specification (`it.each`), and a Reviewer's knowledge gap
            → Coding. Checked by planting a wrong role list (3 red).
  ```

- Known wrong guess, next slice: a Research *pass* today advances to Architecture, because
  Research is not in the module pipeline.
- Gate: 47 unit tests, 40 scenarios; `@wip` judge clean; mutation 102 of 102 killed.

## 2026-10-12: An interface impediment goes to the Programme Architect

- Concept §5 and §9: a module agent whose contract does not work raises an interface impediment;
  Divlab sends it to the Programme Architect, never to the other module. A rule for every module
  role, so it also overrides the Reviewer's and Security & Quality's "otherwise → Coding", and,
  the Programme Architect being most upstream, it outranks anything reported with it.
- Acceptance (`@wip`, all 8 red as *not yet right*: alerted with no task, or Coding / Architecture
  instead of the Programme Architect): an outline over the six module roles; a two-module project
  where the module on the other side gets no task; and a "several problems" row (Coding, an
  architecture and an interface impediment → Programme Architect).
- Cycles:

  ```
  RED:      sends a failed test reporting an interface impediment to the Programme Architect
            -> expected { Object (alert) } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (35 passed), one table row
  RED:      sends a review reporting an interface impediment to the Programme Architect, not Coding
            -> expected { tasks: [ { role: 'coding', …(2) } ] } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (36 passed), by generalising: one row per module role
  REFACTOR: none
  PASSED FIRST TIME: the same for Architecture, Specification, Coding and Security & Quality
            (`it.each`), as the generalisation implied. Checked by planting a gap that dropped two
            roles from the rule (2 red).
  ```

- The "other module gets no task" scenario guards against a future change; nothing today could
  post a task for another module, so it went red only on its Programme Architect step.
- Gate: 40 unit tests, 35 scenarios; `@wip` judge clean; mutation 98 of 98 killed.

## 2026-10-12: A revision task carries its feedback signal

- Bernard confirmed for now: Reviewer / Security & Quality fails go to Coding whatever else they
  report (may be revisited); Coding reporting an upstream ambiguity alerts a PDC coordinator;
  knowledge gaps and interface impediments alert until their own items are built.
- Concept §8: only Divlab and PDC coordinators read feedback signals; agents receive feedback as
  an input to a revision task. So a revision task carries the signal, and a task for the next role
  must not.
- Accepted work now names its feedback signal (an opaque reference; in GitHub it will be the
  merged signal's location). Core puts it on revision tasks only; Divlab passes it through.
- Acceptance: "A revision task carries the feedback signal that sent the work back", red as *not
  yet right* (a Specification task was posted, without a signal); green once Divlab carried it.
- Cycles:

  ```
  RED:      gives a revision task the feedback signal that sent the work back
            -> expected { tasks: [ { …(2) } ] } to deeply equal { tasks: [ { …(3) } ] }
  GREEN:    (33 passed)
  REFACTOR: every routing test's input names a feedback signal (now required), and the expected
            revision tasks in the failure tests carry it: those expectations were incomplete once
            the input had a signal (13 went red, as they should).
  PASSED FIRST TIME: keeps the feedback signal from the next role, which only revision tasks
            receive. Guards the access rule; checked by planting the leak in `route` (8 red).
  ```

- Acceptance guard "The next role does not see the feedback signal" also passed first time;
  checked by planting the same leak (it was the only scenario to fail). The DSL's "only task"
  checks now compare role and module only.
- Gate: 34 unit tests, 27 scenarios; `@wip` judge clean; mutation 95 of 95 killed.

## 2026-10-12: A failure no rule covers alerts a PDC coordinator

- Reading of the AutoPM table: each role has rules keyed by impediment; only Reviewer and
  Security & Quality have an unconditional "otherwise → Coding". So a Reviewer or Security &
  Quality fail reporting an architecture impediment now goes to Coding (it used to go to
  Architecture). Flagged to Bernard.
- Acceptance: four alert scenarios (no problem reported; Test reporting an architecture impediment
  or test failures; an implementation impediment), red with `NotYetImplemented` at the driver
  until Divlab could alert; plus the Reviewer / Security & Quality → Coding outline.
- Refactor first: `route` returns a routing decision (`{ tasks }` or `{ alert }`).
- Cycles:

  ```
  RED:      alerts a PDC coordinator, posting no task, when a failure reports no problem
            -> expected { tasks: [ … ] } to deeply equal { alert: … }
  GREEN:    (26 passed)
  RED:      alerts … when a failed test reports an architecture impediment -> { tasks: [ architecture ] }
  GREEN:    (27 passed)
  RED:      alerts … when a failed test reports test failures -> { tasks: [ coding ] }
  GREEN:    (28 passed)
  RED:      alerts … when a failure other than a review reports a scope gap -> { tasks: [ … ] }
  GREEN:    (29 passed)
  RED:      alerts … when failed code reports an upstream ambiguity -> { tasks: [ … ] }
  GREEN:    (30 passed)
  RED:      routes on the impediments a rule covers, letting the others ride along
            -> expected { alert: … } to deeply equal { tasks: [ architecture ] }
  GREEN:    (31 passed), by generalising to the routing table (`FAILURE_ROUTES`)
  REFACTOR: none
  PASSED FIRST TIME: sends a failed architecture back to Architecture when it reports an
            architecture impediment. Written because Stryker found that table row untested at unit
            level (4 survivors); now 95 of 95 killed.
  ```

- Table rows are matched by exact string, never by object key: role and impediment names come
  from untrusted feedback signals, and keys like `constructor` would hit an object's built-ins.
- Divlab's `TaskBoard` port gains `alertCoordinators`; the fake GitHub records alerts. Checked that
  the alert scenarios fail when Divlab doesn't raise the alert.
- A refactor edit missed a spot that Biome had reformatted; the gate caught it before commit.

## 2026-10-12: Blocked routes as fail

- Red showed a real bug: blocked work advanced to the next role.

  ```
  RED:      routes blocked work just as it routes failed work
            -> expected [ { role: 'coding', … } ] to deeply equal [ { role: 'specification', … } ]
  GREEN:    (25 passed)
  REFACTOR: none
  ```

## 2026-10-12: Failed review and Security & Quality go back to Coding

- Acceptance: outline for Reviewer and Security & Quality → Coding (red), and a scope-gap
  scenario that **passed at once** through the no-rule fallback. Put straight into the blocking
  run as a guard, and it worked: the least-code Reviewer change sent scope gaps to Coding and the
  guard went red, which drove the scope-gap unit test. Nothing committed while it was red.
- Cycles:

  ```
  RED:      sends a failed review back to Coding
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ Array(1) ]
  GREEN:    (22 passed), but the scope-gap acceptance guard went red
  RED:      sends a review that finds a scope gap to the Programme Architect
            -> expected [ { role: 'coding', … } ] to deeply equal [ { …(2) } ]
  GREEN:    (23 passed; acceptance green)
  REFACTOR: none
  RED:      sends a failed Security & Quality check back to Coding
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ Array(1) ]
  GREEN:    (24 passed)
  REFACTOR: extracted `ownerOfFailure`, one rule per line
  ```

- Not refactored into a routing table yet: a table would drop the untested guesses, which changes
  behaviour. That is the "no rule matches" item, so the table is built there, test-first.
- The refactor exposed one more guess: test failures from any role go to Coding. Listed.
- Mutation testing: 57 of 57.

## 2026-10-12: Failing tests send the code back to Coding

- Step glue: the impediment parameter carries its own article, so "reporting test failures"
  reads naturally (the judge caught the undefined step first).
- Cycles:

  ```
  RED:      sends failed code back to Coding when it reports test failures
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ Array(1) ]
  GREEN:    (20 passed)
  REFACTOR: none
  PASSED FIRST TIME: ranks an architecture impediment above test failures. Written to kill the
            surviving `some` → `every` mutant, not to drive code; Stryker confirms it does.
  ```

- The "several problems" scenario became an outline with the new row. Mutation testing: 48 of 48.

## 2026-10-12: Several impediments: the most upstream wins (first case)

- Acceptance: Specification failing with an upstream ambiguity *and* an architecture impediment
  leaves only a Programme Architect task.
- Cycle:

  ```
  RED:      sends a failure with several impediments to the most upstream role that owns one
            -> expected [ { role: 'architecture', … } ] to deeply equal [ { …(2) } ]
  GREEN:    (19 passed)
  REFACTOR: none yet; a general ranking would be ahead of the tests with two impediment types
  ```

- Fixed the wrong route that the previous mutant pointed at. The `some` → `every` mutant still
  survives: only a mix of an architecture impediment with a *non*-ambiguity impediment tells them
  apart, and those types (test failures, knowledge gap) have no routes yet. Planned next.

## 2026-10-12: An architecture impediment goes back to Architecture

- Acceptance: a second outline in `failed-work.feature` (Architecture, Specification, Coding).
- Refactor first, while green: `impediments` is required on accepted work (feedback signals
  always carry the list) and now flows from the driver through Divlab to core.
- Cycle:

  ```
  RED:      sends a failed specification back to Architecture when it reports an architecture impediment
            -> expected [ { role: 'programme-architect', … } ] to deeply equal [ { role: 'architecture', … } ]
  GREEN:    (18 passed)
  REFACTOR: none
  ```

- The check ignores the failing role, so Test or Reviewer reporting an architecture impediment
  also goes to Architecture: a guess the AutoPM table doesn't make. Listed under "a failure that
  matches no rule" on the test list, with the other known guesses.
- Mutation testing: 1 survivor (`some` → `every` on the impediments). No test mixes impediments,
  and today a mix of upstream ambiguity and architecture impediment wrongly goes to Architecture
  rather than the more upstream Programme Architect. Next item ("several impediments") fixes it.

## 2026-10-12: An upstream ambiguity goes back to its owner

- Decisions (Bernard): an ambiguity in a module's requirements goes to the Programme Architect
  (owner of the requirement slice), not Requirements; several impediments route on the most
  upstream one only; Coding test failures re-run Coding until run history exists. The fail table
  is now concrete items on the test list.
- Acceptance: `features/routing/failed-work.feature`, an outline (Test → Specification;
  Specification and Architecture → Programme Architect) asserting the revision is the *only* ready
  task. Red showed the bug: a failed Test was advancing to Coding.
- Cycles:

  ```
  RED:      sends a failed test back to Specification when it reports an upstream ambiguity
            -> expected [ { role: 'coding', … } ] to deeply equal [ { role: 'specification', … } ]
  GREEN:    (14 passed), hard-coded
  REFACTOR: none
  RED:      names the Programme Architect role as members know it
            -> expected undefined to be 'Programme Architect'
  GREEN:    (15 passed)
  REFACTOR: none
  RED:      sends a failed specification back to the Programme Architect …
            -> expected [ { role: 'specification', … } ] to deeply equal [ { …(2) } ]
  GREEN:    (16 passed)
  REFACTOR: none
  PASSED FIRST TIME: sends a failed architecture back to the Programme Architect … (the ternary
            already covered it; kept to pin the decision for Architecture)
  ```

- **Impediments are not read yet**: core ignores them and the driver doesn't pass them through
  Divlab. With one impediment type nothing demanded it; the architecture impediment item will.
- A stray `cat` in a compound shell command hung; killing it let the rest of the command run and
  insert a test twice. Removed the duplicate before going on.
- Mutation testing: 26 of 26 killed.

## 2026-10-12: A conditional pass advances like a pass

- Acceptance scenario and unit test both **passed the first time they ran**: `route` ignores the
  verdict, so the behaviour already existed. Kept as regression tests, to guard against a naive
  `verdict === "pass"` once fail routing arrives; checked by hand that exactly that change makes
  both fail.
- Step glue gained a `{verdict}` parameter ("conditional pass"); the in-process driver turns it
  into the feedback signal's `conditional_pass`.
- Not yet: keeping the open questions and assumptions in the event record (section 1, "Every
  routing decision is recorded as an event").

## 2026-10-12: A pass advances through the module pipeline

- Decisions (Bernard): a pass always advances, ignoring ρ until metrics exist; a conditional pass
  routes as a pass. Both recorded in the concept document, §9, and the test list.
- `@wip` rule widened (Bernard): a scenario failing on an assertion in a Then step is honest ("not
  yet right"). Judge and `CLAUDE.md` updated; checked that crashes in When or Then still fail it.
- Acceptance: the skeleton's scenario became an outline over the whole pipeline; new rows went in
  a `@wip` Examples block, red on their Then, then green and untagged.
- Cycles:

  ```
  RED:      makes a Specification task when the module's architecture passes
            -> expected [ { role: 'test', … } ] to deeply equal [ { role: 'specification', … } ]
  GREEN:    (3 passed), conditional on architecture
  REFACTOR: none
  RED:      makes a Coding task when the module's tests pass
            -> expected [ { role: 'test', … } ] to deeply equal [ Array(1) ]
  GREEN:    (4 passed), generalised to the pipeline order
  REFACTOR: none
  RED:      makes a Reviewer task when the module's code passes -> expected [] to deeply equal …
  GREEN:    (5 passed)
  REFACTOR: none
  RED:      makes a Security & Quality task when the module's review passes -> expected [] …
  GREEN:    (6 passed)
  REFACTOR: none
  RED:      names the Security & Quality role as members know it
            -> expected undefined to be 'Security & Quality'
  GREEN:    (7 passed)
  REFACTOR: none
  RED:      names the <role> role <name> (one table test, 5 cases)
            -> expected undefined to be 'Architecture' (and 4 more)
  GREEN:    (12 passed)
  REFACTOR: typed `Role`; the pipeline and posted tasks can only name real roles
  ```

- The in-process driver now takes role names from core's `ROLE_NAMES`, not a hand mapping.
- Mutation testing: 13 of 13 mutants killed.

## 2026-10-12: Tool versions pinned for contributors

- `CONTRIBUTING.md` says what to install and how. `package.json` + `package-lock.json` play the
  part of a `requirements.txt`: dev tools now pinned to exact versions, and `.npmrc` sets
  `save-exact=true` so new ones are too.
- `engines.node` is now `^24` with `engine-strict=true`, so `npm ci` refuses Node 25 with
  `EBADENGINE` (checked) instead of failing later inside Cucumber.

## 2026-10-12: Mutation testing

- Stryker 10 with the Vitest runner on `packages/core`, break threshold 100%, weekly CI job and
  `npm run mutate`; not in the blocking gate. Details and reasons: decision 0002.
- Two incompatibilities found. TypeScript 7 lacks the compiler API Stryker uses to rewrite the
  tsconfig (worked around: skip the rewrite, which we don't need). On Vitest 5 the runner reports
  every mutant as surviving (stryker-js#6210, open), so **Vitest is pinned to `~4.1`**.
- Checked: 4 of 4 mutants killed on `route`; an untested branch added by hand gave survivors and
  a non-zero exit.
- npm 11 holds back the install scripts of `esbuild` and `fsevents`; everything works without them,
  so they stay unapproved.

## 2026-10-12: Walking skeleton

- Scaffolding: npm workspaces (`packages/core`, `packages/divlab`), strict TypeScript 7, Biome,
  Vitest with 100% coverage thresholds on core, Cucumber.js 13 loaded through `tsx`. CI runs the
  gate on Node 24 (`.nvmrc`).
- **Use Node 24 locally.** Cucumber 13 refuses to run on Node 25 (it supports 22, 24 and ≥26).
- Four Layer harness: `features/` → `acceptance/steps/` → `acceptance/dsl/` (the `Anarres` DSL,
  with per-scenario aliases) → `acceptance/drivers/` (in-process driver, fake GitHub at Divlab's
  `TaskBoard` port).
- `npm run test:wip` (`scripts/wip-judge.ts`) reads Cucumber's message stream and fails if a
  `@wip` scenario passes or fails with anything other than `NotYetImplemented` or
  `HarnessNotYetBuilt`. Checked by hand against a dishonest failure and against a passing
  scenario.
- Cycles:

  ```
  RED:      routing > makes a Test task for the module when its specification passes
            -> AssertionError: expected [] to deeply equal [ { role: 'test', module: 'parser' } ]
  GREEN:    (1 passed), hard-coded
  REFACTOR: none
  RED:      routing > keeps the next task in the same module as the accepted work
            -> expected [ { role: 'test', module: 'parser' } ] to deeply equal [ { ..., module: 'ledger' } ]
  GREEN:    (2 passed)
  REFACTOR: none
  ```

- Acceptance: red with `NotYetImplemented` at the driver; green after wiring Divlab's
  `onWorkAccepted` to core's `route`; `@wip` removed. Confirmed the scenario fails when routing is
  wrong.
- `route` ignores role and verdict for now: no test demands them yet (section 1 will).

## 2026-10-12: Decisions confirmed

- Stack (decision 0001) accepted. It covers Anarres itself only; hosted projects may use any
  language. Recorded in the concept document (§7, "Any language"): projects declare a toolchain,
  their own CI runs their tests, and Divlab reads only the check result and a JUnit XML report.
  Matching cases added to the test list (section 4a).
- Test list order accepted as drafted; first slice is "Divlab posts the next task".
- Building continues in sessions started from this repository, so `CLAUDE.md` applies.

## 2026-10-12: Project set up

- GitHub organisation `anarres-project` and public repository `anarres` created; licence AGPL-3.0.
- Concept document moved from `bernardSolar/csd` (`docs/Arena_Concept.md`) to
  `docs/Anarres_Concept.md` and renamed: router → Divlab, stewards → PDC coordinators, charter →
  Odonian Principles.
- `CLAUDE.md` tailored from Bernard's test-first template: test-first protocol, outside-in ATDD,
  Four Layer acceptance model, with Anarres-specific safety rules.
- Stack chosen: see `docs/decisions/0001-stack.md`.
- Initial test list drafted from the concept document's Phase 1.
