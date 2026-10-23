Feature: A member finds work
  So that a member spends their spare allowance only on work they may do, asking for work offers
  them the ready tasks their trust level and the conflict-of-interest rules let them take.

  # Not in the sandbox yet: the CLI's reading of Anarres's projects on GitHub is not built yet.
  @sandbox-wip
  Scenario: A member is offered the ready tasks they may take
    Given a project with modules "parser" and "lexer"
    And a member's Coding work on "parser" was accepted with a pass verdict
    And a member's Specification work on "lexer" was accepted with a pass verdict
    When Alice asks for work
    Then Alice is offered the Test task for "lexer"
    And Alice is not offered the Reviewer task for "parser"
