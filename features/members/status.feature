Feature: A member sees where their work stands
  So that a member never loses track of a task they hold, nor lets its lease run out unawares,
  asking for their status shows each task they hold and when its lease runs out.

  Scenario: A member is shown the tasks they hold, and when each lease runs out
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Alice asks for the status of their work
    Then Alice is shown that they hold the Test task for "parser", with when its lease runs out

  Scenario: A member is shown their draft of a task they hold
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And Alice submits draft Test work on "parser"
    When Alice asks for the status of their work
    Then Alice is shown that their Test work on "parser" is a draft

  Scenario: A member is shown the work of theirs Divlab has merged
    Given a project with a module "parser"
    And Alice's Specification work on "parser" was accepted with a pass verdict
    When Alice asks for the status of their work
    Then Alice is shown their Specification work on "parser" among their merged work
