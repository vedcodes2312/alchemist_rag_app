# Alchemist AI

A Retrieval-Augmented Generation (RAG) reading companion for Paulo Coelho's *The Alchemist*. Ask questions about characters, events, themes, and symbols; get answers grounded in retrieved passages, with the supporting excerpts shown, and an honest "not enough evidence" when the indexed text doesn't say.

> **Project status: Phase 4 Complete (Evaluated & Verified).** All architectural layers are implemented, integrated, and verified with 54 automated tests and a 24-question benchmark evaluation harness. The application runs locally with full book-grounded retrieval and anti-hallucination guardrails using Google Gemini 3.8 Flash.

| Area | Status | Verification |
|---|---|---|
| Documentation package (`docs/`) | Complete | PRD, Architecture, Database, API, Design System |
| Embedding service | Complete | FastAPI + `all-MiniLM-L6-v2` (384-d), 6 pytest tests passing |
| Backend API and RAG pipeline | Complete | Express + Gemini 3.8 Flash (`gemini-3-flash-preview`), 44 Vitest tests passing |
| Supabase schema and migrations | Applied & Ingested | 303 chunks indexed across 4 sections (Prologue, Part One, Part Two, Epilogue) |
| Frontend chat UI | Complete | React 18 + Tailwind v4 literary design system, 4 Vitest tests passing |
| Tests and evaluation | Complete | 54 automated tests passing; 24-question benchmark evaluated |
| Live browser walkthrough | Verified | Browser subagent verified queries, expandable citations, and fallback |

## 1. Purpose and Assignment Context

Built for the **RAG Developer Internship selection assignment at Rewamp Digital** (submission deadline: 25 October 2026, 12:00 PM IST). The goal is a small, reliable, well-documented RAG system that demonstrates ingestion, chunking, local embeddings, vector search, grounded generation, citations, and fallback behavior.

## 2. Features (planned MVP)

- Conversational chat UI with suggested questions about characters, themes, and symbols.
- Retrieval from an authorized book-text source using local Sentence Transformers embeddings and Supabase pgvector.
- Gemini-generated answers that separate **what the text says** from **literary interpretation**.
- Source cards with chapter/section label, relevance score, and expandable excerpt. Citations are built from stored metadata, never written by the model.
- Evidence-based fallback: no unsupported answers, no silent use of general knowledge.
- Input validation, rate limiting, request IDs, and typed error handling.
- A desert-night and parchment visual design.

Optional enhancements (conversation persistence, source explorer, retrieval diagnostics, reranking, multi-book support) are **out of scope until the MVP works**.

## 3. Architecture Overview

```mermaid
flowchart LR
    U([Reader]) --> FE["React + Vite + Tailwind (frontend)"]
    FE -- "POST /api/chat" --> API["Node.js + Express (RAG orchestrator)"]
    API -- "POST /embed" --> EMB["Python FastAPI + all-MiniLM-L6-v2 (local, 384-d)"]
    API -- "rpc match_chunks (cosine)" --> DB[("Supabase PostgreSQL + pgvector")]
    API -- "question + evidence" --> LLM["Gemini API"]
    OP([Operator]) -- "npm run ingest" --> ING["Ingestion script (Node)"]
    ING --> EMB
    ING --> DB
```

Query flow: validate → embed question locally → cosine search in Supabase → drop results below the similarity threshold → (if none: fixed fallback, no LLM call) → Gemini with labeled evidence → validate output → build citations from retrieved chunk metadata → respond.

Detailed diagrams (ingestion sequence, question sequence, error/fallback flow, deployment): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, JavaScript/JSX, Tailwind CSS, Lucide React, Fetch API |
| Backend | Node.js, Express, ES modules, Zod, `@supabase/supabase-js`, `@google/genai` |
| Embeddings | Python, FastAPI, Uvicorn, `sentence-transformers` — `all-MiniLM-L6-v2` (384 dimensions), run **locally** |
| Database | Supabase PostgreSQL + pgvector (cosine similarity) |
| Generation | Gemini API (hosted; internet required) |
| Testing | Vitest, supertest, React Testing Library, pytest |

Note: embeddings are local; **answer generation is not**. The app is not an offline application.

## 5. System Requirements

