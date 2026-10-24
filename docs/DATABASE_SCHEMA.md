# Alchemist AI — Database Schema (Supabase PostgreSQL + pgvector)

Related: [ARCHITECTURE](ARCHITECTURE.md) · [API_SPECIFICATION](API_SPECIFICATION.md) · [TECH_STACK](TECH_STACK.md)

**Embedding dimension: 384** (`sentence-transformers/all-MiniLM-L6-v2`). The `vector(384)` column, the `match_chunks` parameter type, the Python service output, and the ingestion dimension check must all agree. Changing the model means changing the column type, re-ingesting, and updating every document.

## 1. Migrations

Files live in `supabase/migrations/` and are applied in order.

| File | Purpose | Applied by default |
|---|---|---|
| `0001_create_documents_and_chunks.sql` | Extension, tables, constraints, RLS, privilege revocation | Yes |
| `0002_create_match_chunks.sql` | Retrieval function and its grants | Yes |
| `0003_optional_hnsw_index.sql` | Approximate-search index | **No** (see §6) |

### 0001 — tables

```sql
-- pgvector lives in the "extensions" schema on Supabase.
create extension if not exists vector with schema extensions;

create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,            -- e.g. 'the-alchemist'
  title               text not null,
  author              text,
  source_description  text,                            -- how the text was obtained (free text, no content)
  source_sha256       text,                            -- hash of the normalized source, for change detection
  embedding_model     text not null,
  embedding_dimension integer not null default 384 check (embedding_dimension = 384),
  chunk_count         integer not null default 0 check (chunk_count >= 0),
  ingested_at         timestamptz
);

create table public.chunks (
  id             text primary key,                     -- stable ID: {slug}-{index:4}-{contentHash8}
  document_id    uuid not null references public.documents(id) on delete cascade,
  chunk_index    integer not null check (chunk_index >= 0),
  chapter        text,                                 -- section label from source markers; nullable
  chapter_index  integer,                              -- order of the section in the source; nullable
  page_number    integer check (page_number is null or page_number > 0),
  content        text not null check (length(btrim(content)) > 0),
  token_estimate integer not null check (token_estimate > 0),
  char_start     integer,                              -- offset in the normalized source; nullable
  char_end       integer,
  embedding      extensions.vector(384) not null,
  metadata       jsonb not null default '{}'::jsonb,   -- extensible source metadata
  created_at     timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index chunks_document_id_idx on public.chunks (document_id);

-- Row Level Security: enabled, with NO policies for anon/authenticated.
alter table public.documents enable row level security;
alter table public.chunks    enable row level security;

-- Supabase grants table privileges to anon/authenticated by default; remove them.
revoke all on table public.documents from anon, authenticated;
revoke all on table public.chunks    from anon, authenticated;
```

### 0002 — retrieval function

```sql
create or replace function public.match_chunks(
  query_embedding        extensions.vector(384),
  match_count            integer default 5,
  filter_document_slug   text    default null
)
returns table (
  id             text,
  document_id    uuid,
  document_title text,
  chapter        text,
  page_number    integer,
  content        text,
  similarity     double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    d.title as document_title,
    c.chapter,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity   -- cosine similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where filter_document_slug is null or d.slug = filter_document_slug
  order by c.embedding <=> query_embedding                 -- cosine distance, ascending
  limit least(greatest(match_count, 1), 20);
$$;

-- Only the backend (service_role) may call it.
revoke execute on function public.match_chunks(extensions.vector, integer, text) from public, anon, authenticated;
grant  execute on function public.match_chunks(extensions.vector, integer, text) to service_role;
```

**Design notes**

- The similarity **threshold is applied in Node.js**, not in SQL, so the evaluation script can record near-miss scores while tuning.
- `1 - (a <=> b)` is cosine similarity because `<=>` is cosine *distance*. Because embeddings are L2-normalized, scores fall in roughly [−1, 1]; typical relevant passages score well above unrelated ones, but the absolute scale is model-specific and **not a probability**.
- `limit least(greatest(match_count,1),20)` caps abuse and keeps results small.
- `language sql` with `stable` lets the planner inline the query. The function takes only typed parameters, so there is no string concatenation and no SQL-injection surface.

## 2. Column Reference

### `documents`

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Internal ID |
| `slug` | text unique | Document key; equals `BOOK_DOCUMENT_SLUG` |
| `title` | text | Display title (`--title` CLI argument) |
| `author` | text | Optional |
| `source_description` | text | How the authorized source was obtained (no content) |
| `source_sha256` | text | Hash of the normalized text; used to detect changed sources |
| `embedding_model` | text | Model that produced the vectors |
| `embedding_dimension` | int | Always 384 (check constraint) |
| `chunk_count` | int | Set **last** during ingestion; `0` means the index is not ready |
| `ingested_at` | timestamptz | Time ingestion completed |

### `chunks`

| Column | Type | Description |
|---|---|---|
| `id` | text PK | `{slug}-{chunk_index padded to 4}-{first 8 hex of SHA-256 of content}` e.g. `the-alchemist-0012-3fa9c1d2`; deterministic for identical text/config |
| `document_id` | uuid FK | Parent document; cascade delete |
| `chunk_index` | int | Order in the source; unique per document |
| `chapter` | text | Label from `## ` marker lines; `null` if the source has none |
| `chapter_index` | int | Section order |
| `page_number` | int | Only if the authorized source provides page data; otherwise `null` |
| `content` | text | Chunk text |
| `token_estimate` | int | `ceil(words × 1.33)` estimate |
| `char_start`, `char_end` | int | Offsets in normalized text |
| `embedding` | vector(384) | L2-normalized embedding |
| `metadata` | jsonb | Extensible; e.g. `{"paragraphs":[3,4]}` |
| `created_at` | timestamptz | Insert time |

