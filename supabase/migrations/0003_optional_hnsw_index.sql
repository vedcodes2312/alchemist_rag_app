-- 0003_optional_hnsw_index.sql
-- Alchemist AI: Optional HNSW index for approximate vector search on larger corpora (not applied by default)

create index if not exists chunks_embedding_hnsw_idx
  on public.chunks using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
