# Arya — HM Design Consultant: A Beginner's Guide to How It Works

This guide explains, from first principles, how the **Arya** consultant is built and why each piece exists. You need no background in AI or web development. By the end you should be able to explain the system to a colleague, run it, and know where to change things.

---

## 1. What the system does, in one paragraph

Arya is a chat assistant for hydro-mechanical (HM) engineering on Hydro Electric Projects (HEP) and Pumped Storage Projects (PSP). You ask a question like *"How do I fix the shell thickness of a surface penstock per IS 11639 Part 1?"*. Arya **looks up the most relevant passages** in a library of IS codes and your project design documents, **hands those passages to a large language model (Claude)** with instructions to reason like a senior consultant, and **streams back an answer with references** such as *"IS 11639 (Part 1), Cl. 5.2 [S3]"*. After each conversation it **writes down anything worth remembering**, such as project facts you mentioned, corrections you made, or answers you marked 👍. That way it knows more the next time.

A good analogy: Claude is a brilliant consultant who has read a lot of engineering literature but has **never seen your company's documents** and **doesn't remember yesterday's meeting**. The system gives this consultant a **librarian** (retrieval), a **filing cabinet** (knowledge base), and a **notebook** (learned memory).

---

## 2. The big picture

```
 ┌──────────────────────────── Browser (public/) ─────────────────────────────┐
 │  Avatar + chat · Knowledge base drawer (upload / documents / learned)      │
 └───────────────▲─────────────────────────────────────────────┬──────────────┘
                 │ streamed answer (SSE)                       │ question / files
 ┌───────────────┴──────────────── Node.js server (server/) ───▼──────────────┐
 │                                                                            │
 │  1. Retrieve  ─►  knowledge.js  (BM25 keyword + optional semantic search)  │
 │                      ▲                                                     │
 │                      │ chunks with clause / page metadata                  │
 │  Upload ─► ingest.js ─► chunker.js ─► store.js (data/*.json)               │
 │                                                                            │
 │  2. Prompt   ─►  prompts.js  (consultant system prompt + sources)          │
 │  3. Answer   ─►  llm.js ──────────────► Claude API (Anthropic)             │
 │  4. Learn    ─►  chat.js ─► Claude Haiku extracts memories ─► knowledge    │
 └────────────────────────────────────────────────────────────────────────────┘
```

Every question runs four steps: **Retrieve → Prompt → Answer → Learn**.

---

## 3. Foundational concepts (the "why")

### 3.1 Large Language Models (LLMs)
An LLM is a program trained on a huge amount of text to predict "what text comes next". At large scale, that simple objective produces a model that can explain, reason, calculate and write. We use **Claude** from Anthropic through its API (a paid web service).

What LLMs are good at: reasoning, structuring answers, explaining, doing arithmetic with care, and adapting tone.
Where they fall short on their own:
- They don't know **your private documents** (DBRs, calculations, specifications).
- They can be **out of date** or fuzzy on exact clause numbers.
- They may **"hallucinate"**, meaning they state something plausible but wrong with confidence.

The rest of this design exists to fix those three weaknesses.

### 3.2 Tokens and the context window
LLMs read and write in **tokens**, which are small pieces of words (roughly ¾ of an English word, or about 4 characters). Pricing is per token, both for what you send (**input**) and what the model writes (**output**). Everything the model can "see" in one request (instructions, retrieved passages, chat history and the question) must fit in its **context window**.

**Why this matters:** we can't paste your whole library into every question. It would be slow, expensive, and the model would get distracted. So we **select** only the most relevant passages. That selection is RAG.

### 3.3 RAG: Retrieval-Augmented Generation
RAG is "open-book exam" for an AI:
1. **Retrieval:** search your library for passages relevant to the question.
2. **Augmentation:** paste those passages into the prompt, each labelled [S1], [S2]…
3. **Generation:** the LLM writes the answer using those passages and cites them.

