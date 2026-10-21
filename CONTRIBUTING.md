# Contributing to Anarres

How to get a working copy of Anarres itself. How we work (test-first, trunk-based) is in
[`CLAUDE.md`](CLAUDE.md); where things stand is in [`docs/DEV_LOG.md`](docs/DEV_LOG.md).

## What you need

| Tool | Version | Where it is pinned |
|---|---|---|
| git | any recent | |
| Node.js | 24 LTS | `.nvmrc` (which to install), `engines` in `package.json` (which are accepted) |
| npm | 11, comes with Node 24 | |
| Everything else (TypeScript, Vitest, Cucumber, Biome, Stryker, tsx) | exact versions | `package.json` and `package-lock.json` |

You do not install the other tools globally: `npm ci` installs them, at the locked versions, into
`node_modules/`.

**Node 24 exactly, not newer.** Cucumber refuses to run on Node 25, so `npm ci` refuses it too
(`EBADENGINE`). If your system Node is a different version, use a version manager that reads
`.nvmrc`:

- [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use`
- [fnm](https://github.com/Schniz/fnm): `fnm install && fnm use`
- [Homebrew](https://brew.sh) (macOS): `brew install node@24`, then
  `export PATH="$(brew --prefix node@24)/bin:$PATH"` in the shell you work in. Homebrew does not
  link it over a newer `node`, so it is not used until it comes first on your `PATH`.

or install Node 24 from [nodejs.org](https://nodejs.org/en/download) and put it first on your
`PATH` for this repository.

## Set up

```bash
git clone https://github.com/anarres-project/anarres.git
cd anarres
nvm use          # or your version manager's equivalent
npm ci           # installs the locked tool versions
npm test         # the gate: typecheck, lint, unit and acceptance tests
```

`npm ci` may warn that the install scripts of `esbuild` and `fsevents` were not run. That is
expected: npm 11 holds them back by default, and nothing here needs them.

The other commands (`npm run test:wip`, `npm run mutate` and so on) are listed under "Commands" in
[`CLAUDE.md`](CLAUDE.md) and defined in `package.json`.

## Adding or upgrading a tool

`.npmrc` sets `save-exact=true`, so `npm install -D <tool>` records an exact version. Commit
`package.json` and `package-lock.json` together, and run `npm test` before pushing. Some versions
are held back on purpose; check `docs/decisions/` before upgrading (Vitest, for example: decision
0002).
