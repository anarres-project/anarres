Feature: Coding work passes the project's own tests
  So that code reaches a project only once it passes the module's tests, Divlab merges Coding work
  only when the project's own check has passed on it. Divlab never runs a project's code: the
  project's own check does, and Divlab reads its result (decision 0010).

  Scenario: Coding work whose tests fail is not merged, and the member is told why
    Given a project with a module "parser"
    When a member submits Coding work on "parser" whose tests fail
    Then Divlab has not merged the member's Coding work on "parser"
    And the member is told the project's tests failed on their work

  # Not in the sandbox: GitHub runs the project's tests at once, and nothing holds them on cue.
  @sandbox-wip
  Scenario: Coding work is not merged while the project's tests are still running
    Given a project with a module "parser"
    When a member submits Coding work on "parser" whose tests are still running
    Then Divlab has not merged the member's Coding work on "parser"
    And the member has been told nothing about their work yet

  # Not in the sandbox: GitHub runs the project's tests at once, and nothing holds them on cue.
  # Every Coding work merged in the sandbox is merged once its tests pass.
  @sandbox-wip
  Scenario: Coding work is merged once the project's tests pass on it
    Given a project with a module "parser"
    And a member submits Coding work on "parser" whose tests are still running
    When the project's tests pass on the member's Coding work on "parser"
    Then Divlab has merged the member's Coding work on "parser"
