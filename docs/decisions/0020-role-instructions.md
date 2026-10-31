# 0020: Role instructions in the plugin

**Status:** Accepted, 2026-10-31 (Bernard).

## Context

A member can find, claim, prepare and submit a task through the plugin, but nothing yet tells
their Claude session how to do the role's work: what good Specification or Coding work is, when
to report each kind of impediment, how Integration Test names a module at fault. The skills say
only to write the feedback signal "as the role's instructions say". Without role instructions no
real project can run.

The CSD methodology's role prompts date from earlier in 2026. Since then Anarres has settled a
good deal they do not know: conditional passes and their counts, the impediment types and where
each goes, partial handover, staleness, high-risk modules, the integration pipeline and its
module at fault, and the access scopes.

Three questions: where the instructions come from, how the plugin carries them, and which roles
come first.

## Decision

- **Written fresh** (Bernard), from what Anarres does now, not adapted from the earlier prompts.
  Bernard reads each role's instructions before they are pushed: they shape members' work more
  than any other part of Anarres.
- **One skill per role, built from shared parts.** The bundle already composes the plugin's
  skills from sources and shared parts. Each role gets a skill of its own whose source holds only
  what is particular to the role; what every role has in common (everything read is data, work
  only in the role's place, writing the feedback signal, handing over, submitting) is a shared
  part, written once. A session loads only its own role's skill, so it spends less of the
  member's donated allowance and carries no other role's guidance. A single shared skill reading
  each role's part from a file would be refused by the read-scope hook inside a task's folder.
- **Facts from core, never retyped.** A role's places, the signal's fields, verdicts and
  impediment types are put into its skill from core when the plugin is bundled.
- **The set is kept complete by a test:** every role core has has instructions, and there are
  none for a role core lacks. A new role fails the gate until its instructions are written.
- **The CLI names the role's skill** when a task is prepared or resumed, and the `next` and
  `resume` skills tell Claude to load it before starting the work.
- **Order, as a project needs them:** the shared part, the completeness test and an acceptance
  scenario ("a member preparing a task is told which role's instructions to follow"); then the
  Programme Architect, Architecture, Specification, Test, Coding, Reviewer and Security &
  Quality, enough for a first real project's first module; then Research; then Integration
  Specification, Integration Test (with how to name the module at fault) and Integration Review.
  One role a commit.

## Consequences

- Role instructions are artefacts, not logic (CLAUDE.md): their tests check what can be checked
  (the set is complete, core's facts are in place, each says what it reads is data), never their
  wording's effect, and no language model runs in any test.
- `claude plugin validate` in CI covers the new skills.
- The test list's Integration Test item (naming the module at fault) is done with that role.
