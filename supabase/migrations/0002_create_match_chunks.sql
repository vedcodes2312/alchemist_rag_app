-- 0002_create_match_chunks.sql
-- Alchemist AI: Retrieval function with cosine similarity and service-role authorization

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
