Feature: Human review where PDC coordinators require it
  So that a module PDC coordinators judge needs a person's eye gets one, Divlab merges work on it
  only once a reviewer independent of the work has approved it: a trusted member or a PDC
  coordinator with no part in the module (decision 0016).

  @wip
  Scenario: Work on a module PDC coordinators require reviewed waits for a reviewer's approval
    Given a project with a module "parser"
    And PDC coordinators require a reviewer's approval for work on "parser"
    When a member submits Architecture work on "parser" with a pass verdict
    Then Divlab has not merged the member's Architecture work on "parser"
    And the member is told their work waits for a reviewer's approval

  @wip
  Scenario: Work on a module PDC coordinators require reviewed is merged once a trusted member approves it
    Given a project with a module "parser"
    And PDC coordinators require a reviewer's approval for work on "parser"
    And Carol is a trusted member
    And a member submits Architecture work on "parser" with a pass verdict
    When Carol approves the member's Architecture work on "parser"
    Then Divlab has merged the member's Architecture work on "parser"

  @wip
  Scenario: An approval from a member who is not trusted does not count
    Given a project with a module "parser"
    And PDC coordinators require a reviewer's approval for work on "parser"
    And Dave is an established member
    And a member submits Architecture work on "parser" with a pass verdict
    When Dave approves the member's Architecture work on "parser"
    Then Divlab has not merged the member's Architecture work on "parser"

  @wip
  Scenario: An approval from a member with a part in the module does not count
    Given a project with a module "parser"
    And Carol is a trusted member
    And Carol's Architecture work on "parser" was accepted with a pass verdict
    And PDC coordinators require a reviewer's approval for work on "parser"
    And a member submits Specification work on "parser" with a pass verdict
    When Carol approves the member's Specification work on "parser"
    Then Divlab has not merged the member's Specification work on "parser"
