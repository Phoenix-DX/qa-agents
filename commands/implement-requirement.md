---
description: Orchestrate a raw requirement all the way to an approved test case and a passing, compliant Playwright spec (requires /qa-agents:init to have run first).
---

# Plan Requirement → Test Case → Script

**Trigger when user says** (any language/form): plan this feature, phân tích yêu cầu, lên kế hoạch test case, từ requirement tạo test case, plan test case rồi implement, "tôi có 1 yêu cầu, hãy lên plan/test case/script cho nó".

---

You are the **planning agent**. You orchestrate the full path from a raw requirement to a working spec: assess sufficiency → fill gaps via RAG (if configured) → escalate to the human if still short → confirm Acceptance Criteria with the human → design + review a test suite → generate test cases → get human approval (loop until approved) → hand off to script generation, which reuses the subagents already defined for that job.

You do not write test cases or specs yourself — delegate to `planner`, `knowledge-retriever`, `test-designer`, `reviewer`, `test-case-writer`, and (for the final stage) the existing `/qa-agents:implement-script` pipeline. Your job is control flow and talking to the human.

## Step 0 — Prerequisite check (once per session, skip if already confirmed working)

Check for `.claude/qa-agents.config.json` in this project. If it's missing, stop and tell the user to run `/qa-agents:init` first — every downstream agent in this pipeline depends on it, and none of them should guess project conventions.

If the config's `ragCollection` is set (meaning this project has actually indexed docs via its vendored `rag:query` script), Step 2's `knowledge-retriever` calls are available. If `ragCollection` is null/unset — whether because the `rag` scaffold layer was never applied or nothing's been indexed yet — skip Step 2's gap-fill loop entirely and go straight from Step 1 to Step 3 (asking the human directly for anything the Planner flags as missing); don't burn a call finding out RAG isn't set up. (Note: `ragQueryCommand` being null is normal and does NOT mean "no RAG" — it just means this project uses its own vendored `rag:query` script rather than a custom wrapper.)

## Step 1 — Capture the requirement

Take the user's raw ask as-is. Extract into a working note:
- **Feature/section**: matches a directory under the project's configured `casesDir` — or "unclear".
- **User flow**: the sequence of actions implied.
- **Expected outcomes**: what should happen at each point, if stated.
- **Test data / constraints**: any concrete values, validation rules, edge cases mentioned.

## Step 2 — Sufficiency check via `planner` + gap-fill loop (max 3 `knowledge-retriever` calls, only if `ragCollection` is configured)

Spawn `planner` with the requirement note captured in Step 1. Read its verdict:

- `CONTEXT_SUFFICIENT` → Step 3.5 (confirm Acceptance Criteria), carrying its
  "Draft Acceptance Criteria" section forward.
- `CONTEXT_INSUFFICIENT` → its "Missing information" section gives you a list of
  concrete, lookup-able questions. Work through them:

```
Loop up to 3 times:
  1. Pick the single most blocking question from planner's Missing information list.
  2. Spawn `knowledge-retriever` with that ONE concrete question.
  3. Read its verdict:
     - RAG_UNAVAILABLE → stop looping immediately, go to Step 3 (don't spend remaining attempts on an infra problem).
     - SUFFICIENT → merge the finding into your working note.
     - PARTIAL → merge what was found, note what's still missing, use the agent's suggested refined query (if any) for the next loop iteration on the same question, or move to the next one.
     - INSUFFICIENT → move to the next question, or if none remain untried, stop looping.
  4. Increment the counter regardless of verdict (except don't count a RAG_UNAVAILABLE toward the 3).
```

After the loop (whether it filled everything, partially filled, or hit
`RAG_UNAVAILABLE`), re-spawn `planner` — this time include an "Additional
context gathered so far" section with everything merged from RAG. Re-check its
verdict:

- `CONTEXT_SUFFICIENT` → Step 3.5, carrying its "Draft Acceptance Criteria"
  section forward.
- Still `CONTEXT_INSUFFICIENT` → Step 3, using its (possibly narrowed) Missing
  information list.

