Feature: Divlab posts the next task
  So that a module's pipeline keeps moving without anyone routing it by hand,
  Divlab turns each piece of accepted work into a task for the next role.

  A module's pipeline runs Architecture, Specification, Test, Coding, Reviewer,
  then Security & Quality.

  Scenario Outline: Passed work makes the next role's task ready
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a pass verdict
    Then a <next role> task for "parser" is ready to claim

    Examples:
      | role          | next role |
      | Specification | Test      |

    @wip
    Examples:
      | role         | next role          |
      | Architecture | Specification      |
      | Test         | Coding             |
      | Coding       | Reviewer           |
      | Reviewer     | Security & Quality |
