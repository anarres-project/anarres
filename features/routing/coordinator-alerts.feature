Feature: A PDC coordinator's alert says what happened
  So that a PDC coordinator can act on an alert without digging through the project,
  the alert says what the work reported and why Divlab stopped routing it.

  @sandbox
  Scenario: An alert for a problem no rule covers says what was reported
    Given a project with a module "parser"
    When a member's Test work on "parser" is accepted with a fail verdict, reporting test failures
    Then a PDC coordinator is alerted that no rule covers the Test work on "parser", which failed reporting test failures

  Scenario: An escalation alert names the role that is stuck
    Given a project with a module "parser"
    And a member's Coding work on "parser" has been sent back for test failures 3 times
    When a member's Coding work on "parser" is accepted with a fail verdict, reporting test failures
    Then a PDC coordinator is alerted that Coding has been re-run more than three times on "parser"
