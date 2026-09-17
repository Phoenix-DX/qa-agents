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
agents/                 13 subagents (planner, knowledge-retriever, ac-reviewer,
                         test-designer, case-reviewer, test-case-writer,
                         dom-inspector, pom-discoverer, pom-author, spec-runner,
                         code-fixer, compliance-checker, spec-evaluator)
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
/plugin marketplace add UBT-global-software/qa-agents
/plugin install qa-agents
```

(Or, while developing locally: point `/plugin marketplace add` at a local
path instead of the GitHub shorthand.)

Then, inside the target project:

```
/qa-agents:init
```

This scans the target project for its actual POM directory, spec directory,
test-case directory, spec/POM style conventions, and lint command, and tries
to map the project to its entry in UBT's Cortex knowledge graph, then
writes `.claude/qa-agents.config.json` (and optionally
`.claude/docs/framework-rules.md` / `intent-mapping.md`, adapted from the
`docs/*.template.md` files in this plugin). Every other command and agent in
this plugin reads that config instead of assuming any particular project's
layout.

Re-run `/qa-agents:init` whenever the target project's conventions change
materially.

## Updating the plugin

```
/plugin marketplace update qa-agents-marketplace   # refresh the marketplace catalog
/plugin update qa-agents                           # update the installed plugin to the version the catalog now lists
```

Run both — `marketplace update` alone only refreshes the catalog, it
doesn't touch what's actually installed; `plugin update` alone won't find
anything new until the catalog has been refreshed first. Then run
`/reload-plugins`, or start a new Claude Code session, for the update to
actually take effect. If `plugin.json`'s version wasn't bumped in the
change you're expecting, `/plugin update` will see nothing new and no-op —
that's expected, not a bug.

## Scaffolding a starter framework

If the target project has no Playwright/POM framework yet (or is missing
pieces of one), `/qa-agents:init` offers — before it scans anything — to copy
a generic starter skeleton from `templates/scaffold/` into the project, in
three independently-selectable layers: `core` (Playwright config, TS config,
lint, a `.mcp.json` wiring up the `playwright-test` MCP server `dom-inspector`
needs, a generic `CLAUDE.md` starter, base POM class, fixtures, a TODO-marked
auth starter), `allure`
(reporting), and `api-k6` (a generic REST API layer + k6 perf tests against the
public Petstore demo). It always asks first — **Default** (scaffold every
layer with anything missing) or **Custom** (pick specific layers) — shows
what's already present vs. missing per layer either way, and never
overwrites a file that's already there.

### Knowledge lookup via Cortex KG

Requirement/business-rule gap-filling (`knowledge-retriever`, used inside
`/qa-agents:implement-requirement`) is backed by UBT's **Cortex** knowledge
graph — a company-wide, centrally-maintained index of Jira/Confluence/code
across every UBT product, reached via MCP tools already available in a
Claude Code session with Cortex configured. There's nothing to scaffold or
install per-project for this: no npm package, no local vector store, no
registry token.

`/qa-agents:init` tries to map the target project to its Cortex canonical
project key (e.g. `LDM`) and records it as `cortexProject` in
`.claude/qa-agents.config.json`. A confirmed mapping still doesn't guarantee
results — Cortex access is **entitlement-gated per identity**: a KB steward
has to grant the calling account read access to that project's sources
before `search_knowledge_base`/`get_feature`/etc. return anything instead of
an access-denied verdict. There's no local indexing step a QA engineer
triggers — Cortex's own ingestion pipeline owns that.

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
- `knowledge-retriever` is OPTIONAL and queries UBT's Cortex knowledge graph
  via MCP tools already available in the Claude Code session — no
  per-project install required. `.claude/qa-agents.config.json`'s
  `cortexProject` field records the canonical Cortex project key
  `/qa-agents:init` mapped this project to (set = Cortex lookups attempted,
  null = skip the gap-fill loop in `implement-requirement.md`). A non-null
  `cortexProject` does not guarantee results — Cortex access is
  entitlement-gated per identity, and `knowledge-retriever` reports
  `NO_ACCESS` distinctly from an empty/`INSUFFICIENT` result when the
  calling identity hasn't been granted read access.
- The `rules.*` flag set in the config is a first pass at "common POM/spec
  style choices" (readonly locators, mandatory step-wrapper, no direct
  page-interaction calls in specs, data-builder threshold) — a project with
  a meaningfully different spec architecture (e.g. Screenplay pattern) may
  need additional flags this version doesn't have yet.
