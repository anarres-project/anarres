# 0015: Work whose inputs changed after its task was posted

**Status:** Accepted, 2026-10-29 (Bernard: each recommendation, 1a, 2a, 3a and 4a).

## Context

Each task's inputs are pinned to a commit: the merge that decided it (concept §8, step 1). The
plugin fetches the role's read scope at that commit, and since b03a4ab a scenario shows it does so
even after a later merge changes those inputs. The concept document says Divlab "flags work whose
inputs changed after it was claimed" (§8, step 7), but not what flagging means, nor what follows.

Within a module, work goes one task at a time along the pipeline, so a module's own architecture,
specification and tests do not change while one of its tasks is open. What can change underneath an
open task is the **programme's** part of its inputs: its module's requirement slice and the
contracts its module provides and uses, both the Programme Architect's (decision 0014). A revised
contract, the interface change protocol (§5), is the main case, and it is meant to happen: "start
whole, split when it hurts".

The concept document also says that a revised contract creates revision tasks for every affected
module (§5). Decision 0014 left that for later. It needs answering here too: the same change that
makes open work stale is the one that calls for revision tasks.

## Decision: the questions, with what was chosen

### 1. What counts as stale

- **(a, recommended)** Work is stale when any file in its task's read scope, as core's `readScope`
  gives it for that task, changed between the task's pinned commit and the commit Divlab merges
  onto. Deterministic, explained from its inputs, and stated once (core's read scopes).
- (b) Only a change to a contract the module provides or uses. Narrower, but slices change too, and
  it would be a second rule beside the read scopes.

### 2. When Divlab notices

- **(a, recommended)** When it validates the work, before merging: one comparison of the pinned
  commit with main, from GitHub (one request), its changed paths judged by core.
- (b) Also when the inputs change: on each Programme Architect merge, Divlab finds the open tasks
  whose read scope it touched and tells their holders at once, so they can stop early or give the
  task back. Saves a member's allowance, at some cost in Divlab's runs. Could follow (a) later.

### 3. What happens to stale work

- **(a, recommended)** Divlab merges it, records in its routing record that it was stale and which
  inputs changed, and posts the next task for the **same role and module** as a revision, pinned
  to the new commit, instead of routing on. The work is not lost: the revision reads its role's own
  place (as a continuation does, decision 0008), so whoever takes it starts from it.
- (b) Divlab refuses it, saying which inputs changed. Simple, but throws away donated work that is
  mostly right.
- (c) Divlab merges it and routes on as usual, only recording that it was stale and alerting a PDC
  coordinator. Keeps the pipeline moving, but the next role builds on work made against an old
  contract.

### 4. A revised contract, for every module it affects

- **(a, recommended)** Each module that provides or uses a contract the Programme Architect's
  merged work changed gets a revision task for Architecture, the first role that reads contracts,
  and its pipeline runs on from there. A module keeps one task open at a time: with none open, the
  revision is posted at once; with one open, it is posted in place of that task's next one, once
  its work is merged. Where 3 would also post a revision (an open Specification task, its work
  stale), the most upstream role wins, as in routing: Architecture. Which contracts changed is
  judged from the merge's own files, so no extra request.
- (b) Leave it to its own slice, as decision 0014 did, and build only 1 to 3 now.

### 5. Stale work that also failed, or was handed over part done

Decided 2026-10-29 (Bernard: upstream wins). Failed work goes where the routing table sends it,
always its own role or one upstream, and part-done work stays a continuation for its own role,
which reads the work done too. Both tasks are pinned at the new commit, so read the new inputs;
the record of the work says which inputs changed. A revised contract still comes first: it sends
the module to Architecture, ahead of any role a failure names below it.

## What this does not decide

- Changes a PDC coordinator makes to governance, and work reaching main without Divlab: neither
  is a task's input.
- The Integration roles, which read all contracts: they come with the integration pipeline.
- How many requests this adds per Divlab run is measured as before (Divlab's App's allowance).

## Consequences

- Concept §8, step 7 reads "flags work whose inputs changed after its task was posted": pinning
  is at posting, so a change between posting and claiming makes work stale too.
- Core gains a rule judging a task's changed inputs, from its read scope and a list of changed
  paths; Divlab gains one comparison per module role's merge; routing gains a stale-work rule
  ahead of the AutoPM table, recorded with its inputs like every other decision.
- The plugin needs nothing new: a revision task is prepared like any other.
