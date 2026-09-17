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
- **Never narrate a step in prose.** Lines like "Now applying the ADDITIONS
  merges (package.json, playwright.config.ts, ...)" or "Reading the Quick
  start section" are exactly the noise this section exists to remove — the
  status line already said which stage is running, and Step 5 says what
  came of it.
- **Do this flow's file writing through `Bash`, batched.** The terminal
  renders a full colored diff for every `Write`/`Edit` call, which is the
  single biggest source of visual noise here, and one line per tool call
  regardless. So: copy template files with `cp`, and apply the
  `ADDITIONS.md` merges with a heredoc'd `python3`/`sed` script — and put as
  many files as possible in **one** call, so the whole scaffold collapses to
  a single `Ran 1 shell command` line instead of a screenful of diffs. Give
  that call a flat description (`Scaffolding selected layers`), not a
  per-file one, and let it print nothing on success. The same applies to
  Step 3's config file and Step 4's reference docs — write them with a
  heredoc, not `Write`.
  - The no-clobber and additive-merge rules in Step 0.4 still bind: the
    script checks for an existing file and skips it rather than
    overwriting, exactly as `Edit` would have.
  - `Edit` is still the right tool for a merge too delicate to script
    safely — correctness beats quiet. Just don't reach for it by default.
- Full detail (concrete paths, code snippets, the config JSON) still belongs
  in the Step 2 confirmation question and the Step 5 report — this rule only
  suppresses the intermediate process chatter, not the final content the
  human needs to review.

## Step 0 — Offer to scaffold the framework structure

This plugin ships a generic starter framework skeleton (modeled on a real
Playwright/POM/TS project, generalized) under this plugin's own
`templates/scaffold/` directory, in three independently-selectable layers.
Knowledge lookup (`knowledge-retriever` / `/qa-agents:implement-requirement`)
is backed by UBT's Cortex KG, reached via MCP tools already available in
this Claude Code session — nothing to scaffold into the target repo for it
(no npm package, no local index, no registry token). Step 1.6 below handles
mapping this project to its Cortex registry entry instead.

| Layer | Adds |
|---|---|
| `core` | `playwright.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.mcp.json` (the `playwright-test` MCP server `dom-inspector` needs) + `.claude/settings.local.json` (pre-enables it, see Step 0b), `.gitignore`, `.env.example` (secrets template — copy to `.env.local`), `.env.uat` (a real, committed placeholder — only `BASE_URL` needs a working value to run anything), `README.md` (generic human-facing setup/run doc, TODO-marked) + `CLAUDE.md` (generic project-instructions starter), `src/utils/env.ts`, `src/pages/base.page.ts` (shared POM base class), `src/global.setup.ts` + `src/pages/example/login.page.ts` (TODO-marked auth starter), `src/tests/seed.spec.ts`, `src/cases/` (empty, `.gitkeep` only — the default `casesDir`) |
| `allure` | Allure reporter wiring in `playwright.config.ts` + `package.json` scripts/deps (config-only, no new source files) |
| `api-k6` | `src/api/{base,config,endpoints,models,services}` (generic sample REST layer) + `k6/` perf-test scaffold (esbuild build, smoke/load/stress against the public Swagger Petstore demo as a runnable placeholder) |

