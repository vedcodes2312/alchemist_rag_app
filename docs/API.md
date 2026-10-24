# Alchemist AI — REST API Reference Manual

The Alchemist AI backend exposes a production-grade REST API designed for literary question answering with strict grounding against Paulo Coelho's *The Alchemist*.

- **Base URL (Local)**: `http://localhost:3001`
- **Interactive Swagger Documentation**: `http://localhost:3001/docs`
- **Standalone Developer Playground & UI Demo**: `http://localhost:3001/demo`
- **OpenAPI 3.0.3 Spec**: `http://localhost:3001/openapi.json`
- **Postman Collection**: `alchemist_api.postman_collection.json` (in workspace root)

---

## 1. Endpoints Overview

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/chat` | Submit a question; returns grounded answer with citations and pgvector evidence | None (Rate limited: 30 req/min) |
| `GET` | `/api/book/info` | Retrieve document metadata (slug, title, dimension, chunk count, index readiness) | None |
| `GET` | `/api/health` | Liveness check (standard) or deep diagnostics (`?deep=true`) | None |
| `GET` | `/api/chat/sessions` | List recent conversation sessions stored in Supabase PostgreSQL | None |
| `GET` | `/api/chat/sessions/:id` | Retrieve full message thread and citations for a specific session | None |
| `DELETE` | `/api/chat/sessions/:id` | Delete a conversation thread and its associated message history | None |
| `GET` | `/demo` | Standalone Developer Playground & UI Demo (Zero build step) | None |
| `GET` | `/docs` | Interactive Swagger UI API documentation | None |
| `GET` | `/openapi.json` | Raw OpenAPI 3.0.3 specification JSON | None |

---

## 2. Detailed Endpoint Specifications

### 2.1 Ask a Question (`POST /api/chat`)

Submits a question to the RAG pipeline. The pipeline encodes the query into a 384-dimensional vector using local `sentence-transformers/all-MiniLM-L6-v2`, queries Supabase PostgreSQL pgvector for the top 5 cosine-similar chunks, verifies similarity exceeds the configured threshold (`0.45`), and prompts Google Gemini 3.8 Flash (`gemini-3-flash-preview`) with labeled context passages.

#### Request Headers
```http
Content-Type: application/json
Accept: application/json
```

#### Request Body
```json
{
  "question": "What is a Personal Legend according to Melchizedek?",
  "sessionId": "a73bc110-38e2-4112-9c12-32a101f80922",
  "title": "Discussion on Melchizedek"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | **Yes** | 1 to 500 characters. Trimmed automatically. |
| `sessionId` | string (UUID) | Optional | Existing conversation session ID to append turns. If omitted, a new session is created. |
| `title` | string | Optional | Custom title for the session thread (up to 100 characters). |

#### Response: Answered (`200 OK`)
```json
{
  "success": true,
  "data": {
    "status": "ANSWERED",
    "answer": "According to Melchizedek, the King of Salem, a Personal Legend is what a person has always wanted to accomplish. He explains that everyone, when young, knows what their destiny is and isn't afraid to desire everything they'd like to see happen.",
    "groundingScore": 1.0,
    "sessionId": "a73bc110-38e2-4112-9c12-32a101f80922",
    "citations": [
      {
        "quote": "It's what you have always wanted to accomplish.",
        "chapter": "Part One",
        "chunkId": "the-alchemist_part1_004"
      }
    ],
    "passagesConsulted": [
      {
        "chunkId": "the-alchemist_part1_004",
        "chapter": "Part One",
        "similarity": 0.8124,
        "text": "\"It's what you have always wanted to accomplish. Everyone, when they are young, knows what their destiny is. At that point in their lives, everything is clear and everything is possible.\""
      }
    ]
  },
  "meta": {
    "requestId": "bf4a5b8f-c071-4a65-bea2-152a661b0453",
    "timestamp": "2026-10-24T06:40:00.000Z"
  }
}
```

#### Response: Insufficient Evidence Fallback (`200 OK`)
When a question is out of domain or the retrieved passages lack sufficient evidence:
```json
{
  "success": true,
  "data": {
    "status": "INSUFFICIENT_EVIDENCE",
    "answer": "I cannot find support for that in The Alchemist. I can only answer questions directly supported by the text of the book.",
    "groundingScore": 0.0,
    "sessionId": "a73bc110-38e2-4112-9c12-32a101f80922",
    "citations": [],
    "passagesConsulted": []
  },
  "meta": {
    "requestId": "cf4a5b8f-c071-4a65-bea2-152a661b0454",
    "timestamp": "2026-10-24T06:40:01.000Z"
  }
}
```

---

### 2.2 Book Index Status (`GET /api/book/info`)

Returns the status of the indexed book in Supabase pgvector.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "slug": "the-alchemist",
    "title": "The Alchemist",
    "dimension": 384,
    "chunkCount": 303,
    "indexReady": true,
    "sections": ["Prologue", "Part One", "Part Two", "Epilogue"]
  }
}
```

---

### 2.3 Health & Diagnostics (`GET /api/health`)

#### Standard Liveness Check (`GET /api/health`)
```json
{
  "status": "ok",
  "service": "alchemist-ai-backend",
  "timestamp": "2026-10-24T06:40:00.000Z"
}
```

#### Deep Diagnostics Probe (`GET /api/health?deep=true`)
Checks database connectivity, vector index readiness, and embedding service status.
```json
{
  "status": "ok",
  "service": "alchemist-ai-backend",
  "database": {
    "connected": true,
    "provider": "Supabase PostgreSQL",
    "chunkCount": 303
  },
  "embeddings": {
    "healthy": true,
    "dimension": 384,
    "model": "sentence-transformers/all-MiniLM-L6-v2"
  },
  "timestamp": "2026-10-24T06:40:00.000Z"
}
```

---

## 3. Error Responses

All error responses adhere to standard JSON error envelopes with tracking IDs:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Question exceeds maximum length of 500 characters",
    "requestId": "bf4a5b8f-c071-4a65-bea2-152a661b0453"
  }
}
```

| HTTP Status | Error Code | Cause |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Empty question or question longer than 500 characters |
| `403` | `CORS_ERROR` | Request origin not in `CORS_ALLOWED_ORIGINS` |
| `404` | `NOT_FOUND` | Invalid endpoint or session ID does not exist |
| `429` | `RATE_LIMIT_EXCEEDED` | Exceeded 30 chat requests per minute window |
| `503` | `INDEX_NOT_READY` | Book has not been indexed into Supabase yet |
| `503` | `EMBEDDING_SERVICE_UNAVAILABLE` | Python embedding service is offline or unreachable |
| `500` | `INTERNAL_SERVER_ERROR` | Unhandled runtime exception |

---

## 4. Quick cURL Recipes

### Ask Grounded Question
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the Soul of the World?"}'
```

### Out-of-Domain Guardrail Test
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I build a nuclear reactor for spacecraft?"}'
```

### Deep Health Check
```bash
curl http://localhost:3001/api/health?deep=true
```

### List Chat Sessions
```bash
curl http://localhost:3001/api/chat/sessions
```
