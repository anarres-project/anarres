Feature: A member resumes a task
  So that a member can carry on with a task they hold in a new session, as their allowance renews,
  resuming it finds the work where they left it, while the task is still theirs.

  @sandbox-wip
  Scenario: A member resumes a task they hold in a new session
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And Alice has prepared the Test task for "parser"
    When Alice resumes the Test task for "parser" in a new session
    Then Alice is told where their work on the Test task for "parser" is

  @sandbox-wip
  Scenario: A member cannot resume a task they have given back
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And Alice has prepared the Test task for "parser"
    And Alice releases the Test task for "parser"
    When Alice resumes the Test task for "parser" in a new session
    Then Alice is told they no longer hold the Test task for "parser"
