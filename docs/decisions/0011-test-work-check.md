# 0011: The project's own check on Test work

**Status:** Accepted, 2026-10-28 (Bernard).

## Context

In CSD the Test role writes a module's tests from its specification before any code exists: the
tests must run, and fail, for the right reason. Divlab should merge Test work only when the
project's own tests show that. Divlab never runs project code (decision 0010): the project's
checks workflow runs the tests and Divlab reads the outcome. A pass or fail for the whole run is
not enough: Divlab must see each new test, whether it ran, and how it ended.

Almost every test framework can write a JUnit XML report, in which each test case either passes,
fails (an assertion did not hold) or errors (it could not run: a compile error, a missing file).
The toolchain in `anarres.yaml` already names where the report is written (concept §7).

The report is written by running the member's own code, so it is untrusted data, like a
feedback signal: Divlab reads it, bounded and validated, and nothing in it is ever run or
followed.

## Decision

1. **Which tests are new.** The test cases in the work's report that the module's tests on main
   did not have, compared by name. (Not the tests the feedback signal names, which a member could
   leave out; not every test of the module, which is wrong in revision rounds, once code exists.)
   Only Test work adds tests and only Divlab merges, so Divlab records the names of the tests in
   each piece of Test work it merges, in its event log: the module's tests on main are the names
   recorded for it, and no extra run on main is needed.
2. **What "run and fail" means.** Every new test fails on an assertion. A new test that errors
   (it did not run) or passes (it tests nothing yet) means the work is refused, naming those
   tests. Work that adds no test is refused too.
3. **How Divlab gets the report.** The checks workflow uploads the report as the run's artefact;
   Divlab downloads it through the API, refuses one over a size limit, and reads it as data.
   The checks run on Test work too: its place, `modules/*/tests/`, joins Coding's in the
   workflow's paths.
4. **Which Test work.** As for Coding (decision 0010): only Test work that says it passed;
   reporting a failure or blocked, or partial, needs no check.

## Consequences

- The toolchain gains its report path, and the checks workflow its upload.
- Divlab reads a zipped artefact and an XML report: both bounded, both data.
- Divlab's log records the names of the tests each piece of Test work added.
- Test counts for metrics (the test list's next item) come from the same reports.
