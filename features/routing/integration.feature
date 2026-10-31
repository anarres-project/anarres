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
