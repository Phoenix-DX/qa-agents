# {{APP_SLUG}}

TODO(init): replace this intro line with a one-sentence description of the
app under test — mention POM/locator discipline, the API layer, the
RAG-backed requirement pipeline, and k6 perf tests only if the matching
scaffold layer (`api-k6`, `rag`) was actually selected; delete the rest.

---

## Install Claude Code CLI

**macOS / Linux / WSL:**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://claude.ai/install.ps1 | iex
```

**Any platform (via npm, requires Node.js):**

```bash
npm install -g @anthropic-ai/claude-code
```

Verify with `claude --version`, then run `claude` from the repo root to
start a session.

---

## Install the `qa-agents` Claude Code plugin

If it's not already installed in your Claude Code session, add the
marketplace and install the plugin once per machine:

```
/plugin marketplace add Phoenix-DX/qa-agents
/plugin install qa-agents@qa-agents-marketplace
```

After that, nothing else to install per-project beyond `/qa-agents:init`
once (already done if `.claude/qa-agents.config.json` exists — see
[Working with Claude Code](#working-with-claude-code) below).

### Updating the plugin

```
/plugin marketplace update qa-agents-marketplace   # refresh the marketplace catalog
/plugin update qa-agents                           # update the installed plugin to the version the catalog now lists
```

Run both — `marketplace update` alone only refreshes the catalog, it
doesn't touch what's actually installed; `plugin update` alone won't find
anything new until the catalog has been refreshed first. Then run
`/reload-plugins`, or start a new Claude Code session, for the update to
actually take effect.

---

## Quick start

```bash
# 1. Install
npm install
npm run install:browsers          # one-time per machine

# 2. Configure secrets (one-time)
cp .env.example .env.local        # then fill credentials

# 3. Run tests
npm test                          # all specs, chromium, uat env (default)
npm run test:uat | test:prod
```

TODO(init): the block below only applies if the `allure` layer was
selected — delete it otherwise.

```bash
# 4. Reports (requires a Java runtime on PATH for the Allure CLI)
npm run allure                    # generate + open Allure
```

---

## Repo structure

```
.
├─ .claude/
│  ├─ qa-agents.config.json     # POM/spec/cases dirs, style rules, lint command — read by every agent
│  └─ docs/                     # framework-rules.md, intent-mapping.md, healing-rules.md
├─ src/
│  ├─ pages/                    # POMs (base.page.ts + one file per page/feature)
│  ├─ tests/                    # *.spec.ts
│  ├─ cases/                    # TC source markdown (default casesDir — see config)
│  ├─ fixtures/                 # custom.fixture.ts — test.extend wiring, if applicable
│  ├─ utils/env.ts              # requireEnv() helper
│  ├─ auth/                     # saved storageState (gitignored) — written by global.setup.ts
│  └─ global.setup.ts           # TODO-marked auth starter — replace with the app's real login flow, or delete if the app needs no auth
├─ .mcp.json                    # playwright-test MCP server (dom-inspector's tools)
├─ CLAUDE.md                    # Claude Code instructions (auto-loaded)
├─ package.json
└─ playwright.config.ts
```

TODO(init): not every branch above exists in every project — `src/api/`
+ `k6/` (perf tests) only exist if the `api-k6` layer was scaffolded;
`docs/`, `guide/rag-guide.md`, `.rag/store.sqlite`, and `.npmrc` only
exist if the `rag` layer was scaffolded. See
`.claude/qa-agents.config.json` for what's real here.

---

## Working with Claude Code

This repo relies on the `qa-agents` Claude Code plugin (see
[Install the `qa-agents` Claude Code plugin](#install-the-qa-agents-claude-code-plugin)
above) — nothing to install per-project beyond `/qa-agents:init` once
(already done if `.claude/qa-agents.config.json` exists).

| Slash | When | What it does |
|---|---|---|
| `/qa-agents:implement-requirement` | Raw requirement → test cases → spec, end to end | `planner` assesses context sufficiency, gap-fills via `knowledge-retriever` (RAG) or escalates to a human, `test-designer` + `reviewer` draft/critique test cases, human approves, `test-case-writer` produces the TC markdown, then hands off to `implement-script` |
| `/qa-agents:implement-script <tc>.md` | Convert a TC → Playwright spec | `pom-discoverer` finds existing POM methods, `dom-inspector` inspects live DOM for locators, `pom-author` extends POMs if needed, spec is generated and confirmed via `spec-runner` |
| `/qa-agents:implement-fix-script <spec>.ts` | Fix a failing spec, diagnose a flake | `spec-runner` classifies the failure (P1.1-P1.4 execution or P2.x compliance), `code-fixer` applies the matched fix, re-run to confirm |
| `/qa-agents:implement-rag` (only if the `rag` layer was scaffolded) | Index new knowledge into the RAG store | Resolves the source (`docs/` folder by default, or a Jira/Confluence URL), runs `npm run rag:index`, reports what was indexed |
| `/qa-agents:init` | Re-scan conventions / re-scaffold | Run again after conventions change |

Full breakdown of every agent, framework rules, and the RAG pipeline lives
in [`CLAUDE.md`](CLAUDE.md) and:
- [`.claude/docs/framework-rules.md`](.claude/docs/framework-rules.md) — spec discipline, POM, locators, login, API services, naming
- [`.claude/docs/intent-mapping.md`](.claude/docs/intent-mapping.md) — natural language → POM method mapping
- [`.claude/docs/healing-rules.md`](.claude/docs/healing-rules.md) — priority-ordered healing playbook

---

## Common commands

```bash
# Tests — by env
npm test                                              # all specs, chromium, uat env (default)
npm run test:uat | test:prod
npx playwright test src/tests/<file>.spec.ts          # single file
npx playwright test --grep "TC001" --workers=1        # single test, sequential
npx playwright test --headed                          # headed mode
npx playwright test --debug                           # inspector