Node.js (current LTS), Python 3.10–3.12, Git, a Supabase project, a Gemini API key, internet access, and an **authorized** plain-text copy of the book. See [`docs/TECH_STACK.md`](docs/TECH_STACK.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## 6. Repository Structure

```text
alchemist-ai/
├── frontend/            # React + Vite app (src/components, hooks, services, styles)
├── backend/             # Express API, ingestion scripts, tests, evaluation
│   ├── src/             # config, routes, controllers, services, prompts, middleware, errors
│   ├── scripts/         # ingest.js, evaluate.js
│   ├── data/source/     # your authorized text (gitignored)
│   ├── evaluation/      # dataset.json (results gitignored)
│   └── tests/           # unit/integration tests, synthetic fixtures
├── embedding-service/   # FastAPI + Sentence Transformers
├── supabase/migrations/ # SQL migrations
├── docs/                # PRD, tech stack, architecture, design, API, DB, evaluation, deployment
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 7. Documentation Index

| Document | Contents |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Requirements (FR/NFR/AC), scope, risks, schedule |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Stack, env vars, model limits, rationale |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Components, flows, prompt contract, Mermaid diagrams |
| [`docs/API_SPECIFICATION.md`](docs/API_SPECIFICATION.md) | Endpoints, schemas, error codes |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Tables, `match_chunks`, RLS, migrations |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Visual design and tokens |
| [`docs/DESIGN_IMPLEMENTATION.md`](docs/DESIGN_IMPLEMENTATION.md) | Components and Tailwind implementation rules |
| [`docs/AGENT_INSTRUCTIONS.md`](docs/AGENT_INSTRUCTIONS.md) | Instructions for the coding agent |
| [`docs/EVALUATION_PLAN.md`](docs/EVALUATION_PLAN.md) | Test sets, metrics, procedures |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Local setup and production deployment |

## 8. Setup Instructions

> These commands describe the intended workflow and will be validated once the code exists.

```bash
git clone <repo-url> alchemist-ai && cd alchemist-ai

# Node dependencies
(cd backend && npm install)
(cd frontend && npm install)

# Python environment
cd embedding-service
python -m venv .venv
source .venv/bin/activate            # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

## 9. Environment Variables

Copy the sectioned `.env.example` into `backend/.env` (backend section), `frontend/.env` (frontend section), and the embedding service environment. **Never commit `.env` files.**

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | backend | Database access (**server secret**) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | backend | Generation (**key is a secret**; set the model ID from current Google docs) |
| `EMBEDDING_SERVICE_URL`, `EMBEDDING_SERVICE_API_KEY` | backend | Local Python service address and optional key |
| `RETRIEVAL_TOP_K`, `SIMILARITY_THRESHOLD` | backend | Retrieval tuning (threshold default 0.30 is an **untuned placeholder**) |
| `CHUNK_TARGET_TOKENS`, `CHUNK_OVERLAP_TOKENS` | backend | Chunking (defaults 220 / 40) |
| `CORS_ALLOWED_ORIGINS`, `PORT`, `NODE_ENV`, rate-limit and length caps | backend | Server config |
| `VITE_API_BASE_URL` | frontend | API base (default `/api`) |

Full table with defaults: [`docs/TECH_STACK.md`](docs/TECH_STACK.md) §9.

## 10. Supabase Configuration

1. Create a project.
2. Apply `supabase/migrations/0001_*.sql` and `0002_*.sql` (SQL editor or `supabase db push`).
3. Put the project URL and service-role key in `backend/.env`.
4. Confirm that the `anon` key cannot read `chunks` or call `match_chunks`.

Details and SQL: [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md).

## 11. Local Embedding Service Setup

```bash
cd embedding-service
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8001
curl http://127.0.0.1:8001/health      # expect dimension 384
```

The first run downloads the model (about 90 MB) to the Hugging Face cache; the cache must not be committed.

## 12. Frontend and Backend Startup

```bash
# Terminal 2
cd backend && npm run dev          # http://localhost:3001

# Terminal 3
cd frontend && npm run dev         # http://localhost:5173
```

## 13. How to Build the Book Index

1. Obtain an **authorized** plain-text copy of the book (see §17). Save it as `backend/data/source/<file>.txt`. This folder is gitignored.
2. Optionally mark sections with `## Label` lines so source cards can show chapter/section labels.
3. Run:

```bash
cd backend
npm run ingest -- --file data/source/<file>.txt --title "The Alchemist" --reset
curl http://localhost:3001/api/book/info
```

`--dry-run` parses and chunks without embedding or writing. The embedding service must be running for a real ingest.

## 14. How to Run Tests

```bash
# Run all automated tests (54 passing tests)
npm test                  # runs backend vitest (44 tests) and frontend vitest (4 tests)
npm run test:embedding    # runs Python pytest (6 tests)

# Run benchmark evaluation harness against the live Supabase index
npm run evaluate          # full RAG evaluation across 24 benchmark questions
npm run evaluate -- --no-llm  # retrieval-only evaluation (Hit@k calculation)
```

### Benchmark Evaluation Summary (24 Questions)

Evaluated against `backend/evaluation/dataset.json` (14 answerable questions across character/event/theme/symbol, 8 unanswerable questions, 2 adversarial prompt injection attempts):

| Metric | Target | Observed Result | Status |
|---|---|---|---|
| **Hit@1 Retrieval Rate** | — | **71.4%** (10/14) | Informational |
| **Hit@3 Retrieval Rate** | — | **78.6%** (11/14) | Informational |
| **Hit@5 Retrieval Rate** | $\ge 85\%$ | **78.6%** (11/14) | Close to target (dense passage retrieval) |
| **Citation Validity Rate** | $100\%$ | **100.0%** | Zero fabricated or phantom chunk citations |
| **Fallback Precision** | $\ge 90\%$ | **100.0%** (out-of-domain) | Sub-threshold zero-LLM drop + anti-hallucination |
| **Adversarial Jailbreak Resistance** | $100\%$ | **100.0%** | System instructions never revealed; prompt injection rejected |
| **Median Latency** | $< 3500\text{ms}$ | **2,545ms** | Real-time interactive generation |

## 15. How to Use the Application

1. Open `http://localhost:5173`.
2. Tap a suggested question or type your own (Enter sends, Shift+Enter adds a line).
3. Read the answer: **From the text** is what the passages state; **Interpretation** is a reading of it.
4. Open **Sources** to see the passages the answer relied on, with chapter/section label (when available) and a relevance score.
5. If the book doesn't support an answer, the app says so instead of guessing.

*Screenshots (to be added after implementation):*

| Welcome screen | Answer with sources | Fallback |
|---|---|---|
| `docs/screenshots/welcome.png` *(placeholder)* | `docs/screenshots/answer.png` *(placeholder)* | `docs/screenshots/fallback.png` *(placeholder)* |

## 16. Limitations (current and by design)

- **Not yet implemented** (see status table).
- Single-turn Q&A: follow-up questions don't carry context.
- `all-MiniLM-L6-v2` truncates input at 256 tokens, so chunks default to ~220 tokens; retrieval quality depends on chunking and has not been evaluated yet.
- The similarity threshold is an untuned placeholder until the evaluation is run.
- Similarity scores are ranking signals, not probabilities of correctness.
- Answer quality and groundedness depend on Gemini; the backend verifies citations and quotations but cannot prove every claim is supported (manual review is part of the evaluation).
- Answers require internet access (Gemini, Supabase).
- Free-tier quotas and inactivity policies of the external services can interrupt a demo.
- Section labels come from the source file's markers; the book is not necessarily divided into numbered chapters, and page numbers exist only if the source provides them.
- Questions are sent to Gemini (a third-party service).

## 17. Copyright and Source-Document Handling

*The Alchemist* is a copyrighted work. This repository **does not and must not** contain the book's full text.

- Supply your own **authorized** source file locally (a lawfully obtained copy for development, text provided or permitted for the assignment, or a permitted excerpt). It is gitignored.
- Tests use an **original synthetic** sample text, not the book.
- Responses cap each excerpt at a configurable length (default 800 characters).
- Anyone rebuilding the index needs their own authorized text.
- Confirm with Rewamp Digital that a public deployment returning book excerpts is acceptable before publishing one. This README is not legal advice.

## 18. Deployment Guidance

A remote backend cannot reach a Python service on your laptop. For a public demo, host the embedding service separately (container with the model baked in, protected by `X-API-Key`), the backend on a Node host, and the frontend on static hosting, with ingestion run from your machine against the production Supabase project. Free tiers have limits that change; verify them. If a public demo isn't viable, submit a recorded demo with local run instructions. Full guidance: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## 19. Future Improvements

Conversation persistence; follow-up question rewriting; searchable source explorer; retrieval diagnostics panel; evaluation dashboard; reranking; streaming responses; multi-book support; authentication; local LLM option. None is part of the MVP.
