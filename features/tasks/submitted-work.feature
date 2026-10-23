Feature: Divlab merges the work members submit
  So that every change to a project has passed Divlab's checks,
  only Divlab merges a member's work into the project, and it routes the work as it merges it.

  Scenario: Work that passes validation is merged and routed
    Given a project with a module "parser"
    When a member submits Specification work on "parser" with a pass verdict
    Then Divlab has merged the member's Specification work on "parser"
    And the only task ready for "parser" is a Test task

  Scenario: Work several members submit at once is all merged
    Given a project with modules "parser", "lexer" and "printer"
    When members submit Specification work on "parser", "lexer" and "printer" at once, each with a pass verdict
    Then Divlab has merged the member's Specification work on "parser"
    And Divlab has merged the member's Specification work on "lexer"
    And Divlab has merged the member's Specification work on "printer"

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

  Scenario: Work whose feedback signal's file is not named plainly is not merged
    Given a project with a module "parser"
    When a member submits Specification work on "parser" whose feedback signal's file is named in more than a plain name
    Then Divlab has not merged the member's Specification work on "parser"
    And the member is told their feedback signal's file must have a plain name
    And no task is ready for "parser"

  # Not in the sandbox: the real Action cannot be stopped between merging and recording on cue.
  @sandbox-wip
  Scenario: A merge Divlab was interrupted in is finished by its next run
    Given a project with a module "parser"
    And Divlab was interrupted just after merging a member's Specification work on "parser"
    When Divlab next acts on the project
    Then the only task ready for "parser" is a Test task
    And no PDC coordinator is alerted that work reached main without Divlab merging it

  # Not in the sandbox: the real Action cannot be stopped between recording and acting on cue.
  @sandbox-wip
  Scenario: A decision Divlab recorded but did not act on is acted on by its next run, once
    Given a project with a module "parser"
    And Divlab was interrupted just after recording its decision on a member's Specification work on "parser"
    When Divlab next acts on the project
    And Divlab next acts on the project
    Then the only task ready for "parser" is a Test task

  # Not in the sandbox: the real Action cannot be stopped between recording and acting on cue.
  @sandbox-wip
  Scenario: The task the work was for is closed by Divlab's next run, if it stopped first
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Divlab was interrupted just after recording its decision on a member's Test work on "parser"
    When Divlab next acts on the project
    Then the only task ready for "parser" is a Coding task

  # Not yet in the sandbox: it has not passed there yet.
  @sandbox-wip
  Scenario: Work that changes files outside its role's scope is not merged
    Coding writes a module's code, never its tests: whoever writes the code must not be able to
    change what checks it.

    Given a project with a module "parser"
    When a member submits Coding work on "parser" that also changes the module's tests
    Then Divlab has not merged the member's Coding work on "parser"
    And the member is told their work changes files outside what Coding may change