Benefits: answers are grounded in *your* documents, the model can cite clauses, and you add knowledge by **uploading a file**. No retraining is needed.

### 3.4 Chunking: cutting documents into citable pieces
A 60-page code is far too large to retrieve as one unit. We split it into **chunks** of about 1,400 characters (about 350 tokens). The naïve approach cuts every N characters, but that would slice clauses in half and lose track of which clause a sentence belongs to.

Our chunker (`server/chunker.js`) is **structure-aware**:
- It recognises clause headings such as `5.2.3 Shell Thickness`, `ANNEX A`, and Markdown headings.
- It remembers the **heading path** (for example `5 DESIGN CRITERIA › 5.2 Shell Thickness`), the **clause number** and the **page number** for each chunk.
- It **merges** tiny neighbouring clauses under the same parent (5.1 + 5.2), so short clauses aren't orphaned. It never merges across top-level clauses (5.x with 6.x).
- It **splits** very long clauses at paragraph or sentence boundaries, with a small overlap so no sentence is lost at the seam.
- It detects which **IS code** a document is (for example `IS 11639 (Part 1):1986`) from the title, filename or first pages.

This metadata is what lets Arya say *"IS 11639 (Part 1), Cl. 5.2, p. 4"* instead of just "somewhere in a PDF".

### 3.5 Retrieval method 1: keyword search with BM25
**BM25** is the classic ranking formula behind most search engines. For each chunk it scores how well the query words match, based on three intuitions:
- **Term frequency:** a chunk that mentions "penstock" 5 times is more relevant than one that mentions it once, with diminishing returns.
- **Inverse document frequency (IDF):** rare words matter more. "bifurcation" is informative; "design" appears everywhere and tells us little.
- **Length normalisation:** a long chunk shouldn't win just because it contains more words.

Simplified: `score = Σ over query words of IDF(word) × (tf × (k1+1)) / (tf + k1 × (1 − b + b × length/avgLength))`

We add three domain tweaks in `server/bm25.js`:
- **Clause numbers are kept as words** ("5.2.1"), so "clause 5.2.1" finds that exact clause.
- **Light stemming**, so "penstocks" and "penstock" match.
- **HM synonym expansion**: "trashrack" also searches "trash rack"; "hoist" also searches "rope drum", "hydraulic", "cylinder"; "PSP" also searches "pumped storage".

BM25 is fast, free, runs offline, and works very well on code text full of precise terms.

### 3.6 Retrieval method 2 (optional): semantic search with embeddings
Keyword search misses paraphrases. "Minimum plate for handling" and "thickness required for transportation stiffness" share few words but mean similar things. An **embedding** is a list of about 1,000 numbers that represents the *meaning* of a text. Texts with similar meanings get similar lists. We compare them with **cosine similarity** (the angle between the vectors).

If you set `VOYAGE_API_KEY`, every chunk is embedded at upload time, and each question is embedded at query time (`server/embeddings.js`).

### 3.7 Hybrid search and Reciprocal Rank Fusion (RRF)
When both searches are on, we merge the two ranked lists with **RRF**: each chunk gets `1/(60 + rank)` from each list, and the scores are summed. Chunks that rank well in *both* lists rise to the top. RRF is robust because it uses ranks, not raw scores, which aren't comparable between methods.

We then apply **engineering-specific re-ranking** (`server/knowledge.js`):
- **Authority weighting:** IS codes (×1.15) > design documents (×1.0) > notes (×0.95) > learned memories (×0.85).
- **Exact-reference boost:** if the question names a code ("IS 4622") or a clause ("5.2.3"), matching chunks get a strong boost.
- **Diversity cap:** at most 4 chunks per document, so one large document can't crowd out the others.
- **Budget cap:** stop adding chunks at about 14,000 characters of context (`MAX_CONTEXT_CHARS`) to keep token spend under control.

