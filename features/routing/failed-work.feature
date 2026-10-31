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

    # The rest of the table: in-process only, as one row shows the rule against GitHub.
    Examples:
      | role          | revising role       |
      | Coding        | Specification       |
      | Specification | Programme Architect |
      | Architecture  | Programme Architect |

  Scenario Outline: An architecture impediment goes back to Architecture
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict, reporting an architecture impediment
    Then the only task ready for "parser" is an Architecture task

    Examples:
      | role          |
      | Architecture  |

    # The rest of the table: in-process only, as one row shows the rule against GitHub.
    Examples:
      | role          |
      | Specification |
      | Coding        |

    # A review or security check finding the architecture at fault (Bernard, 2026-10-29).
    Examples:
      | role               |
      | Reviewer           |
      | Security & Quality |

  Scenario: Failing tests send the code back to Coding
    Given a project with a module "parser"
    When a member's Coding work on "parser" is accepted with a fail verdict, reporting test failures
    Then the only task ready for "parser" is a Coding task

  Scenario Outline: A failed review or security check sends the code back to Coding
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict
    Then the only task ready for "parser" is a Coding task

    Examples:
      | role               |
      | Reviewer           |

    # The rest of the table: in-process only, as one row shows the rule against GitHub.
    Examples:
      | role               |
      | Security & Quality |

  Scenario Outline: A failed review or security check goes to Coding
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict, reporting an implementation impediment
    Then the only task ready for "parser" is a Coding task

    Examples:
      | role               |
      | Reviewer           |

    # The rest of the table: in-process only, as one row shows the rule against GitHub.
    Examples:
      | role               |
      | Security & Quality |

  Scenario: A review that finds a gap in scope goes to the Programme Architect
    Given a project with a module "parser"
    When a member's Reviewer work on "parser" is accepted with a fail verdict, reporting a scope gap
    Then the only task ready for "parser" is a Programme Architect task

  Scenario Outline: A contract that does not work goes to the Programme Architect
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict, reporting an interface impediment
    Then the only task ready for "parser" is a Programme Architect task

    Examples:
      | role               |
      | Architecture       |

    # The rest of the table: in-process only, as one row shows the rule against GitHub.
    Examples:
      | role               |
      | Specification      |
      | Test               |
      | Coding             |
      | Reviewer           |
      | Security & Quality |

  Scenario: A contract problem never goes to the module on the other side of the contract
    Given a project with modules "parser" and "ledger"
    When a member's Test work on "parser" is accepted with a fail verdict, reporting an interface impediment
    Then the only task ready for "parser" is a Programme Architect task
    And the only task ready for "ledger" is an Architecture task

  Scenario: Blocked work goes back just as failed work does
    Given a project with a module "parser"
    When a member's Test work on "parser" is accepted with a blocked verdict, reporting an upstream ambiguity
    Then the only task ready for "parser" is a Specification task

  Scenario Outline: Several problems go back to the most upstream role that owns one
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict, reporting <first> and <second>
    Then the only task ready for "parser" is a <revising role> task

    Examples:
      | role          | first                 | second                     | revising role       |
      | Specification | an upstream ambiguity | an architecture impediment | Programme Architect |

    # The rest of the table: in-process only, as one row shows the rule against GitHub.
    Examples:
      | role          | first                 | second                     | revising role       |
      | Coding        | test failures         | an architecture impediment | Architecture        |

    Examples: interface impediments
      | role          | first                      | second                  | revising role       |
      | Coding        | an architecture impediment | an interface impediment | Programme Architect |

  Scenario: A failure that reports no problem is never guessed at
    Given a project with a module "parser"
    When a member's Specification work on "parser" is accepted with a fail verdict
    Then a PDC coordinator is alerted
    And no task is ready for "parser"

  Scenario Outline: A problem that no rule covers is never guessed at
    Given a project with a module "parser"
    When a member's <role> work on "parser" is accepted with a fail verdict, reporting <problem>
    Then a PDC coordinator is alerted
    And no task is ready for "parser"

    Examples:
      | role          | problem                      |
      | Test          | an architecture impediment   |

    # The rest of the table: in-process only, as one row shows the rule against GitHub.
    Examples:
      | role          | problem                      |
      | Test          | test failures                |
      | Specification | an implementation impediment |

  @sandbox
  Scenario: A revision task carries the feedback signal that sent the work back
    Given a project with a module "parser"
    When a member's Test work on "parser" is accepted with a fail verdict, reporting an upstream ambiguity
    Then the Specification task for "parser" carries the feedback signal from the Test work
