Feature: Human review where PDC coordinators require it
  So that a module PDC coordinators judge needs a person's eye gets one, Divlab merges work on it
  only once a reviewer independent of the work has approved it: a trusted member or a PDC
  coordinator with no part in the module (decision 0016).

  # Each changes the sandbox's governance file, which every scenario there reads, so runs alone.

  @governance
  Scenario: Work on a module PDC coordinators require reviewed waits for a reviewer's approval
    Given a project with a module "parser"
    And PDC coordinators require a reviewer's approval for work on "parser"
    When a member submits Architecture work on "parser" with a pass verdict
    Then Divlab has not merged the member's Architecture work on "parser"
    And the member is told their work waits for a reviewer's approval

  @governance
  Scenario: Work on a module PDC coordinators require reviewed is merged once a trusted member approves it
    Given a project with a module "parser"
    And PDC coordinators require a reviewer's approval for work on "parser"
    And Carol is a trusted member
    And a member submits Architecture work on "parser" with a pass verdict
    When Carol approves the member's Architecture work on "parser"
    Then Divlab has merged the member's Architecture work on "parser"

  @governance
  Scenario: An approval from a member who is not trusted does not count
    Given a project with a module "parser"
    And PDC coordinators require a reviewer's approval for work on "parser"
    And Dave is an established member
    And a member submits Architecture work on "parser" with a pass verdict
    When Dave approves the member's Architecture work on "parser"
    Then Divlab has not merged the member's Architecture work on "parser"

  @governance
  Scenario: An approval from a member with a part in the module does not count
    Given a project with a module "parser"
    And Carol is a trusted member
    And Carol's Architecture work on "parser" was accepted with a pass verdict
    And PDC coordinators require a reviewer's approval for work on "parser"
    And a member submits Specification work on "parser" with a pass verdict
    When Carol approves the member's Specification work on "parser"
    Then Divlab has not merged the member's Specification work on "parser"

  @governance
  Scenario: Divlab alerts PDC coordinators, once, when it cannot read which modules need review
    Given a project with modules "parser" and "lexer"
    And the list of modules PDC coordinators require reviewed cannot be read
    When a member submits Architecture work on "parser" with a pass verdict
    And a member submits Architecture work on "lexer" with a pass verdict
    Then Divlab has not merged the member's Architecture work on "parser"
    And PDC coordinators have been alerted once that the list of modules needing review cannot be read

  # Not in the sandbox: GitHub runs the project's tests at once, and nothing holds them on cue.
  @governance @sandbox-wip
  Scenario: A reviewer who asks for changes after approving has withdrawn their approval
    Given a project with a module "parser"
    And PDC coordinators require a reviewer's approval for work on "parser"
    And Carol is a trusted member
    And a member submits Coding work on "parser" whose tests are still running
    And Carol approves the member's Coding work on "parser"
    And Carol asks for changes to the member's Coding work on "parser"
    When the project's tests pass on the member's Coding work on "parser"
    Then Divlab has not merged the member's Coding work on "parser"
