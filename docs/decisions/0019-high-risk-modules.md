# 0019: High-risk modules

**Status:** Accepted, 2026-10-31 (Bernard: each recommendation).

## Context

Decision 0007 treats every module as low-risk until a PDC coordinator can mark one high-risk, so
new members may take any module's Coding tasks. The concept document (§11) lets new members code
only low-risk modules, and (§15, against backdoored code) gives high-risk modules two independent
reviewers. Four things were open: where coordinators mark a module, who may code one, whether the
second reviewer comes now, and what happens when the marking cannot be read.

## Decision

- **Where:** PDC coordinators name each project's high-risk modules in the governance file,
  beside the modules needing human review (decision 0016), changed only through reviewed pull
  requests.
- **Who may code one:** an *established* member or above. A new member may not take a Coding
  task on a high-risk module; every other role's level stays as decision 0007 has it.
- **Two independent reviewers, now:** a high-risk module's Reviewer work goes on to Security &
  Quality only once two different members' reviews have passed since its code last changed. The
  second reviewer is independent by decision 0007's rules, and of the first: the member whose
  review passed may not take the second.
- **A marking that cannot be read** makes every module of every project high-risk until it is
  fixed, and PDC coordinators are alerted once, as for the review list (decision 0016).

## Consequences

- Eligibility (claims, and the tasks the CLI offers) reads the module's risk from the governance
  file; core holds the rule once.
- Routing reads whether the module is high-risk and how many independent reviews have passed
  since Coding last passed, from Divlab's records.
