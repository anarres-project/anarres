# 0014: Contracts, and what each role reads of them

**Status:** Accepted, 2026-10-28 (Bernard).

## Context

The Programme Architect writes one interface contract per boundary between modules (concept §5),
in `programme/contracts/`. The access matrix (§6) has Architecture read the contracts its module
provides and uses, and Specification its module's contracts. Integration reads all of them, and
nobody else reads any.

Core already holds every other read scope, once (test list, section 5). The plugin's `prepare`
fetches exactly the role's read scope at the task's pinned commit, and its hook refuses Claude's
file tools anything outside that scope. Contracts are the gap: a module's read scope depends on
which contracts the module provides and uses, and today nothing says which those are.

Since decision 0013, Divlab reads `programme/modules.yaml` from the Programme Architect's merged
work, as data: a list of modules, each with a plain name.

## Decision

1. **Where "provides" and "uses" are stated: in `modules.yaml`.** Each module may list the
   contracts it `provides` and the contracts it `uses`, by plain name. The Programme Architect
   writes the decomposition in one file, Divlab already reads it, and core validates it with the
   reader it already has. (The other choice, a header in each contract file naming its provider
   and users, spreads one decision over many files, each of which would have to be read and
   checked.)
2. **Where a contract lives: a folder of its own, `programme/contracts/<contract>/`.** Read scopes
   are places, matched by prefix. With one file per contract, the scope for a contract `parser`
   would also take in a contract `parser-ledger`. With a folder, each scope is exact, and a
   contract can hold more than one file (a schema beside its prose).
3. **What makes `modules.yaml` unreadable, from now on.** As well as what decision 0013 refuses:
   a contract named in more than a plain name; a contract provided by more than one module; a
   contract a module uses that no module provides; a module that uses a contract it provides. In
   each case the Programme Architect's work is refused, saying why. A contract provided and used
   by nobody else is allowed: it may be waiting for the module that will use it.
4. **What each role reads, as the matrix has it.** Architecture and Specification read the folders
   of the contracts their module provides and uses. No other module role reads a contract. The
   Integration roles, which read all contracts, come with the integration pipeline.
5. **Where the plugin learns a module's contracts.** From `programme/modules.yaml` at the task's
   pinned commit, read with core's reader, before the sparse checkout. That commit is one only
   Divlab merged, so its contents went through Divlab's checks. Divlab does not copy the contracts
   into the task's issue: anyone who triages can edit an issue's text and labels, and the plugin
   already treats them as data that cannot decide what a member reads. If the file at that
   commit cannot be read, `prepare` refuses, saying why, and fetches nothing.
6. **What is not decided here.** A revised contract making revision tasks for each module that
   uses it (the interface change protocol, §5), and the Integration roles. Each is a slice of its
   own, once this one is built.

## Consequences

- Core's `readModules` returns each module's `provides` and `uses`, and `readScope` takes them,
  so the matrix stays in one place.
- `prepare` reads one file at the pinned commit before the sparse checkout. The hook judges reads
  by the same scope, so it needs the same contracts, recorded in the task's folder by `prepare`.
- The concept document's layout (§7) shows `programme/contracts/<contract>/`, and §5 says where
  "provides" and "uses" are stated.
