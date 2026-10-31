Feature: A member preparing a task has its role's inputs, and no others
  So that each role works from its own inputs alone, as CSD's independence needs, preparing a task
  fetches only what its role may read: for Architecture, among others, the contracts its module
  provides and uses, as the Programme Architect's modules.yaml says (decision 0014).

  Scenario: A member preparing an Architecture task has the contracts its module uses, and no others
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And Alice is an established member
    And Alice has claimed the Architecture task for "parser"
    When Alice prepares the Architecture task for "parser"
    Then Alice has the contract "tokens" to read, and not the contract "entries"

  @sandbox
  Scenario: A member preparing a Test task has its module's architecture and specification, and nothing of another module
    Given a project with modules "parser" and "ledger"
    And a member's Architecture work on "parser" was accepted with a pass verdict
    And a member's Architecture work on "ledger" was accepted with a pass verdict
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Alice prepares the Test task for "parser"
    Then Alice has the architecture and the specification of "parser" to read, and nothing of "ledger"

  @sandbox
  Scenario: A member preparing a task has its module's contracts as they were when the task was posted
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And Alice is an established member
    And Alice has claimed the Architecture task for "parser"
    And the Programme Architect's work was revised since, so that "parser" uses the contract "entries" too
    When Alice prepares the Architecture task for "parser"
    Then Alice has the contract "tokens" to read, and not the contract "entries"

  Scenario: A member taking the revision after research has the research brief to read
    Given a project with a module "parser"
    And a member's Coding work on "parser" was accepted with a fail verdict, reporting a knowledge gap
    And a member's Research work on "parser" was accepted with a pass verdict
    And Bob has claimed the Coding task for "parser"
    When Bob prepares the Coding task for "parser"
    Then Bob has the research brief of "parser" to read

  Scenario: A member preparing a Research task has the knowledge gap to read, and none of the module's work
    Given a project with a module "parser"
    And a member's Coding work on "parser" was accepted with a fail verdict, reporting a knowledge gap
    And Bob has claimed the Research task for "parser"
    When Bob prepares the Research task for "parser"
    Then Bob has the knowledge gap the Coding work on "parser" reported to read, and none of the module's work

  # Not in the sandbox yet, as the integration pipeline's scenarios.
  Scenario: A member preparing an Integration Test task has the integration specifications and the contracts, and none of the modules' work
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "ledger" was accepted with a pass verdict
    And a member's Integration Specification work for the programme was accepted with a pass verdict
    And Alice has claimed the Integration Test task for the programme
    When Alice prepares the Integration Test task for the programme
    Then Alice has the integration specifications and every contract to read, and none of the modules' work
