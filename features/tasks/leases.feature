Feature: Leases
  So that a task a member has stopped working on is not lost, a claim holds a task for a limited
  time: a lease. A lease runs out after 24 hours without activity, and the task is ready again.

  # Not in the sandbox: its clock is GitHub's, and nothing can move it on 24 hours.
  @sandbox-wip
  Scenario: A lease runs out after 24 hours without activity, and the task is ready again
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When 25 hours pass without activity on the task
    And Divlab checks the project's leases
    Then a Test task for "parser" is ready to claim
    And Alice is told the lease on the task ran out

  # Not in the sandbox: its clock is GitHub's, and nothing can move it on 24 hours.
  @sandbox-wip
  Scenario: A lease holds the task until 24 hours have passed
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When 23 hours pass without activity on the task
    And Divlab checks the project's leases
    Then the Test task for "parser" is claimed by Alice

  # Not yet in the sandbox: it has not passed there with the second account yet.
  @sandbox-wip
  Scenario: Divlab does not merge draft work
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    When Alice submits draft Test work on "parser"
    Then Divlab has not merged the member's Test work on "parser"
    And the Test task for "parser" is claimed by Alice

  # Not in the sandbox: its clock is GitHub's, and nothing can move it on 24 hours.
  @sandbox-wip
  Scenario: Draft work extends the lease
    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And 20 hours pass without activity on the task
    When Alice submits draft Test work on "parser"
    And 20 hours pass without activity on the task
    And Divlab checks the project's leases
    Then the Test task for "parser" is claimed by Alice
