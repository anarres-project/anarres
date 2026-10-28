Feature: A new project starts with its Programme Architect's task, and each module with its own
  So that all work is done for a task a member holds, a project starts with one task: the
  Programme Architect's, who decides its modules in modules.yaml. Each module then starts with
  its first task ready: Architecture, the first role in a module's pipeline (decision 0013).

  Scenario: A new project starts with a Programme Architect task for the programme
    Given a new project is started
    Then the only task ready is a Programme Architect task for the programme

  Scenario: The Programme Architect's modules start once its work is merged
    Given a new project is started
    When a member's Programme Architect work for the programme was accepted, listing the modules "parser" and "lexer"
    Then the only task ready for "parser" is an Architecture task
    And the only task ready for "lexer" is an Architecture task

  Scenario: A new project has an Architecture task ready for its module
    Given a project with a module "parser"
    Then the only task ready for "parser" is an Architecture task