1. **Detect what's already there** before asking anything: check for
   `playwright.config.ts`, `tsconfig.json`, `.mcp.json`, a POM directory (per
   Step 1's Glob), `allure-playwright` in `package.json`, and an `src/api/` or
   `k6/` directory. Build a per-layer present/missing picture — don't guess,
   check the actual filesystem.
2. **No question here — always scaffold every layer that has anything
   missing**, using this plugin's generic templates as-is, whether the
   project is empty or already has a framework. Don't ask `AskUserQuestion`
   about which layers to scaffold and don't offer a Custom/pick-layers path
   — the human can always ask afterward to remove or redo a specific layer
   if they don't want it. Treat every layer Step 1 found not-fully-present
   as selected. If literally everything in all three layers is already
   present, just state that (a statement, not a question) and move on.
3. **For each selected layer**, copy every file from this plugin's
   `templates/scaffold/<layer>/` into the equivalent path in the target
   project — including dotfiles like `.mcp.json` (don't let a hidden-file
   listing skip them) — then apply that layer's `ADDITIONS.md`
   (playwright.config.ts / package.json / `.gitignore` merges — these are
   instructions for you to apply, not files to copy verbatim). Do both
   through batched `Bash` calls rather than `Write`/`Edit`, per the
   Progress reporting rule above.
   - Replace `{{APP_SLUG}}` with a short kebab-case slug derived from the
     target project's name (package.json `name`, or the directory name) —
     used for the storageState auth filename and as `README.md`'s title.
   - **Never overwrite a file that already exists at the target path.** If a
     template file would collide with something already there, skip writing
     it and note the skip in the Step 5 report instead — this is existing
     work, not yours to clobber. Scaffolding everything missing means "fill
     in what's missing," never "clobber what's there."
   - When merging into an existing `package.json` / `.gitignore` /
     `playwright.config.ts` / `eslint.config.mjs`, merge additively,
     and if a script/dep/section already exists with a *different* value
     than the template expects, keep the project's existing value and flag
     the conflict in Step 5 rather than overwriting it.
4. **`core/src/pages/example/login.page.ts` and `src/global.setup.ts` are
   starters, not real POMs** — they're deliberately full of `TODO` /
   placeholder locators (never invented real ones — same discipline as
   everywhere else in this plugin). Tell the human explicitly that these need
   a real `dom-inspector` + `pom-author` pass against the app's actual login
   page before they're usable. Say plainly that this is the project's only
   login: specs inherit the session from `storageState` and never
   authenticate themselves (`rules.enforceLoginPattern`, framework-rules.md
   §4). Deleting them applies only to an app with no authenticated area.
5. Whatever layers were scaffolded (or none, if skipped), continue into
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
6. Check the Cortex KG mapping — `knowledge-retriever` and `/qa-agents:implement-requirement` query UBT's Cortex knowledge graph by canonical project key, not a per-project install:
   - Call `mcp__claude_ai_Cortex__list_registered_projects` (or `resolve_project` if a clear candidate name is already known) and try to match this target project against a `canonical_key`/`display_name`/`aliases` entry, using the target project's `package.json` `name`, its directory name, and any Jira/repo naming mentioned in existing docs.
   - If the tool call itself fails or returns an entitlements/access error, don't treat that as "no match" — note that Cortex access may be blocked for the current identity, and say so plainly in Step 5's report; still let the human set `cortexProject` manually in Step 2 if they know the right key, since the config field doesn't require a successful lookup to be set.
   - If nothing matches with reasonable confidence, don't guess — leave it as "no confident match" for Step 2 to ask about, rather than picking the closest-sounding project.
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
- Cortex KG mapping: show Step 1.6's best-guess `canonical_key` (or "no confident match") and let the human confirm or correct it, or say "skip — don't use Cortex for this project" if they'd rather `knowledge-retriever` stay unavailable. Note plainly that even a correct mapping doesn't guarantee access — that depends on entitlements a KB steward grants separately, outside this command's control.

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
  "cortexProject": "<the Cortex canonical project key confirmed in Step 2, or null if this project isn't registered in Cortex or the human opted out>",
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
   still stands.
5. Never run anything beyond the install itself — no browser download
   (`npx playwright install` / the project's `install:browsers` script), no
   build, no test run.

## Step 5 — Report

Tell the human:
- Which scaffold layers (if any) were applied in Step 0, which files were written, and which were skipped because something already existed at that path (list them — don't silently drop this).
- Any merge conflicts flagged in Step 0 (existing script/dep/config value that differed from the template's).
- Whether Step 0b found and fixed an MCP enable/disable conflict in `.claude/settings.local.json` (and which server), or found none.
- That `src/pages/example/login.page.ts` / `src/global.setup.ts` (if scaffolded) are TODO-marked starters needing a real `dom-inspector` + `pom-author` pass — and that this is where the project's only login lives: specs inherit the session via `storageState` and never log in themselves (`rules.enforceLoginPattern`). Deleting them is for the rare app with no authenticated area at all.
- That `.env.uat` (if scaffolded) has a placeholder `BASE_URL=https://example.com` — replace it with the app's real UAT URL before running any spec.
- That `CLAUDE.md` and `README.md` (if scaffolded) are generic starters with `TODO(init)` markers — point out they should be revisited once conventions are confirmed, and note either was skipped if the project already had one.
- **Cortex KG mapping**: report the `cortexProject` value written to the config (or that it's `null` and why — no confident match, human opted out, or the lookup call itself failed/was denied). If set, remind the human that a correct mapping still doesn't guarantee `knowledge-retriever` gets results — Cortex access is entitlement-gated per identity, granted by a KB steward, independent of anything this command does.
- Whether dependencies were installed in Step 4b: which command ran (`npm`/`pnpm`/`yarn`/`bun`), and whether it succeeded, was skipped (no `package.json`), or failed — quoting the error verbatim if it failed. If `@playwright/test` is now installed but its browsers aren't, add one line telling them to run the project's own browser-install script if it has one (the `core` scaffold ships `npm run install:browsers`), else `npx playwright install`, before any spec will run.
- The config file path written.
- The Step 2B convention defaults that were applied without asking — list them compactly (`readonlyLocators`, `mandatoryTestStep`, `noPageDotInSpec`, `enforceLoginPattern`, `builderFieldThreshold: 3`, and the TC-ID + tags `testHeaderFormat`) and say in one line that they're org standards, so the human can flag an exception now instead of discovering it later. Call out separately any default you overrode from existing-code evidence, and what the project does instead.
- Any field left unset/null and why (so they know what's not yet configured, not silently assumed).
- Whether **each** of framework-rules.md, intent-mapping.md, and healing-rules.md was written or skipped because it already existed — report on all three individually, never just one, and flag any `<TODO: fill in>` left in the two templated ones so the human knows what still needs real project evidence.
- That they can re-run `/qa-agents:init` any time conventions change.
