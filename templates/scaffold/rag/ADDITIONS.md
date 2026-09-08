<!-- /qa-agents:init applies this only if the human opted into the RAG layer.

     This layer VENDORS a real two-stage RAG implementation (embed + SQLite
     store + cross-encoder rerank) directly into the target project — no
     external tool install required. It's a generalized copy of a proven
     in-repo implementation (embedder/reranker/vector-store/Jira-fetch),
     not an invented one. `knowledge-retriever` talks to it via
     `npm run rag:query`, a per-project script, not a global binary. -->

## 1. Source files (copied as-is by Step 0.3)

```
src/rag/                — embedder, reranker, vector stores (sqlite/in-memory/qdrant), pipeline, evaluator
src/utils/env.ts        — requireEnv() helper (skip if core layer already added this — same file, no conflict)
scripts/rag-cli.ts      — the index/query CLI, bundled by esbuild into dist/rag-cli.mjs
guide/rag-guide.md      — full ingestion guide (PDF, web page, Jira, etc.)
docs/README.md          — the docs-drop folder's own instructions
```

## 2. package.json — scripts to add

```json
{
  "rag:build": "esbuild scripts/rag-cli.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/rag-cli.mjs",
  "rag:index": "npm run rag:build && node dist/rag-cli.mjs index",
  "rag:query": "npm run rag:build && node dist/rag-cli.mjs query"
}
```

## 3. package.json — devDependencies to add

```json
{
  "esbuild": "^0.24.0"
}
```

Skip if the `api-k6` layer already added `esbuild` at the same (or a
satisfiable) version — don't add a duplicate/conflicting entry.

## 4. package.json — dependencies to add

```json
{
  "@huggingface/transformers": "^4.2.0",
  "@qdrant/js-client-rest": "^1.18.0",
  "dotenv": "^17.2.3",
  "mammoth": "^1.12.0"
}
```

- `dotenv` may already be present if the `core` layer was applied — skip
  the duplicate in that case.
- `@qdrant/js-client-rest` only matters if the human later swaps in
  `QdrantStore` — the default `SqliteStore` path never imports it. Still
  worth adding now so `stores/qdrant.store.ts` type-checks.

## 5. .gitignore — lines to add

```
# docs/ — local requirement docs dropped in for RAG indexing, not framework code
/docs/*.md
/docs/*.txt
/docs/*.docx
!/docs/README.md

# RAG local vector store (SQLite) — local index, not shared via git
/.rag/
```

Skip the `/dist/` line if the `core` layer already added a generic one —
`dist/rag-cli.mjs` (the esbuild output) is already covered by it.

## 6. .env.example — lines to add (optional block)

```
# Only needed for `npm run rag:index -- --url=<jira-issue-or-search-url>`
JIRA_EMAIL=
JIRA_API_TOKEN=
```

Skip if the `core` layer was already applied — its `.env.example` template
includes this block by default. Only add it here if `rag` is being
scaffolded without `core`.

## 7. Node version note — tell the human explicitly

The default `SqliteStore` backend uses Node's built-in `node:sqlite`
module: unflagged from Node 23.4+, needs `--experimental-sqlite` on
22.5–23.3, and doesn't exist before 22.5. If the project's Node version is
older or pinned elsewhere, flag this rather than silently assuming it
works — see `guide/rag-guide.md`'s Requirements section for the fallback
options (`InMemoryVectorStore`, `QdrantStore`).

## 8. .claude/qa-agents.config.json

Set `ragCollection` to the collection name the human chooses once they've
actually run `npm run rag:index` — leave it `null` until indexing has
really happened (this is Step 1.6 / Step 3 of the main init flow, not a new
step). Leave `ragQueryCommand` `null` — `null` now means "use this
project's own `npm run rag:query --`", which is the vendored default this
layer just installed; only set it if the project genuinely wired up
something else instead.
