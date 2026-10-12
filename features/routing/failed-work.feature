Feature: Divlab sends failed work back to the role that can fix it
  So that a problem is fixed where it started, instead of being passed down the pipeline,
  Divlab turns a failed piece of work into a revision task for the role that owns the problem.

  A module's requirements come from the Programme Architect's requirement slice, so an
  ambiguity in them goes to the Programme Architect.

  Scenario Outline: An upstream ambiguity goes back to the role that owns the ambiguous artefact
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict, reporting an upstream ambiguity
    Then the only task ready for "parser" is a <revising role> task

    Examples:
      | role          | revising role       |
      | Test          | Specification       |
      | Specification | Programme Architect |
      | Architecture  | Programme Architect |
