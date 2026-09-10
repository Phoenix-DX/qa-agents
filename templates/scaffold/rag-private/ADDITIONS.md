<!-- /qa-agents:init applies this only if the human opted into the RAG layer
     AND chose the "private" mode over "open source" for it (see rag/ vs
     rag-private/ — mutually exclusive, pick exactly one).

     This is the "hidden architecture" variant: instead of vendoring
     src/rag/ + scripts/rag-cli.ts into the target repo (the `rag` layer's
     approach), it ships a tiny fetch script that downloads a prebuilt
     dist/rag-cli.mjs bundle from an internal artifact host at build time.
     Nobody with read access to this repo ever sees the RAG source or even
     the built bundle in git history — only whoever holds a valid
     RAG_ARTIFACT_TOKEN can pull it, and even then only into their local
     untracked dist/. `knowledge-retriever` still talks to it via
     `npm run rag:query`, same as the open variant — usage is identical,
     only the build step differs. -->

## 1. Source files (copied as-is by Step 0.3)

```
scripts/fetch-rag-cli.mjs — downloads the prebuilt CLI bundle using RAG_ARTIFACT_URL/RAG_ARTIFACT_TOKEN
guide/rag-guide.md        — full ingestion guide (PDF, web page, Jira, Confluence, etc.)
docs/README.md            — the docs-drop folder's own instructions
```

No RAG source (`src/rag/`, `scripts/rag-cli.ts`) is ever copied into this
repo — that's the entire point of this variant. Whoever maintains the
artifact host builds and publishes `dist/rag-cli.mjs` from their own
private source, outside this project.

## 2. package.json — scripts to add

```json
{
  "rag:build": "node scripts/fetch-rag-cli.mjs",
  "rag:index": "npm run rag:build && node dist/rag-cli.mjs index",
  "rag:query": "npm run rag:build && node dist/rag-cli.mjs query"
}
```

No `esbuild` devDependency needed — there's nothing to bundle locally,
only a file to download.

## 3. package.json — dependencies to add

```json
{
  "@huggingface/transformers": "^4.2.0",
  "@qdrant/js-client-rest": "^1.18.0",
  "dotenv": "^17.2.3"
}
```

The downloaded bundle is built with `--packages=external` (same as the
open variant), so these still need to be real `node_modules` packages at
runtime even though the code that imports them isn't visible here.
`mammoth` is omitted — the bundle only needs it if the maintainer's
private source still handles `.docx`; check with them or add it back if
`rag:index`/`rag:query` errors on a missing module.

- `dotenv` may already be present if the `core` layer was applied — skip
  the duplicate in that case.

## 4. .gitignore — lines to add

```
# docs/ — local requirement docs dropped in for RAG indexing, not framework code
/docs/*.md
/docs/*.txt
/docs/*.docx
!/docs/README.md

# RAG local vector store (SQLite) — local index, not shared via git
/.rag/
```

Do **not** add an exception for `dist/rag-cli.mjs` — unlike a normal build
artifact, this one must never be committed (it's fetched fresh by whoever
has the token, not shared via git). Skip the generic `/dist/` line
entirely if the `core` or `api-k6` layer already added one.

## 5. .env.example — lines to add

```
# Internal artifact host for the private RAG CLI bundle — ask whoever
# maintains it for a URL + token; do not commit real values here.
RAG_ARTIFACT_URL=
RAG_ARTIFACT_TOKEN=

# Atlassian Cloud account (email + API token) — only needed for
# `npm run rag:index -- --url=<...>` against a Jira issue/search URL or a
# Confluence page/space URL (same token works for both, same site/account)
JIRA_EMAIL=
JIRA_API_TOKEN=
```

Skip the `JIRA_EMAIL`/`JIRA_API_TOKEN` pair if the `core` layer was already
applied — its `.env.example` template includes that block by default.
`RAG_ARTIFACT_URL`/`RAG_ARTIFACT_TOKEN` are new either way — always add
them when this layer is scaffolded.

## 6. Node version note — tell the human explicitly

Same as the open variant: the default `SqliteStore` backend inside the
fetched bundle uses Node's built-in `node:sqlite` module (unflagged from
Node 23.4+, needs `--experimental-sqlite` on 22.5–23.3, doesn't exist
before 22.5). Flag it if the project's Node version doesn't support it —
see `guide/rag-guide.md`'s Requirements section for fallback stores.

## 7. .claude/qa-agents.config.json

Same as the open variant — set `ragCollection` once indexing has actually
succeeded, leave `ragQueryCommand` `null` (this project's own
`npm run rag:query --` is still the default entry point either way).

## 8. Tell the human explicitly

- They (or whoever owns this repo's RAG setup) need to have already built
  and published a `dist/rag-cli.mjs` bundle to an authenticated host
  reachable via `RAG_ARTIFACT_URL`, and generated a `RAG_ARTIFACT_TOKEN`
  for this project's `.env.local` — this layer only wires up the *client*
  side (the fetch script), it does not build or host anything itself.
- Anyone who needs to actually run `rag:index`/`rag:query` locally will
  need a working token — so this hides the implementation from casual
  readers of the repo, not from anyone who has a token and chooses to
  inspect the downloaded bundle themselves. Say this plainly, don't oversell
  it as airtight secrecy.
