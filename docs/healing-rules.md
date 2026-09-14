# Healing Rules — Playwright Automation

> Priority-ordered playbook for fixing failing tests. App-agnostic — works
> the same regardless of which project's `.claude/qa-agents.config.json` is
> loaded. Companion files:
> - Conventions code must follow: [`framework-rules.md`](./framework-rules.md) (project-specific, written by `/qa-agents:init`)
> - Intent → method translation: [`intent-mapping.md`](./intent-mapping.md) (project-specific, written by `/qa-agents:init`)

---

## Golden rules

| Rule | Detail |
|---|---|
| **Execution before compliance** | Fix P1 (broken tests) first. P2 (style) only AFTER P1 passes |
| **Forward healing only** | NEVER touch code that already passes — only the current failure point |
| **Verify consequence, not absence of error** | A fix is complete when the UI/state changed as expected, NOT just when no error was thrown |

### What to verify after each fix type

| Action fixed | Must verify after |
|---|---|
| Click row / list item | Detail panel or expected next element appeared (`waitFor visible`) |
| Click submit-style button (Save / Submit / Login / ...) | Success message, URL change, OR expected validation error displayed |
| Fill form field | Field contains expected value |
| Navigate to page | Page heading/key element visible, matching the URL the page expects |
| Click nav link | URL matches the page's expected route AND page heading visible |

---

## P1 — Execution Healing (fix the broken test)

### P1.1 — DOM Locator

**Triggers**: `element not found`, `timeout waiting for selector`, `strict mode violation`

**Procedure:**
1. Spawn `dom-inspector` agent (or use `test_debug` MCP tool) to capture live DOM at failure point
2. Find the real element: role, placeholder, label, `data-testid`, `id`
3. Update the POM locator per priority order in [`framework-rules.md` §3](./framework-rules.md#3-locator-strategy) — check that project's doc for any app-specific gotchas it has recorded (component-library quirks, unlinked labels, etc.), don't assume a specific framework's rendering behavior here.

### P1.2 — Timing / Stuck Test

**Triggers**: Hanging tests, infinite waits, race conditions, `Timeout exceeded` on navigation

**Fixes:**
- Add explicit timeout to wait: `{ timeout: 5_000 }`
- Add an explicit "wait for network/load settle" call between action and assertion (use sparingly)
- **DO NOT** wait for a URL pattern right after a navigating action if that URL may already match before the action completes — wait for a post-action element instead:

```typescript
// ❌ Race condition — target URL may already match before the action completes
await this.submitButton.click();
await this.page.waitForURL(/.*\/dashboard/);

// ✅ Wait for post-action content
await this.submitButton.click();
await expect(this.dashboardHeading).toBeVisible({ timeout: this.navigationTimeout });
```

### P1.3 — Element Interaction

**Triggers**: `not interactable`, `not enabled`, `not visible`

**Procedure:**
1. Inspect DOM via `dom-inspector` / `test_debug` — understand WHY:
   - Hidden behind another element?
   - Disabled (e.g. a submit button before the form is filled)?
   - Off-screen / not rendered?
2. Add proper wait/scroll before interaction:

```typescript
await this.targetElement.waitFor({ state: 'visible' });
await this.targetElement.scrollIntoViewIfNeeded();
await this.targetElement.click();
```

### P1.4 — API Response

**Triggers**: Wrong status code, missing body field, unsafe-cast access errors

1. Log the response to confirm the JSON path:
   ```typescript
   console.log('response:', JSON.stringify(response));
   ```
2. Compare the actual response (status code, body shape) against the endpoint's
   real behavior — check the project's API service/model layer for what it
   actually returns, not what the test assumes.
3. If a real-runtime field is missing from the TypeScript interface → **update the model file first**, then access cleanly. NEVER use an unsafe type-cast as first choice.

```typescript
// ✅ Correct
if (!response.body) throw new Error('No response body');
const id = response.body.id;
if (!id) throw new Error('Missing id');

// ❌ Wrong
const id = (response.body as any).id;
```

---

## P2 — Framework Compliance (only after P1 passes)

Cross-references → [`framework-rules.md`](./framework-rules.md). This table
mirrors `compliance-checker`'s config-gated checklist — apply in order, and
only for rules whose flag is actually set in
`.claude/qa-agents.config.json`:

| Step | Check | Config flag |
|---|---|---|
| P2.1 | Test header/name format | `testHeaderFormat` set |
| P2.2 | Import path correct (fixture import if the spec uses one, else the plain test-runner import) | always |
| P2.3 | Auth via the global setup project's `storageState` — no login performed inside the spec (except a spec testing auth itself) | `rules.enforceLoginPattern` |
| P2.4 | No direct low-level interaction calls in spec — only POM methods | `rules.noPageDotInSpec` |
| P2.5 | No step-wrapper calls in spec — POM methods wrap internally | `rules.mandatoryTestStep` |
| P2.6 | POM locators `readonly` in constructor, NOT inside methods | `rules.readonlyLocators` |
| P2.7 | POM methods wrap body in the project's step helper | `rules.mandatoryTestStep` |
| P2.8 | Data Builder pattern if entity field count exceeds threshold and is reused across specs | `rules.builderFieldThreshold` |
| P2.9 | Linter passes | `lintCommand` set |
| P2.10 | No step comments duplicating step-wrapper labels | `rules.mandatoryTestStep` |

---

## Healing Workflow

```
1. Detect    → Run via spec-runner agent, get classified failure (P1.1 / P1.2 / P1.3 / P1.4 / P2)
2. Analyze   → For P1.1/P1.3 spawn dom-inspector. For P1.4 check the project's API service/model layer.
3. Heal      → Spawn code-fixer with the classification + report. Forward only. Verify consequence.
4. Validate  → Re-run via spec-runner. If still failing, re-classify and loop (capped — see Escalation Format).
5. Compliance → Once green, walk the P2 list top-to-bottom via compliance-checker + code-fixer (also capped).
```

The priority table above (P1.1–P1.4, P2) is the single source of truth for "what
fix to apply" — `code-fixer` reads it directly. Callers (`implement-script`,
`implement-fix-script`) should NOT restate the table inline; they just supply the
classification + report and spawn the agent.

