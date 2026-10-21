# Alchemist AI — Coding Agent Instructions

This is the primary instruction file for the AI coding agent implementing Alchemist AI. Follow it literally. If it conflicts with your habits or with a convenient shortcut, this file wins; if it conflicts with another document in `docs/`, stop and report the conflict (see §9).

## 1. Agent Role

Act as a senior full-stack engineer experienced in React, Express, Python/FastAPI, Sentence Transformers, PostgreSQL/pgvector, and RAG evaluation. You value correctness, small modules, explicit error handling, and honest reporting over speed or flashy features.

## 2. Read First (mandatory)

Before writing any code, read completely:

1. [PRD](PRD.md): requirements (FR/NFR/AC IDs) and scope.
2. [TECH_STACK](TECH_STACK.md): approved stack, env variables, model limits.
3. [ARCHITECTURE](ARCHITECTURE.md): components, flows, prompt contract.
4. [API_SPECIFICATION](API_SPECIFICATION.md) and [DATABASE_SCHEMA](DATABASE_SCHEMA.md): exact contracts and SQL.
5. [DESIGN_SYSTEM](DESIGN_SYSTEM.md) and [DESIGN_IMPLEMENTATION](DESIGN_IMPLEMENTATION.md): UI.
6. [EVALUATION_PLAN](EVALUATION_PLAN.md) and [DEPLOYMENT](DEPLOYMENT.md).

Then restate in your plan: the stack, the 384-d embedding dimension, the fallback policy, and the MVP scope, so that misunderstandings surface before code exists.

## 3. Decisions Already Made (do not re-decide)

| Topic | Decision |
|---|---|
| Frontend | React + Vite + JSX + Tailwind CSS + Lucide + Fetch. No router, no UI kit, no state library. |
| Backend | Node.js + Express, ES modules. Node orchestrates the whole RAG pipeline. |
| Embeddings | Local Python FastAPI service, `sentence-transformers/all-MiniLM-L6-v2`, 384-d, normalized. Python does **only** embeddings. |
| Storage/search | Supabase PostgreSQL + pgvector, cosine, `match_chunks` function, exact scan by default. |
| Generation | Gemini via `@google/genai`; model from `GEMINI_MODEL`; JSON-schema output. |
| Ports | Frontend 5173, backend 3001, embedding service 8001. |
| Chunk defaults | `CHUNK_TARGET_TOKENS=220`, `CHUNK_OVERLAP_TOKENS=40` (model truncates at 256 tokens), configurable. |
| Retrieval defaults | `RETRIEVAL_TOP_K=5`, `SIMILARITY_THRESHOLD=0.30` (untuned placeholder). |
| Chunk ID | `{slug}-{index:4}-{contentHash8}`. |
| Section markers in source | Lines beginning `## ` define a section label. |
| Citations | Built by the backend from chunk metadata; the model only returns evidence labels (`S1`…). |
| Fallback text | Fixed backend template; Gemini is not called when retrieval yields nothing usable. |
| Conversation | Stateless single-turn; no persistence. |
| Theme | Single night theme with parchment evidence cards. |

Replace a decision only if you hit a **concrete blocker** (a documented library limitation, a failing requirement). Then follow §9.

## 4. Rules for Working

**Process**
- Implement incrementally in the order of §5. Finish and verify each step before starting the next.
- Keep modules small, with one responsibility each; follow the module map in ARCHITECTURE §2.
- Use JavaScript ES modules in Node.js; consistent naming (`camelCase` functions/variables, `PascalCase` components, `kebab-case` for non-component files only if the repo structure uses them, SQL `snake_case`).
- Add comments only where they explain non-obvious logic (e.g., why the threshold is applied in Node, why the model truncates).
- Verify library APIs against current official docs before using them (`@supabase/supabase-js`, `@google/genai`, Tailwind, `sentence-transformers`). Do not rely on memory for version-specific behavior.

