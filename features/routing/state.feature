Feature: Divlab records the project's state as its work is merged
  So that every project's progress can be followed and studied, Divlab records the project's state
  with each merge: for now its tests, how many there are and how many pass, from the project's own
  test report (concept §15, decision 0012).

  Scenario: Divlab records how many of the project's tests pass as its Test and Coding work is merged
    Given a project of its own with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And a member's Test work on "parser" was accepted with a pass verdict
    When a member's Coding work on "parser" is accepted with a pass verdict
    Then Divlab's records show the project's test failing after the Test work, and passing after the Coding work
