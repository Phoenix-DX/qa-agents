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
copies/edits several files. The human does not want a play-by-play of any of
it — keep the running output down to **one short status line per step and
nothing else**:

- Right before starting each step, print a single line: a prefix, then the
  stages reached so far, each as `<icon> <one-word label>`, `✓` for finished
  stages and `…` for the one now starting. Stages not reached yet are simply
  left off, so the line grows as the run goes:

  ```
  ⚙  qa-agents init — 📁 scaffold ✓  🔍 scan ✓  ❓ confirm …
  ```

  The seven stages, in order — icon, label, and the step they stand for:
  `📁 scaffold` (Step 0 + 0b), `🔍 scan` (Step 1), `❓ confirm` (Step 2),
  `📝 config` (Step 3), `📄 docs` (Step 4), `📦 install` (Step 4b),
  `✅ report` (Step 5).
- **That line is the only thing printed between steps.** No step numbers, no
  "Step 3/6" counters, no progress bar, no restating what the step is about
  or what you are about to do, no per-file "wrote X" lines, no tool
  narration, no file contents, no matched snippets, no raw command output.
  If it isn't the status line, an `AskUserQuestion`, or the Step 5 report,
  it doesn't get printed.
- While scanning (Step 0's detection pass and Step 1), do the Glob/Read/Grep
  work silently and keep what you found for Step 2/Step 5 instead of
  narrating it.
- Full detail (concrete paths, code snippets, the config JSON) still belongs
  in the Step 2 confirmation question and the Step 5 report — this rule only
  suppresses the intermediate process chatter, not the final content the
  human needs to review.

## Step 0 — Offer to scaffold the framework structure

This plugin ships a generic starter framework skeleton (modeled on a real
Playwright/POM/TS project, generalized) under this plugin's own
`templates/scaffold/` directory, in four layers — three
independently-selectable, plus `rag`, which is **mandatory** and always
scaffolded when it isn't already present (it's never offered as a
checkbox; the only question it raises is when its registry token gets
entered):