---

## Escalation Format

Use this when a retry cap below is hit, or `spec-evaluator` returns
`do NOT commit.` (< 70). **The calling command populates this — not an agent.**
No leaf agent (`spec-runner`, `compliance-checker`, `spec-evaluator`) retains
history across calls; only the command's own conversation-level loop state has
the attempt history, so "What was tried" must come from there.

```
## Escalation: <spec-path or feature>

Reason: <e.g. "3 consecutive P1.1 fails" | "5 total fix-cycles without converging" | "spec-evaluator score 62/100 — do NOT commit">

### What was tried
- <attempt 1> → <result>
- <attempt 2> → <result>
- <attempt 3> → <result>

### Current state
<PASS/FAIL, last error + file:line, or scorecard total>

### Recommended human action
<concrete next step>
```

### Retry caps (apply in both `implement-script.md` and `implement-fix-script.md`)

| Cap | Trigger | Action |
|---|---|---|
| Same-classification cap | 3 consecutive fails with the SAME classification (e.g. P1.1 three times in a row) | Stop, escalate |
| Total-attempts backstop | 5 total heal→re-run cycles regardless of classification (catches **oscillating** failures) | Stop, escalate |
| Compliance-loop cap | 5 iterations of "fix violation → re-audit" without reaching `Verdict: clean` | Stop, escalate |

---

## When to use `test_debug` MCP tool (if the Playwright MCP server is available)

Use at specific checkpoints, NOT first resort:

| Checkpoint | Why |
|---|---|
| After P1.1 fix | Verify new locator resolves in live DOM |
| After P1.3 fix | Confirm element interactable in real browser state |
| Before P2 fixes | Confirm test passes execution first |
| When multiple locator candidates | Pick the correct one from live DOM |

**Do NOT use `test_debug` when:**
- Test already passes
- Failure is clearly P2 (no DOM involved)
- Error is TypeScript / import — fix code directly

> `test_debug` vs `browser_snapshot`: `test_debug` captures DOM state AFTER prior test steps ran — gives real context of the failure. `browser_snapshot` only shows the page from a fresh navigation. Use `test_debug` for healing; `browser_snapshot` for initial generation.

---

## Stale-cache troubleshooting

If your code change appears correct but the failure recurs verbatim:

1. **Read the file back** — confirm disk matches your edit
2. **Clear the test runner's transform/build cache** — check the project's own troubleshooting notes (its `CLAUDE.md`) for the exact path/command; don't assume this plugin's own cache location.
3. **If MCP-related**: changed a global setup/config file but MCP still loads the old version → restart the Claude Code session (MCP caches modules)
