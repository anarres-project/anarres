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

  # Not in the sandbox: its clock is GitHub's, and nothing can move it on 24 hours.
  @sandbox-wip
  Scenario: A task whose lease ran out goes to a new claim without waiting for Divlab's check
    Divlab's check runs every hour, but GitHub stops a quiet project's scheduled runs, so a claim
    on a task whose lease has run out frees it there and then.

    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And Alice has claimed the Test task for "parser"
    And 25 hours pass without activity on the task
    When Bob claims the Test task for "parser"
    Then the Test task for "parser" is claimed by Bob
    And Alice is told the lease on the task ran out

  # Not in the sandbox: Divlab's hourly check runs on GitHub's schedule, not on cue.
  @sandbox-wip
  Scenario: A task shown as claimed that Divlab never gave anyone is made ready again
    Divlab records each claim before the task shows it, so a task shown as claimed with no claim
    in Divlab's log was changed by someone else. PDC coordinators are told.

    Given a project with a module "parser"
    And a member's Specification work on "parser" was accepted with a pass verdict
    And the Test task for "parser" is shown as claimed by Mallory, though Divlab never gave it to them
    When Divlab checks the project's leases
    Then a Test task for "parser" is ready to claim
    And a PDC coordinator is alerted that the Test task for "parser" was shown as claimed without a claim
