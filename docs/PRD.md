# Alchemist AI — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Version | 1.0 (documentation phase) |
| Context | RAG Developer Internship selection assignment, Rewamp Digital |
| Submission deadline | 25 October 2026, 12:00 PM IST |
| Status | Documentation complete. **No application code exists yet.** |
| Related docs | [TECH_STACK](TECH_STACK.md) · [ARCHITECTURE](ARCHITECTURE.md) · [API_SPECIFICATION](API_SPECIFICATION.md) · [DATABASE_SCHEMA](DATABASE_SCHEMA.md) · [DESIGN_SYSTEM](DESIGN_SYSTEM.md) · [DESIGN_IMPLEMENTATION](DESIGN_IMPLEMENTATION.md) · [AGENT_INSTRUCTIONS](AGENT_INSTRUCTIONS.md) · [EVALUATION_PLAN](EVALUATION_PLAN.md) · [DEPLOYMENT](DEPLOYMENT.md) |

---

## 1. Product Overview

**Alchemist AI** is a literary question-answering assistant for Paulo Coelho's *The Alchemist*. A reader asks questions in a chat interface; the system retrieves relevant passages from an **authorized** text source, and Gemini writes an answer grounded in those passages. Every answer shows the supporting passages, and the system says so plainly when the indexed text does not contain enough evidence.

The product should feel like an elegant reading companion (parchment, desert night, golden light), not a generic AI chatbot.

## 2. Problem Statement

Readers and students who want to find a specific detail, trace a character, or understand a symbol in a novel must re-read or keyword-search the text. General-purpose chatbots answer fluently but may blend memory, other sources, and invention, and they rarely show which passage backs a claim. Readers need answers they can **verify against the book itself**.

## 3. Product Vision

A trustworthy companion for exploring one book: fast to ask, transparent about evidence, honest about its limits, and pleasant to read in.

## 4. Objectives and Measurable Success Criteria

The numbers below are **targets to be measured** using [EVALUATION_PLAN](EVALUATION_PLAN.md). They are not results. Do not report them as achieved until the evaluation has been run.

| ID | Objective | Measurable criterion (target) |
|---|---|---|
| SC-01 | Retrieval finds the right evidence | On the answerable evaluation questions, at least one expected evidence chunk appears in the top-5 for ≥ 85 % of questions (hit@5). |
| SC-02 | Honest fallback | ≥ 90 % of unanswerable evaluation questions return `sufficientEvidence: false` with no invented content. |
| SC-03 | Valid citations | 100 % of returned `sources[].chunkId` values exist in the index **and** were among the chunks retrieved for that request. |
| SC-04 | Groundedness | On a manually scored sample (≥ 20 answers), ≥ 90 % score "fully supported" on the groundedness rubric. |
| SC-05 | Responsiveness | On the developer machine, median end-to-end `/api/chat` latency ≤ 8 s and p95 ≤ 15 s, excluding the first request after startup. |
| SC-06 | Reliability of failure handling | Each injected failure (embedding service down, DB unreachable, invalid Gemini key, index missing) yields the documented error code and a readable UI message. |
| SC-07 | Secret hygiene | A repository scan finds no API keys, Supabase service key, `.env` files, model caches, or embeddings. |
| SC-08 | Reproducibility | A reviewer with an authorized text file can follow the README and reach a working chat in ≤ 30 minutes (excluding model download time). |

## 5. Target Users and Needs

| User | Needs |
|---|---|
| **Reader** | Ask natural questions; get short answers with the passage that supports them; not be misled. |
| **Student** | Distinguish what the text says from interpretation; find evidence for essays; explore themes and symbols. |
| **Passage seeker** | Locate where something happens without scanning the whole book. |
| **Evaluator (Rewamp Digital)** | See a correct, inspectable RAG pipeline: ingestion → chunking → embeddings → vector search → grounded generation → citations → fallback. |

## 6. Primary User Journeys

**J1 — Ask about a character.** User opens the app → sees the welcome screen with suggested questions → taps "Who is Melchizedek…?" → loading indicator → answer ("From the text") with optional "Interpretation" → expands a source card to read the passage.

**J2 — Explore a theme.** User types a free-form question about a theme → receives an answer where explicit text facts and interpretation are visibly separate → inspects 2–3 source cards.

**J3 — Ask something the book does not cover.** User asks about a topic absent from the index → the app returns the evidence-fallback message, shows no sources, and suggests rephrasing or example questions. No general-knowledge answer is substituted.