**Correctness and safety**
- Validate all inputs at system boundaries (HTTP bodies/queries with Zod, env at startup, CLI arguments, embedding responses).
- Handle every async operation's failure explicitly; map failures to the error codes in API_SPECIFICATION §1.2. No empty `catch`, no swallowed rejections, no silently ignored failed requests.
- Never hard-code API keys, passwords, tokens, or the Supabase service key. Never commit `.env` files. Never expose the service-role key to the frontend or any response or log.
- Never invent chapter references, page numbers, quotations, or retrieved evidence, in code, tests, fixtures presented as real, docs, or UI copy.
- Do not include or download unauthorized copyrighted book text. Test fixtures must be original synthetic text.
- Do not substitute general model knowledge for missing evidence.
- Do not generate placeholder functionality and describe it as complete. A stub must be labeled `TODO`, listed under "Known limitations", and excluded from "done".
- Do not introduce unrelated frameworks, microservices, or dependencies. Any new dependency requires a one-line justification in `TECH_STACK.md`.
- Keep documentation synchronized: if behavior, env vars, endpoints, or commands change, update the relevant docs in the same change.

## 5. Required Development Order, with Definition of Done

| # | Step | Definition of done (verify before moving on) |
|---|---|---|
| 1 | Repository and project skeleton | Folder structure from the PRD/README exists; `.gitignore` excludes `.env`, `node_modules`, `.venv`, model caches, `backend/data/source/*`, `evaluation/results/`; `.env.example` complete; root `package.json` has convenience scripts. |
| 2 | React frontend skeleton | `npm run dev` serves a placeholder shell; Tailwind works; tokens in `index.css`; Vite proxies `/api` to 3001. |
| 3 | Express backend skeleton | `GET /api/health` returns 200; env validated by Zod (fails fast with clear message); error handler returns the standard error shape; request ID middleware. |
| 4 | Python embedding service | `uvicorn main:app --host 127.0.0.1 --port 8001` loads model once; `POST /embed` and `GET /health` per contract; pytest passes (dimension 384, empty text 422, oversize 413, auth 401). |
| 5 | Supabase schema and function | Migrations 0001/0002 applied to a real project; `match_chunks` callable by service role and **denied** to anon; dimension check query works. |
| 6 | Ingestion and chunking | Source read/validate/normalize/section-parse/chunk implemented with unit tests (empty file, missing file, no markers, markers, long paragraph, determinism of IDs, no cross-section chunks). |
| 7 | Embedding and indexing | `npm run ingest` embeds in batches, verifies 384 dims, writes `chunks`, sets `chunk_count` last; `--reset` and `--dry-run` work; summary printed. |
| 8 | Semantic retrieval | `retrievalService` returns candidates with metadata; threshold applied in Node; integration test on the fixture passes (AC-06, AC-07). |
| 9 | Gemini generation and grounded prompts | `prompts/groundedAnswer.js` implements ARCHITECTURE §8 exactly; `llmService` parses/validates JSON, retries once, maps errors/timeouts/quotas. Tests use a mocked client. |
| 10 | Full RAG pipeline | `POST /api/chat` follows API_SPECIFICATION §5 order; citation builder drops unknown labels; quote verification; fallback paths (AC-09…AC-13). |
| 11 | Chat UI and source cards | All components in DESIGN_IMPLEMENTATION §1–§12; keyboard and a11y rules satisfied. |
| 12 | Loading and error states | Every API error code has a UI mapping; Retry works; question preserved. |
| 13 | Unit and integration tests | Backend (Vitest + supertest), frontend (Vitest + RTL), embedding service (pytest) all runnable with one command each. |
| 14 | Answerable/unanswerable testing | Evaluation dataset created from the **real authorized text**; `npm run evaluate` runs; results recorded without embellishment. |
| 15 | Environment examples and setup docs | `.env.example`, README and DEPLOYMENT steps match actual commands. |
| 16 | Validation and doc update | Walk through README on a clean clone (or state that you could not); all docs consistent with implementation. |
| 17 | Deployment instructions and submission checklist | DEPLOYMENT.md accurate; checklist in PRD §18 completed or items marked as not done. |

