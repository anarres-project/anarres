Feature: A member preparing a task has its role's inputs, and no others
  So that each role works from its own inputs alone, as CSD's independence needs, preparing a task
  fetches only what its role may read: for Architecture, among others, the contracts its module
  provides and uses, as the Programme Architect's modules.yaml says (decision 0014).

  @wip
  Scenario: A member preparing an Architecture task has the contracts its module uses, and no others
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And Alice is an established member
    And Alice has claimed the Architecture task for "parser"
    When Alice prepares the Architecture task for "parser"
    Then Alice has the contract "tokens" to read, and not the contract "entries"
