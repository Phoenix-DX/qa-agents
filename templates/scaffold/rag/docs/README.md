# docs/

Drop requirement docs here (`.md`, `.txt`, `.docx` — any subfolder, walked
recursively), then index them:

```bash
npm run rag:index
```

Then verify they're retrievable:

```bash
npm run rag:query -- "a question the doc should be able to answer"
```

See `guide/rag-guide.md` for the full ingestion guide (PDFs, web pages, and
other formats that need converting to Markdown first).

Everything in this folder except this file is gitignored — it's local input
for indexing, not framework code.