**J4 — Service problem.** The embedding service, database, or Gemini is unavailable → the app shows a clear, non-technical error with a retry action; the input text is preserved.

**J5 — Index not built.** A developer starts the app before ingestion → the app shows "The book hasn't been indexed yet" instead of a crash.

## 7. Functional Requirements

Priority: **M** = mandatory MVP, **O** = optional enhancement (only after all M items work).

### 7.1 Ingestion and indexing

| ID | Pri | Requirement |
|---|---|---|
| FR-01 | M | A CLI script (`npm run ingest`) reads a plain-text source file path supplied by the operator. |
| FR-02 | M | The script validates that the file exists, is UTF-8 readable, and contains at least a configurable minimum amount of text; otherwise it exits non-zero with a clear message and writes nothing to the database. |
| FR-03 | M | Text is normalized: line endings unified, repeated whitespace collapsed, line-break hyphenation repaired, configurable extraction artifacts (e.g., page-number lines) removed, paragraph breaks preserved. |
| FR-04 | M | Section/chapter labels are detected from marker lines (`## <label>`) in the source file and attached to chunks. If no markers exist, `chapter` is `null` and nothing is invented. |
| FR-05 | M | Chunks are built from paragraph/sentence boundaries without crossing section boundaries, using configurable target size and overlap (`CHUNK_TARGET_TOKENS`, `CHUNK_OVERLAP_TOKENS`). |
| FR-06 | M | Every chunk has a deterministic, stable ID: `{slug}-{index:4}-{contentHash8}`. Re-ingesting unchanged text produces identical IDs. |
| FR-07 | M | Every chunk stores: ID, document reference, chunk index, chapter label (nullable), page number (nullable), text, token estimate, 384-d embedding, ingestion timestamp. |
| FR-08 | M | The Python service exposes `POST /embed` accepting a batch of strings and returning one 384-dimensional vector per string, in order. |
| FR-09 | M | Chunks and embeddings are stored in Supabase PostgreSQL with pgvector. |
| FR-10 | M | Re-running ingestion is idempotent: the previous index for the same document is replaced (`--reset` or hash change), never duplicated. |
| FR-11 | M | The ingestion run prints a summary (sections, chunks, average/min/max token estimate, duration) and aborts if any returned embedding has a dimension other than 384. |

### 7.2 Retrieval and generation

| ID | Pri | Requirement |
|---|---|---|
| FR-12 | M | `POST /api/chat` validates the question (string, trimmed, 1–`MAX_QUESTION_LENGTH` characters). |
| FR-13 | M | The backend obtains the question embedding from the local Python service using the same model and the same text-normalization function used during ingestion. |
| FR-14 | M | The backend calls the Supabase `match_chunks` function (cosine distance) and obtains the top `RETRIEVAL_TOP_K` candidates (default 5). |
| FR-15 | M | The backend discards candidates with similarity below `SIMILARITY_THRESHOLD`. |
| FR-16 | M | If no candidates remain, the backend returns the insufficient-evidence fallback **without calling Gemini**. |
| FR-17 | M | Otherwise the backend sends the question and labeled evidence blocks to Gemini using the prompt module `backend/src/prompts/groundedAnswer.js`. |
| FR-18 | M | Gemini returns structured JSON (sufficiency flag, text-grounded answer, optional interpretation, list of used evidence labels). The backend validates this structure. |
| FR-19 | M | If Gemini reports insufficient evidence, or cites no valid evidence label, the backend returns the same fallback. |
| FR-20 | M | Source objects in the response are built **by the backend from retrieved chunk metadata**, never from model-written text. Only chunks the model cited are returned, ordered by similarity. |
| FR-21 | M | Quotation check: any double-quoted span of ≥ 4 words in the model output must appear (after normalization) in a retrieved chunk. On failure the backend retries once with a corrective instruction; if it still fails, the response carries `meta.warnings: ["UNVERIFIED_QUOTATION"]`. |
| FR-22 | M | The answer separates explicit textual facts (`answer`) from literary interpretation (`interpretation`, nullable). |
| FR-23 | M | Answers never silently use general model knowledge to fill missing book evidence. |

### 7.3 API, resilience, and operations

