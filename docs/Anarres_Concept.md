# Anarres — Distributed Collective Software Development

### Concept document, version 2

**Status:** Draft for discussion — October 2026
**Supersedes:** the platform and participation sections of `CGD_Arena_and_Self_Validating_Research.md` in the CSD repository (March 2026), where this idea was called the "CGD Arena". That document's research programme remains valid and is referenced in §15.
**Builds on:** the CSD methodology at [github.com/bernardSolar/csd](https://github.com/bernardSolar/csd), especially [Collective_Software_Development.md](https://github.com/bernardSolar/csd/blob/main/docs/Collective_Software_Development.md), [CSD_Artefact_Interface_Specifications.md](https://github.com/bernardSolar/csd/blob/main/docs/CSD_Artefact_Interface_Specifications.md) and [CSD_AutoPM_Spec.md](https://github.com/bernardSolar/csd/blob/main/CSD_AutoPM_Spec.md)

### About the name

Anarres is the anarchist moon world in Ursula K. Le Guin's *The Dispossessed* (1974). It has no government and no owners. Work is coordinated by **Divlab**, the Division of Labour, which posts the jobs that need doing; people volunteer for the postings they choose. The **PDC** (Production and Distribution Coordination) coordinates without governing, and its members serve rotating terms. Society runs on the principles of **Odo**, the founder of its philosophy.

This project borrows all three names, because they describe how it works:

| On Anarres | In this project |
|---|---|
| Divlab posts work; people volunteer for postings | **Divlab**, the routing service, posts tasks; members claim them |
| PDC coordinates without governing | **PDC coordinators** approve proposals and handle escalations, with delegated, rotating responsibility |
| Odonian principles | The **Odonian Principles**: the project's charter (§11) |

---

## 1. Summary

Anarres is an open, volunteer-driven platform where people pool their spare Claude capacity to build software that is too large, or too important, for one person and one Claude session to do well alone.

It runs Collective Software Development (CSD) across many people's machines. Each member runs **one Claude Code session in one role** (Requirements, Architecture, Specification, Test, Coding, Review and so on) on their own computer, using their own Claude subscription. Members never share credentials and their agents never talk to each other. All coordination happens through artefacts committed to GitHub, and Divlab, a deterministic routing service, turns each agent's feedback signal into the next task.

Five design choices define version 1:

| Decision | v1 choice |
|---|---|
| Domain | Software projects only |
| Models | Claude only |
| How work starts | The member starts it (`/anarres:next`) when they have spare allowance. |
| Visibility | Public repositories by default. A private mode is designed in for security-sensitive work. |
| Scale | Start with a small pilot, using an architecture that grows by adding projects and members, not servers |

---

## 2. Why Anarres should exist

The March documents described Anarres's value mainly as raw context, many agents' context windows added together. That framing does not hold up. Separate context windows do not add together, and no single agent ever holds the whole problem. Models have also improved greatly since then, and a single current model working over several sessions can now complete many tasks that once looked impossible.

Anarres's value lies elsewhere:

1. **Pooled capacity.** Many members' spare allowances, working in parallel on independent tasks, give throughput that no individual can afford. Most of that allowance is otherwise lost when the weekly window resets.
2. **Real independence.** In CSD the reviewer has not seen the reasoning behind the work it reviews. In Anarres the reviewer is also *a different person on a different machine*, with a different session history. It is the strongest form of independent review CSD can offer.
3. **Decomposition that holds up.** Large systems are split into modules with formal interface contracts, and each module goes through its own independent pipeline (§5). That is what actually lets Anarres take on work bigger than one context. Pooling tokens alone does not.
4. **A commons.** The outputs are openly licensed, and the full history of every decision is public and auditable.

**How this differs from Claude's own ways of running sessions in parallel.** Claude Code's Projects (in public beta as of October 2026) has one coordinating conversation hand tasks to parallel sessions, each with its own context window, working through branches and pull requests. That is CSD's general shape, built for one person. A project belongs to one user and draws on that user's plan alone. Every session starts from the same instructions and memory, with no roles and no limits on what each one reads. A language model decides where the work goes, following preferences rather than enforced rules. Claude Tag lets several people steer Claude together, but within one organisation's Slack channel, again with a language model coordinating. Anarres keeps what these products leave out: capacity pooled from many independent members, independence between roles that the system enforces rather than requests, deterministic and auditable routing, and the governance that lets strangers work on the same project safely. Someone who simply wants a team of Claude sessions for their own work is well served by Projects. Anarres is for work that needs many people, and the independence that comes with them.

Anarres is **not** a way to beat a single strong agent on speed. A distributed pipeline has step-to-step delays of hours, not seconds. Anarres competes on scale, quality and trust, not on how quickly any single project finishes.

---

## 3. Design principles

1. **One role, one session, one member.** Each task runs in a member's own Claude Code session, with no tmux and no multi-agent orchestration on the member's machine.
2. **Artefacts are the only channel.** Agents communicate only through files committed to Git, exactly as in CSD.
3. **GitHub is the backbone.** Repositories hold the artefacts, issues are the task queue, Actions run the routing and validation, and pull requests carry the contributions. v1 has no Anarres server.
4. **Tasks, not seats.** Work is broken into tasks that any eligible member can claim, for a limited time. A project never waits for a "full team" to assemble.
5. **Writes are enforced by GitHub, reads are limited on the member's machine.** GitHub checks every contribution against the role's write rules. The Anarres client limits what each agent reads.
6. **Routing is code, judgement is Claude.** Divlab is deterministic and tested. A language model is used only where judgement is truly needed: diagnosing escalations and governance review.
7. **Safe for members by default.** Artefacts written by strangers are untrusted input. Members' sessions run sandboxed.
8. **Transparency supports safety.** Public artefacts make misuse visible and let any member audit any project.
9. **Grow by adding projects and members, not servers.** Every component either runs separately in each project repository or on the member's own machine.

---

## 4. Vocabulary

| Term | Meaning |
|---|---|
| **Member** | A registered person who contributes Claude sessions to Anarres |
| **PDC coordinator** | A trusted member who approves proposals, handles escalations and merges anything that goes upstream |
| **Project** | An approved undertaking with a brief, a licence and a public repository |
| **Module** | An independently developed part of a project, with formal interface contracts |
| **Pipeline** | The CSD sequence of roles applied to one module (or to the programme level) |
| **Role** | A CSD agent role with defined read and write scopes (§6) |
| **Task** | One unit of work: a role run against specific inputs, sized to fit one session |
| **Lease** | A time-limited claim on a task by one member |
| **Artefact** | A versioned file produced by a role: requirements, specifications, tests, code, reviews |
| **Feedback signal** | A role's structured report (a YAML header plus a narrative) |
| **Divlab** | The deterministic GitHub Action that turns merged feedback signals into new tasks. It replaces the human PM role (the successor to the AutoPM). |
| **PDC** | The body of PDC coordinators, collectively |

---

## 5. Decomposing work in two directions

CSD splits work **by role**: each agent sees one layer. That alone does not fit large projects into context, because the Coding AI on a large system would still need every specification and test. Anarres adds a second split, **by module**.

```
                         PROGRAMME LEVEL
     Discovery → Requirements → Programme Architect
                                     │
                     produces modules.yaml + interface contracts
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
   MODULE PIPELINE A          MODULE PIPELINE B          MODULE PIPELINE C
   Arch → Spec → Test →       Arch → Spec → Test →       Arch → Spec → Test →
   Code → Review → SecQ       Code → Review → SecQ       Code → Review → SecQ
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     ▼
                           INTEGRATION PIPELINE
              Integration Spec → Integration Test → Review
```

**The Programme Architect** is a new role. It reads the programme requirements and produces:

- `modules.yaml`, which lists the modules, the requirements each one covers, the modules each depends on and a size estimate
- **interface contracts**: one formal contract per boundary between modules (API signatures, data formats, error behaviour, invariants)
- module-level requirement slices, so each module pipeline begins with a requirements document of a size it can handle

**Start whole, split when it hurts.** Decomposition is not a design done up front. A project starts as **one module**, and the Programme Architect's first `modules.yaml` may say exactly that. A split must be earned by evidence: the sizing rule failing (a layer too big for one session), or feedback that the current boundaries do not work (`interface_impediment`, `scope_gap`). Never by speculation about how the system might grow. Requirements start the same way: a first slice, enough to begin, grown by the same loop that grows the decomposition. Every split adds a contract, and contracts are the costliest artefacts to change, so the decomposition stays as coarse as the evidence allows. Heavy contract churn (ω(t) at programme level, §17) is the sign that a split was guessed too early.

**Which module provides and uses each contract** is stated in `modules.yaml`: each contract is provided by exactly one module, and used by any others (decision 0014).

**Interface contracts are the joints of the system.** A module's Specification AI turns the contracts its module *provides* and *uses* into contract scenarios. The Coding AI, which never sees architecture, still meets every interface through the specifications and tests.

**Interface change protocol.** When a module agent finds that a contract does not work, it raises a feedback signal of type `interface_impediment`. Divlab sends that to the Programme Architect, never to the other module. A revised contract creates revision tasks for every affected module: each module that provides or uses it goes back to Architecture, at once if it has no task open, or once its open task's work is merged (decision 0015). That keeps module teams independent of each other while still letting contracts change.

**Sizing rule.** Every task must fit comfortably in one session of a typical member's spare allowance. If the Programme Architect's size estimate says a module's layer is too big, the module is split again. The decomposition is recursive, and the same rule applies at every level.

**Integration pipeline.** Once module pipelines reach their done criteria, an integration pipeline checks the assembled system against programme-level acceptance scenarios. Failures are traced back to a module or a contract: a defect in a module sends it back to Specification, so the missed behaviour becomes a module scenario, then a failing module test, then code; a contract that does not work goes to the Programme Architect. A module reopened after integration has begun holds integration until every module is done again, when the integration tests are run again. Integration Review passing completes the programme (decision 0017).

---

## 6. Roles and access

Read and write scopes follow the CSD access control matrix, extended for modules. "Own module" means the module named in the task.

| Role | Level | Reads | Writes |
|---|---|---|---|
| Discovery | Programme | brief | `context/` |
| Requirements | Programme | brief, `context/` | `requirements/` |
| Programme Architect | Programme | `requirements/` | `programme/` (modules.yaml, contracts, requirement slices) |
| Architecture | Module | own module requirement slice, contracts it provides and uses | `modules/<m>/architecture/` |
| Specification | Module | requirement slice, module architecture, its contracts | `modules/<m>/specifications/` |
| Test | Module | requirement slice, module architecture, specifications | `modules/<m>/tests/` |
| Coding | Module | specifications, tests **only** | `modules/<m>/src/` |
| Reviewer | Module | requirement slice, specifications, `src/` | `modules/<m>/reviews/` |
| Security & Quality | Module | requirement slice, architecture, `src/` | `modules/<m>/reviews/` |
| Integration Specification | Programme | requirements, contracts | `integration/specifications/` |
| Integration Test | Programme | requirements, contracts, integration specifications | `integration/tests/` |
| Integration Review | Programme | requirements, contracts, integration specifications and tests | `integration/reviews/` |
| Research | Any | its question (the feedback signal that reported the knowledge gap) and `research-briefs/<m>/` | `research-briefs/<m>/` |
| Governance | Programme | **everything** | `governance/` |

When Research passes, the revision task for the role that reported the gap also reads its module's `research-briefs/<m>/` (Bernard, 2026-10-29). Research reads nothing of its module's work: it works from outside sources, and its question, read as data, never widens what it may read (Bernard, 2026-10-29).

Every role also writes one feedback signal per task to `feedback/`. Only Divlab and PDC coordinators read feedback signals. Agents receive the relevant feedback as an input to a revision task, never by browsing.

**Conflict-of-interest rules**, enforced by Divlab when a task is claimed:

- A member may hold at most one role per module, over the module's whole life: their merged work and any task they hold count, and they may always revise their own role's work. Research is not a role in a module (decision 0007).
- A member who produced any artefact in a module (Architecture, Specification, Test or Coding) may not take the Reviewer or Security & Quality role for that module.
- Two accounts that are linked by a PDC coordinator, or flagged as suspected duplicates, are treated as one member.

**Governance is the deliberate exception to epistemic independence.** It is the one role that sees the whole project, because harmful intent can be hidden by decomposition (§11).

---

## 7. GitHub organisation layout

The organisation is [github.com/anarres-project](https://github.com/anarres-project). While the platform is being built, all of its parts live in **one repository**, `anarres-project/anarres`, licensed AGPL-3.0:

```
anarres/
├── packages/
│   ├── core/      Pure domain rules shared by everything: access scopes, routing, leases, eligibility
│   ├── github/    The only code that talks to the GitHub API
│   ├── divlab/    GitHub Action: validation, routing, leases, event log
│   ├── cli/       `anarres` CLI called by the plugin's commands and hooks
│   └── site/      Netlify website: sign-up, project browser, proposals, dashboards
├── plugin/        Claude Code plugin + marketplace: role skills, hooks, /anarres commands
├── template/      Template for new project repositories
├── governance/    Odonian Principles, policies, member trust levels, PDC list
└── docs/          Concept, design and decision records
```

`CLAUDE.md` in the repository describes the full engineering layout, including the acceptance test
layers.

When the parts have settled, they will be split into separate repositories (`divlab`, `plugin`, `site`, `project-template`, `governance`), plus a `proposals` repository where project proposals are filed as issues. Each approved project gets its own repository, `proj-<name>` (more than one at scale; see §14). Platform code is AGPL-3.0. Each project chooses its own licence (§13).

### Project repository layout

```
proj-<name>/
├── anarres.yaml              Project config: licence, visibility, modules, layer→location map
├── brief.md                The approved proposal
├── context/                Discovery
├── requirements/           Programme requirements
├── programme/
│   ├── modules.yaml
│   ├── contracts/<c>/      One contract per module boundary, a folder each (decision 0014)
│   └── slices/             Requirement slices per module
├── modules/<m>/
│   ├── architecture/
│   ├── specifications/
│   ├── tests/
│   ├── src/
│   └── reviews/
├── integration/
├── research-briefs/<m>/    Research's briefs, one folder per module
├── feedback/               One file per signal: FB-<task-id>.md
├── events/                 Append-only event log: one JSON file per event
├── governance/
└── .github/
    ├── CODEOWNERS
    └── workflows/anarres.yml  Calls divlab
```

Two choices here avoid merge conflicts by design. Every role writes only to its own paths, and the event log uses one file per event rather than a single growing file. Concurrent PRs from different members therefore never touch the same file.

`anarres.yaml` includes a **layer→location map**. In public mode every layer lives in the project repository. In private mode (§12) layers can be mapped to separate repositories with team-level permissions. The plugin and Divlab read the map, so switching modes is a configuration change, not a rewrite.

### Any language

Hosted projects can be written in any language (Python, Java, C++, Rust and so on). Anarres itself never builds or runs a project's code. `anarres.yaml` declares the project's **toolchain**: the dev container image members work in, the command that runs the tests, and where the test report is written. Divlab starts no project that declares none. The project's own CI workflow runs that command. Divlab only reads the outcome: the CI check result and a test report in **JUnit XML**, a format almost every test framework can produce. Divlab's routing, validation and metrics are therefore the same whatever language a project uses.

---

## 8. Task lifecycle and synchronisation

This is how members' Claude sessions find out there is work for them, and how everything stays in step without a central server.

```
 Divlab opens issue          member runs /anarres:next       member's session works
 ┌───────────┐  /claim   ┌──────────┐  PR opened   ┌──────────┐  checks pass  ┌────────┐
 │  ready    │ ────────▶ │ claimed  │ ───────────▶ │ in review│ ────────────▶ │ merged │
 └───────────┘           └──────────┘              └──────────┘               └────────┘
       ▲   lease expires      │                         │ checks fail              │
       └──────────────────────┘                         └──▶ member fixes or     │
                                                             releases            ▼
                                              Divlab reads feedback header, opens next task(s)
```

1. **Task creation.** Divlab opens an issue for each task, labelled `role:<role>`, `module:<m>` and `state:ready`. The issue body lists the input artefact paths **pinned to a commit SHA**, the output paths, a size estimate and a link to the feedback signal that triggered it, if any. A module starts with its first task, Architecture, ready, so all work is done for a task.
2. **Discovery of work.** The model is pull-based. The member runs `/anarres:next` in Claude Code whenever they have allowance to spare. The plugin searches open issues across Anarres projects for the roles the member is eligible for, ranks them, and offers a choice: work already under way first (a revision, a continuation or research, posted for a feedback signal), as it unblocks a module that is moving, then the longest waiting; size joins the ranking once tasks carry estimates (Bernard, 2026-10-29). Nothing is ever pushed into a member's session.
3. **Claiming.** The plugin posts a `/claim` comment. Divlab checks eligibility (trust level, conflict of interest), then applies `state:claimed` and a lease expiry (default 24 hours).
4. **Preparing the workspace.** The plugin syncs the member's fork and uses sparse checkout to fetch **only the paths the role may read, at the pinned SHA**. Read-scope hooks block any other file access. The role's instructions load as a skill.
5. **Work.** Claude does the role's job in a sandbox (§10) and writes the artefact plus a feedback signal.
6. **Contribution.** The plugin opens a PR from the member's fork, referencing the task issue. A draft PR pushed early also counts as a heartbeat and extends the lease.
7. **Validation.** Divlab validates every contribution against the task it was claimed for, the role's access rules and the project's own CI, and flags work whose inputs changed after its task was posted: such work is merged, and the next task is a revision for the same role, pinned to the new inputs, unless the work failed or was handed over part done, when those rules decide, the most upstream winning (decision 0015). It accepts work only from the member it shows holding the task, so the checks made at claiming hold for the work too: anyone else's is refused. A holder whose lease has run out, but who still holds the task, is still its holder.
8. **Merge.** Divlab merges contributions that pass validation, with human review wherever PDC coordinators require it: a module they name in the governance file is merged only once a trusted member or PDC coordinator independent of the work approves the commit (decision 0016). **Only Divlab merges:** no person merges or pushes to a project's main branch, so every change there has passed validation. Anything that reaches main another way is never routed; Divlab records it and alerts the PDC coordinators, and routing carries on (decision 0005).
9. **Routing.** On merge, Divlab reads the feedback header, applies the routing table (§9), opens the next task or tasks and writes an event file.
10. **Partial work.** If a member runs out of allowance, the plugin commits what exists with `status: partial` and a handover note. Divlab merges it and re-queues the task as a continuation: a task for the same role and module, which also reads the role's own place, so its member sees the work they continue. Anyone eligible may take it (decision 0008).
11. **Lease expiry.** If a lease runs out with no activity, the task returns to `ready`. Nothing is lost except that one task's unfinished work.

**Notification beyond pull.** Members can watch repositories or labels through ordinary GitHub notifications. A chat integration (Discord, for example) that announces new tasks can be added later. Neither is needed for correctness.

**Latency is expected.** One step may take hours to be picked up. Throughput comes from running many module pipelines in parallel, not from making any one pipeline faster.

### Feedback signal header (extended for Anarres)

```yaml
---
feedback_signal:
  task_id: proj-ledger/T-0142
  from_role: specification
  module: parser
  member: github-handle
  inputs:                       # SHAs the work was based on
    requirements_slice: 3f2a91c
    architecture: 8be04d2
  status: complete              # complete | partial
  verdict: conditional_pass     # pass | conditional_pass | fail | blocked
  impediments:
    - type: interface_impediment   # + upstream_ambiguity | knowledge_gap | scope_gap |
      severity: high               #   implementation_impediment | architecture_impediment
      affects: CONTRACT-parser-ledger
      description: "Contract does not define behaviour for empty batches"
  open_questions: 1
  assumptions_made: 2
  routing_recommendation: upstream_to_programme_architect
  tokens_used: 410000           # optional, self-reported, for dashboards
---
```

---

## 9. Divlab (successor to the AutoPM)

The March AutoPM spec had a Claude session apply a fixed routing table. A fixed table is code, and it is better written as code: testable, auditable, free to run and identical on every project.

**What Divlab does** (a GitHub Action in `divlab/`, acting as its own GitHub App so that only it can merge: decision 0006):

- validates PRs (§8, step 7)
- manages leases and eligibility
- applies the routing table from the CSD AutoPM spec, extended with module and interface rules:
  - `interface_impediment` → Programme Architect
  - Coding's `upstream_ambiguity` → Specification (the AutoPM table has no such row; CSD's
    interface specifications send a specification ambiguity there). If the ambiguity lies further
    up, Specification fails upward in turn
  - Reviewer's and Security & Quality's `architecture_impediment` → Architecture (the AutoPM
    table sends every failed review to Coding, which cannot change the architecture; Bernard,
    2026-10-29)
  - when a failure reports several problems, one revision task goes to the most upstream role that
    owns one, except that a `knowledge_gap` goes to Research first: what is learnt may change any
    other fix. The Research task belongs to the module that reported the gap
  - **escalation:** within one module, each revision task for a role counts as a re-run of that
    role, and the count starts again when that role's work passes. A fourth re-run is not posted:
    a PDC coordinator is alerted instead (the AutoPM's "same agent re-run > 3 times")
  - a contract revision → revision tasks for every module that uses the contract
  - all module pipelines done → integration pipeline: the modules are those `modules.yaml` on
    main lists, and the last one done posts an Integration Specification task (decision 0017)
  - a `conditional_pass` routes exactly as a `pass` does; its open questions and assumptions are
    kept in the event record
  - **v1 difference:** the AutoPM table advances a pass only while ρ > 0. Until Divlab computes
    metrics, a pass always advances; the ρ-based escalation arrives with the metrics
- computes the state space metrics d(t), ρ(t) and ω(t) for each module and for the programme, using code
- writes event files
- escalates by opening an `escalation` issue for PDC coordinators whenever an escalation trigger from the AutoPM spec fires

**Where Claude is used:** optionally, an escalation issue can be diagnosed by Claude through a GitHub Action that runs Claude with an organisation API key. That costs money for the organisation, so it is opt-in per project.

**Built test-first.** The routing table is Divlab's executable specification. Each row becomes an acceptance test, and that suite is the first thing to build.

---

## 10. Member experience and safety

### Joining

1. Sign in on the Anarres website with GitHub.
2. Read and accept the Odonian Principles (§11) and the contributor terms (§13).
3. Install the plugin: `/plugin marketplace add anarres-project/anarres`, then install the `anarres` plugin.
4. Run `/anarres:setup`. This checks the sandbox, creates the member's working area and confirms the member's GitHub CLI login.
5. Run `/anarres:next` whenever there is allowance to spare.

### Commands

| Command | Purpose |
|---|---|
| `/anarres:next` | Find, claim and start an eligible task |
| `/anarres:status` | Show current leases, open PRs and contribution history |
| `/anarres:release` | Give a task back early; work already done is handed over as partial work, and Divlab posts a continuation |
| `/anarres:resume` | Continue a claimed task in a new session |

### Protecting members

Every artefact a member's Claude reads was written by someone else. The threats are real:

- **Prompt injection:** a specification or test file that contains instructions aimed at the agent.
- **Hostile code execution:** test suites and builds run code written by strangers on the member's machine.
- **Data exposure:** an agent with broad file access could read the member's other work.

Defences built into the plugin:

- Tasks that execute code (Test, Coding, Security & Quality, Integration) run in the project's declared **dev container** with no host secrets and restricted network access. Other roles use Claude Code's sandbox.
- Read-scope hooks confine the agent to the sparse-checkout workspace, and each role to its own inputs and its own place within it (where it may also read back its own work: decision 0009). They judge Claude Code's file tools only, so they keep an honest session on course rather than wall it in: the hard boundary is the sandbox or dev container, and Claude Code's permission rules.
- Each role's instructions tell it to treat artefacts as data and to report suspicious content as a feedback impediment (`suspicious_content`), never to act on it.
- Anarres sessions run with isolated Claude configuration, so the member's personal memory, global CLAUDE.md and other projects never enter an Anarres task, and nothing from one Anarres role carries into another.

### Donated capacity

Members decide when to contribute, so v1 involves no automation of anyone's subscription. Task size estimates let a member pick work that fits what they have left. Usage is self-reported in the feedback header for dashboards only. It is never a condition of participation.

---

## 11. Safety governance

Anarres must reject harmful work. Decomposition makes this harder than it looks: **if a harmful project is split into innocent-looking pieces, no single member can see the harm.** Epistemic independence, which Anarres relies on for quality, works against it here. Governance therefore has to look at whole projects, continuously.

### The Odonian Principles (short form)

- Outputs are openly licensed and held in common.
- No project may be designed to cause harm to people, animals or critical systems.
- No project may concentrate power over others, or enable surveillance of individuals or groups.
- Members must follow Anthropic's usage policies. Every member's Claude applies them independently to every task.
- Any member may fork any project, carrying the Odonian Principles with it.

### Prohibited categories

Including but not limited to: weapons of any kind; biological, chemical, radiological or nuclear capability; malware, exploit development and offensive cyber tools; surveillance, tracking or profiling of individuals; deception at scale (disinformation tooling, impersonation); and anything designed to evade safety or security controls.

The March document's "pathogen design-space mapping" project is **explicitly excluded**, and its defensive framing makes no difference. Projects next to dual-use areas, such as drug discovery tooling, need extra PDC coordinator review if they are considered at all after v1.

### Three layers of defence

1. **At proposal.** Every proposal is screened automatically against the Odonian Principles and then approved by two PDC coordinators. A proposal must state its purpose, users, outputs and licence.
2. **During the project.** A Governance role sees the whole project. It reviews it continuously, checking for drift from the approved purpose and for dangerous capability emerging from parts that look harmless on their own. Its findings go to PDC coordinators as `governance` issues.
3. **Community and member level.** Any member can flag a project. PDC coordinators can freeze one, which stops new tasks being created, at once. Each member's own Claude refuses harmful tasks, and Anarres treats such refusals as a governance alert, not a nuisance.

### Contribution integrity

| Threat | Mitigation |
|---|---|
| One person with several accounts takes producing and reviewing roles | Trust levels gate review roles; conflict-of-interest rules; linked-account flags |
| Backdoored code | Independent Reviewer and Security & Quality roles; two independent reviewers on modules marked high-risk; every merge public |
| Low-effort or fabricated artefacts | Schema checks, CI, sanity checks on state space metrics, reviewer verdicts recorded per member |
| Malicious content aimed at agents | Sandboxing (§10), `suspicious_content` reporting, PDC coordinator action against the account |

**Trust levels:** *new* (Requirements, Specification, Test, Coding on low-risk modules, Research) → *established* (all producing roles, including Architecture, and Reviewer) → *trusted* (Security & Quality, Governance, Programme Architect) → *PDC coordinator*. Trust is earned over time and confirmed by PDC coordinators, who record each member's level, and any accounts linked to them, in a reviewed file in `governance/` (decision 0007). The same file names each project's high-risk modules: coding one needs an established member, and its code goes to Security & Quality only once two different members' reviews have passed (decision 0019).

---

## 12. Visibility modes

| | Public (default) | Private (designed in, enabled later) |
|---|---|---|
| Repositories | One public repository per project | One private repository per layer, readable by teams |
| Read isolation | Agent-level (sparse checkout and hooks). Humans can see everything. | Human-level (GitHub permissions) |
| Contributions | PRs from forks. No org membership needed. | Org membership and team assignment required |
| When to use | Ordinary open-source work | Security fixes before disclosure; sensitive work with PDC coordinators' approval |

**Why public first.** Independence in CSD protects the *agent's* context. A member who deliberately reads another layer gains nothing, and in public mode it is visible anyway. Public mode also makes safety monitoring and auditing possible for everyone, and it has the lowest barrier to joining. Private mode exists because some work, especially fixing vulnerabilities in upstream software, must not be public until it is disclosed.

---

## 13. Upstream contributions and licensing

- **Licence per project**, compatible with any upstream target (GPL-2.0 for Linux kernel work, for example), recorded in `anarres.yaml`.
- **Developer Certificate of Origin** sign-off on every PR.
- **Upstream submissions are made by people.** A PDC coordinator acting as maintainer liaison reviews, signs off and submits. Anarres never sends AI-generated patches upstream automatically, follows each upstream project's policy on AI contributions and always discloses how the work was produced.
- **Quality over volume.** Upstream maintainers' time is the scarcest resource in open source. Anarres aims to be known for a small number of excellent contributions, never a flood of plausible ones.
- **Coordinated disclosure** for security findings, using private mode.

---

## 14. Scaling plan

The architecture grows without being redesigned. Each stage names what changes and what becomes the bottleneck.

| Stage | Members | What changes | Bottleneck |
|---|---|---|---|
| Pilot | 5–10 | One project, run by hand: issues opened manually, a human acts as Divlab, plugin in prototype | Learning whether distributed CSD works at all |
| Foundation | 10–100 | Divlab and the plugin released; website live; a GitHub App runs the org; several projects | PDC coordinator time for proposals and escalations |
| Growth | Hundreds | Trust levels and conflict checks fully automated; delegated PDC coordinators per project; large projects split into a repository per module group | GitHub API limits on cross-project task search; merge volume in busy repositories |
| Scale | Larger still | A small read-only **task index** service (a cache of open tasks, rebuilt from GitHub events) for `/anarres:next`; elected councils for governance | Governance capacity; upstream maintainers' capacity |

The things that do **not** scale on their own are human: proposal review, PDC coordinatorship and upstream liaison. Anarres's governance design (delegation, trust levels, councils) is its scaling plan as much as any technology is.

---

## 15. Research programme

The [CSD state space model](https://github.com/bernardSolar/csd/blob/main/research/CSD_State_Space_Model.md) and the six falsifiable claims in the [experimental programme](https://github.com/bernardSolar/csd/blob/main/research/CSD_Experimental_Programme.md) still apply. Anarres makes them much easier to test:

- Divlab logs the state vector and metrics at every merge, so every Anarres project produces research data as a by-product.
- Multiple independent members per role, across many projects, give the corpus needed for the claims about concern convergence and phase-portrait archetypes.
- Pre-registration can be enforced the same way the March document proposed, by making the hypotheses artefact a dependency of the data-collection tasks.

Research instrumentation is **not** a v1 prerequisite. v1 only has to make sure the event log captures everything needed later.

---

## 16. Roadmap

Each phase has an exit criterion and is built test-first, from the outside in.

| Phase | Deliverable | Exit criterion |
|---|---|---|
| **0. Walking skeleton** | Pilot project with 5–7 members. Issues and routing handled by hand. Role instructions adapted from the CSD library. | One module reaches its done criteria through a distributed pipeline. A lessons-learned report is written. |
| **1. Divlab and plugin** | `divlab/` (validation, routing table, leases, events) and `plugin/` (`/anarres:next`, sparse checkout, hooks, sandbox) | The pilot's second module runs with no human routing |
| **2. Decomposition** | Programme Architect role, contracts, the interface change protocol, the integration pipeline | A project with three or more modules and at least one contract revision completes |
| **3. Website and proposals** | Netlify site, GitHub sign-in, proposal flow, project browser, dashboards | A project proposed by a non-founder is approved and started |
| **4. Governance at scale** | Governance role, trust levels, automated conflict checks, PDC coordinator tooling | Several projects run at once with no founder routing or approvals |
| **5. Research instrumentation** | Metrics dashboards, research corpus export | The first claim from the experimental programme is tested on Anarres data |

---

## 17. Open questions and risks

1. **Domain and name use.** The GitHub organisation is registered. No domain is yet; `anarrescommons.org` and `anarres.io` appeared to be free in October 2026, and Netlify's free subdomain will do until launch. "Anarres" is used as an homage to Le Guin's novel; the project should credit the source and avoid any suggestion of endorsement by her estate.
2. **Does distributed CSD work?** CSD has been proven on one project, on one machine. Phase 0 exists to find out cheaply.
3. **Quality of decomposition.** The Programme Architect's output decides everything downstream. Poor contracts will show up as heavy interface churn. ω(t) at programme level should detect it.
4. **Anthropic's terms.** Members start every session themselves. Any change to how sessions start is checked against Anthropic's terms first.
5. **Member retention and latency.** Volunteer platforms depend on motivation. Visible credit (contributor pages, acknowledgements in upstream commits where allowed) and short, well-sized tasks matter.
6. **Legal entity and liability.** Who owns the organisation, the trademark and the PDC coordinator role? A lightweight foundation or fiscal host may be needed before the Growth stage.
7. **Cost of Claude in Divlab.** Optional escalation diagnosis uses an organisation API key. Keep it opt-in until a funding source exists.
8. **Pilot project choice.** Larger than the calculator, small enough to finish in weeks, genuinely useful, and with a clear done criterion. To be chosen.

---

## 18. What changed from the March documents

| Kept | Changed | Dropped |
|---|---|---|
| Epistemic independence and the role taxonomy | Divlab is deterministic code, not a Claude session | Raw context as the main argument |
| Feedback signals with YAML headers | Tasks with leases instead of a full team up front | tmux on member machines |
| Routing table and escalation triggers | Decomposition by module plus Programme Architect role | Channels as a requirement (optional later) |
| Event journal and state space metrics | GitHub as the coordination layer (no PostgreSQL server) | Pathogen design-space project |
| Commons licensing and fork right | Odonian Principles simplified; governance has a whole-project view | Tie to any existing commercial community |
| Pull-based participation | Member safety (sandbox, injection defence) made explicit | Claude-specific naming |

---

*Prepared by Bernard McCarty, with Claude (Anthropic) — October 2026*