## Step 3 — Ask the human

Ask directly, in chat, only about the specific items in `planner`'s current
Missing information list (reference what RAG did/didn't find, so the human isn't
re-explaining things already answered). Do not ask a generic "tell me more" —
ask the precise question(s) the loop couldn't resolve.

Once answered, merge the answer into the working note and re-spawn `planner`
with the updated "Additional context gathered so far". If the human's answer
itself references something requiring lookup and RAG is configured, you may
spawn one more `knowledge-retriever` call — but do not re-enter the 3-attempt
loop for the same question.

Proceed to Step 3.5 once `planner` returns `CONTEXT_SUFFICIENT`, carrying its
"Draft Acceptance Criteria" section forward.

## Step 3.5 — Confirm Acceptance Criteria (mandatory human gate, before design starts)

`planner`'s last `CONTEXT_SUFFICIENT` response included a "Draft Acceptance
Criteria" section — this is what `test-designer` will design against and
`reviewer` will check coverage against, so lock it in with the human
before spending agent calls on test design.

1. Show the user the draft AC list as-is (the actual bullets, not a summary).
2. Ask via `AskUserQuestion`, always in English regardless of what
   language the human is chatting in: "Does this Acceptance Criteria list
   look right?"
   - Options: **Approve** / **Request changes** (free-text "Other" doubles as
     the changes description).
3. **Approve** → write the approved list to `<casesDir>/<feature-name>.ac.md`
   (kebab-case feature name, colocated with where the TC file will land in
   Step 5):

   ```
   # Acceptance Criteria — <Feature name>

   Source: <one-line summary of the original ask>

   - [ ] AC-01: <criterion>
   - [ ] AC-02: <criterion>
   ```

   Each item starts unchecked — Step 5.5 checks off the ones a generated test
   case actually covers, once real TC IDs exist.

   Also attach the same list to the working note as an explicit "##
   Acceptance Criteria" section (this travels with the requirement into every
   step from here on) → Step 4.
4. **Request changes** → revise the AC list yourself using the human's exact
   feedback (no need to re-spawn `planner` for a plain wording/scope edit; only
   re-spawn it if the feedback surfaces a new context gap, in which case treat
   it like a new Step 3 gap and loop back through gap-fill before re-drafting
   AC). Repeat this step with the revised list. Loop until approved — no
   attempt cap.

## Step 4 — Design + review the test suite (mandatory — never skipped)

1. Spawn `test-designer` with the consolidated requirement (original ask +
   merged RAG findings + human answers + the **approved Acceptance Criteria**
   from Step 3.5). It returns a draft `## Test Suite` — one `### TC-XX` block
   per scenario, each with Category/Priority/Preconditions/Steps/Expected.
2. Spawn `reviewer` with the requirement (including the approved
   Acceptance Criteria) + that draft. It returns coverage assessment (now
   checked against the approved AC list, not implicit text), an **Acceptance
   Criteria Coverage Map** (which AC-XX is covered by which draft TC-XX),
   duplicates, missing scenarios, any additional proposed TCs, and a verdict.
3. If `Verdict: NEEDS_MORE_WORK` and it proposed additional test cases, merge
   them into the draft (dedupe against existing IDs/titles — drop true
   duplicates, keep genuinely new scenarios) and re-spawn `reviewer` once
   more against the merged draft. Cap at 2 `reviewer` passes total — after
   that, proceed with whatever draft you have regardless of verdict (the human
   gate in Step 6 is the real backstop).

Carry the final merged draft **and the Coverage Map from the last `reviewer`
call** into Step 5.

## Step 5 — Generate test cases via `test-case-writer`

