Feature: Divlab merges the work members submit
  So that every change to a project has passed Divlab's checks,
  only Divlab merges a member's work into the project, and it routes the work as it merges it.

  # Not yet in the sandbox: Divlab merges there as its GitHub App (decision 0006), not yet set up.
  @sandbox-wip
  Scenario: Work that passes validation is merged and routed
    Given a project with a module "parser"
    When a member submits Specification work on "parser" with a pass verdict
    Then Divlab has merged the member's Specification work on "parser"
    And the only task ready for "parser" is a Test task
