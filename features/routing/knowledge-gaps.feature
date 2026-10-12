Feature: Divlab sends a knowledge gap to Research
  So that a role missing knowledge gets it from research instead of guessing,
  Divlab turns a reported knowledge gap into a Research task for the module.

  Research comes first: what is learnt may change how anything else reported is fixed.

  Scenario Outline: A knowledge gap makes a Research task ready
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict, reporting a knowledge gap
    Then the only task ready for "parser" is a Research task

    Examples:
      | role          |
      | Architecture  |
      | Specification |
      | Test          |
      | Coding        |

  Scenario: Research comes before anything else reported
    Given a project with a module "parser"
    When a member's Specification work on "parser" is accepted with a fail verdict, reporting an upstream ambiguity and a knowledge gap
    Then the only task ready for "parser" is a Research task
