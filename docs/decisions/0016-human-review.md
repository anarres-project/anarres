# 0016: Human review where PDC coordinators require it

**Status:** Accepted, 2026-10-30 (Bernard: each recommendation, and to hold everything when the
list cannot be read).

## Context

The concept document (§8, step 8) has Divlab merge contributions that pass validation "with human
review wherever PDC coordinators require it". This is not the Reviewer role: a Reviewer task is a
member's Claude session, whose review is work routed like any other. Human review is a person
reading a pull request and approving it before Divlab merges it. Four things were open: where
coordinators say what needs it, what a requirement covers, who may approve, and how.

## Decision

- **Where:** in this repository's `governance/` folder, beside trust levels (decision 0007),
  changed only by PDC coordinators through reviewed pull requests. Divlab reads it as it reads
  trust levels; the sandbox reads its own, named by the organisation's settings. Nothing in a
  project or in a member's pull request can change it.
- **A list that cannot be read holds everything** (Bernard, 2026-10-30): if the governance file
  cannot be read, or its list of modules needing review is malformed, every contribution needs
  a human's approval until a PDC coordinator fixes it, and coordinators are alerted. A file with
  no such list names no module: review is required only where coordinators asked for it.
- **What it covers:** a module of a project. Every contribution to a module so named needs a
  human's approval before Divlab merges it. This sits with marking a module high-risk (concept
  §11; decision 0007's module risk), so one mark may later carry both.
- **Who may approve:** a member at trust level *trusted*, or a PDC coordinator, who is
  independent of the work: not its author, nor linked to its author, and holding no role in the
  module, by the same rules as claiming (decision 0007).
- **How:** GitHub's own pull request review, *Approve*, by the reviewer's account. GitHub ties an
  approval to the commit reviewed; it counts only for the commit Divlab merges.

## Consequences

- Work needing approval that has none is left open, not refused: Divlab says once on the pull
  request that it waits for a reviewer, and does nothing more. The holder's lease is unaffected.
- A push after approval needs approving again, as the approval was for an earlier commit.
- Divlab acts again when a review is given, as it does when the project's checks complete, so the
  template's Divlab workflow also runs on pull request reviews.
- An approval from anyone not eligible is ignored, never an error; the work still waits.
- Whether a module ever needs two approvals (concept §11 asks for two independent reviewers on
  high-risk modules) is left for when risk marking is built.
