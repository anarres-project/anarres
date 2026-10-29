Feature: Work whose inputs changed after its task was posted is revised
  So that no role builds on work made from inputs that have since changed, Divlab merges such work
  and gives it back to the same role, with the new inputs (decision 0015).

  @wip
  Scenario: Work whose requirement slice changed after its task was posted goes back to its role
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And the Programme Architect's work was revised since, changing the requirement slice for "parser"
    When Alice submits Test work on "parser" with a pass verdict
    Then the only task ready for "parser" is a Test task
