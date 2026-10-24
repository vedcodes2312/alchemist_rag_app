# Alchemist AI Documentation Package

Comprehensive documentation and engineering specifications for **The Alchemist AI** — a production-grade Retrieval-Augmented Generation (RAG) reading companion for Paulo Coelho's *The Alchemist*.

---

## Documentation Index

| Document | Title | Description |
|---|---|---|
| [`API.md`](API.md) | **API Reference & Client Guide** | Complete REST API specification (`/api/chat`, `/api/book/info`, `/api/health`, `/api/chat/sessions`), request/response schemas, error handling, rate limiting, cURL recipes, and Postman instructions. |
| [`PRD.md`](PRD.md) | **Product Requirements Document** | High-level goals, user personas, core MVP scope, grounding constraints, anti-hallucination guardrails, and acceptance criteria. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | **System Architecture** | Architectural diagrams (C4, ingestion sequence, question answering flow, error recovery), component breakdown, latency budgets, and security model. |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | **Database & pgvector Schema** | Supabase PostgreSQL schema, `documents`, `chunks`, `chat_sessions`, `chat_messages` tables, HNSW vector indexing, RLS policies, and cosine similarity RPC functions. |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | **Design System & Typography** | Literary desert-night design tokens, color palette (`#141722`, `#F4E9D5`, `#C69B55`), typography, spacing, glassmorphism surfaces, and accessibility standards. |
| [`DESIGN_IMPLEMENTATION.md`](DESIGN_IMPLEMENTATION.md) | **UI/UX Implementation** | Component hierarchy, state management, citation drawers, responsive layouts, journal sidebar, and animation contracts. |
| [`TECH_STACK.md`](TECH_STACK.md) | **Technology Stack & Rationale** | Detailed technology selection rationale across FastAPI, Express, React, Vite, SentenceTransformers, and Gemini 3.8 Flash. |
| [`EVALUATION_PLAN.md`](EVALUATION_PLAN.md) | **Evaluation & Benchmark Harness** | 24-question test dataset methodology, Hit@k retrieval metrics, citation faithfulness evaluation, adversarial jailbreak defense, and automated reporting. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | **Production & Local Deployment** | Single-command Docker Compose orchestration, AWS Free Tier (`t2.micro` / `t3.micro`) EC2 setup, swap memory provisioning, and Nginx reverse proxy. |
| [`openapi.json`](openapi.json) | **OpenAPI 3.0.3 Specification** | Full machine-readable API specification for automated code generation, Swagger UI, and Postman collections. |

---

## Interactive Local Interfaces

In addition to the static markdown specifications, you can explore the live system locally:

1. **Standalone Developer Playground & UI Demo**: [`http://localhost:3001/demo`](http://localhost:3001/demo)
   - Zero build step, side-by-side view with quote callouts, pgvector citations drawer, raw JSON syntax highlighting, and live latency metrics.
2. **Interactive Swagger UI**: [`http://localhost:3001/docs`](http://localhost:3001/docs)
   - Interactive "Try it out" runners for every endpoint.
3. **OpenAPI JSON Endpoint**: [`http://localhost:3001/openapi.json`](http://localhost:3001/openapi.json)
4. **Terminal CLI Walkthrough**: `npm run api:demo`
5. **Postman Collection**: [`../alchemist_api.postman_collection.json`](../alchemist_api.postman_collection.json)
