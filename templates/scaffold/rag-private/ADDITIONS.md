<!-- /qa-agents:init applies this only if the human opted into the RAG layer
     AND chose the "private" mode over "open source" for it (see rag/ vs
     rag-private/ — mutually exclusive, pick exactly one).

     This is the "hidden architecture" variant: instead of vendoring
     src/rag/ + scripts/rag-cli.ts into the target repo (the `rag` layer's
     approach), it installs a private, prebuilt RAG CLI as a normal npm
     dependency from an internal registry (GitHub Packages by default).
     Nobody with read access to this repo ever sees the RAG source — only
     whoever holds a valid registry token can even install the package.
     `knowledge-retriever` still talks to it via `npm run rag:query`, same
     as the open variant — usage is identical, only where the CLI binary
     comes from differs.

     Needs one piece of info from the human before applying: the private
     package's full name (scope + name), e.g. `@phoenix-dx/rag-cli`. Ask
     for it as a normal chat question (free text, not AskUserQuestion — this
     isn't a small fixed set) if not already stated, suggesting
     `@phoenix-dx/rag-cli` as the default since that's this org's existing
     package. Derive `{{RAG_PACKAGE_NAME}}` (the full name) and
     `{{RAG_PACKAGE_SCOPE}}` (the `@scope` part before the `/`) from the
     answer and substitute both wherever they appear below, same mechanism
     as `{{APP_SLUG}}` elsewhere in this plugin. -->

## 1. Source files (copied as-is by Step 0.3)

```
.npmrc              — routes {{RAG_PACKAGE_SCOPE}} to the private registry (safe to commit, no secret in it)
guide/rag-guide.md  — full ingestion guide (PDF, web page, Jira, Confluence, etc.)
docs/README.md      — the docs-drop folder's own instructions
```

Substitute `{{RAG_PACKAGE_SCOPE}}` in `.npmrc` before copying. If the
target project already has an `.npmrc` with other content, `Edit` in just
this one line instead of overwriting the file.

No RAG source (`src/rag/`, `scripts/rag-cli.ts`) is ever copied into this
repo — that's the entire point of this variant. Whoever maintains
`{{RAG_PACKAGE_NAME}}` builds and publishes it from their own private
source, outside this project.

## 2. package.json — scripts to add

```json
{
  "rag:index": "rag-cli index",
  "rag:query": "rag-cli query"
}
```

No `rag:build` step and no `esbuild` devDependency — `rag-cli` is an
installed binary (from `node_modules/.bin`, which `npm run` puts on
`PATH` automatically), not something built in this repo.

## 3. package.json — dependencies to add

```json
{
  "{{RAG_PACKAGE_NAME}}": "^1.0.0"
}
```

Use whatever the latest published major version actually is if the human
knows it — don't guess a version that doesn't exist; `^1.0.0` is just the
placeholder default.

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

Skip the generic `/dist/` line entirely if the `core` or `api-k6` layer
already added one — this variant produces no `dist/` of its own.

## 5. .env.example — lines to add

```
# Atlassian Cloud account (email + API token) — only needed for
# `npm run rag:index -- --url=<...>` against a Jira issue/search URL or a
# Confluence page/space URL (same token works for both, same site/account)
JIRA_EMAIL=
JIRA_API_TOKEN=
```

Skip if the `core` layer was already applied — its `.env.example`
template includes this block by default. This is the *only* credential
that belongs in `.env.local` for this layer — see Step 6 for why the
registry token does not.

## 6. Tell the human explicitly — registry auth can't live in `.env.local`

Installing `{{RAG_PACKAGE_NAME}}` requires a token *before* `npm install`
even runs, so it can't be loaded the way `JIRA_EMAIL`/`JIRA_API_TOKEN` are
(those load via `dotenv` inside application code, which only runs after
install already succeeded). Tell the human, plainly, once:

- They need a **personal, fine-grained GitHub PAT** with `read:packages`
  scope (add `repo` too if `{{RAG_PACKAGE_NAME}}`'s repo is private),
  created at https://github.com/settings/tokens.
- It goes in their **global** `~/.npmrc` (not this project's, not
  `.env.local`), one time per machine, not per project:
  ```
  //npm.pkg.github.com/:_authToken=<TOKEN>
  ```
- Without this, `npm install` in this project will fail to resolve
  `{{RAG_PACKAGE_NAME}}` — that's expected until they've done this once.
- CI needs the same token wired as a secret into whatever registry-auth
  step it already uses for other private packages, if any — this project
  doesn't set that up, it only assumes it's handled the same way as any
  other private dependency here.

## 7. Node version note — tell the human explicitly

Same as the open variant: the default `SqliteStore` backend inside
`{{RAG_PACKAGE_NAME}}` uses Node's built-in `node:sqlite` module
(unflagged from Node 23.4+, needs `--experimental-sqlite` on 22.5–23.3,
doesn't exist before 22.5). Flag it if the project's Node version doesn't
support it — see `guide/rag-guide.md`'s Requirements section for fallback
stores.

## 8. .claude/qa-agents.config.json

Same as the open variant — set `ragCollection` once indexing has actually
succeeded, leave `ragQueryCommand` `null` (this project's own
`npm run rag:query --` is still the default entry point either way).

## 9. Tell the human explicitly

- This hides the implementation from casual readers of the repo (nobody
  browsing the code sees any RAG source), not from anyone who has a
  working registry token and chooses to `npm pack`/inspect the installed
  package themselves. Say this plainly, don't oversell it as airtight
  secrecy.