Only fields actually stored are returned to clients; absent chapter/page values are `null`, never fabricated.

## 3. Example Ingestion Operation

Via supabase-js (backend, service-role key):

```js
// 1. Upsert document with chunk_count = 0 (index not ready while ingesting)
const { data: doc } = await supabase
  .from('documents')
  .upsert(
    { slug, title, author, source_sha256, embedding_model, embedding_dimension: 384, chunk_count: 0, ingested_at: null },
    { onConflict: 'slug' }
  )
  .select('id')
  .single();

// 2. Replace any previous chunks for this document
await supabase.from('chunks').delete().eq('document_id', doc.id);

// 3. Insert in batches (e.g., 50 rows)
await supabase.from('chunks').insert(batch.map((c) => ({
  id: c.id, document_id: doc.id, chunk_index: c.index,
  chapter: c.chapter, chapter_index: c.chapterIndex, page_number: c.pageNumber ?? null,
  content: c.text, token_estimate: c.tokenEstimate, char_start: c.charStart, char_end: c.charEnd,
  embedding: c.embedding,          // number[384]; use '[...]' string form if required by the client version
  metadata: c.metadata ?? {}
})));

// 4. Mark ready only after all batches succeed
await supabase.from('documents')
  .update({ chunk_count: total, ingested_at: new Date().toISOString() })
  .eq('id', doc.id);
```

Equivalent SQL for one row (illustrative):

```sql
insert into public.chunks (id, document_id, chunk_index, chapter, content, token_estimate, embedding)
values ('the-alchemist-0000-1a2b3c4d', '<document uuid>', 0, 'Prologue', '<chunk text>', 180,
        '[0.0123, -0.0456, ... 384 values ...]'::extensions.vector);
```

## 4. Example Semantic Retrieval Query

Via supabase-js:

```js
const { data, error } = await supabase.rpc('match_chunks', {
  query_embedding: questionEmbedding,   // number[384]
  match_count: 5,
  filter_document_slug: 'the-alchemist'
});
```

Equivalent SQL (psql / SQL editor, for manual inspection):

```sql
select id, chapter, left(content, 120) as preview,
       1 - (embedding <=> '[0.01, ... 384 values ...]'::extensions.vector) as similarity
from public.chunks
order by embedding <=> '[0.01, ... 384 values ...]'::extensions.vector
limit 5;
```

Dimension sanity check after ingestion:

```sql
select count(*) as chunks,
       min(extensions.vector_dims(embedding)) as min_dim,
       max(extensions.vector_dims(embedding)) as max_dim   -- both must be 384
from public.chunks;
```

## 5. Permissions and Row Level Security

| Role | `documents` / `chunks` | `match_chunks` |
|---|---|---|
| `service_role` (backend only) | Full access (bypasses RLS by design) | Execute |
| `anon` | No privileges (revoked; RLS on with no policies) | No execute |
| `authenticated` | No privileges (revoked; RLS on with no policies) | No execute |

Rules:

- The browser never talks to Supabase. The frontend has no Supabase URL or key.
- `SUPABASE_SERVICE_ROLE_KEY` exists only in backend environment variables and the host's secret store; it is never committed, logged, or returned.
- If a future feature needs browser access, add narrowly scoped RLS policies and use the `anon` key; do not reuse the service key.
- Verify after migration: run a request with the `anon` key against `/rest/v1/chunks` and `/rest/v1/rpc/match_chunks`; both must be denied.

## 6. Vector Index: Exact vs Approximate

| Option | Behavior | When to use |
|---|---|---|
| **No ANN index (default)** | Sequential exact scan with cosine distance. 100% recall. | A single novel yields on the order of hundreds to low thousands of chunks; exact scan is fast enough and removes recall as an evaluation variable. |
| **HNSW** (`0003_optional_hnsw_index.sql`) | Approximate nearest neighbor; faster at large scale; slightly lower recall; extra memory and build time. | Only if the corpus grows (e.g., multi-book) or latency measurements justify it. |

```sql
-- 0003_optional_hnsw_index.sql  (not applied by default)
create index chunks_embedding_hnsw_idx
  on public.chunks using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
```

If enabled, re-run the evaluation to confirm hit@k did not regress. The operator class (`vector_cosine_ops`) must match the `<=>` operator used in `match_chunks`, or the index is not used. An IVFFlat index is not recommended here because it needs representative data at build time and tuning of `lists`/`probes`.

## 7. Migration and Reset Instructions

**Apply (hosted project)** — either:

1. Supabase dashboard → SQL editor → run `0001…sql`, then `0002…sql`; or
2. Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.

**Rebuild the index only (keep schema):**

```bash
cd backend
npm run ingest -- --file data/source/<your-authorized-file>.txt --title "The Alchemist" --reset
```

**Full reset (destroys all indexed data):**

```sql
drop function if exists public.match_chunks(extensions.vector, integer, text);
drop table if exists public.chunks;
drop table if exists public.documents;
```

then re-apply the migrations and re-ingest.

**Changing embedding model or dimension:** write a new migration altering `chunks.embedding`, `match_chunks`, and the `documents` check constraint; clear `chunks`; re-ingest; update docs and `.env.example` together.

## 8. Operational Notes

- Free-tier projects may pause after inactivity; confirm the project is active before demos.
- Never store generated embeddings or the source text in Git; they are reproducible from the operator's authorized file.
- Back up nothing sensitive: the database contains passages of a copyrighted book. Treat the project as private and restrict dashboard access.
