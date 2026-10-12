# 0001: Stack

**Status:** Accepted, 2026-10-12.

**Scope:** the tools used to build Anarres itself. Hosted projects may use any language; see the
concept document, §7, "Any language".

## Context

Anarres has four moving parts: Divlab (a GitHub Action), a CLI that the Claude Code plugin's
commands and hooks call, the plugin itself (Markdown commands, skills and hook configuration), and
later a website on Netlify. Divlab and the CLI share the same domain rules (access scopes,
eligibility, the feedback signal schema), which must be defined once.

## Decision

- **TypeScript (strict) on Node.js 24 LTS** for everything. JavaScript Actions run natively on
  GitHub's runners with no container start-up; one language lets Divlab and the CLI share
  `packages/core`; Netlify supports it directly.
- **npm workspaces** for the monorepo. No extra tooling.
- **Vitest** for unit tests and coverage; **Stryker** for mutation testing. (Vitest is pinned to
  4.1 for Stryker's sake: see decision 0002.)
- **Cucumber.js** for executable specifications, so all drivers sit behind one DSL. **Playwright**
  inside the browser driver when the site exists.
- **Biome** for linting and formatting: one fast tool, little configuration.
- **No database.** GitHub is the store (concept document, §3).

## Alternatives considered

- **Python:** familiar from CSD's scripts, but GitHub Actions would need a container or set-up
  step, and the site would need a second language.
- **Go:** fast, single-binary CLI, but a second language for the site and less natural for Actions.
- **playwright-bdd instead of Cucumber.js:** good for a UI-first product, but most of Anarres is
  driven through GitHub events and a CLI, not a browser.

## Consequences

- The plugin's Markdown commands stay thin and call the `anarres` CLI, so behaviour is testable.
- Divlab is bundled into a single file for the Action runtime; the bundling step is part of the
  pipeline.
