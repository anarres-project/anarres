# Development log

Running history and current status. Newest entry first.

---

## Current status

Design stage. No code yet. Next: agree the order of `docs/TEST_LIST.md`, then build the walking
skeleton (section 0): the first acceptance scenario, the `npm test` gate and CI.

---

## 2026-10-12: Project set up

- GitHub organisation `anarres-project` and public repository `anarres` created; licence AGPL-3.0.
- Concept document moved from `bernardSolar/csd` (`docs/Arena_Concept.md`) to
  `docs/Anarres_Concept.md` and renamed: router → Divlab, stewards → PDC coordinators, charter →
  Odonian Principles.
- `CLAUDE.md` tailored from Bernard's test-first template: test-first protocol, outside-in ATDD,
  Four Layer acceptance model, with Anarres-specific safety rules.
- Stack chosen: see `docs/decisions/0001-stack.md`.
- Initial test list drafted from the concept document's Phase 1.
