---
description: Index the project's docs-drop folder (or a Jira issue/search URL) into the vendored RAG store via its own `npm run rag:index` script — wraps the manual terminal step so it runs directly from Claude Code (requires /qa-agents:init to have scaffolded the `rag` layer).
---

# Index RAG Store

**Trigger when user says** (any language/form): implement-rag, rag:index, index rag, reindex, index tài liệu, nạp dữ liệu vào rag, cập nhật rag store, index the docs folder, index this jira issue into rag.

---

## Step 1 — Confirm the `rag` layer is scaffolded

`Glob` for `src/rag/index.ts` and `Grep` `package.json` for a `"rag:index"` script.

- **Missing** → this project hasn't scaffolded the RAG layer yet. Tell the human to run `/qa-agents:init` and opt into the `rag` layer, then stop — do not try to invent or install anything else.
- **Present** → continue.

## Step 2 — Resolve arguments

Read `.claude/qa-agents.config.json` if present, for `ragCollection`.

- **Collection**: `--collection=<name>` from the user's message, else the config's `ragCollection`, else fall back to the CLI's own default (`requirements`) — don't invent a different default.
- **Source**: if the user's message already names one (a folder path, or a Jira URL — `.../browse/PROJ-123` or a search URL with `jql=`), use it directly and skip the question below.

  Otherwise, if the human said nothing more specific than "index rag" / "reindex," don't ask — just run it against the default folder (`docs`); that's the common case and matches what `npm run rag:index` alone would already do.

  Only ask when it's genuinely ambiguous (e.g. the human said "index my docs" with no path/URL and `docs/` looks empty or isn't obviously it). Use `AskUserQuestion` (single-select) — this is a fixed set of choices, so it fits the tool:

  ```
  question: "Which source do you want to index?"
  header: "RAG source"
  options:
    - label: "Docs folder (docs/)"
      description: "Index every .md/.txt/.docx file under docs/ — the default."
    - label: "Jira issue or search"
      description: "Pull one issue or a JQL search's results straight from Jira."
  ```

  If they pick **Jira**, that's a fixed choice but the actual URL isn't — ask for it as a normal follow-up question in chat (not another `AskUserQuestion`, since a URL is free text, not a small option set): "Cho URL Jira issue (.../browse/PROJ-123) hoặc URL search (có ?jql=...)."

### Step 2b — Jira credentials, only if the source is Jira

The CLI needs `JIRA_EMAIL` and `JIRA_API_TOKEN` in `.env.local` (see `.env.example`'s Jira block) — check before running, don't let it fail on a missing-env error:

1. `Read` `.env.local` at the project root (if it doesn't exist yet, treat both vars as missing).
2. Check both `JIRA_EMAIL=` and `JIRA_API_TOKEN=` are present with a non-empty value.
3. If either is missing — ask the human directly in chat (plain question, not `AskUserQuestion` — secrets are free text): their Atlassian account email, and an API token from `https://id.atlassian.com/manage-profile/security/api-tokens`.
4. Write them to `.env.local`:
   - If `.env.local` doesn't exist yet, create it from `.env.example` first (`cp`), then fill in the two values.
   - If it exists, `Edit` only the exact `JIRA_EMAIL=`/`JIRA_API_TOKEN=` lines — never touch any other line, and never rewrite the whole file.
5. Never echo the token value back in your response — after writing, confirm only that it was saved to `.env.local`, not what it is.

## Step 3 — Run it

```bash
npm run rag:index -- <folder>              --collection=<collection>
# or, for a Jira source:
npm run rag:index -- --url=<jira-issue-or-search-url> --collection=<collection>
```

This rebuilds the CLI bundle first (`rag:build` is chained in), so first run is slower — that's expected, not a hang.

## Step 4 — Report, don't guess-fix

Summarize stdout: files/issues indexed, chunk counts per source, and the final `Done. N chunks indexed into collection "<collection>".` line.

On failure, surface the actual error rather than attempting a fix yourself:
- `JIRA_EMAIL`/`JIRA_API_TOKEN` missing → point to `.env.local` (see `.env.example`'s Jira block).
- `node:sqlite` / experimental flag errors → this project's Node version doesn't support the default `SqliteStore` backend; point to `guide/rag-guide.md`'s Requirements section for the fallback stores, don't patch Node flags yourself.
- Any other failure → paste the error verbatim and stop; this command indexes, it doesn't debug the RAG implementation.

## Step 5 — Update config if this was the first successful index

If `.claude/qa-agents.config.json` exists and its `ragCollection` is currently `null`, and this run just succeeded, set `ragCollection` to the collection used and tell the human you did so (so `knowledge-retriever` stops treating this project as unindexed). Don't touch the field if it was already set to something else — that's the human's call, not this command's.