| ID | Pri | Requirement |
|---|---|---|
| FR-24 | M | `GET /api/health` (shallow by default; `?deep=true` checks embedding service and database). |
| FR-25 | M | `GET /api/book/info` returns whether the index is ready and the indexed document's metadata. |
| FR-26 | M | Every failure path returns the standard JSON error object with a stable error `code`, HTTP status, and request ID; no stack traces or configuration values. |
| FR-27 | M | Embedding service, database, and Gemini calls have timeouts and map failures to distinct error codes. |
| FR-28 | M | When the index has not been created, `/api/chat` returns `INDEX_NOT_READY` (503). |
| FR-29 | M | Per-IP rate limiting on `/api/chat` (`RATE_LIMIT_PER_MINUTE`). |
| FR-30 | M | CORS allows only origins listed in `CORS_ALLOWED_ORIGINS`. |
| FR-31 | M | Each request gets a request ID, logged with timings and error codes. Full question text is not logged in production. |

### 7.4 Frontend

| ID | Pri | Requirement |
|---|---|---|
| FR-32 | M | Responsive React chat UI with welcome screen, suggested questions (characters, themes, symbols), message list, and composer. |
| FR-33 | M | User and assistant messages are visually distinct; generated answer text is visually distinct from source evidence. |
| FR-34 | M | Source cards show chapter label (when present), relevance score, and an expandable excerpt. |
| FR-35 | M | Loading, success, fallback (insufficient evidence), and error states are implemented and visually distinct. |
| FR-36 | M | Empty or whitespace-only input cannot be submitted; the send button is disabled with an accessible state. |
| FR-37 | M | Keyboard operation: Enter sends, Shift+Enter inserts a newline, source cards and suggestions are focusable and operable. |
| FR-38 | M | Error messages preserve the user's question and offer retry. |

### 7.5 Optional enhancements (post-MVP only)

| ID | Pri | Enhancement |
|---|---|---|
| OPT-01 | O | Conversation persistence (local storage or database). |
| OPT-02 | O | Follow-up question handling via query rewriting from recent turns. |
| OPT-03 | O | Searchable source explorer. |
| OPT-04 | O | Retrieval diagnostics panel (scores, rejected candidates). |
| OPT-05 | O | Small evaluation dashboard. |
| OPT-06 | O | Reranking. |
| OPT-07 | O | Multiple-book support, authentication, local LLM option. |

## 8. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Targets in SC-05. Embedding model loaded once at service startup. Batch embedding for ingestion. |
| NFR-02 | Reliability | Every outbound call (embedding, Supabase, Gemini) has a timeout and explicit error mapping; no unhandled promise rejections. |
| NFR-03 | Security | See §13. |
| NFR-04 | Accessibility | See §12. |
| NFR-05 | Maintainability | Small modules with single responsibilities; Node.js ES modules; configuration via validated environment variables; prompts isolated in one module. |
| NFR-06 | Testability | Core logic (chunker, normalizer, retrieval filter, citation builder, quote checker, error mapper) is pure or injectable and unit-tested with mocked embedding/Gemini/Supabase. |
| NFR-07 | Reproducibility | Pinned dependency lockfiles; `.env.example`; migrations committed; one documented command per step. |
| NFR-08 | Portability | Runs on Windows, macOS, and Linux with Node.js LTS and Python 3.10–3.12. |
| NFR-09 | Privacy | No user accounts, no server-side chat history in the MVP. Questions are sent to Gemini (a third party); this is disclosed in the README. |
| NFR-10 | Cost | MVP must run within the free tiers of the chosen services, whose limits can change. Do not assume unlimited usage. |

## 9. Mandatory Assignment Requirements → Implementation Mapping

| Assignment requirement | Implementation component | Requirements | Acceptance |
|---|---|---|---|
| Document ingestion | `backend/scripts/ingest.js`, `backend/src/services/ingestion/*` | FR-01–FR-04, FR-10, FR-11 | AC-01, AC-02 |
| Chunking | `ingestion/chunker.js` | FR-05–FR-07 | AC-03 |
| Embedding generation (local) | `embedding-service/main.py`, `services/embeddingClient.js` | FR-08, FR-13 | AC-04 |
| Vector storage (Supabase/pgvector) | `supabase/migrations/*`, `ingestion/indexer.js` | FR-07, FR-09 | AC-05 |
| Retrieval | `services/retrievalService.js`, SQL `match_chunks` | FR-14, FR-15 | AC-06, AC-07 |
| LLM generation (Gemini) | `services/llmService.js`, `prompts/groundedAnswer.js` | FR-17–FR-23 | AC-08, AC-09 |
| Source references | `services/ragService.js` (citation builder), `SourceCard` | FR-20, FR-34 | AC-10, AC-11 |
| Evidence-based fallback | `ragService.js`, `ErrorMessage`/`MessageBubble` | FR-16, FR-19, FR-23, FR-35 | AC-12 |
| Chat UI | `frontend/src/*` | FR-32–FR-38 | AC-14–AC-17 |
| Validation and errors | middleware, controllers | FR-12, FR-24–FR-31 | AC-13 |
| Tests | `backend/tests`, `embedding-service/tests`, `frontend` tests | NFR-06 | AC-18 |
| Documentation and setup | `README.md`, `docs/*` | NFR-07 | AC-19, AC-20 |

