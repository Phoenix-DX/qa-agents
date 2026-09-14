<!-- /qa-agents:init applies this only if the human opted into the RAG layer.
     There is only this one variant — org policy is to never vendor RAG
     source into a target repo, so this plugin doesn't offer that as a
     choice at all.

     Instead of vendoring src/rag/ + a CLI script into the target repo,
     this installs a private, prebuilt RAG CLI as an *optional* npm
     dependency from an internal registry (GitHub Packages by default) —
     optional so that a teammate with no registry token still gets a
     working `npm install`, see Step 3. Nobody with
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
.npmrc.example      — ALWAYS copied, token or no token: the committed template for the project-local .npmrc (gitignored, holds the real token). Creating the real .npmrc is NOT this repo's job — tell the human to do it (see Step 6)
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

## 3. package.json — `optionalDependencies` to add (never `dependencies`)

```json
{
  "optionalDependencies": {
    "{{RAG_PACKAGE_NAME}}": "^1.0.0"
  }
}
```

Optional on purpose. It's a private package, so as a normal dependency it
would make `npm install` fail outright for every teammate without a
registry token — including people who never touch RAG. As an optional
dependency npm skips it when auth is missing and installs everything else
normally (verified on npm 11 against GitHub Packages with no token at all:
the scoped package is skipped, install exits 0). `knowledge-retriever`
already reports RAG_UNAVAILABLE when the binary isn't there, so the rest
of the pipeline degrades cleanly. Don't "fix" this by moving it into
`dependencies`.

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

## 6. Registry auth — `npm install` is never blocked, the token is opt-in

Because Step 3 declares `{{RAG_PACKAGE_NAME}}` as an **optional**
dependency, `npm install` succeeds with no token at all — npm just skips
the RAG CLI, and the only things that stop working are `npm run rag:index`
and `npm run rag:query`. Nobody on the team is blocked; only people who
actually use RAG need auth.

Either way the token can't live in `.env.local`: npm needs it *before*
install runs, while `JIRA_EMAIL`/`JIRA_API_TOKEN` load via `dotenv` inside
application code, long after install already finished.

Two places it can go — recommend the first:

- **`~/.npmrc` (per machine, recommended)** — done once, applies to every
  clone and every project, and survives deleting the repo:
  ```
  {{RAG_PACKAGE_SCOPE}}:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=<YOUR_TOKEN>
  ```
- **`.npmrc` at this project's root (per clone)** — the same two lines,
  gitignored, and has to be recreated after every fresh clone. This is
  what `init.md`'s RAG question writes when the human pastes a token
  during init, and what `.npmrc.example` is the template for.

The token is a personal GitHub PAT with `read:packages` scope (add `repo`
too if `{{RAG_PACKAGE_NAME}}`'s repo is private), created at
https://github.com/settings/tokens — or requested through whatever
internal channel (1Password/Slack/onboarding doc) the team already uses
for shared secrets. Don't reuse someone else's token, and don't invent or
guess one.

After adding a token, run `npm install` again — the earlier install
skipped the package, so it won't appear in `node_modules` until npm
resolves it with auth.

CI needs this only if the pipeline actually runs RAG: wire the token as a
secret that writes `~/.npmrc` (or use `actions/setup-node` with
`registry-url`) before its `npm install`. Otherwise CI installs fine with
no secret at all.

**Lockfile caveat — tell the human this once, it's the only sharp edge.**
`npm install` run *without* a token produces a `package-lock.json` with no
`{{RAG_PACKAGE_NAME}}` entry at all. If that lockfile gets committed,
`npm ci` then fails everywhere — including for people who *do* have a
token — with `npm error code EUSAGE ... Missing: {{RAG_PACKAGE_NAME}}@
from lock file`. So: whoever regenerates `package-lock.json` should have a
token configured, and a token-less teammate should not commit a lockfile
change that drops the entry. The reverse direction is safe (verified on
npm 11): with the entry present in the lockfile, a token-less `npm ci`
skips the package and exits 0 — it only leaves an empty
`node_modules/{{RAG_PACKAGE_SCOPE}}/` directory behind.

## 7. README.md — insert a "RAG setup" section, if README.md exists

If this project already has a `README.md` (written by the `core` layer, or
otherwise), insert the section below immediately **after** whichever
section first shows or instructs running `npm install` (commonly named
"Setup"/"Quick start"/"Getting started"). RAG is an optional add-on that
no longer gates `npm install`, so it reads as a follow-on step, not a
prerequisite. In this plugin's own `core` layer template that's right
after "## Quick start". If the README predates this plugin and has a
differently-named section that runs `npm install` (e.g. "Setup"), insert
right after that section instead. Don't touch anything else in the file.
If there's no `README.md` yet, skip this; nothing to insert into, and this
layer doesn't create one on its own.

Substitute `{{RAG_PACKAGE_NAME}}` and `{{RAG_PACKAGE_SCOPE}}` before
inserting:

```markdown
## RAG setup (`{{RAG_PACKAGE_NAME}}`) — optional

`{{RAG_PACKAGE_NAME}}` is a private package published to GitHub Packages,
declared as an **optional** dependency. `npm install` works without a
registry token — npm simply skips the package, and everything except
`npm run rag:index` / `npm run rag:query` works normally. Only do this
section if you need RAG-backed requirement lookups.

### 1. Add your registry token

Recommended — put these two lines in `~/.npmrc`, once per machine, so
every clone and every project picks it up:

\`\`\`
{{RAG_PACKAGE_SCOPE}}:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<YOUR_TOKEN>
\`\`\`

Per-clone alternative: copy `.npmrc.example` to `.npmrc` at this project's
root (gitignored — recreate it after every fresh clone).

> If you ever regenerate `package-lock.json`, do it with a token
> configured. A lockfile generated without one has no
> `{{RAG_PACKAGE_NAME}}` entry, and `npm ci` then fails for everyone with
> `Missing: {{RAG_PACKAGE_NAME}}@ from lock file`.

The token is a personal GitHub PAT with `read:packages` scope — create one
at https://github.com/settings/tokens, or request it through an internal
channel (1Password/Slack/onboarding doc). Don't reuse someone else's
token.

### 2. Re-run install

\`\`\`bash
npm install
\`\`\`

The earlier token-less install skipped the package, so this is what
actually pulls it in.

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
