Feature: A member finds work
  So that a member spends their spare allowance only on work they may do, asking for work offers
  them the ready tasks their trust level and the conflict-of-interest rules let them take.

  Scenario: A member is offered the ready tasks they may take
    Given a project with modules "parser" and "lexer"
    And a member's Coding work on "parser" was accepted with a pass verdict
    And a member's Specification work on "lexer" was accepted with a pass verdict
    When Alice asks for work
    Then Alice is offered the Test task for "lexer"
    And Alice is not offered the Reviewer task for "parser"

  # Not yet in the sandbox: it has not passed there yet.
  @sandbox-wip
  Scenario: A member's work submitted through the plugin is merged
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Alice submits Test work on "parser" through the plugin, with a pass verdict
    Then Divlab has merged the member's Test work on "parser"
