Feature: Work whose inputs changed after its task was posted is revised
  So that no role builds on work made from inputs that have since changed, Divlab merges such work
  and gives it back to the same role, with the new inputs (decision 0015).

  @sandbox
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

  @sandbox
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

  Scenario: A revised contract sends a module that is done, and that it no longer serves, back to Architecture at once
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    When the Programme Architect's work is revised, changing the contract "tokens" so that "parser" no longer uses it
    Then the only task ready for "parser" is an Architecture task

  Scenario: Work that failed after its requirement slice changed goes where its failure says
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the requirement slice for "parser"
    When Alice submits Test work on "parser" with a fail verdict, reporting an upstream ambiguity
    Then the only task ready for "parser" is a Specification task

  Scenario: Work reporting a contract that does not work goes to the Programme Architect, though the contract was revised since
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the contract "tokens"
    When Alice submits Test work on "parser" with a fail verdict, reporting an interface impediment
    Then the only task ready for "parser" is a Programme Architect task

  # In-process only: the sandbox would write over 300 files for it. That GitHub lists at most 300
  # files of a comparison is checked against its answer in the GitHub adapter's unit tests.
  Scenario: Work whose inputs cannot be checked, as too much changed since its task was posted, goes back to its role
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the requirement slices of a great many other modules
    When Alice submits Test work on "parser" with a pass verdict
    Then the only task ready for "parser" is a Test task
