Feature: Divlab merges the work members submit
  So that every change to a project has passed Divlab's checks,
  only Divlab merges a member's work into the project, and it routes the work as it merges it.

  Scenario: Work that passes validation is merged and routed
    Given a project with a module "parser"
    When a member submits Specification work on "parser" with a pass verdict
    Then Divlab has merged the member's Specification work on "parser"
    And the only task ready for "parser" is a Test task

  Scenario: Work without a feedback signal is not merged, and the member is told why
    Given a project with a module "parser"
    When a member submits Specification work on "parser" without a feedback signal
    Then Divlab has not merged the member's Specification work on "parser"
    And the member is told their work has no feedback signal
    And no task is ready for "parser"

  Scenario: Work whose feedback signal does not use plain names is not merged
    Given a project with a module "parser"
    When a member submits Specification work on "parser" whose feedback signal names its module in more than a plain name
    Then Divlab has not merged the member's Specification work on "parser"
    And the member is told their feedback signal must use plain names
    And no task is ready for "parser"

  # Not in the sandbox: the real Action cannot be stopped between merging and recording on cue.
  @sandbox-wip
  Scenario: A merge Divlab was interrupted in is finished by its next run
    Given a project with a module "parser"
    And Divlab was interrupted just after merging a member's Specification work on "parser"
    When Divlab next acts on the project
    Then the only task ready for "parser" is a Test task
    And no PDC coordinator is alerted that work reached main without Divlab merging it
