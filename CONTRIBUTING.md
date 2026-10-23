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

## The GitHub sandbox

`npm run test:acceptance:sandbox` runs the acceptance tests against real repositories in a
dedicated sandbox organisation. Each run creates its repositories and deletes them at the end.
What a run does and checks is in [`docs/SANDBOX.md`](docs/SANDBOX.md). It
needs four values, from a git-ignored `.env` locally, or from the `sandbox` environment in CI:

- `ANARRES_SANDBOX_ORG`: the sandbox organisation's name;
- `ANARRES_SANDBOX_TOKEN`: a fine-grained personal access token whose resource owner is that
  organisation, with access to all its repositories (the tests create new ones), and these
  repository permissions:
  - read and write: administration, contents, issues, pull requests, workflows (the tests install
    the project template's workflow);
  - read: actions (the tests watch Divlab's runs), metadata;
- `ANARRES_SANDBOX_MEMBERS_ORG` (a variable in CI): a second sandbox organisation, playing the
  members, where the tests fork each project and push members' work;
- `ANARRES_SANDBOX_MEMBERS_TOKEN` (a secret in CI): a fine-grained personal access token whose
  resource owner is that organisation, with access to all its repositories, and these repository
  permissions: read and write for administration (to make and delete forks) and contents (to push
  work); read for metadata. Nothing else: it cannot act on the sandbox organisation itself.

- `ANARRES_SANDBOX_SECOND_MEMBER_TOKEN` (a secret in CI): a fine-grained personal access token of
  a second GitHub account, a member of the sandbox organisation, so the tests can play a second
  member. Its resource owner is the sandbox organisation, with access to all its repositories,
  and these repository permissions: read and write for issues (to claim) and pull requests (to
  submit work); read for metadata. The sandbox's own token plays a scenario's first member, this
  one its second; a scenario with more members is not run in the sandbox.

The sandbox's projects read members' trust levels from a governance file of the sandbox's own,
never from this repository's: an organisation variable, `ANARRES_GOVERNANCE`, names the
repository in the sandbox organisation that holds `governance/members.json` (decision 0007). Not
set up yet; until it is, the trust-level scenarios run in-process only.

The sandbox organisation itself needs, under Settings → Actions → General:

- Actions enabled for all repositories;
- actions from `anarres-project/anarres/*` allowed (Divlab is one);
- workflow permissions left read-only by default: the template's workflow asks for what it needs.

Divlab merges as its own GitHub App (decision 0006). The sandbox's App is **Divlab Sandbox**
(its App ID is in the sandbox driver, which sets each repository up with it), owned by and installed on the sandbox
organisation only, for all its repositories. Its repository permissions: read and write for
contents, issues and pull requests; read for metadata; none for workflows. The organisation holds
its Client ID as the Actions variable `DIVLAB_APP_CLIENT_ID` (the template's workflows read it;
GitHub's token action no longer takes the App ID) and its private key as the Actions secret
`DIVLAB_APP_PRIVATE_KEY`. The key lives nowhere else.

Each project repository gets, when it is set up, an Actions policy allowing `pull_request_target`
for Divlab's pull request workflow only (decision 0006, addendum): GitHub blocks that event on
public repositories otherwise. The sandbox driver sets each sandbox repository up the same way,
with the sandbox token's administration permission. The `anarres-sandbox` organisation also has
an organisation policy to the same effect ("Divlab pull requests"); GitHub does not enforce
organisation policies on the Free plan, so it is only a fallback.

The members' organisation needs Actions disabled (Settings → Actions → General → Disabled):
nothing runs in members' forks; Divlab runs only in the project's repository.

Never point these at any other organisation: automated tests touch only the two sandbox
organisations.

## Adding or upgrading a tool

`.npmrc` sets `save-exact=true`, so `npm install -D <tool>` records an exact version. Commit
`package.json` and `package-lock.json` together, and run `npm test` before pushing. Some versions
are held back on purpose; check `docs/decisions/` before upgrading (Vitest, for example: decision
0002).
