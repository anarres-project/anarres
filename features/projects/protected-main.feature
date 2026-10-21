Feature: Only Divlab changes a project's main branch
  So that every change to a project has passed Divlab's checks,
  a project is set up so that nobody but Divlab can change its main branch, not even its
  administrators.

  Scenario: A change to main from anyone but Divlab is refused
    Given a project with a module "parser"
    When someone other than Divlab changes the project's main branch directly
    Then the change is refused
