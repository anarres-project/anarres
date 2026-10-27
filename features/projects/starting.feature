Feature: A new project starts with a task for each module
  So that all work is done for a task a member holds, a project's modules start with their first
  task ready: Specification, the first role in a module's pipeline.

  @wip
  Scenario: A new project has a Specification task ready for its module
    Given a project with a module "parser"
    Then the only task ready for "parser" is a Specification task
