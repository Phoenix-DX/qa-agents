# RAG Knowledge Ingestion Guide

How to get any new knowledge — a markdown/text/docx file, a PDF, a web page,
a Jira story, or a data-driven HTML export — into this project's RAG store
so the `knowledge-retriever` agent and ad-hoc queries (`npm run rag:query`)
can retrieve it.

Backing implementation: a private, prebuilt `dist/rag-cli.mjs` bundle
(two-stage retrieve + cross-encoder rerank, local SQLite by default) fetched
from an internal artifact host via `RAG_ARTIFACT_URL`/`RAG_ARTIFACT_TOKEN` —
**source is intentionally not vendored into this repo** (see
`scripts/fetch-rag-cli.mjs`). Usage from here on is identical to the
open-source variant; only where the CLI binary comes from differs. See
`.claude/qa-agents.config.json` for this project's `ragCollection` name.

---

## Quick path — `.md` / `.txt` / `.docx`

These 3 extensions are read natively by `rag-cli`. No conversion needed:

1. Drop the file into `docs/` (any subfolder works — it's walked
   recursively).
2. Run:
   ```bash
   npm run rag:index
   ```
3. Verify it's retrievable:
   ```bash
   npm run rag:query -- "a question the doc should be able to answer"
   ```
   Check the `source` field in the result points to your file, and
   `rerankScore` is reasonably high (roughly > 0 for a genuinely relevant
   chunk — very negative scores mean the reranker doesn't think it answers
   the question).

That's the entire flow for the common case. Everything below is for formats
`rag-cli` can't read directly.

---

## Jira story / issue

`rag-cli` can pull a Jira issue (or a whole JQL search) straight from the
API — no manual copy/paste:

```bash
npm run rag:index -- --url=https://<your-jira-domain>/browse/PROJ-123
# or a search URL with a jql= param, to index many issues at once:
npm run rag:index -- --url="https://<your-jira-domain>/issues/?jql=project=PROJ"
```

Requires `JIRA_EMAIL` and `JIRA_API_TOKEN` in `.env.local` (an [Atlassian
API token](https://id.atlassian.com/manage-profile/security/api-tokens),
not your account password).

---

## Confluence page / space

`rag-cli` can also pull straight from Confluence Cloud's REST API — same
credentials as Jira (`JIRA_EMAIL` / `JIRA_API_TOKEN`, same Atlassian
account/site):

```bash
# a single page (URL contains /pages/<id>/):
npm run rag:index -- --url=https://<your-domain>.atlassian.net/wiki/spaces/SPACEKEY/pages/12345/Some+Title
# or a whole space (no /pages/<id>/ segment) — walks every page in it:
npm run rag:index -- --url=https://<your-domain>.atlassian.net/wiki/spaces/SPACEKEY/overview
```

Notes:
- Indexing a space walks all pages under that space key via the Confluence
  v2 API (paginated) — nested/child pages included, no need to link each one
  individually.
- The Atlassian account behind the token needs read access to the space.
- Content comes from each page's storage-format body, stripped down to
  plain text (tables/lists kept as `|`/`-` separated lines, Confluence-only
  macros dropped) — not a full-fidelity Markdown conversion.
- A large space can mean a lot of chunks; there's a 1500-page safety cap per
  run, same idea as the Jira JQL cap above.

---

## PDF

`rag-cli` does **not** parse `.pdf` today (only `.md`/`.txt`/`.docx`). To
index one, convert it to Markdown first:

1. Ask Claude to read the PDF (the `Read` tool supports PDF; for docs over
   10 pages, read it in page ranges — max 20 pages per call).
2. Have Claude write the extracted content as `docs/<name>.md` — plain
   Markdown, tables kept as tables, no need to preserve exact PDF layout.
3. Run `npm run rag:index` as usual.

---

## URL / web page

Also not auto-fetched (Confluence is the exception — see above). Convert
manually for anything else:

1. Ask Claude to fetch the page (`WebFetch`).
2. Have Claude strip navigation/ads/boilerplate and keep just the
   substantive content, saved as `docs/<name>.md` (add a `Source: <url>`
   line at the top for traceability).
3. Run `npm run rag:index`.

---

## Data-driven HTML (interactive tool export, dashboard, etc.)

Some "documents" are actually small web apps — the real knowledge lives as
JS data objects inside a `<script>` tag (e.g. a tree-explorer UI), not as
readable HTML text. Stripping tags alone loses the data:

1. Locate the `const X = {...}` / `const X = [...]` declarations that hold
   the actual content (grep for `^const ` to find top-level declarations
   and their closing line).
2. Extract just those declarations (skip DOM/jQuery/event-handler code) and
   evaluate them in a Node `vm` sandbox — safe, since nothing touches the
   DOM.
3. Walk the resulting objects, strip HTML-in-string fields (`<p>`, `<ul>`,
   `<b>`, `<code>`, etc.) into plain Markdown, keep any Mermaid diagram
   strings as fenced ` ```mermaid ` code blocks, render tables for
   structured fields.
4. Write the result to `docs/<name>.md`, then `npm run rag:index`.

This is a one-off manual conversion (ask Claude to do it given the specific
file) — there's no generic tool for it since every such export has a
different internal data shape.

---

## After indexing: always verify

```bash
npm run rag:query -- "<a question only the new doc could answer>"
```

Confirm the top result's `source` is the new file and the content actually
answers the question. An empty array or all-negative `rerankScore` means
nothing relevant got indexed — check the file actually landed in `docs/`
and the index step reported `Indexed N chunks from docs/<file>`.

---

## Sharing what's indexed with teammates

Two options — pick based on what you need:

| Option | How | Tradeoff |
|---|---|---|
| Share the source doc | Send the `docs/*.md` file (chat/drive), teammate drops it into their own `docs/` and runs `npm run rag:index` | Reproducible, source of truth stays as docs, but each person rebuilds their own store |
| Share the built index | Copy `.rag/store.sqlite` directly into the same relative path in their repo | Instant, no rebuild — but it's a binary blob, must be sent outside git (`.rag/` is gitignored), and both sides need `@huggingface/transformers` installed for the embedder/reranker models |

Either way, `.rag/` and `docs/` (except `docs/README.md`) are gitignored —
nothing here is meant to go through a normal `git push`/`git pull`.

---

## Requirements

- Node **22.5+** with `node:sqlite` enabled (unflagged from Node 23.4+; on
  22.5–23.3 run with `--experimental-sqlite`). The default `SqliteStore`
  backend needs it — swap in `InMemoryVectorStore` (non-persistent) or
  `QdrantStore` (needs a running Qdrant instance) if that's not an option.
- First run downloads the embedder/reranker models
  (`@huggingface/transformers`, ONNX runtime) — expect a one-time delay and
  disk usage on `npm run rag:index`/`rag:query`.

---

## Troubleshooting

- `knowledge-retriever` returns `RAG_UNAVAILABLE` → nothing indexed yet, or
  `.rag/store.sqlite` doesn't exist. Fix: drop a doc in `docs/` and run
  `npm run rag:index` (it auto-creates the SQLite file).
- Query returns nothing relevant / low `rerankScore` → either nothing
  indexed covers that topic, or the question is too vague — try a narrower
  question using terms that actually appear in the source document.
