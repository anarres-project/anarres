# Development log

Running history and current status. Newest entry first.

---

## Current status

Design stage. No code yet. Next: build the walking skeleton (`docs/TEST_LIST.md`, section 0): the
first acceptance scenario through the in-process driver, the `npm test` gate and CI.

---

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
