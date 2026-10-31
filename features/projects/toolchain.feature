Feature: A project declares its toolchain
  So that every project's own tests can run, whatever its language, a project declares its
  toolchain: the image its tests run in, and the command that runs them. Divlab starts no project
  that does not (concept §7, decision 0010).

  @sandbox
  Scenario: A project that declares no toolchain is not started
    When a project with a module "parser" is started without declaring its toolchain
    Then the project is not started, and whoever started it is told it declares no toolchain, so no task for "parser" is ready
