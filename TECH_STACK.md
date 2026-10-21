# Alchemist AI — Technology Stack

Related: [PRD](PRD.md) · [ARCHITECTURE](ARCHITECTURE.md) · [DEPLOYMENT](DEPLOYMENT.md)

> **Version policy.** This document names packages and responsibilities, not exact versions. Pin versions with `package-lock.json` and `requirements.txt` at install time, and check each library's current documentation (especially `@supabase/supabase-js`, `@google/genai`, Tailwind CSS, and `sentence-transformers`) before writing integration code, because APIs and model names change.

## 1. Frontend

| Technology | Role |
|---|---|
| React (function components, hooks) | UI |
| Vite | Dev server, bundler; proxies `/api` to the backend in development |
| JavaScript + JSX | Language (no TypeScript) |
| Tailwind CSS | Styling; design tokens mapped from CSS variables ([DESIGN_IMPLEMENTATION](DESIGN_IMPLEMENTATION.md)) |
| Lucide React | Icons |
| Fetch API | Frontend → backend calls (`src/services/chatApi.js`) |
| React Router | **Not installed.** Added only if a second route becomes necessary. |

The MVP is a single-screen app; `src/pages/` exists per the repository structure but stays empty (`.gitkeep`).

## 2. Backend (primary application and RAG orchestrator)

| Technology | Role |
|---|---|
| Node.js (LTS) + Express | HTTP API; orchestrates retrieval and generation |
| JavaScript ES modules (`"type": "module"`) | Language |
| `@supabase/supabase-js` | Database access and RPC to `match_chunks` |
| `@google/genai` (Gemini SDK) | Answer generation |
| Zod | Request and environment validation |
| `helmet`, `cors`, `express-rate-limit` | Security headers, CORS allow-list, rate limiting |
| `dotenv` | Load `.env` in development |
| Vitest + supertest | Tests |

Node's built-in `fetch`, `crypto`, `fs/promises`, and `AbortController` cover HTTP calls to the embedding service, hashing, file reading, and timeouts; no additional HTTP client is needed.

## 3. Python Embedding Service

| Technology | Role |
|---|---|
| Python 3.10–3.12 | Runtime |
| FastAPI | HTTP API (`POST /embed`, `GET /health`) |
| Uvicorn | ASGI server |
| `sentence-transformers` | Model loading and inference (brings PyTorch) |
| pytest + httpx | Tests |

**Scope rule:** Python only generates embeddings. Chunking, retrieval, prompting, and API logic live in Node.js.

## 4. Model Selection — `sentence-transformers/all-MiniLM-L6-v2`

| Property | Value |
|---|---|
| Output dimension | **384** |
| Similarity metric | Cosine (embeddings are L2-normalized by the service, so cosine similarity = dot product) |
| Size | Roughly 90 MB of weights; small enough for CPU inference |
| Max input length | **256 word-piece tokens by default; longer input is truncated** |

**Consequence for chunking.** The assignment brief suggests starting with 400–600-token chunks. With this model, tokens beyond ~256 do not influence the embedding, so a 500-token chunk would be searchable only by its first half. This project therefore sets defaults to **`CHUNK_TARGET_TOKENS=220`, `CHUNK_OVERLAP_TOKENS=40`** and keeps both configurable. The 400–600 range can still be evaluated as an experiment (the full chunk text still goes to Gemini), but the evaluation must account for the truncation. Token counts in the chunker are estimates (`ceil(words × 1.33)`); keep a safety margin below 256.

**Consistency rule.** Ingestion and query embedding must use the same model, the same normalization (`normalizeForEmbedding` in the backend, applied before every `POST /embed` call), and `normalize_embeddings=True`. Changing any of these requires re-ingestion.

## 5. Supabase and pgvector

- Supabase hosts PostgreSQL; the `vector` extension provides the `vector(384)` type and the cosine-distance operator `<=>`.
- Retrieval is a SQL function, `match_chunks`, called through `supabase.rpc(...)` with the service-role key from the backend only.
- Index: exact scan by default (the book yields hundreds of chunks). An optional HNSW index migration is provided. See [DATABASE_SCHEMA](DATABASE_SCHEMA.md) for the trade-off.

## 6. Gemini Integration

- Called only from the backend with `GEMINI_API_KEY`.
- Model ID is read from `GEMINI_MODEL`; no model name is hard-coded.
- Requests ask for JSON output matching a schema (sufficiency flag, answer, interpretation, used evidence labels), with low temperature.
- The model receives no tools, no browsing, and no secrets.
- Gemini is a hosted service: the application **requires an internet connection** for generation and is not an offline application. Embedding is local; generation is not.

## 7. Development Tools

Git/GitHub, npm, Python `venv`, a code editor, an HTTP client (curl or similar), and optionally the Supabase CLI for migrations. ESLint/Prettier are optional.

## 8. Dependencies and Purposes (summary)

| Package | Workspace | Purpose |
|---|---|---|
| react, react-dom | frontend | UI runtime |
| vite, @vitejs/plugin-react | frontend | Build/dev |
| tailwindcss (+ `@tailwindcss/vite` for v4) | frontend | Styling |
| lucide-react | frontend | Icons |
| vitest, @testing-library/react, @testing-library/user-event, jsdom | frontend | Tests |
| express | backend | HTTP |
| cors, helmet, express-rate-limit | backend | Security |
| zod | backend | Validation |
| dotenv | backend | Env loading |
| @supabase/supabase-js | backend | DB client |
| @google/genai | backend | Gemini client |
| vitest, supertest | backend | Tests |
| fastapi, uvicorn | embedding-service | API server |
| sentence-transformers | embedding-service | Embeddings |
| pytest, httpx | embedding-service | Tests |

