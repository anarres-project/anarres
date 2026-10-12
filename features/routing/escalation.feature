Feature: Divlab escalates a role that keeps being sent back
  So that volunteers' capacity isn't spent going round in circles,
  Divlab stops sending work back to a role that has already been re-run three times for a module,
  and alerts a PDC coordinator instead. The count starts again once that role's work passes.

  Scenario: A fourth re-run goes to a PDC coordinator instead
    Given a project with a module "parser"
    And a member's Coding work on "parser" has been sent back for test failures 3 times
    When a member's Coding work on "parser" is accepted with a fail verdict, reporting test failures
    Then a PDC coordinator is alerted
    And no task is ready for "parser"
    And Divlab records that the Coding work on "parser" went to a PDC coordinator because Coding was re-run more than three times

  Scenario: A third re-run is still sent back
    Given a project with a module "parser"
    And a member's Coding work on "parser" has been sent back for test failures 2 times
    When a member's Coding work on "parser" is accepted with a fail verdict, reporting test failures
    Then the only task ready for "parser" is a Coding task

  Scenario: The count starts again once the role's work passes
    Given a project with a module "parser"
    And a member's Coding work on "parser" has been sent back for test failures 3 times
    And a member's Coding work on "parser" was accepted with a pass verdict
    When a member's Reviewer work on "parser" is accepted with a fail verdict
    Then the only task ready for "parser" is a Coding task
