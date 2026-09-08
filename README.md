# qa-agents

A Claude Code plugin: a multi-agent pipeline for Playwright/POM-based UI test
automation — raw requirement → test case → spec, plus heal / compliance /
quality-scorecard loops. Originally extracted from an LDM Back Office test
automation project and generalized to be config-driven instead of hard-coded
to that project's paths and conventions.

## What's in here

```
.claude-plugin/
  plugin.json          plugin manifest
  marketplace.json      self-listing marketplace (this repo IS the marketplace)
agents/                 12 subagents (planner, knowledge-retriever, test-designer,
                         reviewer, test-case-writer, dom-inspector, pom-discoverer,
                         pom-author, spec-runner, code-fixer, compliance-checker,
                         spec-evaluator)
commands/
  init.md               /qa-agents:init — run once per target project first
  implement-requirement.md
  implement-script.md
  implement-fix-script.md
docs/
  framework-rules.template.md   filled in per-project by /qa-agents:init
  intent-mapping.template.md    filled in per-project by /qa-agents:init
  healing-rules.md              app-agnostic P1/P2 playbook, copied as-is
templates/scaffold/             starter framework skeleton /qa-agents:init can
                                 copy into a project that has none yet — see
                                 "Scaffolding a starter framework" below
```

## Install into a project

```
/plugin marketplace add simonpham268/qa-agents
/plugin install qa-agents
```

(Or, while developing locally: point `/plugin marketplace add` at a local
path instead of the GitHub shorthand.)

Then, inside the target project:

```
/qa-agents:init
```

This scans the target project for its actual POM directory, spec directory,
test-case directory, spec/POM style conventions, and lint/RAG commands, then
writes `.claude/qa-agents.config.json` (and optionally
`.claude/docs/framework-rules.md` / `intent-mapping.md`, adapted from the
`docs/*.template.md` files in this plugin). Every other command and agent in
this plugin reads that config instead of assuming any particular project's
layout.

Re-run `/qa-agents:init` whenever the target project's conventions change
materially.

## Scaffolding a starter framework

If the target project has no Playwright/POM framework yet (or is missing
pieces of one), `/qa-agents:init` offers — before it scans anything — to copy
a generic starter skeleton from `templates/scaffold/` into the project, in
four independently-selectable layers: `core` (Playwright config, TS config,
lint, a `.mcp.json` wiring up the `playwright-test` MCP server `dom-inspector`
needs, a generic `CLAUDE.md` starter, base POM class, fixtures, a TODO-marked
auth starter), `allure`
(reporting), `api-k6` (a generic REST API layer + k6 perf tests against the
public Petstore demo), and `rag` (a real vendored two-stage RAG
implementation — `src/rag/` embedder/reranker/vector-stores, a
`scripts/rag-cli.ts` index/query CLI incl. Jira ingestion, and a `docs/`
docs-drop folder — no external tool install required, see below). It always
asks first — **Default** (scaffold every layer with anything missing) or
**Custom** (pick specific layers) — shows what's already present vs.
missing per layer either way, and never overwrites a file that's already
there.

## Then use

```
/qa-agents:implement-requirement    raw requirement -> approved TC -> spec
/qa-agents:implement-script         existing TC markdown -> spec
/qa-agents:implement-fix-script     heal a failing spec
```

## Design notes

- **No plugin-install-time scripting.** Claude Code plugins have no
  postinstall hook — `/qa-agents:init` is a slash command the agent runs
  *inside* the target project, not a shell script that runs automatically on
  install.
- **Config over hard-coding.** `pom-discoverer`, `pom-author`,
  `compliance-checker`, `spec-evaluator`, and `test-case-writer` all read
  `.claude/qa-agents.config.json` at runtime via the normal `Read` tool —
  no special mechanism needed. If the config is missing, they refuse and
  point the caller at `/qa-agents:init` rather than guessing a path.
- **Never invent project-specific facts.** The templates in `docs/` start
  with explicit `{{TODO}}` placeholders and empty "none recorded yet" tables
  rather than plausible-sounding but fabricated examples — same discipline
  the agents themselves follow (`<TODO: confirm ...>` in TCs/specs).

## Status / known gaps (as of first draft)

- Validated once: `claude plugin validate --strict` passes clean, and a fresh
  subagent executing `commands/init.md`'s instructions verbatim against a
  deliberately different fake Playwright project produced a correct,
  non-LDM-biased config. Not yet validated via the live `/plugin
  marketplace add`+`/plugin install`+restart-session+`/qa-agents:init` path
  against a real second project — worth doing before relying on this for a
  team's actual work.
- `knowledge-retriever` is OPTIONAL and targets this project's own vendored
  `npm run rag:query` script (from `/qa-agents:init`'s `rag` scaffold
  layer) — no external tool install required.
  `.claude/qa-agents.config.json`'s `ragCollection` field records whether a
  project has actually indexed docs (set = RAG available, null = skip the
  gap-fill loop in `implement-requirement.md`); `ragQueryCommand` is a
  rarely-needed override for a project using something other than its own
  vendored `rag:query` script — it being `null` does NOT mean "no RAG."
- The `rules.*` flag set in the config is a first pass at "common POM/spec
  style choices" (readonly locators, mandatory step-wrapper, no direct
  page-interaction calls in specs, data-builder threshold) — a project with
  a meaningfully different spec architecture (e.g. Screenplay pattern) may
  need additional flags this version doesn't have yet.
