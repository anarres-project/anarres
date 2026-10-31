Feature: Divlab may check members' pull requests
  So that members' work keeps reaching Divlab, now that GitHub stops workflows from acting on
  pull requests unless a project allows it, a project is set up to allow Divlab's checks, and
  nothing else.

  @sandbox
  Scenario: A project is set up to let only Divlab check members' pull requests
    Given a project with a module "parser"
    Then only Divlab may check members' pull requests to the project
