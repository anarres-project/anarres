Feature: Members claim tasks
  So that no two members do the same work, a member claims a ready task before starting it,
  and holds it under a lease for a limited time.

  Scenario: A member claims a ready task
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    When Alice claims the Test task for "parser"
    Then the Test task for "parser" is claimed by Alice
    And the Test task for "parser" is no longer ready to claim

  # Not in the sandbox: one account plays every member there, so it cannot show two members.
  @sandbox-wip
  Scenario: A claimed task cannot be claimed by anyone else
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Bob claims the Test task for "parser"
    Then the Test task for "parser" is claimed by Alice
    And Bob is told the task has already been claimed
