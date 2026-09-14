# Framework Rules — Playwright Automation

> Conventions all specs + POMs must follow in **this project**. Written by
> `/qa-agents:init` from `{{PROJECT_NAME}}`'s actual code — every section below
> should be adapted or confirmed against real evidence (existing specs/POMs),
> never invented. Cross-references:
> - Intent → method translation: [`intent-mapping.md`](./intent-mapping.md)
> - When to apply which fix: [`healing-rules.md`](./healing-rules.md)

---

## 1. Spec Discipline (what specs MUST and MUST NOT contain)

<!-- /qa-agents:init: fill this table from the confirmed rules.* flags in
     .claude/qa-agents.config.json. Only include a MUST/MUST NOT row for a
     rule that's actually enforced (flag = true) — omit rows for flags that
     are false/unset instead of stating a fake rule. -->

**Spec files (`{{SPEC_DIR}}/*.spec.ts`) are orchestration only** *(only if `rules.noPageDotInSpec` is true — otherwise state the project's actual spec-body convention instead)*.

| MUST | MUST NOT |
|---|---|
| {{fill from confirmed rules}} | {{fill from confirmed rules}} |

```typescript
// {{init: paste one REAL example spec snippet from this project here, not an invented one}}
```

### No inline literals as method arguments

<!-- Keep this section only if confirmed as an actual project convention;
     otherwise delete it rather than presenting it as a rule. -->

---

## 2. Page Object Model

**One POM per page.** Place in `{{POM_DIR}}/<page-name>.page.ts` (confirm the
actual naming/extension convention from existing files — don't assume
kebab-case + `.page.ts` if the project uses something else).

### Structure

```typescript
// {{init: paste a REAL, minimal POM example from this project (e.g. its
// login page or simplest page) here — extending its actual base class,
// using its actual locator style. Do not invent a fictional class.}}
```

### POM rules

| Rule | Detail |
|---|---|
| **Extend `{{BASE_PAGE_CLASS}}`** | {{list what the base class actually provides, read from `{{basePageFile}}`}} |
| **Locators as `readonly`** in constructor | *(only if `rules.readonlyLocators` is true)* |
| **Method bodies wrap in a step helper** | *(only if `rules.mandatoryTestStep` is true — name the actual helper, e.g. `test.step(...)`)* |
| **Context ownership** | Method belongs to the page that contains/displays the element |

---

## 3. Locator Strategy

**Priority order** (try in this sequence, fall back when previous unavailable) — this order is Playwright-general and rarely needs project-specific changes:

1. `getByRole('button|link|textbox|combobox|checkbox|...', { name: '<exact>' })` — most stable
2. `getByPlaceholder('<exact>')` — only when a real placeholder exists
3. `getByLabel('<exact>')` — only when label is linked via `for`/`aria-labelledby`
4. `locator('[data-testid="..."]')` — verify it exists in DOM first
5. `locator('#id')` / other stable attribute selector
6. `getByText('<exact>')` — last resort

**Inspect live DOM before guessing.** Use the `dom-inspector` agent or `browser_snapshot` MCP tool.

### Project-specific gotchas

<!-- /qa-agents:init: this section starts EMPTY. Do not invent gotchas —
     they accumulate over time as dom-inspector/spec-runner/code-fixer
     discover real quirks in this project's app (e.g. a component library
     rendering selects as non-<input> elements, unlinked form labels, async
     races after a selection). Leave a single placeholder row until the
     first real one is found. -->

| Where | Gotcha |
|---|---|
| *(none recorded yet)* | *(agents should add a row here when they discover a real, reusable quirk)* |

---

## 4. Login Patterns

<!-- /qa-agents:init: the default below IS this org's pattern — authenticate
     once in the global setup project, reuse the storage state everywhere.
     Keep it; only fill in the project-specific values ({{...}}) from the
     project's real global setup file, and only rewrite the pattern itself
     if this project demonstrably does something else (say so explicitly
     in that case). -->

**Authentication happens in `{{GLOBAL_SETUP_FILE}}` (the `setup` project),
never inside a spec.** The session it produces is reused by every test
through `storageState`.

| Piece | This project |
|---|---|
| Setup file | `{{GLOBAL_SETUP_FILE}}` — e.g. `src/global.setup.ts`, run as the `setup` project via `testMatch` |
| Storage state file | `{{AUTH_FILE}}` — e.g. `src/auth/{{APP_SLUG}}.json`, written by `page.context().storageState(...)` |
| Wiring | `playwright.config.ts`: `use.storageState = AUTH_FILE`, and every browser project declares `dependencies: ['setup']` |
| Credentials | `{{env var names}}` — per-environment (e.g. `APP_ADMIN_USERNAME_UAT`), read via `requireEnv(...)`, never hardcoded |
| Roles | {{TODO: list each additional role and its own storageState file, or "single role"}} |

Rules that follow from this:

- A spec **never** instantiates the login POM, fills credentials, or calls
  a `login(...)` method. It starts already authenticated.
- A spec that genuinely needs no session (or a different role) says so via
  `test.use({ storageState: ... })` — the documented per-role file, or
  `{ cookies: [], origins: [] }` for anonymous — rather than logging in by
  hand.
- The **only** exception is a spec whose subject *is* authentication
  (invalid credentials, lockout, logout). Those legitimately drive the
  login POM directly, and run anonymous via `test.use`.
- Adding a new role means a new setup step + its own storage state file
  here, not a login call in a spec.

---

## 5. API Services (for preconditions + cleanup)

<!-- /qa-agents:init: list what API service helpers actually exist in this
     project, if any (path, methods). If the project doesn't have this
     layer, delete this section rather than inventing one. -->

{{TODO: fill in, or delete section if not applicable}}

---

## 6. Data Builders

Use when an entity has more than `{{builderFieldThreshold}}` configurable
fields and is used with many variants across specs *(only include this
section if `rules.builderFieldThreshold` is set)*.

---

## 7. Live DOM Inspection (mandatory)

**Never guess selectors from TC text alone.** Inspect the live page before writing or fixing any locator.

Tools:
- `dom-inspector` agent — preferred, returns structured locator recommendations
- `browser_snapshot` MCP tool — direct call when iterating
- `test_debug` MCP tool — for healing context, if the Playwright MCP server is available in this environment

---

## 8. Test Header + Naming

<!-- /qa-agents:init: fill from testHeaderFormat in the config, with a real
     example pulled from an existing spec if one exists. -->

{{TODO: fill in the project's actual test header/name format, or delete
this section if the project has no fixed convention}}

---

## 9. Code Style

<!-- /qa-agents:init: point to the project's actual lint config instead of
     restating rules here — e.g. "run `{{lintCommand}}` to check/fix style;
     see <path to eslint/prettier config> for the exact rules." -->

{{TODO: fill in}}

---

## 10. Project Structure Reference

<!-- /qa-agents:init: fill with the REAL directory layout discovered in
     Step 1 of the init command — pomDir, specDir, casesDir, base POM
     class location. Never hardcode a literal app URL here; reference the
     env var name the project uses instead. -->

```
{{TODO: real project structure}}
```
