Feature: Merged work closes its task
  So that no member claims work that has already been done,
  merging a member's work closes the task it was for.

  @sandbox
  Scenario: Merging a member's work closes the task it was for
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    When a member's Test work on "parser" is accepted with a pass verdict
    Then the Test task for "parser" is no longer ready to claim
