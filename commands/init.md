---
description: Scan this project (offering to scaffold a starter Playwright/POM/TS framework structure first if one isn't there yet) and write .claude/qa-agents.config.json so the other qa-agents commands/agents stop guessing paths and conventions. Run once per project before anything else in this plugin.
---

# Initialize qa-agents for this project

**Trigger when user says** (any language/form): init qa-agents, setup qa-agents, cấu hình qa-agents, khởi tạo cho project này.

---

Run this once per target project, before using `/qa-agents:implement-requirement`, `/qa-agents:implement-script`, or `/qa-agents:implement-fix-script` for the first time — and again any time the project's test-automation conventions change materially (new POM location, new spec style rule, etc.).

You are gathering just enough project-specific fact to make the other agents config-driven instead of guessing. Do not invent an answer to any of these — if you can't find or confirm something, leave it unset in the config and note it as a follow-up for the human, rather than defaulting to this plugin's own examples (e.g. don't default `pomDir` to `src/pages/LDM` — that's this plugin's dogfood project, not the target project).

## Progress reporting

This flow runs many `Glob`/`Read`/`Grep`/`Bash` calls and, when scaffolding,
copies/edits several files. Keep the terminal output clean instead of noisy:

- Right before starting each of the 6 steps below (Step 0 through Step 5),
  print exactly one short progress line and nothing else at that point —
  no file contents, no code snippets, no raw command output:

  ```
  [■■□□□□] Step 2/6 — Confirming conventions with you
  ```

  Fill in the bar (`■`/`□`, one block per step) and the step number/label
  for that step. Use these six labels in order: `Scaffold check`, `Scanning
  conventions`, `Confirming conventions with you`, `Writing config`,
  `Writing framework-rules doc`, `Final report`.
- While scanning (Step 0's detection pass and Step 1), do the Glob/Read/Grep
  work silently — do not paste the file contents, matched snippets, or
  command output you read into the chat. Only turn what you found into a
  short natural-language summary, saved for Step 2/Step 5.
- Full detail (concrete paths, code snippets, the config JSON) still belongs
  in the Step 2 confirmation question and the Step 5 report — this rule only
  suppresses the intermediate scanning noise, not the final content the
  human needs to review.

## Step 0 — Offer to scaffold the framework structure

This plugin ships a generic starter framework skeleton (modeled on a real
Playwright/POM/TS project, generalized) under this plugin's own
`templates/scaffold/` directory, in four independently-selectable layers:

| Layer | Adds |
|---|---|
| `core` | `playwright.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.mcp.json` (the `playwright-test` MCP server `dom-inspector` needs) + `.claude/settings.local.json` (pre-enables it, see Step 0b), `.gitignore`, `.env.example` (secrets template — copy to `.env.local`), `.env.uat` (a real, committed placeholder — only `BASE_URL` needs a working value to run anything), `README.md` (generic human-facing setup/run doc, TODO-marked) + `CLAUDE.md` (generic project-instructions starter), `src/utils/env.ts`, `src/pages/base.page.ts` (shared POM base class), `src/global.setup.ts` + `src/pages/example/login.page.ts` (TODO-marked auth starter), `src/tests/seed.spec.ts` |
| `allure` | Allure reporter wiring in `playwright.config.ts` + `package.json` scripts/deps (config-only, no new source files) |
| `api-k6` | `src/api/{base,config,endpoints,models,services}` (generic sample REST layer) + `k6/` perf-test scaffold (esbuild build, smoke/load/stress against the public Swagger Petstore demo as a runnable placeholder) |
| `rag` | Installs a **private** RAG CLI (e.g. `@phoenix-dx/rag-cli`) as a normal npm dependency — org policy is to never vendor RAG source into a target repo, so this is the only mode this plugin offers. Adds `.npmrc` (registry routing), `guide/rag-guide.md`, `docs/` docs-drop folder + `.gitignore` entries, `package.json` `rag:index`/`rag:query` scripts. Needs the private package's name — see Step 3c |

1. **Detect what's already there** before asking anything: check for
   `playwright.config.ts`, `tsconfig.json`, `.mcp.json`, a POM directory (per
   Step 1's Glob), `allure-playwright` in `package.json`, an `src/api/` or
   `k6/` directory, and `src/rag/` or a `rag:query` script in `package.json`
   (a pre-existing `src/rag/` means a project scaffolded before this plugin
   went private-only — leave it as-is, don't force-migrate it; just treat
   the layer as already present). Build a per-layer present/missing
   picture — don't guess, check the actual filesystem.
2. **Always surface this to the human**, whether the project is empty or
   already has a framework — unless literally everything in all four layers
   is already present, in which case skip straight to step 3b and just state
   that instead of asking a vacuous question. Otherwise ask, via
   `AskUserQuestion` (single-select), how they want to proceed:
   - **Default** — scaffold every layer that has anything missing, using
     this plugin's generic templates as-is (no per-layer picking). Best for
     an empty or near-empty project that just wants the whole starter
     framework.
   - **Custom** — pick exactly which layer(s) to scaffold now.
3. **Resolve which layers to scaffold**, based on the answer to step 2:
   - **3a. If Default** — treat every layer step 1 found not-fully-present
     as selected. Still show what's already present per layer (so the human
     knows it won't be touched) before proceeding — this is a statement, not
     a second question.
   - **3b. If Custom** — ask a second `AskUserQuestion` (multiSelect),
     showing what's already present vs. missing per layer, and let them pick
     zero or more layers to scaffold now.
   - **3c. If `rag` ends up selected** (Default or Custom) and it wasn't
     already present per Step 1's detection: there's no open-vs-private
     question anymore — this plugin only scaffolds the private variant,
     full stop, in both Default and Custom mode. It still needs one piece
     of info that can't be invented: the private package's full name (scope
     + name). Ask it as a normal chat question (free text, not
     `AskUserQuestion` — this isn't a small fixed set), suggesting
     `@phoenix-dx/rag-cli` as the default, and explicitly offering to skip:
     "Tên npm package RAG private của bạn là gì? (mặc định:
     @phoenix-dx/rag-cli — hoặc gõ 'bỏ qua' nếu chưa có token/package sẵn,
     làm sau cũng được)". Derive `{{RAG_PACKAGE_NAME}}` (the full answer)
     and `{{RAG_PACKAGE_SCOPE}}` (the `@scope` segment before `/`) from it —
     `templates/scaffold/rag/ADDITIONS.md` substitutes both, same
     mechanism as `{{APP_SLUG}}`. Skip the question if the project already
     has this layer present (per Step 1) — don't re-ask.
     - **If they skip** (any answer meaning "later" — "bỏ qua", "skip",
       "sau", empty/no answer): drop `rag` from this run's selected layers
       entirely — don't scaffold it, don't write a placeholder package
       name, don't guess. Note in the Step 5 report that RAG was skipped
       and how to add it later: re-run `/qa-agents:init` in Custom mode and
       pick just `rag` once the package name (and eventually the
       `~/.npmrc` token) are ready. This is a normal, expected outcome, not
       an error.
4. **For each selected layer**, copy every file from this plugin's
   `templates/scaffold/<layer>/` into the equivalent path in the target
   project — including dotfiles like `.mcp.json` (don't let a hidden-file
   listing skip them) — then apply that layer's `ADDITIONS.md`
   (playwright.config.ts / package.json / `.gitignore` merges — these are
   instructions for you to apply with `Edit`, not files to copy verbatim).
   - Replace `{{APP_SLUG}}` with a short kebab-case slug derived from the
     target project's name (package.json `name`, or the directory name) —
     used for the storageState auth filename and as `README.md`'s title.
   - **Never overwrite a file that already exists at the target path.** If a
     template file would collide with something already there, skip writing
     it and note the skip in the Step 5 report instead — this is existing
     work, not yours to clobber. This applies identically in Default mode —
     "default" means "fill in what's missing," never "clobber what's there."
   - When merging into an existing `package.json` / `.gitignore` /
     `playwright.config.ts` / `eslint.config.mjs`, merge additively (`Edit`),
     and if a script/dep/section already exists with a *different* value
     than the template expects, keep the project's existing value and flag
     the conflict in Step 5 rather than overwriting it.
5. **`core/src/pages/example/login.page.ts` and `src/global.setup.ts` are
   starters, not real POMs** — they're deliberately full of `TODO` /
   placeholder locators (never invented real ones — same discipline as
   everywhere else in this plugin). Tell the human explicitly that these need
   a real `dom-inspector` + `pom-author` pass against the app's actual login
   page before they're usable, or should be deleted if the app needs no auth.
6. Whatever layers were scaffolded (or none, if skipped), continue into
   Step 1 below — the scan there will now pick up whatever structure just got
   written (or the project's pre-existing one) as "existing conventions."

## Step 0b — Default every `.mcp.json` server to enabled

Run this unconditionally on every `/qa-agents:init` run (not just when the
`core` layer was just scaffolded) — it also has to fix pre-existing projects
where this drifted before init ever ran. No conditional branching, no
conflict analysis — the rule is simply "every server this project's
`.mcp.json` defines is enabled by default," full stop:

1. If the target project has an `.mcp.json` (freshly scaffolded — the `core`
   layer's template now includes a matching `.claude/settings.local.json`
   pre-set this way, so this step is a no-op there — or pre-existing), read
   its `mcpServers` keys.
2. Read `.claude/settings.local.json` in the target project (create it with
   `{}` first if it doesn't exist yet).
3. For every one of those server names: make sure it's listed in
   `enabledMcpjsonServers` and make sure it's absent from
   `disabledMcpjsonServers`. Apply this unconditionally, regardless of
   whatever state the two lists were already in — don't special-case "both
   lists" vs. "disabled only" vs. "missing"; just enforce the end state.
4. Write the file back with only the minimal change (don't reformat or touch
   unrelated keys like `permissions`).
5. Note in the Step 5 report whether this changed anything (and what), or
   state that everything was already enabled by default — must be visible to
   the human, not a silent edit.

## Step 1 — Scan for existing conventions

Before asking the human anything, look for evidence yourself:

1. `Glob` for `**/*.spec.ts` (or the project's actual test file extension) to find the spec directory.
2. `Glob` for `**/*page*.ts`/`**/*Page*.ts` (or equivalent) to find where Page Object Model files live, and `Read` 1-2 of them to see:
   - Do locators live as `readonly` constructor fields, or are they created ad hoc?
   - Do methods wrap their body in a step helper (e.g. Playwright's `test.step(...)`)? Is that consistent across files, or occasional?
   - Is there a shared base/parent POM class? What's it called and where does it live?
3. `Read` 1-2 existing spec files (if any) to see:
   - Do they call low-level page-interaction methods directly, or only POM methods?
   - What test header/name format do they use, if any?
   - What do they import, and from where (a custom fixture, or the test runner directly)?
4. Look for a test-case source directory (markdown/other format describing scenarios before they become specs) — often near the spec directory or under a `cases`/`test-cases` folder.
5. Look for a lint command in `package.json` scripts (e.g. `lint`, `lint:file`).
6. Check RAG setup — the `knowledge-retriever` agent expects a per-project `npm run rag:query` script backed by this plugin's own vendored `src/rag/` implementation (see Step 0's `rag` layer), not a global tool install:
   - `Glob`/`Grep` for `src/rag/index.ts` and a `rag:query` script in `package.json`. If neither is there, RAG is simply unavailable here — that's normal, not an error; offer the `rag` scaffold layer (Step 0) rather than telling the human to install anything externally.
   - If it IS present, `Glob` for `.rag/store.sqlite` in the project root to see if anything's been indexed yet, and if so, try to determine which collection name(s) it holds (ask the human if you can't tell from a quick `npm run rag:query --` test).
   - Only note a custom `ragQueryCommand` override if the project demonstrably uses something other than its own `npm run rag:query` script (rare) — don't invent one.
7. Check for a project instructions file (`CLAUDE.md` or similar) that already documents test-case format rules — if found, don't duplicate its content into the config; just note its path so `test-case-writer` reads it directly.

## Step 2 — Confirm with the human

Show what you found (or didn't) and ask, in one pass — don't interrogate field by field if you already have solid evidence for most of them:

- POM directory (confirm or correct what you inferred)
- Spec directory
- Test-case source directory (or "none — TCs aren't tracked as files here")
- Fixture import path, if specs use one (e.g. for an API client)
- Spec/POM style rules — for each, "yes, enforced" / "no" / "mixed, don't enforce":
  - Locators must be `readonly` constructor fields (not created inside methods)
  - Every POM method body must be wrapped in a step helper
  - Specs must call only POM methods, never low-level page-interaction calls directly
  - A field-count threshold above which a Data Builder pattern should be used (or "not used in this project")
- Lint command (or "none")
- RAG: whether the vendored `src/rag/` + `rag:query` script was found, and if so which collection this project's docs live in (or "not indexed yet" / "rag layer not scaffolded — offer it, or skip knowledge-retriever for now")
- Test header/name format, if the project has a fixed convention (e.g. a doc comment ID + tags above each test)

Use `AskUserQuestion` for anything genuinely ambiguous after Step 1; don't ask about things Step 1 already confirmed with high confidence — just state them and let the human correct if wrong.

## Step 3 — Write the config

Write `.claude/qa-agents.config.json` in the target project:

```json
{
  "pomDir": "<path>",
  "basePageFile": "<path to shared base POM class, if any>",
  "specDir": "<path>",
  "casesDir": "<path, or null if TCs aren't tracked as files>",
  "fixtureImport": "<import path, or null>",
  "lintCommand": "<command, or null>",
  "ragCollection": "<collection name this project's vendored rag-cli holds its docs under, or null if not indexed yet>",
  "ragQueryCommand": "<ONLY set if this project uses something other than its own vendored `npm run rag:query --` script — an override command, else null (null does NOT mean 'no RAG'; it means 'use this project's own npm run rag:query -- script')>",
  "testHeaderFormat": "<short description or example, or null>",
  "caseFormatDoc": "<path to the project's own TC-format rules doc, if one exists, else null>",
  "rules": {
    "readonlyLocators": true,
    "mandatoryTestStep": true,
    "noPageDotInSpec": true,
    "enforceLoginPattern": true,
    "builderFieldThreshold": 3
  }
}
```

Every `rules.*` flag is a boolean (or number for the threshold) reflecting what Step 2 confirmed — set to `false`/`null` rather than guessing `true` for anything not actually confirmed as enforced in this project.

## Step 4 — Write the project's own framework-rules doc (optional but recommended)

If the target project doesn't already have its own `.claude/docs/framework-rules.md`, offer to write one: read this plugin's `docs/framework-rules.template.md`, adapt every `{{...}}` placeholder and bracketed TODO using what Step 1-2 gathered, and write the result to `<target>/.claude/docs/framework-rules.md`. Do the same for `docs/intent-mapping.template.md` if the human wants method-mapping guidance too. Skip anything you don't have real evidence for — leave it as an explicit `<TODO: fill in>` rather than inventing plausible-sounding content, matching the same "never invent, flag instead" discipline the other agents follow.

Copy `docs/healing-rules.md` as-is (it's app-agnostic P1/P2 troubleshooting) unless the human's answers changed which P2 rules apply — in that case, adjust its P2 checklist table to match `rules.*` from the config.

## Step 5 — Report

Tell the human:
- Which scaffold layers (if any) were applied in Step 0, which files were written, and which were skipped because something already existed at that path (list them — don't silently drop this).
- Any merge conflicts flagged in Step 0 (existing script/dep/config value that differed from the template's).
- Whether Step 0b found and fixed an MCP enable/disable conflict in `.claude/settings.local.json` (and which server), or found none.
- That `src/pages/example/login.page.ts` / `src/global.setup.ts` (if scaffolded) are TODO-marked starters needing a real `dom-inspector` + `pom-author` pass, or deletion if the app needs no auth.
- That `.env.uat` (if scaffolded) has a placeholder `BASE_URL=https://example.com` — replace it with the app's real UAT URL before running any spec.
- That `CLAUDE.md` and `README.md` (if scaffolded) are generic starters with `TODO(init)` markers — point out they should be revisited once conventions are confirmed, and note either was skipped if the project already had one.
- **If the `rag` layer was scaffolded**: that `npm install` will fail until they add a personal GitHub PAT (`read:packages` scope) to their **global** `~/.npmrc` — this is a one-time per-machine setup, never written to any file in this project, and cannot go in `.env.local` (see the `rag` layer's `ADDITIONS.md` Step 6 for the exact lines). Say this every time the layer is scaffolded, not just once.
- **If the `rag` layer was skipped** (per Step 3c, no package name given): say so plainly, not as an error — and remind them how to add it later (`/qa-agents:init` again, Custom mode, pick just `rag`, once the package name and `~/.npmrc` token are ready).
- The config file path written.
- Any field left unset/null and why (so they know what's not yet configured, not silently assumed).
- Whether framework-rules.md / intent-mapping.md were written or skipped, and why.
- That they can re-run `/qa-agents:init` any time conventions change.
