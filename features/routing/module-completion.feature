Feature: Divlab marks a module done
  So that PDC coordinators and members can see which parts of a project are finished,
  Divlab marks a module done when its last check passes, and posts no further task for it.

  Scenario Outline: A passed security and quality check completes the module
    Given a project with a module "parser"
    When a member's Security & Quality work on "parser" is accepted with a <verdict> verdict
    Then the module "parser" is done
    And no task is ready for "parser"

    Examples:
      | verdict          |
      | pass             |
      | conditional pass |

  Scenario: A module is not done before its security and quality check
    Given a project with a module "parser"
    When a member's Reviewer work on "parser" is accepted with a pass verdict
    Then the module "parser" is not done
