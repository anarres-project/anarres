Feature: Who may take a task
  So that each piece of a module is checked by someone independent of it, a member takes one
  role in a module for its whole life: whoever wrote a module's tests never writes its code, and
  whoever produced any of it never reviews it. Divlab checks this when a member claims a task.

  # Not in the sandbox yet: it has no governance file of its own to set trust levels in.
  @sandbox-wip
  Scenario: A member who wrote a module's code cannot review it
    Given a project with a module "parser"
    And Alice is an established member
    And Alice's Coding work on "parser" was accepted with a pass verdict
    When Alice claims the Reviewer task for "parser"
    Then Alice is told a member takes only one role in a module
    And a Reviewer task for "parser" is ready to claim

  Scenario: A member who wrote a module's specification cannot write its tests
    Given a project with a module "parser"
    And Alice's Specification work on "parser" was accepted with a pass verdict
    When Alice claims the Test task for "parser"
    Then Alice is told a member takes only one role in a module

  Scenario: A member may revise work in their own role
    Given a project with a module "parser"
    And Alice's Coding work on "parser" was accepted with a fail verdict, reporting test failures
    When Alice claims the Coding task for "parser"
    Then the Coding task for "parser" is claimed by Alice

  # Not in the sandbox yet: it has no governance file of its own to set trust levels in.
  @sandbox-wip
  Scenario: A new member cannot take a Reviewer task
    Given a project with a module "parser"
    And a member's Coding work on "parser" was accepted with a pass verdict
    When Alice claims the Reviewer task for "parser"
    Then Alice is told a Reviewer task needs an established member
    And a Reviewer task for "parser" is ready to claim

  # Not in the sandbox yet: it has no governance file of its own to set trust levels in.
  @sandbox-wip
  Scenario: An established member can take a Reviewer task
    Given a project with a module "parser"
    And Alice is an established member
    And a member's Coding work on "parser" was accepted with a pass verdict
    When Alice claims the Reviewer task for "parser"
    Then the Reviewer task for "parser" is claimed by Alice

  # Not in the sandbox yet: it has no governance file of its own, and one account plays everyone.
  @sandbox-wip
  Scenario: Accounts a PDC coordinator has linked are one member
    Given a project with a module "parser"
    And Alice is an established member
    And a PDC coordinator has linked a second account to Alice
    And Alice's Coding work on "parser" was accepted with a pass verdict
    When Alice's second account claims the Reviewer task for "parser"
    Then Alice's second account is told a member takes only one role in a module
