Feature: Divlab merges the work members submit
  So that every change to a project has passed Divlab's checks,
  only Divlab merges a member's work into the project, and it routes the work as it merges it.

  Scenario: Work that passes validation is merged and routed
    Given a project with a module "parser"
    When a member submits Specification work on "parser" with a pass verdict
    Then Divlab has merged the member's Specification work on "parser"
    And the only task ready for "parser" is a Test task

  # Not yet tried against the sandbox (2026-10-21): the sandbox was busy measuring the suite.
  @sandbox-wip
  Scenario: Work without a feedback signal is not merged, and the member is told why
    Given a project with a module "parser"
    When a member submits Specification work on "parser" without a feedback signal
    Then Divlab has not merged the member's Specification work on "parser"
    And the member is told their work has no feedback signal
    And no task is ready for "parser"