No other runtime dependencies without a documented reason.

## 9. Environment Configuration

Three places, one sectioned `.env.example` at the repository root.

**`backend/.env`**

| Variable | Default / example | Purpose |
|---|---|---|
| `PORT` | `3001` | API port |
| `NODE_ENV` | `development` | Mode |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated allow-list |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | *(secret)* | Server-only DB key |
| `GEMINI_API_KEY` | *(secret)* | Gemini credential |
| `GEMINI_MODEL` | *(set from current Google AI docs)* | Model ID |
| `EMBEDDING_SERVICE_URL` | `http://127.0.0.1:8001` | Python service |
| `EMBEDDING_SERVICE_API_KEY` | *(optional locally, required in production)* | Sent as `X-API-Key` |
| `EMBEDDING_TIMEOUT_MS` | `15000` | Embedding call timeout |
| `LLM_TIMEOUT_MS` | `30000` | Gemini call timeout |
| `RETRIEVAL_TOP_K` | `5` | Candidates retrieved |
| `SIMILARITY_THRESHOLD` | `0.30` (**untuned**) | Minimum cosine similarity |
| `CHUNK_TARGET_TOKENS` | `220` | Chunk size |
| `CHUNK_OVERLAP_TOKENS` | `40` | Overlap |
| `MAX_QUESTION_LENGTH` | `500` | Question cap |
| `MAX_EXCERPT_CHARS` | `800` | Excerpt cap in responses |
| `RATE_LIMIT_PER_MINUTE` | `20` | Per-IP limit on `/api/chat` |
| `BOOK_DOCUMENT_SLUG` | `the-alchemist` | Document key |

**`embedding-service` environment**

| Variable | Default | Purpose |
|---|---|---|
| `EMBEDDING_MODEL_NAME` | `sentence-transformers/all-MiniLM-L6-v2` | Model |
| `EMBEDDING_SERVICE_API_KEY` | *(optional locally)* | Required `X-API-Key` when set |
| `EMBEDDING_MAX_BATCH` | `64` | Max texts per request |
| `EMBEDDING_MAX_TEXT_CHARS` | `4000` | Max characters per text |

**`frontend/.env`**: `VITE_API_BASE_URL` (default `/api`, proxied by Vite in development). Nothing secret may use the `VITE_` prefix.

## 10. Local Setup Requirements

Node.js LTS, npm, Python 3.10–3.12, Git, internet access (model download on first run, Supabase, Gemini), a Supabase project, a Gemini API key, and an authorized text file of the book. Step-by-step: [DEPLOYMENT](DEPLOYMENT.md).

## 11. Resource Considerations

- The embedding service loads PyTorch plus the model; expect hundreds of MB of RAM. Measure it on your machine. Small free hosting instances may be tight.
- First run downloads the model to the Hugging Face cache (outside the repo; never commit it).
- Ingestion of a novel-length text is a one-time batch job of a few hundred chunks.
- Cold starts of the embedding service on hosted platforms can add noticeable latency to the first query.

## 12. Free-Tier Limitations

Supabase, Gemini, and hosting providers each have free-tier quotas, rate limits, inactivity policies (for example, projects pausing after inactivity), and sleeping instances. These change over time and **must be checked on the providers' current pages** before relying on them. Nothing in this project assumes unlimited usage; the backend rate-limits clients and maps quota errors to `LLM_RATE_LIMITED`.

## 13. Deployment Constraints

- Frontend: static hosting (build output of Vite).
- Backend: any Node.js-compatible host.
- Embedding service: needs a Python host or container with enough memory; **a laptop's `localhost` is unreachable from a remote backend**. See [DEPLOYMENT](DEPLOYMENT.md) §Production.
- Supabase: managed; run migrations against the production project.

## 14. Security Considerations

Server-only secrets; RLS on; revoked grants for `anon`/`authenticated`; Zod validation; strict CORS; rate limiting; evidence treated as untrusted in prompts; no raw error leakage; embedding service bound to loopback locally and API-key protected remotely; `.gitignore` for env files, caches, venvs, embeddings, source text. Details: [PRD](PRD.md) §13, [ARCHITECTURE](ARCHITECTURE.md) §12.

## 15. Reasons for Major Architectural Choices

**Why local embedding inference instead of a hosted embedding API?**
- No per-request quota or cost for ingestion or query embedding.
- The corpus and every user question are not sent to a third-party embedding vendor.
- Deterministic, reproducible vectors: the same model version produces the same index on any machine.
- Demonstrates direct RAG engineering skill (model loading, batching, dimension consistency) for the assignment.
- Trade-offs accepted: an extra service to run and deploy, a memory footprint, cold-start latency, and the 256-token input limit.

**Why Supabase/pgvector instead of a separate vector database?**
- One managed PostgreSQL instance holds chunks, metadata, and vectors, so retrieval returns citation metadata in a single query with ordinary SQL joins.
- Fewer moving parts and vendors for a student-scale project; a free tier is available (subject to limits).
- pgvector's cosine operator and optional HNSW index are sufficient for a single-book corpus.
- Trade-off: not a specialized vector engine; irrelevant at this scale.

**Why Node.js orchestrates and Python only embeds?** The team stack (React/Express) stays uniform; the Python surface is minimal and independently testable and deployable.

**Why Gemini for generation?** It is the approved provider; the model ID is configurable because availability and quotas change.

**Why structured JSON output and backend-built citations?** It makes citations verifiable: the model can only point to labels the backend supplied, and the backend maps labels to real chunk metadata.