> **Assumption A-01:** This mapping is derived from the project master prompt. The original Rewamp Digital assignment brief was not available when writing this PRD. Before submission, re-check the brief for any requirement not listed here (required source format, deliverable format, submission channel).

## 10. Explicitly Excluded Features (MVP)

- Any vector store other than Supabase PostgreSQL with pgvector (no separate vector database or in-process index library).
- Any hosted embedding API.
- Next.js, UI component libraries, Redux or other state libraries.
- User accounts, authentication, server-side conversation history.
- Multi-book support, reranking, local LLM option.
- Python handling anything other than embedding generation.
- Markdown/HTML rendering of model output (plain text with paragraph breaks only).
- Streaming responses (can be an optional enhancement).
- Answers from general model knowledge.
- Distribution of the book's full text in the repository.

## 11. Error States and Fallback Behavior

| Situation | Backend result | HTTP | User sees |
|---|---|---|---|
| Empty / too long / non-string question | `VALIDATION_ERROR` | 400 | Inline hint; send disabled |
| Index not built | `INDEX_NOT_READY` | 503 | "The book hasn't been indexed yet." |
| Embedding service down / timeout | `EMBEDDING_SERVICE_UNAVAILABLE` | 503 | "The search component is unavailable. Please retry." |
| Database unreachable | `DATABASE_UNAVAILABLE` | 503 | "The library is unreachable right now." |
| No candidates ≥ threshold | `status: insufficient_evidence` | 200 | Fallback message, no sources |
| Gemini says evidence insufficient | `status: insufficient_evidence` | 200 | Same fallback message |
| Gemini quota exceeded | `LLM_RATE_LIMITED` | 429 | "The answer service is busy. Try again shortly." |
| Gemini error/timeout/unparseable | `LLM_ERROR` / `LLM_TIMEOUT` / `LLM_BAD_RESPONSE` | 502/504/502 | "I couldn't generate an answer. Retry." |
| Rate limit exceeded | `RATE_LIMITED` | 429 | "Too many questions; wait a moment." |
| Anything else | `INTERNAL_ERROR` | 500 | Generic error with request ID |

**Policy:** the system never substitutes general LLM knowledge for missing book evidence. Full contracts: [API_SPECIFICATION](API_SPECIFICATION.md).

## 12. Accessibility Requirements

Target: WCAG 2.1 AA for the implemented UI.

- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI boundaries); palette values verified in [DESIGN_SYSTEM](DESIGN_SYSTEM.md).
- Full keyboard operation; visible focus ring on every interactive element.
- Message list is a labeled live region (`role="log"`, `aria-live="polite"`); loading state announced.
- Source cards use real `<button aria-expanded aria-controls>`.
- Touch targets ≥ 44 × 44 px.
- `prefers-reduced-motion` disables non-essential animation.
- Information is never conveyed by color alone (fallback and error states include icon + text).
- Zoom to 200 % without loss of content or horizontal scrolling of the chat column.

## 13. Privacy and Security Requirements

- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` exist only in backend environment variables. The frontend contains no secrets; the only frontend variable is `VITE_API_BASE_URL`.
- RLS is enabled on all tables; `anon`/`authenticated` roles have no table or function privileges; only the backend (service role) calls `match_chunks`.
- Zod validation on all request bodies and query parameters; question length capped.
- `helmet` headers, strict CORS allow-list, per-IP rate limiting.
- Retrieved book text is treated as **untrusted data** in the prompt (delimited evidence blocks; instructions inside evidence must be ignored).
- Model output is validated against a schema; unknown evidence labels are dropped; the frontend renders text only (no `dangerouslySetInnerHTML`).
- Errors never include stack traces, SQL, keys, or environment values.
- The embedding service binds to `127.0.0.1` locally; in production it is private or protected by `X-API-Key` (`EMBEDDING_SERVICE_API_KEY`).
- `.env`, model caches, virtual environments, generated embeddings, and source text are in `.gitignore`.

## 14. Copyright and Source-Document Handling

*The Alchemist* is a copyrighted work. This is a documentation requirement, not legal advice.

- The repository **must not** contain the full book text.
- The operator supplies an authorized source at `backend/data/source/` (gitignored). Acceptable sources: a lawfully obtained copy for local development, text supplied or permitted by Rewamp Digital for the assignment, or a permitted excerpt.
- Automated tests use a short, **original, synthetic** fixture (`backend/tests/fixtures/sample-source.txt`) written by the developer. It must not quote the book.
- The API caps each returned `excerpt` at `MAX_EXCERPT_CHARS` (default 800) so the UI shows evidence snippets rather than serving the text wholesale.
- Evaluators will need their own authorized text to rebuild the index; the README documents this.
- Before exposing a **public** demo that returns passages from a copyrighted work, confirm with Rewamp Digital that this is acceptable; otherwise keep the demo local or access-restricted, or use a permitted source.

## 15. MVP Acceptance Criteria

Each criterion is testable and has an owner test in [EVALUATION_PLAN](EVALUATION_PLAN.md) or the automated suites.

| ID | Criterion | How verified |
|---|---|---|
| AC-01 | Running `npm run ingest -- --file <missing path>` exits non-zero with a message and does not modify the database. | Automated (script test) |
| AC-02 | Ingesting an empty or whitespace-only file exits non-zero; ingesting the fixture succeeds and prints a summary. | Automated |
| AC-03 | Chunker never produces a chunk spanning two sections; each chunk's estimated tokens ≤ `CHUNK_TARGET_TOKENS` × 1.15 (except unsplittable single sentences, which are logged); re-chunking the same text yields identical chunk IDs. | Automated (unit) |
| AC-04 | `POST /embed` with N texts returns N vectors of length 384; empty text → 422; > 64 texts → 413; wrong API key (when configured) → 401. | Automated (pytest) |
| AC-05 | After ingestion, `select count(*) from chunks` equals the summary count, and every embedding has dimension 384. | Manual SQL + automated check in ingest script |
| AC-06 | For a fixture-based question with a known answer chunk, `match_chunks` returns that chunk in the top 3. | Integration test |
| AC-07 | A question unrelated to the fixture yields zero candidates above threshold. | Integration test |
| AC-08 | The prompt sent to Gemini contains every retrieved chunk inside delimited evidence blocks and the instruction to treat them as untrusted data. | Unit test on prompt builder |
| AC-09 | With a mocked Gemini returning a sufficient answer, the API response includes `answer`, `interpretation` (nullable), and `sufficientEvidence: true`. | Unit/integration |
| AC-10 | Every `sources[].chunkId` in a response was in the retrieved set; a mocked Gemini citing a nonexistent label results in that label being dropped. | Unit |
| AC-11 | Each source object includes `chunkId`, `documentTitle`, `excerpt`, `similarity` and only includes `chapter`/`pageNumber` when stored (otherwise `null`). | Unit |
| AC-12 | Insufficient evidence (no candidates ≥ threshold) returns `status: "insufficient_evidence"`, `sources: []`, and **zero Gemini calls**. | Unit (mock call count) |
| AC-13 | Empty question → 400 `VALIDATION_ERROR`; embedding service stopped → 503 `EMBEDDING_SERVICE_UNAVAILABLE`; invalid Supabase URL → 503 `DATABASE_UNAVAILABLE`; invalid Gemini key → 502 `LLM_ERROR`; empty `chunks` table → 503 `INDEX_NOT_READY`. | Automated (mocked) + manual injection |
| AC-14 | Welcome screen shows ≥ 3 suggested questions; clicking one submits it. | Frontend test |
| AC-15 | While a request is in flight the composer shows a loading state and the send button is disabled; the request cannot be double-submitted. | Frontend test |
| AC-16 | A response with sources renders source cards collapsed by default; toggling expands/collapses with correct `aria-expanded`. | Frontend test |
| AC-17 | A fallback response and an error response render visually and textually distinct components; the user's question is retained on error. | Frontend test |
| AC-18 | `npm test` (backend, frontend) and `pytest` (embedding-service) run and pass; the report distinguishes executed tests from proposed ones. | CI/local run |
| AC-19 | A repository scan finds no secrets, `.env` files, model caches, embeddings, or full book text. | Manual scan + `git ls-files` review |
| AC-20 | README setup steps, followed on a clean machine, produce a working local chat. | Manual walkthrough |

## 16. Testing and Evaluation Strategy

- **Unit tests** (Vitest, pytest): chunker, normalizer, section parser, prompt builder, citation builder, quote checker, error mapper, config validation, embedding endpoint.
- **Integration tests**: Express routes with mocked embedding client, Supabase client and Gemini client (supertest); optional live-database test gated behind an environment flag.
- **Frontend tests** (Vitest + Testing Library): welcome, suggestions, loading, success, fallback, error, source-card toggle.
- **RAG evaluation**: `backend/scripts/evaluate.js` runs a labeled dataset and reports hit@k, fallback accuracy, citation validity, latency. Groundedness is scored manually. See [EVALUATION_PLAN](EVALUATION_PLAN.md).
- **Threshold tuning**: the initial `SIMILARITY_THRESHOLD=0.30` is an **untuned placeholder**; it must be adjusted using the evaluation set.

## 17. Risks, Assumptions, and Mitigations

| ID | Risk / assumption | Impact | Mitigation |
|---|---|---|---|
| R-01 | No authorized full text available in time | No index, no demo | Request source from Rewamp Digital early; fall back to permitted excerpts; keep the synthetic fixture for tests and demo of mechanics. |
| R-02 | `all-MiniLM-L6-v2` truncates input beyond 256 word-piece tokens | Embeddings ignore the tail of long chunks; the 400–600-token starting point from the brief would lose evidence | Default chunk target is ~220 tokens with ~40 overlap (configurable); evaluate larger sizes explicitly. See [TECH_STACK](TECH_STACK.md) §4. |
| R-03 | Similarity threshold mis-tuned | False fallbacks or unsupported answers | Tune on the evaluation set; log near-miss scores; keep threshold configurable. |
| R-04 | Gemini model name/quotas change | Generation breaks | Model ID in `GEMINI_MODEL`; explicit `LLM_RATE_LIMITED` handling; check current docs when implementing. |
| R-05 | Embedding service hard to host free | No public demo | Document container deployment and fallbacks (§18); demo locally via screen recording if needed. |
| R-06 | Free-tier DB pauses or limits | Demo outage | Verify project is active before submission; document manual resume. |
| R-07 | Model fabricates a quotation | Trust failure | Quote verification (FR-21), prompt rules, manual groundedness review. |
| R-08 | Prompt injection via question or text | Rule override | Evidence delimiting, schema-validated output, no tools given to the model, backend-built citations. |
| R-09 | Schedule: only days remain | Incomplete MVP | Strict MVP scope; optional features frozen; daily plan below. |
| R-10 | Chapter structure of source differs from expectations (the book is organized into Prologue, two Parts, Epilogue rather than numbered chapters) | Misleading labels | `chapter` is a generic section label taken from source markers; never invented. |
| A-02 | Python 3.10–3.12 and Node.js LTS are installable on the developer machine | — | Verified during setup. |
| A-03 | Single-turn Q&A is acceptable for the assignment | Follow-ups lack context | Documented limitation; OPT-02. |

## 18. Deployment and Submission Criteria

### Schedule (20 – 25 October 2026)

| Date | Target |
|---|---|
| Tue 20 Oct | Documentation complete; repo skeleton; embedding service; Supabase schema (steps 1–5 of the agent order). |
| Wed 21 Oct | Ingestion, chunking, indexing, retrieval (steps 6–8). |
| Thu 22 Oct | Gemini generation, pipeline integration, API tests (steps 9–10, part of 13). |
| Fri 23 Oct | React chat UI, states, source cards (steps 11–12). |
| Sat 24 Oct | Evaluation run, threshold tuning, README polish, deployment attempt (steps 14–17). |
| Sun 25 Oct | Buffer. **Submit by ~09:00 IST**, three hours before the 12:00 PM IST deadline. |

### Submission checklist

- [ ] All MVP acceptance criteria AC-01…AC-20 evaluated; results recorded honestly.
- [ ] README setup validated on a clean clone.
- [ ] `.env.example` complete; no secrets in git history (`git log -p` scan).
- [ ] No full book text in the repository.
- [ ] Evaluation dataset and results (or the statement that it was not run) included.
- [ ] Known limitations documented.
- [ ] Deployed URL (if any) tested from a different network; otherwise a demo recording and local run instructions.
- [ ] Submission method and format re-checked against the original assignment brief (A-01).
