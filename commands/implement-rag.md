---
description: Index the project's docs-drop folder (or a Jira issue/search URL, or a Confluence page/space URL) into the RAG store via its own `npm run rag:index` script — wraps the manual terminal step so it runs directly from Claude Code (requires /qa-agents:init to have scaffolded the `rag` layer).
---

# Index RAG Store

**Trigger when user says** (any language/form): implement-rag, rag:index, index rag, reindex, index tài liệu, nạp dữ liệu vào rag, cập nhật rag store, index the docs folder, index this jira issue into rag, index this confluence page/space into rag.

---

## Step 1 — Confirm the `rag` layer is scaffolded

`Grep` `package.json` for a `"rag:index"` script — that alone is enough,
since the `rag` layer always adds it. Don't gate on `src/rag/index.ts`
existing: the private variant (the only one this plugin scaffolds now)
deliberately has no local RAG source, only an installed
`@scope/rag-cli`-shaped npm dependency. A pre-existing project scaffolded
before this plugin went private-only may still have `src/rag/` — that's
fine too, `rag:index` being present is what matters.

- **Missing** → this project hasn't scaffolded the RAG layer yet. Tell the human to run `/qa-agents:init` and opt into the `rag` layer, then stop — do not try to invent or install anything else.
- **Present** → continue.

## Step 2 — Resolve arguments

Read `.claude/qa-agents.config.json` if present, for `ragCollection`.

- **Collection**: `--collection=<name>` from the user's message, else the config's `ragCollection`, else fall back to the CLI's own default (`requirements`) — don't invent a different default.
- **Source**: if the user's message already names one, use it directly and skip the question below:
  - a folder path,
  - a Jira URL (`.../browse/PROJ-123`, or a search URL with `jql=`), or
  - a Confluence URL (`.../wiki/spaces/SPACEKEY/...` — a single page if it has a `/pages/<id>/` segment, otherwise the whole space).

  Otherwise, if the human said nothing more specific than "index rag" / "reindex," don't ask — just run it against the default folder (`docs`); that's the common case and matches what `npm run rag:index` alone would already do.

  Only ask when it's genuinely ambiguous (e.g. the human said "index my docs" with no path/URL and `docs/` looks empty or isn't obviously it). Use `AskUserQuestion` (single-select) — this is a fixed set of choices, so it fits the tool. (Always ask in English, regardless of what language the human is chatting in — this org standardized on English tooling output.):

  ```
  question: "Which source do you want to index?"
  header: "RAG source"
  options:
    - label: "Docs folder (docs/)"
      description: "Index every .md/.txt/.docx file under docs/ — the default."
    - label: "Jira issue or search"
      description: "Pull one issue or a JQL search's results straight from Jira."
    - label: "Confluence page or space"
      description: "Pull one page, or every page in a space, straight from Confluence."
  ```

  If they pick **Jira** or **Confluence**, that's a fixed choice but the actual URL isn't — ask for it as a normal follow-up question in chat (not another `AskUserQuestion`, since a URL is free text, not a small option set), always in English: "What's the Jira issue URL (.../browse/PROJ-123) or search URL (with ?jql=...)?" or "What's the Confluence page or space URL (.../wiki/spaces/SPACEKEY/...)?" as applicable.

### Step 2b — Atlassian credentials, only if the source is Jira or Confluence

Both use the same Atlassian Cloud account, so the same check applies either way. The CLI needs `JIRA_EMAIL` and `JIRA_API_TOKEN` in `.env.local` (see `.env.example`'s Atlassian block) — check before running, don't let it fail on a missing-env error:

1. `Read` `.env.local` at the project root (if it doesn't exist yet, treat both vars as missing).
2. Check both `JIRA_EMAIL=` and `JIRA_API_TOKEN=` are present with a non-empty value.
3. If either is missing, ask **one at a time, in chat, not `AskUserQuestion`** (secrets are free text) — never combine both into one message:
   - First ask only for the Atlassian account email. Wait for the reply.
   - Then, in a separate follow-up message, ask only for the API token (mention `https://id.atlassian.com/manage-profile/security/api-tokens` if they need to generate one). Wait for the reply.
   - Skip whichever of the two `.env.local` already has — only ask for the one(s) actually missing.
4. Only once **all** missing value(s) from step 3 have been collected, write them to `.env.local` in a single pass — don't write the email right after it's given and then write the token separately once it arrives:
   - If `.env.local` doesn't exist yet, create it from `.env.example` first (`cp`), then fill in the two values.
   - If it exists, `Edit` only the exact `JIRA_EMAIL=`/`JIRA_API_TOKEN=` lines — never touch any other line, and never rewrite the whole file.
5. Never echo the token value back in your response — after writing, confirm only that it was saved to `.env.local`, not what it is.

## Step 3 — Run it

```bash
npm run rag:index -- <folder>              --collection=<collection>
# or, for a Jira or Confluence source:
npm run rag:index -- --url=<jira-or-confluence-url> --collection=<collection>
```

This rebuilds the CLI bundle first (`rag:build` is chained in), so first run is slower — that's expected, not a hang.

## Step 4 — Report, don't guess-fix

Summarize stdout: files/issues indexed, chunk counts per source, and the final `Done. N chunks indexed into collection "<collection>".` line.

On failure, surface the actual error rather than attempting a fix yourself:
- `JIRA_EMAIL`/`JIRA_API_TOKEN` missing → point to `.env.local` (see `.env.example`'s Atlassian block).
- `npm error 404`/`403` resolving a `@scope/rag-cli`-shaped package (private RAG variant only) → this is a registry-auth problem, not something to solicit or fix in chat: point to the project's `README.md` "RAG setup" section / `.npmrc.example` for copying it to `.npmrc` with a valid token (can't live in `.env.local` — `npm install` needs it before any dotenv-loaded code runs), and stop.
- Confluence "No Confluence space found for key ..." or a 403/404 → the space key in the URL is wrong, or the Atlassian account behind the token lacks read access to that space — don't retry blindly, tell the human which it looks like.
- `node:sqlite` / experimental flag errors → this project's Node version doesn't support the default `SqliteStore` backend; point to `guide/rag-guide.md`'s Requirements section for the fallback stores, don't patch Node flags yourself.
- Any other failure → paste the error verbatim and stop; this command indexes, it doesn't debug the RAG implementation.

## Step 5 — Update config if this was the first successful index

If `.claude/qa-agents.config.json` exists and its `ragCollection` is currently `null`, and this run just succeeded, set `ragCollection` to the collection used and tell the human you did so (so `knowledge-retriever` stops treating this project as unindexed). Don't touch the field if it was already set to something else — that's the human's call, not this command's.