Follow-up questions such as *"and for PSP?"* are short and vague, so retrieval also uses the previous question to stay on topic.

### 3.8 Prompt engineering: making it think like a consultant
The **system prompt** (`server/prompts.js`) is the standing instruction the model reads before every question. It defines:
- **Persona:** a senior HM consultant with 25+ years of experience, fluent in the IS codes and international practice (ASCE, USBR, DIN 19704…).
- **Method** (the "consultant-level thinking"): 1) frame the problem, 2) establish the code basis, 3) analyse with formulas, units and stated assumptions, 4) recommend with trade-offs, 5) flag risks and what a reviewer would question. It also covers PSP-specific effects (reverse flow, cycling fatigue, pump-trip transients).
- **Evidence rules:** cite [S#] and clause numbers; **never invent clause numbers**; if relying on general knowledge, say "verify against the code"; point out conflicts between documents; say when a governing document is missing.
- **Output format:** headings (Understanding, Code basis, Analysis, Recommendation, Risks & checks, References), tables, and plain-text equations.

Each question is sent as a structured message:
```
<conversation_summary> … </conversation_summary>
<sources>
[S1] IS 11639 (Part 1) | Cl. 5.2 | Shell Thickness | p. 4 | code
…passage text…
</sources>
<question> … </question>
```

### 3.9 Adaptive thinking and effort
Current Claude models can **think before answering**, working through the problem internally. With **adaptive thinking** the model decides how much thinking a question deserves: a definition gets a quick answer, while a load-combination review gets deep reasoning. The **effort** setting (`CHAT_EFFORT`: low / medium / high / xhigh / max) sets the overall depth and token spend. `medium` is the default balance of quality and cost. Raise it to `high` for design-review work.

### 3.10 Streaming (Server-Sent Events)
Long answers can take 20–60 seconds. Instead of making you wait for the whole answer, the server **streams** it word by word using **Server-Sent Events (SSE)**, a simple format where the server keeps the HTTP response open and writes `event: delta / data: "text"` lines. The browser shows the text as it arrives, and the avatar switches between *thinking* and *speaking*.

Event sequence per question: `conversation` → `sources` → many `delta` → `done` (with token usage). If something fails, you get `error`.

### 3.11 Prompt caching (saving tokens)
The system prompt is identical for every question. Anthropic's **prompt caching** lets us mark it as cacheable (`cache_control: ephemeral`). For the next few minutes, repeat requests read it from cache at about 10% of the normal input price, and faster. The footer of each answer shows `… cached` tokens so you can see it working. Rule of thumb: **anything cached must stay byte-for-byte identical**, so the system prompt never contains dates or per-user text.

### 3.12 "Growing with every conversation": memory, not retraining
People often assume an AI "learns" by retraining the model. That is slow, expensive, hard to undo and risky. Instead, Arya uses **retrieval-based memory**, which is instant, reviewable and reversible:

| Channel | What gets stored | How |
|---|---|---|
| **Automatic extraction** | Project facts, preferences and corrections *you* stated | After each answer, a small fast model (Claude Haiku) reads the exchange and outputs JSON memories. It is told **not** to store the assistant's own claims, which prevents a hallucination from becoming "knowledge". |
| **👍 Validated answers** | The Q&A summary plus the codes it relied on | When you mark an answer as good. |
| **👎 Corrections** | Your correction text | When you mark an answer as wrong and explain why. |
| **Teach** | Any fact you type in *Knowledge → Learned* | Manual entry. |
| **Documents** | Any PDF/DOCX/TXT/MD you upload | *Knowledge → Add documents*. |

Memories are indexed like any other chunk, so future questions retrieve them automatically. They are labelled "Learned" and ranked below codes. Everything can be reviewed and **Forget**-ed in the UI. Duplicates are skipped.

### 3.13 Conversation memory and rolling summaries
Within a single conversation, the last 6 exchanges (`HISTORY_TURNS`) are sent word for word. Older turns are compressed into a **rolling summary** of about 180 words by Haiku. This keeps long consultations coherent without the cost growing with every message.

### 3.14 Safety net: refusal fallback
Claude runs safety classifiers. Very occasionally a legitimate engineering question could be misclassified and declined. With `ENABLE_FALLBACKS=true`, the API automatically retries a declined request on a fallback model within the same call (the "server-side fallback" beta feature). If everything declines, the UI shows a polite message.

---

## 4. The tech stack and why each piece was chosen

| Layer | Technology | Why |
|---|---|---|
| Runtime | **Node.js 20+** (JavaScript on the server) | One language for front and back end, excellent streaming support, and it was your preferred choice. |
| Web framework | **Express 5** | The most widely used Node web framework. Simple routing with async error handling. |
| LLM | **Claude Opus 5** via **@anthropic-ai/sdk** | Strong reasoning for engineering analysis. The official SDK handles streaming, retries and typed errors. |
| Utility LLM | **Claude Haiku 4.5** | About 5× cheaper. Used only for background memory extraction and summaries. |
| PDF text | **pdf-parse** (pdf.js) | Extracts text page by page, so we keep page numbers for citations. |
| Word files | **mammoth** | Reliable text extraction from .docx. |
| Uploads | **multer** | Handles multi-file form uploads in memory, with a 50 MB limit. |
| Keyword search | **Custom BM25** (`server/bm25.js`) | No dependency, offline, tuned for clause numbers and HM synonyms. |
| Semantic search | **Voyage AI embeddings** (optional) | Anthropic's recommended embeddings partner. Enables hybrid search. |
| Storage | **JSON files** in `data/` (atomic writes) | Zero setup. Human-readable. Easy to back up. See §8 for scaling. |
| Front end | **Plain HTML/CSS/JS** | No build step, fast, and easy for anyone to modify. Includes a small safe Markdown renderer. |
| Avatar | **Inline SVG + CSS animations** | Blinks when idle, shows a spinning ring when thinking, and animates its mouth when speaking. No images to host. |
| Voice | **Browser Web Speech API** | Optional read-aloud (🔈 button), free and on-device. |
| Security | Optional shared token, rate limiting, security headers | Enough for an internal pilot. See §8 for enterprise SSO. |

---

## 5. Life of a question (step by step)

1. You type a question and press **Enter**. `public/app.js` POSTs `{question, conversationId}` to `/api/chat`.
2. `server/index.js` validates it and opens an SSE stream.
3. `server/chat.js` loads or creates the conversation, then builds the **retrieval query** (question plus the previous question if this one is short).
4. `knowledge.search()` runs BM25 (plus semantic search if enabled), fuses the results, boosts code and clause matches, applies authority weights and caps, and returns about 8 chunks.
5. The server immediately sends the **sources** to the browser, which renders the "Sources consulted" chips.
6. `prompts.buildUserTurn()` assembles the summary, the sources and the question. `llm.streamAnswer()` calls Claude with the cached system prompt, adaptive thinking and effort.
7. Each text fragment is forwarded as a `delta` event, and the browser renders Markdown live. Citation tags like [S3] become clickable chips that open the source excerpt.
8. On completion, the Q&A (with its sources) is saved to `data/conversations.json` and a `done` event reports token usage.
9. **In the background**, Haiku extracts memories from the exchange, and older turns are summarised if the conversation is long.

## 6. Life of an uploaded document

1. *Knowledge base → Add documents*: choose files, a type (**IS code**, **design document** or **note**), and optionally the project and component.
2. `ingest.js` extracts text page by page. Scanned PDFs without a text layer are rejected with advice to run OCR first.
3. `chunker.js` splits the text into clause-aware chunks with metadata. The IS code number is detected automatically for code documents.
4. If embeddings are enabled, each chunk is embedded.
5. Chunks are saved in `data/chunks.json` and added to the live search index. The document is searchable immediately.
6. Use **Ask about** on a document to restrict answers to that document only, which is useful when reviewing a specific DBR.

---

## 7. Project layout

```
server/
  index.js       HTTP API, SSE streaming, auth, rate limiting, startup
  config.js      All settings (read from .env)
  store.js       JSON persistence with debounced atomic writes
  ingest.js      PDF / DOCX / TXT → pages of text
  chunker.js     Clause-aware chunking, IS code detection
  bm25.js        Keyword index, tokenizer, HM synonyms
  embeddings.js  Optional Voyage embeddings + cosine similarity
  knowledge.js   Documents, memories, hybrid retrieval and re-ranking
  prompts.js     Consultant system prompt, memory and summary prompts
  llm.js         Claude calls: streaming answer, memory extraction, summaries
  chat.js        Orchestration: retrieve → answer → learn; feedback loop
  seed.js        Loads starter knowledge on first run
public/          index.html, styles.css, app.js (UI), markdown.js (renderer)
seed/knowledge/  Curated starter notes (IS 4622, IS 11639, other HM codes, PSP/HEP practice)
test/            Unit tests (node --test)
data/            Created at runtime: your documents, chunks, conversations, memories
```

## 8. Taking it to company scale

The code is organised so each of these is a contained change:

| Need | Recommendation |
|---|---|
| Thousands of documents / multiple servers | Replace `store.js` with **PostgreSQL + pgvector** (or OpenSearch). The `knowledge.search()` interface stays the same. |
| Scanned drawings and old codes | Add an OCR step (Tesseract, or Claude's native PDF reading) in `ingest.js`. |
| User accounts / SSO | Put the app behind the company identity provider (Azure AD / Okta via an OAuth proxy), and record the user on each conversation and memory. |
| Governance of learned knowledge | Add an approval state (`pending` → `active`) for auto-extracted memories, reviewed by a discipline lead. |
| Deployment | `docker build -t arya . && docker run -p 3000:3000 --env-file .env -v arya-data:/app/data arya`, or PM2 on a VM behind HTTPS (nginx). Back up the `data/` volume nightly. |
| Quality assurance | Keep a list of 30–50 real questions with expected references. Re-run it after any prompt or model change and compare the results. |
| Cost control | Track the `usage` numbers returned per answer. Use `CHAT_EFFORT=low` for quick lookups, keep caching on, and lower `TOP_K` / `MAX_CONTEXT_CHARS` if answers stay good. |

## 9. Important limitations

- **IS codes are copyrighted by BIS.** The starter notes shipped here are *summaries written for orientation* and are marked "Starter summary". They are **not** the code text, and some typical values in them are flagged "verify". For clause-accurate citations, **upload your company's licensed copies** of IS 4622, IS 11639 (Parts 1–3), IS 4623, IS 11388 and the rest.
- Arya is an **advisor**. Final design responsibility stays with the engineer of record. Always verify critical numbers against the code and the contract specification.
- Retrieval quality depends on document quality. Clean, text-based PDFs give the best clause detection.

## 10. Glossary

- **API**: a way for one program to call another over the internet (here: our server calling Claude).
- **Chunk**: a small passage of a document, the unit that gets retrieved and cited.
- **Context window**: the maximum amount of text the model can consider in one request.
- **Embedding**: a list of numbers representing the meaning of a text.
- **Hallucination**: a confident but incorrect statement from an LLM.
- **LLM**: Large Language Model.
- **Prompt**: the text instructions and data sent to the LLM.
- **RAG**: Retrieval-Augmented Generation, meaning "search, then answer using what you found".
- **RRF**: Reciprocal Rank Fusion, a method for merging ranked lists.
- **SSE**: Server-Sent Events, a one-way stream from server to browser.
- **Token**: the unit LLMs read and write; about 4 characters of English.
