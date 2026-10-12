Feature: Divlab posts the next task
  So that a module's pipeline keeps moving without anyone routing it by hand,
  Divlab turns each piece of accepted work into a task for the next role.

  Scenario: A passed specification makes a test task ready
    Given a project with a module "parser"
    When a member's Specification work on "parser" is accepted with a pass verdict
    Then a Test task for "parser" is ready to claim