| Layer | Adds |
|---|---|
| `core` | `playwright.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.mcp.json` (the `playwright-test` MCP server `dom-inspector` needs) + `.claude/settings.local.json` (pre-enables it, see Step 0b), `.gitignore`, `.env.example` (secrets template — copy to `.env.local`), `.env.uat` (a real, committed placeholder — only `BASE_URL` needs a working value to run anything), `README.md` (generic human-facing setup/run doc, TODO-marked) + `CLAUDE.md` (generic project-instructions starter), `src/utils/env.ts`, `src/pages/base.page.ts` (shared POM base class), `src/global.setup.ts` + `src/pages/example/login.page.ts` (TODO-marked auth starter), `src/tests/seed.spec.ts`, `src/cases/` (empty, `.gitkeep` only — the default `casesDir`) |
| `allure` | Allure reporter wiring in `playwright.config.ts` + `package.json` scripts/deps (config-only, no new source files) |
| `api-k6` | `src/api/{base,config,endpoints,models,services}` (generic sample REST layer) + `k6/` perf-test scaffold (esbuild build, smoke/load/stress against the public Swagger Petstore demo as a runnable placeholder) |
| `rag` | **Mandatory — always scaffolded, never a choice.** Installs `@phoenix-dx/rag-cli` as an **optional** npm dependency (optional in npm's sense only: a missing registry token then can't break anyone's `npm install`) — org policy is to never vendor RAG source into a target repo, and there's exactly one private RAG package, so this plugin doesn't ask about either. Adds `.npmrc.example` (template — the real `.npmrc` holding the token is gitignored, per-project, never committed), `guide/rag-guide.md`, `docs/` docs-drop folder + `.gitignore` entries, `package.json` `rag:index`/`rag:query` scripts, and a "RAG setup" section inserted into `README.md` if one exists. Asks exactly one thing: paste the registry token now, or skip and add it later — see Step 3c |

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
   `AskUserQuestion` (single-select), how they want to proceed. (Every
   literal question/option string shown anywhere in this file, including
   3c below, is asked in **English, always** — regardless of what language
   the human is chatting in. Don't localize these; this org standardized on
   English tooling output on purpose.):
   - **Default** — scaffold every layer that has anything missing, using
     this plugin's generic templates as-is (no per-layer picking). Best for
     an empty or near-empty project that just wants the whole starter
     framework.
   - **Custom** — pick exactly which layer(s) to scaffold now. `rag` is
     not among the choices — it's mandatory and gets scaffolded either
     way; say so in the question's framing rather than listing it as an
     unselectable option.
3. **Resolve which layers to scaffold**, based on the answer to step 2:
   - **3a. If Default** — treat every layer step 1 found not-fully-present
     as selected. Still show what's already present per layer (so the human
     knows it won't be touched) before proceeding — this is a statement, not
     a second question.
   - **3b. If Custom** — ask a second `AskUserQuestion` (multiSelect) over
     `core`/`allure`/`api-k6` only, showing what's already present vs.
     missing per layer, and let them pick zero or more of those to
     scaffold now. `rag` is added to the selection regardless of this
     answer — don't offer it, don't let it be deselected.
   - **3c. `rag` is always in the selection** (Default or Custom), unless
     Step 1's detection found it already fully present. Nothing about the
     layer itself is a question: this plugin only scaffolds the private
     variant, full stop; `{{RAG_PACKAGE_NAME}}` is always
     `@phoenix-dx/rag-cli` and `{{RAG_PACKAGE_SCOPE}}` is always
     `@phoenix-dx` (this org has exactly one private RAG package); and it
     is never deferred to a later run. `{{RAG_PACKAGE_NAME}}` goes into
     `optionalDependencies` (see the layer's `ADDITIONS.md` Step 3), so
     scaffolding it unconditionally can't break anyone's `npm install`,
     token or no token.

     Exactly one real question remains — the registry token. Ask it via
     `AskUserQuestion` (single-select), in English:
     ```
     question: "The rag layer installs @phoenix-dx/rag-cli from GitHub Packages, a private registry. How do you want to handle the token?"
     header: "RAG token"
     options:
       - label: "Paste token now (Recommended)"
         description: "I'll write it into this project's gitignored .npmrc, so npm install resolves the RAG CLI right away."
       - label: "Skip — add it later"
         description: "No .npmrc written now. The rag layer is scaffolded either way and npm install still succeeds — only rag:index/rag:query stay unavailable until you add a token."
     ```
     - **If "Paste token now"** — ask one normal follow-up chat question
       (free text, not `AskUserQuestion` — a token is a secret, not a
       small option set), in English: "Paste your GitHub Packages PAT
       (`read:packages` scope) and I'll write it straight into `.npmrc`."
       - **If they paste a token** — write it directly to the real,
         gitignored `.npmrc` at the project root (not `.npmrc.example`):
         ```
         {{RAG_PACKAGE_SCOPE}}:registry=https://npm.pkg.github.com
         //npm.pkg.github.com/:_authToken=<the token they gave>
         ```
         Create the file fresh if it doesn't exist yet (don't copy
         `.npmrc.example` first and edit it — that file keeps the
         `<YOUR_TOKEN>` placeholder for reference, this is a separate
         real file). `.npmrc.example` is copied either way and stays in
         the repo as the committed template — never delete it just
         because a real `.npmrc` now exists. Never echo the token value
         back in any response — after writing, confirm only that
         `.npmrc` was created, not what it contains.
       - **If it turns out they don't have one to hand** — treat it
         exactly as "Skip" below; don't push, and don't ask again.
     - **If "Skip — add it later"** — don't create the real `.npmrc` at
       all, but **do** make sure `.npmrc.example` exists at the project
       root (it's copied by Step 4 with `{{RAG_PACKAGE_SCOPE}}`
       substituted — verify it landed, and write it from the layer
       template if it somehow didn't). That template file is the whole
       point of this branch: it's what the human copies to `.npmrc` when
       they do get a token, and it's committed, so teammates find it
       after a clone.

       This is a normal, fully-supported outcome, not a pending failure:
       `npm install` works as-is and the whole framework runs; only
       `npm run rag:index` / `npm run rag:query` (and therefore
       `knowledge-retriever`) stay unavailable until a token exists.
       Note in the Step 5 report how to add one later — preferably two
       lines in `~/.npmrc` (once per machine, survives every clone), or
       per-clone by copying `.npmrc.example` to `.npmrc` — followed by
       re-running `npm install`, since the token-less install skipped the
       package. See the layer's `ADDITIONS.md` Step 6.

     If a human explicitly names a *different* package in their own
     message (unprompted — this org occasionally has a one-off reason
     to), honor that instead of the default; just don't ask for it.

     Skip this whole 3c flow if the project already has the `rag` layer
     present (per Step 1) — don't re-ask.
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
   page before they're usable. Say plainly that this is the project's only
   login: specs inherit the session from `storageState` and never
   authenticate themselves (`rules.enforceLoginPattern`, framework-rules.md
   §4). Deleting them applies only to an app with no authenticated area.
6. Whatever layers were scaffolded (or none, if skipped), continue into
   Step 0b and then Step 1 — the scan there will pick up whatever structure
   just got written (or the project's pre-existing one) as "existing
   conventions." Dependencies are installed at the very end, in Step 4b,
   so the human isn't left waiting on a multi-minute install before the
   Step 2 questions.

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

Before asking the human anything, look for evidence yourself. Findings
about POM/spec style (items 2-3 below) feed Step 2B's evidence rule —
they're grounds for overriding an org default on a pre-existing suite,
never grounds for turning it into a question:

1. `Glob` for `**/*.spec.ts` (or the project's actual test file extension) to find the spec directory.
2. `Glob` for `**/*page*.ts`/`**/*Page*.ts` (or equivalent) to find where Page Object Model files live, and `Read` 1-2 of them to see:
   - Do locators live as `readonly` constructor fields, or are they created ad hoc?
   - Do methods wrap their body in a step helper (e.g. Playwright's `test.step(...)`)? Is that consistent across files, or occasional?
   - Is there a shared base/parent POM class? What's it called and where does it live?
3. `Read` 1-2 existing spec files (if any) to see:
   - Do they call low-level page-interaction methods directly, or only POM methods?
   - What test header/name format do they use, if any?
   - What do they import, and from where (a custom fixture, or the test runner directly)?
4. Look for a test-case source directory (markdown/other format describing scenarios before they become specs) — often near the spec directory or under a `cases`/`test-cases` folder. If none exists yet (fresh project, or `core` layer just scaffolded `src/cases/`), `src/cases/` is the default `casesDir` — don't ask about this one, just use it, same as `src/pages`/`src/tests` aren't asked about either.
5. Look for a lint command in `package.json` scripts (e.g. `lint`, `lint:file`).
6. Check RAG setup — the `knowledge-retriever` agent expects a per-project `npm run rag:query` script backed by `@phoenix-dx/rag-cli` (see Step 0's mandatory `rag` layer), not a global tool install:
   - `Grep` for a `rag:query` script in `package.json` (a pre-existing `src/rag/index.ts` also counts — that's a project scaffolded before this plugin). If neither is there, Step 0's `rag` layer should have just added it — re-check rather than telling the human to install anything externally.
   - Don't read `node_modules/` here to decide anything: dependencies aren't installed until Step 4b, so "not in `node_modules`" at this point means nothing. Whether `@phoenix-dx/rag-cli` actually resolved is a Step 4b outcome, reported there.
   - If it IS present, `Glob` for `.rag/store.sqlite` in the project root to see if anything's been indexed yet, and if so, try to determine which collection name(s) it holds (ask the human if you can't tell from a quick `npm run rag:query --` test).
   - Only note a custom `ragQueryCommand` override if the project demonstrably uses something other than its own `npm run rag:query` script (rare) — don't invent one.
7. Check for a project instructions file (`CLAUDE.md` or similar) that already documents test-case format rules — if found, don't duplicate its content into the config; just note its path so `test-case-writer` reads it directly.

## Step 2 — Confirm paths with the human; convention rules are org defaults, not questions

Two different kinds of thing get resolved here, and they are handled
differently. Don't blur them.

**A. Project-specific facts — confirm in one pass, ask only if ambiguous.**
Show what Step 1 found (or didn't) and let the human correct it. Don't
interrogate field by field when you already have solid evidence:

- POM directory (confirm or correct what you inferred)
- Spec directory
- Test-case source directory — state the default (`src/cases/`, existing or just scaffolded) or whatever Step 1 found instead; only ask if genuinely ambiguous (e.g. TCs demonstrably live somewhere else already, or aren't tracked as files at all)
- Fixture import path, if specs use one (e.g. for an API client)
- Lint command (or "none")
- RAG: whether the `rag:query` script is wired up, and if anything is already indexed, which collection this project's docs live in (or "not indexed yet"). Whether `@phoenix-dx/rag-cli` itself resolves is unknown until Step 4b installs — don't state it here.

**B. Framework conventions — org standards. Apply them, state them, never
ask.** These are not per-project preferences; this org has already decided
them, so asking just makes the human rubber-stamp the same answers every
time. Set them straight into the config and report them in Step 5 as
"applied by default — tell me if this project is an exception":

| Config | Default | Meaning |
|---|---|---|
| `rules.readonlyLocators` | `true` | Locators are `readonly` constructor fields, never created inside methods |
| `rules.mandatoryTestStep` | `true` | Every POM method body is wrapped in a step helper |
| `rules.noPageDotInSpec` | `true` | Specs call POM methods only, never low-level page interactions |
| `rules.enforceLoginPattern` | `true` | Login happens once in the global setup project (`src/global.setup.ts`) and every spec inherits it via `storageState` — specs never log in themselves. Roles/anonymous switch with `test.use({ storageState: ... })`; only a spec testing auth itself drives the login POM |
| `rules.builderFieldThreshold` | `3` | An entity with more than 3 fields appearing in 2+ specs uses a Data Builder |
| `testHeaderFormat` | the block below | TC-ID doc comment + tags above every test |

```
/** ID: TC001 Tags: smoke, interchange, happy-path, admin */
test('[TC001] @Smoke @Regression @Admin: Configure a new Interchange with participating localities as LDM Admin', async ({ page }) => { ... });
```

i.e. a `/** ID: <TCxxx> Tags: <comma-separated> */` doc comment directly
above the test, and the test name itself repeating the ID in brackets +
`@Tag` markers + a colon-separated human-readable scenario description.

The only thing that overrides a row of that table is **evidence in this
project's existing code**, not a question: if Step 1 found a pre-existing
suite that plainly doesn't follow one of these (e.g. every existing spec
calls `page.*` directly, or the project already has its own documented
test-header convention), record what the project actually does, and say
in the Step 5 report which default you overrode and why. A brand-new or
freshly-scaffolded project has no such evidence — it gets the defaults,
untouched and unasked.

Use `AskUserQuestion` only for a genuinely ambiguous **A** item after Step 1. Don't ask about things Step 1 already confirmed with high confidence — state them and let the human correct if wrong — and don't ask about **B** at all.

## Step 3 — Write the config

Write `.claude/qa-agents.config.json` in the target project:

```json
{
  "pomDir": "<path>",
  "basePageFile": "<path to shared base POM class, if any>",
  "specDir": "<path>",
  "casesDir": "<path — defaults to src/cases/ for a fresh scaffold, else wherever Step 1 found existing TCs, or null if TCs aren't tracked as files at all>",
  "fixtureImport": "<import path, or null>",
  "lintCommand": "<command, or null>",
  "ragCollection": "<collection name this project's vendored rag-cli holds its docs under, or null if not indexed yet>",
  "ragQueryCommand": "<ONLY set if this project uses something other than its own vendored `npm run rag:query --` script — an override command, else null (null does NOT mean 'no RAG'; it means 'use this project's own npm run rag:query -- script')>",
  "testHeaderFormat": "<the org default from Step 2B, unless this project demonstrably has its own convention>",
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

The `rules.*` values and `testHeaderFormat` shown above are the org
defaults from Step 2B — write them as-is. Deviate only where Step 2B's
evidence rule applied (a pre-existing suite that demonstrably doesn't
follow one of them), and say so in the Step 5 report. Don't downgrade a
default to `false`/`null` just because a brand-new project has no specs
yet to prove it — an empty project gets the defaults.

## Step 4 — Write the project's own reference docs

`.claude/docs/` gets all three of these by default — no question, no
opt-in. They're a standard part of every project this plugin sets up:

1. **`framework-rules.md`** — from this plugin's `docs/framework-rules.template.md`, adapting every `{{...}}` placeholder and bracketed TODO using what Step 1-2 gathered.
2. **`intent-mapping.md`** — same treatment, from `docs/intent-mapping.template.md`. Write it unconditionally, same as framework-rules.md — don't let it quietly disappear the way it used to when this was framed as an optional add-on to the framework-rules.md offer.
3. **`healing-rules.md`** — copy `docs/healing-rules.md` as-is (it's app-agnostic P1/P2 troubleshooting), unless the human's answers changed which P2 rules apply, in which case adjust its P2 checklist table to match `rules.*` from the config.

For each of the three: skip writing it only if the target project
already has a file at that exact path (don't overwrite existing work —
note the skip in Step 5). Otherwise write it, full stop, regardless of
project size or how empty/full the project is. Skip anything you don't
have real evidence for when filling in framework-rules.md/intent-mapping.md
— leave it as an explicit `<TODO: fill in>` rather than inventing
plausible-sounding content, matching the "never invent, flag instead"
discipline the other agents follow — that's the mechanism for handling
missing information here, not skipping the file entirely.

## Step 4b — Install dependencies (the last action before the report)

Everything the human had to answer is done by now, so this is where the
waiting goes. Run it after Step 4's docs are written, immediately before
the Step 5 report.

1. Skip the whole step, and say so in Step 5, if the target project has no
   `package.json` at all (nothing to install).
2. Pick the command from the lockfile actually present in the project root —
   don't assume npm:
   - `pnpm-lock.yaml` → `pnpm install`
   - `yarn.lock` → `yarn install`
   - `bun.lockb` / `bun.lock` → `bun install`
   - otherwise (or `package-lock.json`) → `npm install`
3. Run it in the project root with a generous timeout (it can take minutes
   on a fresh scaffold). Don't paste the raw output into chat — keep it
   quiet and fold a one-line summary into the Step 5 report.
4. **A failure here is reported, never fixed.** Don't retry with different
   flags, don't edit `package.json` to make it resolve, don't delete
   `node_modules`/the lockfile. Capture the error and go straight to Step 5
   — everything before this point (config + docs) already succeeded and
   still stands. A missing RAG registry token is *not* a failure mode here:
   `@phoenix-dx/rag-cli` is an optional dependency, so it's skipped
   silently (see Step 3c).
5. Never run anything beyond the install itself — no browser download
   (`npx playwright install` / the project's `install:browsers` script), no
   build, no test run.
6. This is also where the RAG install state becomes knowable: after the
   install, check whether `@phoenix-dx/rag-cli` landed in `node_modules`.
   Not there + no token configured = the expected "scaffolded, token
   pending" state — report it as such in Step 5, not as an error.

## Step 5 — Report

Tell the human:
- Which scaffold layers (if any) were applied in Step 0, which files were written, and which were skipped because something already existed at that path (list them — don't silently drop this).
- Any merge conflicts flagged in Step 0 (existing script/dep/config value that differed from the template's).
- Whether Step 0b found and fixed an MCP enable/disable conflict in `.claude/settings.local.json` (and which server), or found none.
- That `src/pages/example/login.page.ts` / `src/global.setup.ts` (if scaffolded) are TODO-marked starters needing a real `dom-inspector` + `pom-author` pass — and that this is where the project's only login lives: specs inherit the session via `storageState` and never log in themselves (`rules.enforceLoginPattern`). Deleting them is for the rare app with no authenticated area at all.
- That `.env.uat` (if scaffolded) has a placeholder `BASE_URL=https://example.com` — replace it with the app's real UAT URL before running any spec.
- That `CLAUDE.md` and `README.md` (if scaffolded) are generic starters with `TODO(init)` markers — point out they should be revisited once conventions are confirmed, and note either was skipped if the project already had one.
- **If the `rag` layer was scaffolded**: say plainly that `npm install` is not blocked either way — `@phoenix-dx/rag-cli` is an optional dependency, so npm skips it when there's no registry token and installs everything else normally. Then say which of the two token states this project is in: either a real `.npmrc` was written from a token they pasted during Step 3c (RAG works after `npm install`), or no token yet (everything works except `npm run rag:index` / `rag:query` and `knowledge-retriever`, until they add a token — `.npmrc.example` is already sitting at the project root as the template for exactly this, so say it's there: either lift its two lines into `~/.npmrc` once per machine, or copy it to `.npmrc` per clone — and re-run `npm install`, since the token-less install skipped the package). A token can't go in `.env.local` either way; see the `rag` layer's `ADDITIONS.md` Step 6 and the "RAG setup" section just inserted into `README.md` if one exists. Always say which of the two states it's in, every time the layer is scaffolded.
- **Never report `rag` as skipped or optional-to-add-later** — the layer is mandatory and always scaffolded (only its token is deferrable). The one exception is Step 1 finding it already fully present, in which case just say it was left untouched.
- Whether dependencies were installed in Step 4b: which command ran (`npm`/`pnpm`/`yarn`/`bun`), and whether it succeeded, was skipped (no `package.json`), or failed — quoting the error verbatim if it failed. If `@playwright/test` is now installed but its browsers aren't, add one line telling them to run the project's own browser-install script if it has one (the `core` scaffold ships `npm run install:browsers`), else `npx playwright install`, before any spec will run.
- The config file path written.
- The Step 2B convention defaults that were applied without asking — list them compactly (`readonlyLocators`, `mandatoryTestStep`, `noPageDotInSpec`, `enforceLoginPattern`, `builderFieldThreshold: 3`, and the TC-ID + tags `testHeaderFormat`) and say in one line that they're org standards, so the human can flag an exception now instead of discovering it later. Call out separately any default you overrode from existing-code evidence, and what the project does instead.
- Any field left unset/null and why (so they know what's not yet configured, not silently assumed).
- Whether **each** of framework-rules.md, intent-mapping.md, and healing-rules.md was written or skipped because it already existed — report on all three individually, never just one, and flag any `<TODO: fill in>` left in the two templated ones so the human knows what still needs real project evidence.
- That they can re-run `/qa-agents:init` any time conventions change.
