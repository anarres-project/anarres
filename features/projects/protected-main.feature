Feature: Only Divlab changes a project's main branch
  So that every change to a project has passed Divlab's checks,
  a project is set up so that nobody but Divlab can change its main branch, not even its
  administrators.

  Scenario: A change to main from anyone but Divlab is refused
    Given a project with a module "parser"
    When someone other than Divlab changes the project's main branch directly
    Then the change is refused

  Scenario: Work that reaches main without Divlab merging it is never routed
    Given a project with a module "parser" whose main branch was left unprotected
    When a member's Specification work on "parser" reaches main without Divlab merging it
    Then no task is ready for "parser"
    And a PDC coordinator is alerted that the Specification work on "parser" reached main without Divlab merging it

  Scenario: Divlab alerts PDC coordinators, once, when a project's main branch is not protected
    Given a project with a module "parser" whose main branch was left unprotected
    When a member submits Specification work on "parser" with a pass verdict
    And a member submits Test work on "parser" with a pass verdict
    Then PDC coordinators have been alerted once that the project's main branch is not protected

  # Not yet in the sandbox: it has not passed there yet.
  @sandbox-wip
  Scenario: A change reaching main without Divlab, feedback signal or not, is noticed
    Each Divlab run checks every change to main since its last look: GitHub shows who made each,
    and Divlab knows its own merges from its records.

    Given a project with a module "parser" whose main branch was left unprotected
    And a member's Specification work on "parser" was accepted with a pass verdict
    And someone other than Divlab changes the project's main branch directly
    When a member submits Test work on "parser" with a pass verdict
    Then a PDC coordinator is alerted that a change reached main without Divlab

  Scenario: Divlab's own changes to main raise no alarm
    Given a project with a module "parser"
    When a member's Specification work on "parser" is accepted with a pass verdict
    And a member's Test work on "parser" is accepted with a pass verdict
    Then no PDC coordinator is alerted that a change reached main without Divlab