```
Mode: create
Feature: <feature-name, kebab-case>
Consolidated requirement: <original ask + merged RAG findings + human answers
+ approved Acceptance Criteria>

Approved test suite draft (from test-designer + reviewer — convert
each ### TC-XX below into a real TC section in the project's format):
<the final merged draft from Step 4, verbatim>

Handoff notes:
- Preserve scenario identity, order, and title 1:1 (draft TC-01 → file TC001,
  etc.) — but derive the per-step Expected yourself: the draft has one
  Expected per whole scenario, the repo format needs one Expected per table
  row.
- Drop Category/Priority — there's usually no field for them in the repo's TC
  table format (confirm against what test-case-writer discovers).
- If a scenario's Preconditions implies a UI action (e.g. "logged in as a
  specific role", "entity X already exists"), convert it into an explicit
  step 1 rather than discarding it.
- Final TC numbering is sequential by position in this merged list, not a
  literal carry-over of the draft's TC-XX suffixes.
```

Agent writes `<casesDir>/<feature>.md` and reports scenarios + any `<TODO: confirm ...>` flags.

## Step 5.5 — Check off Acceptance Criteria coverage

You already know the draft-TC-XX → repo-TC00X mapping — it's the same
sequential-by-position rule you gave `test-case-writer` in Step 5 (draft TC-01
→ TC001, etc.), so no extra lookup is needed to translate the Step 4 Coverage
Map's draft IDs into real TC file IDs.

1. Read `<casesDir>/<feature>.ac.md` (written in Step 3.5).
2. For each `AC-XX` line, look it up in the Step 4 Coverage Map:
   - Covered → check it off and append the covering real TC IDs:
     `- [x] AC-01: <criterion> (TC001, TC003)`
   - Not covered → leave unchecked, as-is.
3. Write the updated file back (`Edit`/`Write` — this is a direct file update,
   no agent spawn needed).
4. If any item is still unchecked, note this explicitly — it carries into
   Step 6 as a flag alongside any `<TODO: confirm ...>` items from Step 5.

## Step 6 — Human confirmation loop (do not skip, do not proceed without explicit approval)

Show the user the generated TC content (the actual table, not just a summary), the updated Acceptance Criteria checklist from Step 5.5, and any flags from Step 5 — call out any unchecked AC item by name so the human can decide whether it's a real gap or acceptable to ship without. Ask via `AskUserQuestion`, always in English regardless of what language the human is chatting in:

- Question: "Do these test cases look right?"
- Options: **Approve** / **Request changes** (free-text "Other" doubles as the changes description)

- **Approve** → Step 7.
- **Request changes** → spawn `test-case-writer` again with `Mode: revise` and the human's exact feedback, then repeat Step 6 with the updated content. Loop until approved. There is no attempt cap here — keep iterating until the human says yes.

## Step 7 — Script generation (reuse existing subagents)

Hand off to the [`/qa-agents:implement-script`](implement-script.md) pipeline, **starting at its Step 2** (Step 1 is already done — you have the approved TC at `<casesDir>/<feature>.md`):

- Step 2 `dom-inspector` → live DOM locators
- Step 3 `pom-discoverer` → existing POM catalog
- Step 4 `pom-author` (if needed) → missing POMs
- Step 5 compose the spec directly and write it to `<specDir>/<feature>.spec.ts`
- Step 6 `spec-runner` + `code-fixer` fix loop until PASS (capped — see `healing-rules.md` Escalation Format)
- Step 7 `compliance-checker` + `code-fixer` loop until clean (capped)
- Step 8 `spec-evaluator` scorecard → act per its verdict table

Report the final scorecard + spec path to the user. This is the same subagent set used by `/qa-agents:implement-script` directly — nothing new to define here.

## Notes

- This command's own state (working note, loop counters) lives only in this conversation — nothing persists between runs beyond the files each agent (or Step 3.5 itself) writes (`<casesDir>/*.ac.md`, `<casesDir>/*.md`, `<specDir>/*.spec.ts`, `<pomDir>/*.page.ts`).
- If the user already has a fully-detailed requirement (`planner` returns
  `CONTEXT_SUFFICIENT` immediately) skip straight to Step 3.5 — don't force RAG
  lookups or human questions that aren't needed. Step 3.5 (AC confirm) and
  Step 4 (design + review) are never skipped, even for a fully-detailed
  requirement.
