# 0013: The Programme Architect's modules.yaml

**Status:** Accepted, 2026-10-28 (Bernard).

## Context

The concept (§5) has the Programme Architect read the programme requirements and write
`programme/modules.yaml`, listing the modules, the requirements each covers, the modules each
depends on and a size estimate, with one interface contract per boundary. A project starts as one
module, and the first `modules.yaml` may say exactly that ("start whole, split when it hurts").

Today a project's modules are named when it is set up, and each starts with its first task (test
list, 2026-10-27). Work names its task, and only its holder's work is merged.

## Decision

1. **How a project starts.** With one Programme Architect task, which writes `modules.yaml`.
   When Divlab merges Programme Architect work, it reads `modules.yaml` from that merge and starts
   each module it lists that has not started: its first task, the first role of the module
   pipeline in core, Architecture, ready. (On 2026-10-27 modules started at Specification, wrongly
   called the pipeline's first role; corrected here, Bernard, 2026-10-28.)
2. **Work for a module the project does not have.** Work's role and module must be its task's,
   or it is refused, saying so. A module the project does not have has no task, so no work for it
   is ever merged, without consulting `modules.yaml` on every pull request.
3. **What modules.yaml must hold, for now.** A list of modules, each with a plain name (as
   feedback signals' names are). The requirements each covers, its dependencies and its size are
   kept as data for later (read scopes, the sizing rule, integration). An unreadable file refuses
   the Programme Architect's work, saying why.
4. **A module that a later modules.yaml leaves out.** Nothing, for now: its tasks go on. Retiring
   or merging modules is a decision of its own, once a project needs it.

## Consequences

- A project's set-up posts its Programme Architect task; scenarios that begin with modules have
  the project set up as it stands once its first `modules.yaml` was merged.
- Contracts, and what each role reads of them, follow in their own slices (test list, section 5).
