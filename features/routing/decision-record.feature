Feature: Divlab records every routing decision
  So that anyone can check why Divlab did what it did,
  Divlab records each routing decision with the work it came from and the rule that decided it.

  Scenario: Passed work is recorded as passed on
    Given a project with a module "parser"
    When a member's Test work on "parser" is accepted with a pass verdict
    Then Divlab records that the Test work on "parser" went to Coding because it passed

  Scenario: Failed work is recorded with the problem that sent it back
    Given a project with a module "parser"
    When a member's Coding work on "parser" is accepted with a fail verdict, reporting test failures and an architecture impediment
    Then Divlab records that the Coding work on "parser" went to Architecture because it reported an architecture impediment

  Scenario: A failure no rule covers is recorded as such
    Given a project with a module "parser"
    When a member's Specification work on "parser" is accepted with a fail verdict
    Then Divlab records that the Specification work on "parser" went to a PDC coordinator because no rule covers it

  Scenario: Completing a module is recorded
    Given a project with modules "parser" and "lexer"
    When a member's Security & Quality work on "parser" is accepted with a pass verdict
    Then Divlab records that the Security & Quality work on "parser" completed the module

  Scenario: The record keeps everything the work reported
    Given a project with a module "parser"
    When a member's Coding work on "parser" is accepted with a fail verdict, reporting test failures and an architecture impediment
    Then Divlab's record of the Coding work on "parser" keeps its feedback signal, its verdict and both problems it reported

  Scenario: The record says when Divlab decided
    Given a project with a module "parser"
    When a member's Test work on "parser" is accepted with a pass verdict
    Then Divlab's record of the Test work on "parser" says when Divlab decided, in UTC
