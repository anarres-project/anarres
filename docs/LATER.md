# Later

Ideas beyond current scope. Discuss before building.

- **Dogfooding.** Once Divlab and the plugin work, build later Anarres features as an Anarres
  project, with volunteer members in CSD roles.
- **Site.** Sign-up, proposals, project browser, dashboards (concept document, Phase 3). Choose the
  framework in a decision record when work starts.
- **Programme-level decomposition.** Programme Architect, interface contracts, integration
  pipeline (concept document, Phase 2).
- **Private mode.** Layer-per-repository visibility for security-sensitive projects (§12).
- **Research instrumentation.** State space metrics dashboards and corpus export (Phase 5).
- **Optional escalation diagnosis by Claude**, opt-in per project, paid from an organisation key.
- **Chat notifications** (e.g. Discord) announcing new tasks.
- **Tasks in a cloud sandbox.** Claude Code's cloud sessions (and Projects' cloud threads) run in
  an isolated sandbox away from the member's own machine, which could suit roles that run code
  written by strangers better than a local dev container. Open question first: whether the
  plugin's protections take effect there, since cloud sessions do not run a repository's own
  hooks or settings. Investigate before relying on it.
- **Interference in public project repositories.** Anyone can open issues, comment and open pull
  requests in a public repository, so outsiders could add noise to a real project's tasks and
  discussions, or try to disturb its work. Revisit once the basic system works: decide what an
  outsider may do in a project repository (GitHub's interaction limits are one tool) and which
  inputs Divlab and the plugin act on only from members (Bernard, 2026-10-21). The sandbox's
  repositories hold only synthetic data, so they are left open for now.
- **Scaling on GitHub.** With thousands of members across many projects (Bernard, 2026-10-21):
  - Divlab as a **GitHub App**, GitHub's route for automation at volume, whose rate limits grow
    with the repositories using it, in place of each project's own token;
  - **Actions concurrency** is per organisation (about 20 jobs at once on Free), shared by every
    project's Divlab runs: a paid plan, or projects in their own organisations;
  - a **published task index** (a file Divlab writes, or the site) for the plugin to read, since
    GitHub's search allows few requests a minute and its index lags;
  - very busy projects split into several repositories (concept, scaling table), since one Divlab
    run at a time caps a project at roughly 150 to 180 merges an hour;
  - talk to GitHub (open source programmes, acceptable use) before volume makes it urgent.