Do not start optional enhancements (PRD OPT-*) until steps 1–16 are done and time remains.

## 6. File-by-File Development Sequence (target files)

Create in this order, running tests as you go.

```text
Step 1   .gitignore, .env.example, package.json (root scripts), README.md (stub status table)
Step 2   frontend/package.json, vite.config.js (proxy), index.html (font links), src/main.jsx, src/App.jsx,
         src/styles/index.css
Step 3   backend/package.json ("type":"module"), src/config/env.js, src/errors/AppError.js,
         src/middleware/{requestId,errorHandler,rateLimit,validate}.js, src/app.js, src/server.js,
         src/routes/health.routes.js, src/controllers/healthController.js
Step 4   embedding-service/{requirements.txt,main.py}, tests/test_embed.py
Step 5   supabase/migrations/0001_*.sql, 0002_*.sql, 0003_optional_hnsw_index.sql (not applied),
         backend/src/config/supabaseClient.js
Step 6   backend/src/services/ingestion/{readSource,normalize,sectionParser,chunker}.js,
         backend/tests/fixtures/sample-source.txt (original synthetic text), tests/ingestion/*.test.js
Step 7   backend/src/services/embeddingClient.js, ingestion/indexer.js, scripts/ingest.js
Step 8   backend/src/services/retrievalService.js, bookService.js, routes/book.routes.js, controller
Step 9   backend/src/prompts/groundedAnswer.js, services/llmService.js
Step 10  backend/src/services/ragService.js, routes/chat.routes.js, controllers/chatController.js
Step 11  frontend/src/services/chatApi.js, hooks/useChat.js, components/*.jsx (order: ChatInput,
         MessageBubble, SourceCard, LoadingIndicator, ErrorMessage, SuggestedQuestions, WelcomeScreen,
         ChatWindow, ChatLayout, AppHeader)
Step 12  error mapping table in chatApi/ErrorMessage; component tests
Step 13  remaining tests; scripts in package.json
Step 14  backend/evaluation/dataset.json, scripts/evaluate.js
Step 15–17 docs updates
```

Additions beyond the base repository structure that are allowed: `backend/src/errors/`, `backend/data/source/` (gitignored, contains `.gitkeep`), `backend/tests/fixtures/`, `backend/evaluation/`, `frontend/src/pages/.gitkeep`. Anything else needs justification.

## 7. Implementation Notes That Prevent Common Mistakes

- **One normalization function.** Export `normalizeForEmbedding(text)` from one backend module; ingestion and query paths both call it before `POST /embed`. Never normalize differently on the two paths.
- **Truncation awareness.** The model truncates at 256 word-piece tokens. Never raise `CHUNK_TARGET_TOKENS` above ~230 without recording that embeddings then cover only part of the chunk.
- **Dimension guard.** After every embedding call, assert `length === 384` for each vector; throw otherwise.
- **Threshold in Node.** `match_chunks` has no threshold parameter by design. Log (at debug level) the top scores, including those below threshold, for tuning.
- **Chunk text vs label.** Evidence given to Gemini contains only `S1…` labels and passage text, not chunk IDs or chapter names.
- **Citations.** `sources[]` = retrieved chunks whose labels appear in `usedEvidence`, mapped back to stored metadata; unknown labels are discarded and counted in logs.
- **Quote check.** Extract double-quoted spans of ≥ 4 words from `answer`/`interpretation`; normalize (case, whitespace, curly/straight quotes) and require a substring match in a retrieved chunk. Retry once with a corrective instruction, then add `meta.warnings: ["UNVERIFIED_QUOTATION"]`.
- **Fallback is never LLM-written.** Use the fixed template from API_SPECIFICATION §4.2.
- **Fixture hygiene.** The fixture is original text invented by the developer (e.g., a short synthetic desert-themed story with two `## ` sections). Never paste book passages into tests, docs, or code comments.
- **Logging.** Log request ID, route, status, code, timings. In production do not log full question text. Never log keys or the Supabase URL with credentials.
- **Timeouts.** `AbortController` on every outbound call; configurable via env.
- **Secrets scan.** Before each commit, check `git status`/`git diff --staged` for `.env`, keys, caches, `*.npy`/embedding dumps, or source text.

