Feature: The integration pipeline
  So that the assembled system is checked against the programme's own acceptance scenarios, once
  every module of a project is done Divlab starts the integration pipeline: Integration
  Specification, then Integration Test, then Integration Review (decision 0017).

  # Not in the sandbox yet: a worker's scenarios share one project there, each starting modules
  # of its own, so none is ever the last.
  @sandbox-wip
  Scenario: When the last module is done, the integration pipeline starts
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    When a member's Security & Quality work on "parser" is accepted with a pass verdict
    Then the only task ready is an Integration Specification task for the programme

  Scenario: Integration waits while any module is still in its pipeline
    Given a project with modules "parser" and "lexer"
    When a member's Security & Quality work on "parser" is accepted with a pass verdict
    Then no task is ready for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Integration Specification passing makes an Integration Test task ready
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    When a member's Integration Specification work for the programme is accepted with a pass verdict
    Then the only task ready is an Integration Test task for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Integration Test passing makes an Integration Review task ready
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Integration Specification work for the programme was accepted with a pass verdict
    When a member's Integration Test work for the programme is accepted with a pass verdict
    Then the only task ready is an Integration Review task for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Integration Review passing completes the programme
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Integration Specification work for the programme was accepted with a pass verdict
    And a member's Integration Test work for the programme was accepted with a pass verdict
    When a member's Integration Review work for the programme is accepted with a pass verdict
    Then the programme is done
    And no task is ready for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Divlab tells PDC coordinators when it cannot read the project's modules as one is done
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And the project's list of its modules cannot be read
    When a member's Security & Quality work on "parser" is accepted with a pass verdict
    Then PDC coordinators have been alerted that the project's list of its modules cannot be read
    And no task is ready for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Integration Test work whose tests fail is not merged, and the member is told why
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Integration Specification work for the programme was accepted with a pass verdict
    When a member submits Integration Test work for the programme whose tests fail
    Then Divlab has not merged the member's Integration Test work for the programme
    And the member is told the project's tests failed on their work

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: An integration test finding a defect sends the module at fault back to Specification
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Integration Specification work for the programme was accepted with a pass verdict
    When a member's Integration Test work for the programme is accepted with a fail verdict, its tests finding a defect in "parser"
    Then the only task ready for "parser" is a Specification task
    And the Specification task for "parser" carries the feedback signal from the Integration Test work for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Once the module at fault is done again, integration runs its tests again
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Integration Specification work for the programme was accepted with a pass verdict
    And a member's Integration Test work for the programme was accepted with a fail verdict, its tests finding a defect in "parser"
    When a member's Security & Quality work on "parser" is accepted with a pass verdict
    Then the only task ready is an Integration Test task for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: An integration task nobody has claimed is withdrawn when a module is reopened
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Security & Quality work on "ledger" was accepted with a pass verdict
    When the Programme Architect's work is revised, changing the contract "tokens"
    Then no task is ready for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Integration waits while any reopened module is still in its pipeline
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Security & Quality work on "ledger" was accepted with a pass verdict
    And the Programme Architect's work was revised since, changing the contract "tokens"
    When a member's Security & Quality work on "parser" is accepted with a pass verdict
    Then no task is ready for the programme

  # Not in the sandbox yet, as the first scenario.
  @sandbox-wip
  Scenario: Integration work claimed before a module was reopened finishes, and nothing further is posted
    Given a new project is started
    And a member's Programme Architect work for the programme was accepted, listing the modules "parser", "lexer" and "ledger", with a contract "tokens" that "lexer" provides and "parser" uses, and a contract "entries" that "ledger" provides
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And a member's Security & Quality work on "ledger" was accepted with a pass verdict
    And Alice has claimed the Integration Specification task for the programme
    And the Programme Architect's work was revised since, changing the contract "tokens"
    When Alice submits Integration Specification work for the programme with a pass verdict
    Then no task is ready for the programme

  # Not in the sandbox: it runs integration in one journey of its own (decision 0017).
  @sandbox-wip
  Scenario: Integration waits, and Divlab tells PDC coordinators, when it cannot read the project's modules
    Given a project with modules "parser" and "lexer"
    And a member's Security & Quality work on "lexer" was accepted with a pass verdict
    And a member's Security & Quality work on "parser" was accepted with a pass verdict
    And the project's list of its modules cannot be read
    When a member's Integration Specification work for the programme is accepted with a pass verdict
    Then PDC coordinators have been alerted that the project's list of its modules cannot be read
    And no task is ready for the programme
