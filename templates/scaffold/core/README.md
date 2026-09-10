# {{APP_SLUG}}

Playwright + TypeScript test automation for this project, scaffolded by the
`qa-agents` Claude Code plugin. `CLAUDE.md` documents the agent workflow;
this file is the plain human-facing setup/run doc.

TODO(init): replace this intro line with a one-sentence description of the
app under test.

## Setup

```bash
npm install
npm run install:browsers   # once per machine — installs Playwright browsers
cp .env.example .env.local # fill in any secrets/credentials it lists
```

`.env.uat` is committed with a placeholder `BASE_URL` — set it to the app's
real UAT URL before running anything.

## Running tests

```bash
npm test               # all specs, chromium, uat env (default)
npm run test:uat       # explicit uat
npm run test:prod      # prod env
```

TODO(init): the blocks below only apply if the matching scaffold layer was
selected — delete whichever doesn't apply to this project.

```bash
# allure layer
npm run allure:generate
npm run allure

# api-k6 layer
npm run test:perf

# rag layer
npm run rag:index                   # index docs/ (default) into the RAG store
npm run rag:query -- "<question>"   # ad-hoc lookup
```

## Linting

```bash
npm run lint
npm run lint:fix
```

## Project structure

```
src/
├── pages/          POMs (base.page.ts + one file per page/feature)
├── tests/          Playwright specs
├── cases/          TC source markdown (default casesDir — see config)
├── utils/env.ts     requireEnv() helper
├── auth/            saved storageState (gitignored)
└── global.setup.ts  auth starter — replace with the app's real login flow,
                      or delete if the app needs no auth
```

Not every branch above exists in every project — see
`.claude/qa-agents.config.json` for which scaffold layers were applied here.

## Working with Claude Code on this project

See `CLAUDE.md` — this project is set up for the `qa-agents` plugin
(`/qa-agents:implement-requirement`, `/qa-agents:implement-script`,
`/qa-agents:implement-fix-script`, and `/qa-agents:implement-rag` if the
`rag` layer was scaffolded). Re-run `/qa-agents:init` any time
conventions change.

---

TODO(init): everything above is a generic scaffold default. Once
`/qa-agents:init` has scanned this project and confirmed conventions with
you, replace anything still marked TODO(init) and delete this line.
