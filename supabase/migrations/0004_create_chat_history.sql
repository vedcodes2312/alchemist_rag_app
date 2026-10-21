-- 0004_create_chat_history.sql
-- Alchemist AI: Database-backed chat sessions and message history

create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'New Conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.chat_sessions(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  interpretation  text,                                -- optional literary analysis block
  sources         jsonb not null default '[]'::jsonb,  -- cited chunks, chapters, similarity scores
  status          text not null default 'answered',    -- 'answered' | 'insufficient_evidence' | 'error'
  created_at      timestamptz not null default now()
);

create index if not exists chat_sessions_updated_at_idx on public.chat_sessions (updated_at desc);
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at asc);

-- Row Level Security: enabled, server-only access (service_role)
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Revoke default table privileges from anon and authenticated roles
revoke all on table public.chat_sessions from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;
