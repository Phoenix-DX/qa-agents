<!-- /qa-agents:init applies this only if the human opted into the RAG layer.
     There is only this one variant — org policy is to never vendor RAG
     source into a target repo, so this plugin doesn't offer that as a
     choice at all.

     Instead of vendoring src/rag/ + a CLI script into the target repo,
     this installs a private, prebuilt RAG CLI as a normal npm dependency
     from an internal registry (GitHub Packages by default). Nobody with
     read access to this repo ever sees the RAG source — only whoever
     holds a valid registry token can even install the package.
     `knowledge-retriever` still talks to it via `npm run rag:query`, same
     as any RAG-backed project — usage is identical, only where the CLI
     binary comes from differs.

     `{{RAG_PACKAGE_NAME}}` is always `@phoenix-dx/rag-cli` and
     `{{RAG_PACKAGE_SCOPE}}` is always `@phoenix-dx` — this org has
     exactly one private RAG package, so init.md's Step 3c doesn't ask
     about it, just substitutes both wherever they appear below (same
     mechanism as `{{APP_SLUG}}` elsewhere in this plugin). Only honor a
     different package name if the human explicitly names one unprompted
     in their own message. -->

## 1. Source files (copied as-is by Step 0.3)

```
.npmrc.example      — template for the project-local .npmrc (gitignored, holds the real token) — copy is NOT this repo's job, tell the human to do it (see Step 6)
guide/rag-guide.md  — full ingestion guide (PDF, web page, Jira, Confluence, etc.)
docs/README.md      — the docs-drop folder's own instructions
```

Substitute `{{RAG_PACKAGE_SCOPE}}` in `.npmrc.example` before copying.
Never create the real `.npmrc` yourself — it would hold a live secret you
don't have, and shouldn't invent. If the target project already has an
`.npmrc.example` with other content, `Edit` in just the RAG registry line
instead of overwriting the file.

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

# Real .npmrc holds a live registry token — never committed, only .npmrc.example is
/.npmrc
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
install already succeeded — too late for `npm install` itself). Tell the
human, plainly, once:

- Copy `.npmrc.example` to `.npmrc` **at this project's root** and fill in
  their own token — this file is gitignored, never committed, and lives
  per-project (re-create it after every fresh clone, it isn't shared via
  git).
- The token is a **personal, fine-grained GitHub PAT** with `read:packages`
  scope (add `repo` too if `{{RAG_PACKAGE_NAME}}`'s repo is private),
  created at https://github.com/settings/tokens — or requested through
  whatever internal channel (1Password/Slack/onboarding doc) the team
  already uses for shared secrets. Don't reuse someone else's token, and
  don't invent or guess one.
- Without this, `npm install` in this project will fail to resolve
  `{{RAG_PACKAGE_NAME}}` — that's expected until they've done this once
  per clone.
- CI needs the same token wired as a secret that writes this project's
  `.npmrc` (or an equivalent registry-auth step) before its own
  `npm install` — this layer doesn't set that up, it only assumes it's
  handled the same way as any other private dependency here.

## 7. README.md — insert a "RAG setup" section, if README.md exists

If this project already has a `README.md` (written by the `core` layer,
or otherwise), insert the section below right after its first `##`
section (e.g. after "Setup"/"Quick start") — don't touch anything else in
the file. If there's no `README.md` yet, skip this; nothing to insert
into, and this layer doesn't create one on its own.

Substitute `{{RAG_PACKAGE_NAME}}` and `{{RAG_PACKAGE_SCOPE}}` before
inserting:

```markdown
## RAG setup (`{{RAG_PACKAGE_NAME}}`)

`{{RAG_PACKAGE_NAME}}` is a private package published to GitHub Packages.
Its registry auth token lives in `.npmrc`, which is gitignored — so after
cloning this repo you must recreate it yourself before `npm install` can
resolve the package.

### 1. Create `.npmrc` at the project root

Copy `.npmrc.example` to `.npmrc` and fill in your token:

\`\`\`
{{RAG_PACKAGE_SCOPE}}:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<YOUR_TOKEN>
\`\`\`

The token is a GitHub Packages PAT with `read:packages` scope — request it
through an internal channel (1Password/Slack/onboarding doc). Don't reuse
someone else's token.

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Index knowledge into the RAG store

\`\`\`bash
npm run rag:index
\`\`\`

See [`guide/rag-guide.md`](guide/rag-guide.md) for indexing Jira issues,
Confluence pages, PDFs, and web pages (anything beyond plain
`.md`/`.txt`/`.docx` dropped into `docs/`).

### 4. Verify

\`\`\`bash
npm run rag:query -- "<a question the indexed doc should answer>"
\`\`\`

> Keep the token in a vault rather than leaving it in plaintext on disk
> long-term, even though `.npmrc` is gitignored.
```

## 8. Node version note — tell the human explicitly

The default `SqliteStore` backend inside `{{RAG_PACKAGE_NAME}}` uses
Node's built-in `node:sqlite` module
(unflagged from Node 23.4+, needs `--experimental-sqlite` on 22.5–23.3,
doesn't exist before 22.5). Flag it if the project's Node version doesn't
support it — see `guide/rag-guide.md`'s Requirements section for fallback
stores.

## 9. .claude/qa-agents.config.json

Set `ragCollection` once indexing has actually succeeded, leave
`ragQueryCommand` `null` (this project's own `npm run rag:query --` is
the default entry point).

## 10. Tell the human explicitly

- This hides the implementation from casual readers of the repo (nobody
  browsing the code sees any RAG source), not from anyone who has a
  working registry token and chooses to `npm pack`/inspect the installed
  package themselves. Say this plainly, don't oversell it as airtight
  secrecy.
