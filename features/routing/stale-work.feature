Feature: Work whose inputs changed after its task was posted is revised
  So that no role builds on work made from inputs that have since changed, Divlab merges such work
  and gives it back to the same role, with the new inputs (decision 0015).

  Scenario: Work whose requirement slice changed after its task was posted goes back to its role
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the requirement slice for "parser"
    When Alice submits Test work on "parser" with a pass verdict
    Then the only task ready for "parser" is a Test task

  Scenario: A member taking the revision has the work already done to read
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the requirement slice for "parser"
    And Alice's Test work on "parser" was accepted with a pass verdict
    And Bob has claimed the Test task for "parser"
    When Bob prepares the Test task for "parser"
    Then Bob has the tests of "parser" to read

  Scenario: A revised contract sends a module whose task was open back to Architecture
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the contract "tokens"
    When Alice submits Test work on "parser" with a pass verdict
    Then the only task ready for "parser" is an Architecture task

  Scenario: A revised contract sends a module that is done back to Architecture at once
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    When the Programme Architect's work is revised, changing the contract "tokens"
    Then the only task ready for "parser" is an Architecture task

  Scenario: A revised contract sends a module it no longer serves back to Architecture
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the contract "tokens" so that "parser" no longer uses it
    When Alice submits Test work on "parser" with a pass verdict
    Then the only task ready for "parser" is an Architecture task
