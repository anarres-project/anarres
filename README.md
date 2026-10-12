# Anarres

An open commons where volunteers pool their spare Claude capacity to build software too large, or too important, for one person and one Claude session to do well alone.

Anarres runs [Collective Software Development (CSD)](https://github.com/bernardSolar/csd) across many people's machines. Each member runs one Claude Code session in one role (Requirements, Architecture, Specification, Test, Coding, Review and so on) on their own computer. Agents never talk to each other: all coordination happens through artefacts committed to GitHub. **Divlab**, a deterministic routing service, posts tasks; members claim the ones they choose.

The name comes from the anarchist moon world in Ursula K. Le Guin's *The Dispossessed*, where Divlab posts the work that needs doing and people volunteer for it.

## Status

Walking skeleton: the first routing scenario runs end to end in the test harness. Nothing for
members to install yet.

For contributors: Node.js 24 (see `.nvmrc`), then `npm install` and `npm test`.

- [Concept document](docs/Anarres_Concept.md): architecture, roles, safety governance, scaling plan and roadmap

## Licence

[AGPL-3.0](LICENSE). Projects built on Anarres choose their own licences.
