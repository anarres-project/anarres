Feature: Members claim tasks
  So that no two members do the same work, a member claims a ready task before starting it,
  and holds it under a lease for a limited time.

  Scenario: A member claims a ready task
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    When Alice claims the Test task for "parser"
    Then the Test task for "parser" is claimed by Alice
    And the Test task for "parser" is no longer ready to claim

  Scenario: Divlab records each claim it grants, and when
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    When Alice claims the Test task for "parser"
    Then Divlab's record shows Alice claimed the Test task for "parser", saying when, in UTC

  # Not in the sandbox: it has three members, and the sandbox has accounts for two.
  @sandbox-wip
  Scenario: A claimed task cannot be claimed by anyone else
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Bob claims the Test task for "parser"
    Then the Test task for "parser" is claimed by Alice
    And Bob is told the task has already been claimed

  # Not in the sandbox: it has three members, and the sandbox has accounts for two.
  @sandbox-wip
  Scenario: Of two claims made together, the first made wins, whichever Divlab hears of first
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    When Alice and then Bob claim the Test task for "parser", and Divlab hears of Bob's claim first
    Then the Test task for "parser" is claimed by Alice
    And Bob is told the task has already been claimed

  Scenario: A member can give a task back early
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Alice releases the Test task for "parser"
    Then a Test task for "parser" is ready to claim

  # Not in the sandbox: it has three members, and the sandbox has accounts for two.
  @sandbox-wip
  Scenario: Only the member holding a task can give it back
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Bob releases the Test task for "parser"
    Then the Test task for "parser" is claimed by Alice
    And Bob is told only the member holding the task can give it back
