# CLAUDE.md — Claude Code Instructions

This project uses the `qa-agents` Claude Code plugin for requirement → test
case → spec automation, plus healing/compliance/quality loops. The plugin
supplies the commands and agents below — nothing to install per-project
beyond running `/qa-agents:init` once (already done if this file exists).

---

## 1. Commands — When to Invoke

| User intent | Command |
|---|---|
| Raw requirement → test cases → spec, end to end | `/qa-agents:implement-requirement` |
| Convert an existing TC markdown file → Playwright spec | `/qa-agents:implement-script` |
| Fix a failing spec, diagnose a flake | `/qa-agents:implement-fix-script` |
| Re-scan conventions / re-scaffold (run again after conventions change) | `/qa-agents:init` |

Each command orchestrates a set of specialized agents — `dom-inspector`,
`spec-runner`, `pom-discoverer`, `pom-author`, `code-fixer`,
`compliance-checker`, `spec-evaluator`, `planner`, `knowledge-retriever`,
`test-designer`, `reviewer`, `test-case-writer`. These ship with the plugin
itself, not this repo — nothing to read or maintain here for them.

---

## 2. Project Conventions

This project's actual conventions (POM directory, spec directory,
test-case directory, spec/POM style rules, lint command, RAG collection,
test header format) are recorded in:

- `.claude/qa-agents.config.json` — machine-readable, read by every agent
  above.
- `.claude/docs/framework-rules.md` — human-readable detail, if written.
- `.claude/docs/intent-mapping.md` — intent → POM method mapping, if
  written.

TODO(init): if these files don't exist yet, run `/qa-agents:init` before
relying on this project for anything test-automation related — it fills
them in from the project's real conventions instead of guessing.

---

## 3. Project Structure (from this scaffold)

```
src/
├── pages/                 POMs (base.page.ts + one file per page/feature)
├── tests/                 Playwright specs
├── fixtures/               custom.fixture.ts — test.extend wiring, if applicable
├── utils/env.ts            requireEnv() helper
├── auth/                   saved storageState (gitignored) — written by global.setup.ts
├── global.setup.ts         TODO-marked auth starter — replace with the app's
│                           real login flow, or delete if the app needs no auth
└── api/                    REST API layer + models/services — only if the
                            api-k6 layer was scaffolded

k6/                          perf tests (smoke/load/stress) — only if the
                              api-k6 layer was scaffolded
docs/, scripts/rag-cli.ts,
src/rag/, guide/rag-guide.md — RAG ingestion — only if the rag layer was
                              scaffolded
<casesDir from the config>   TC source markdown
```

Not every branch above exists in every project — it depends on which
scaffold layers were actually applied at `/qa-agents:init` time (see
`.claude/qa-agents.config.json` for what's real here).

---

## 4. Reading Local Files

| File type | How to read |
|---|---|
| `.md`, `.txt`, `.ts`, `.json`, `.yml` | `Read` tool directly |
| `.docx` | `Read` can't open binary — use Bash: `node -e "const m = require('mammoth'); m.extractRawText({path: 'FILE.docx'}).then(r => console.log(r.value))"` |
| `.pdf` | `Read` tool supports it — for docs over 10 pages, read in page ranges (max 20 pages per call) |

---

## 5. Common Commands

```bash
npm test                    # all specs, chromium, uat env (default)
npm run test:uat            # explicit uat
npm run test:prod           # prod env
npm run install:browsers    # once per machine

npm run lint                # ESLint over src/
npm run lint:fix
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
npm run rag:query -- "<question>"   # ad-hoc lookup — same query knowledge-retriever runs
```

### RAG-first for domain/requirement questions (rag layer only)

Even outside `/qa-agents:implement-requirement` — e.g. a direct chat
question about a business rule, validation, or navigation path — check the
RAG store before answering from general knowledge:
`npm run rag:query -- "<question>"`, or delegate to the
`knowledge-retriever` agent for a structured verdict. If retrieval returns
nothing relevant, say so explicitly rather than guessing.

---

## 6. Stale-cache Troubleshooting

If a code change doesn't seem to take effect:

1. Verify the file on disk matches your edit (`Read` it back).
2. Clear Playwright's transform cache (OS temp dir, e.g.
   `$TMPDIR/playwright-transform-cache` on macOS/Linux,
   `%TEMP%\playwright-transform-cache` on Windows).
3. If `global.setup.ts` or `playwright.config.ts` changed but the
   Playwright MCP server (`dom-inspector`'s tools) still behaves like the
   old version, restart Claude Code — the MCP server caches modules in
   Node's `require.cache`.

---

TODO(init): everything above is a generic scaffold default. Once
`/qa-agents:init` has scanned this project and confirmed conventions with
you, replace anything still marked TODO(init) and delete this line.
