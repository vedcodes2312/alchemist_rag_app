-- 0001_create_documents_and_chunks.sql
-- Alchemist AI: Core documents and chunks tables with pgvector

-- pgvector lives in the "extensions" schema on Supabase.
create extension if not exists vector with schema extensions;

create table if not exists public.documents (
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

create table if not exists public.chunks (
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

create index if not exists chunks_document_id_idx on public.chunks (document_id);

-- Row Level Security: enabled, with NO policies for anon/authenticated.
alter table public.documents enable row level security;
alter table public.chunks    enable row level security;

-- Supabase grants table privileges to anon/authenticated by default; revoke them.
revoke all on table public.documents from anon, authenticated;
revoke all on table public.chunks    from anon, authenticated;