# Lint
npm run lint                                           # ESLint check over src/
npm run lint:fix

# Browser install (once per machine)
npm run install:browsers
```

TODO(init): the blocks below only apply if the matching scaffold layer
was selected — delete whichever doesn't apply to this project.

```bash
# allure layer
npm run allure:generate                               # build Allure HTML
npm run allure                                        # generate + open

# api-k6 layer
npm run test:perf                                      # smoke + load + stress
npm run test:perf:smoke | test:perf:load | test:perf:stress
npm run perf:report                                    # open k6 HTML report

# rag layer (backs knowledge-retriever / implement-requirement)
npm run rag:index                                      # index docs/ into the configured collection
npm run rag:query -- "<question>"                      # ad-hoc lookup
```

---

## Environment variables

### Public config — committed in `.env.{uat,prod}`

| Variable | Purpose |
|---|---|
| `BASE_URL` | App base URL for the target environment |

### Secrets — NOT committed

Schema lives in [`.env.example`](.env.example). `.env.local` is gitignored;
`dotenv` merges it on top of `.env.{environment}` automatically.

```bash
cp .env.example .env.local      # then fill credentials for whichever env(s) you test locally
```

TODO(init): replace this table with the app's real credential variables —
this is only a placeholder shape (one row per env pair).

| Variable | Purpose |
|---|---|
| `APP_ADMIN_USERNAME_UAT` / `APP_ADMIN_PASSWORD_UAT` | Login used by `global.setup.ts` when `ENVIRONMENT=uat` |
| `APP_ADMIN_USERNAME_PROD` / `APP_ADMIN_PASSWORD_PROD` | Same, for `ENVIRONMENT=prod` |
| `JIRA_EMAIL` / `JIRA_API_TOKEN` (only if the `rag` layer was scaffolded) | Only needed for `npm run rag:index -- --url=<jira-or-confluence-url>` (Atlassian API token, not your account password) |

**CI:** add the same vars as repo secrets. The pipeline injects them as job
env, and the pair matching the selected environment is the one actually
used.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Code change doesn't seem to take effect | Verify the file on disk matches your edit, then clear Playwright's transform cache (`$TMPDIR/playwright-transform-cache` on macOS/Linux) |
| `global.setup.ts` still behaves like the old version after editing it or `playwright.config.ts` | Restart Claude Code — the MCP server (`dom-inspector`'s tools) caches modules in `require.cache` |
| `knowledge-retriever` returns `RAG_UNAVAILABLE` (only if the `rag` layer was scaffolded) | Nothing indexed yet — drop a doc in `docs/` and run `/qa-agents:implement-rag` |

---

## References

- [Playwright Docs](https://playwright.dev) · [POM](https://playwright.dev/docs/pom) · [Best Practices](https://playwright.dev/docs/best-practices)
- [Claude Code](https://docs.claude.com/en/docs/claude-code)

---

TODO(init): everything above is a generic scaffold default. Once
`/qa-agents:init` has scanned this project and confirmed conventions with
you, replace anything still marked TODO(init) and delete this line.
