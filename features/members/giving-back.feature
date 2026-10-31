Feature: A member gives a task back from their machine
  So that work a member has done is never lost when they give a task back, they hand it over as
  partial work, and Divlab posts a continuation for whoever takes it next (decision 0008). A task
  with nothing done is simply given back.

  @sandbox
  Scenario: A member gives back a task they have done nothing on, and it is ready for others
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And Alice has prepared the Test task for "parser"
    When Alice gives back the Test task for "parser" from their machine
    Then a Test task for "parser" is ready to claim

  Scenario: A member with work not yet handed over is told to hand it over before giving the task back
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And Alice has prepared the Test task for "parser"
    And Alice has written work on the Test task for "parser"
    When Alice gives back the Test task for "parser" from their machine
    Then Alice is told to hand over their work on the Test task for "parser" first
    And the Test task for "parser" is claimed by Alice
