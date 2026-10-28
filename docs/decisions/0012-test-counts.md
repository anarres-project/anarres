# 0012: Test counts in the state vector

**Status:** Accepted, 2026-10-28 (Bernard).

## Context

The CSD state space model (concept §15) describes a project at each step by its state vector
**S**(t): among its components, the tests that exist (n_test), pass (n_pass) and fail (n_fail).
The distance to done d(t), the convergence rate ρ(t) and the oscillation ω(t) are computed from
**S**(t), and Divlab is to log the state vector at every merge, so every project produces research
data as a by-product.

Most components need artefacts Divlab cannot read yet (open questions, coverage, the reviewer's
verdict as a number). The test counts it can: the project's checks write a JUnit report on Coding
and Test work (decisions 0010 and 0011), and Divlab already reads it as data.

## Decision

1. **What is counted.** n_test, n_pass and n_fail from the report of each piece of Coding or
   Test work Divlab merges. A test that errored counts as failing (it is not passing); a skipped
   test is not counted, as it did not run, so n_pass + n_fail = n_test holds, as the model
   requires.
2. **Where it is kept.** In the event that records the merge, as the part of **S**(t) Divlab has
   so far, so the log holds the trajectory.
3. **For what.** The whole report, at programme level, for now. A report does not reliably say
   which module a test belongs to; per module counts come when it does (test list).
4. **What is not done yet.** No d(t), ρ or ω, and no escalation on them: they need the rest of
   **S**(t). Other roles' work has no report and changes no counts; the counts are those of the
   last merged report.

## Consequences

- The merge event gains the test counts; the adapter reads them back validated.
- Research exports and the metrics escalations build on these records later.