## 8. Testing Requirements

You must verify, with real runs wherever possible:

| # | Check | Typical test |
|---|---|---|
| 1 | Empty questions are rejected | supertest: `""`, `"   "`, missing field, wrong type → 400 `VALIDATION_ERROR` |
| 2 | Valid questions reach the backend | frontend test with API stub; supertest happy path |
| 3 | Embeddings have correct dimensions | pytest on `/embed`; Node client asserts 384 |
| 4 | DB retrieval returns correct metadata | integration test against fixture-indexed data (or mocked RPC in unit tests, plus one live test behind an env flag) |
| 5 | Relevant passages are supplied to the LLM | unit test on prompt builder / mocked LLM receives expected evidence |
| 6 | Unsupported questions trigger the fallback | no candidates above threshold → `insufficient_evidence`, **LLM mock called 0 times** |
| 7 | Citations correspond to retrieved passages | mocked LLM cites `S9` (nonexistent) → dropped; all `chunkId`s ⊆ retrieved IDs |
| 8 | Model and DB failures produce understandable errors | mocked failures → exact codes/status from API_SPECIFICATION §1.2 |
| 9 | Frontend shows loading, success, empty (fallback), and error states | RTL tests (DESIGN_IMPLEMENTATION §16) |
| 10 | Secrets are not in the repository | scripted scan: `git ls-files` contains no `.env`; grep for key patterns; `.gitignore` check |

Mocks are acceptable for unit tests; say explicitly which tests used mocks and which hit real services.

## 9. Stop-and-Report Triggers

Stop, explain the situation, and propose options (do not improvise) when:

- No authorized source text is available (do not download or fabricate book text).
- Gemini key, Supabase project, or model name is missing or invalid, and the step cannot be verified.
- A library API differs from what the docs assume.
- The embedding dimension returned is not 384 or the model cannot be loaded.
- A requirement in one document contradicts another.
- Meeting a requirement would need a technology outside the approved stack.

## 10. Output Expectations

At the end of each working session, and when finished, provide:

1. **Implementation plan** (current and remaining steps).
2. **File-by-file sequence** followed (what was created or modified, and why).
3. **Lists** of created files and modified files.
4. **Commands** required to run the project (embedding service, backend, frontend, ingest, tests).
5. **Test results**: clearly separate **executed** (with commands and outcomes, pass/fail counts) from **proposed/not run**.
6. **Unresolved configuration requirements** (keys, project setup, source text).
7. **Known limitations** (including anything stubbed or untuned, e.g., the placeholder threshold).

## 11. Honesty Rules

- Do not claim that something is tested, deployed, evaluated, or complete unless you ran it and it succeeded; report failures verbatim.
- Do not report evaluation numbers you did not measure. Leave the results table empty if evaluation has not been run.
- Do not claim a feature works because the code "should" work; run it.
- If you could not run a step (missing credentials, no network), say so explicitly and list what remains unverified.
- Do not describe free-tier services as unlimited, and do not state hosting limits from memory; point to the provider's current docs.

## 12. Definition of MVP Complete

All PRD AC-01…AC-20 are either verified (with evidence) or listed as unmet with the reason; README setup works from a clean clone; no secrets or copyrighted full text are committed; known limitations are written down.
