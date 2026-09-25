# Arya — HM Design Consultant (RAG)

A retrieval-augmented AI consultant for **Hydro-Mechanical works** in **HEP** and **PSP** projects. It is grounded in IS codes (IS 4622, IS 11639 Parts 1–3, IS 4623, IS 11388, IS 6938, IS 10210, IS 11855 and others) and in your own design documents. It answers with consultant-style reasoning and clause/section references, and it keeps learning from every conversation.

- Node.js + Express backend, Claude (Anthropic) for reasoning, clause-aware BM25 retrieval (optional hybrid semantic search)
- Minimal chat UI with an animated avatar, source chips, 👍/👎 learning, and optional read-aloud
- Upload PDFs/DOCX/TXT/MD of codes, DBRs, calculations and specifications, which are searchable immediately
- Learned-knowledge panel: review and prune what Arya has learned

📘 **New to RAG/LLMs? Read [docs/GUIDE.md](docs/GUIDE.md)**. It explains the tech stack and every concept from scratch.

## Quick start

```bash
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY
npm start                   # http://localhost:3000
```

On first start, four curated starter notes are loaded (IS 4622, IS 11639, other HM codes, HEP/PSP practice). Then open **Knowledge base → Add documents** and upload your licensed IS code PDFs and project design documents.

## Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required |
| `CHAT_MODEL` / `CHAT_EFFORT` | `claude-opus-5` / `medium` | Answering model and reasoning depth |
| `UTILITY_MODEL` | `claude-haiku-4-5` | Cheap background model for memory extraction and summaries |
| `ENABLE_FALLBACKS` | `true` | Server-side refusal fallback (Claude API only; set `false` for Bedrock/Vertex/proxies) |
| `VOYAGE_API_KEY` | — | Optional; enables hybrid semantic + keyword search |
| `TOP_K`, `MAX_CONTEXT_CHARS`, `HISTORY_TURNS` | 8, 14000, 6 | Token budget controls |
| `APP_TOKEN` | — | Optional shared access token for the UI/API |
| `PORT`, `DATA_DIR` | 3000, `./data` | Server |

## API

| Method | Path | |
|---|---|---|
| POST | `/api/chat` | `{question, conversationId?, docIds?}` → SSE: `conversation`, `sources`, `delta`, `done`, `error` |
| GET/DELETE | `/api/conversations[/:id]` | History |
| GET/POST/DELETE | `/api/documents[/:id]` | Multipart upload: `files[]`, `type` (code/design/note), `project`, `component`, `title` |
| GET/POST/DELETE | `/api/memories[/:id]` | Learned knowledge |
| POST | `/api/feedback` | `{conversationId, messageId, rating: up/down, comment?}` |
| GET | `/api/search?q=` | Debug retrieval |
| GET | `/api/stats`, `/api/health` | |

## Tests

```bash
npm test
```

## Docker

```bash
docker build -t arya .
docker run -p 3000:3000 --env-file .env -v arya-data:/app/data arya
```

> The starter notes are summaries for orientation, not BIS code text. Upload licensed copies for clause-accurate citations. Arya is advisory; the engineer of record remains responsible for the design.
