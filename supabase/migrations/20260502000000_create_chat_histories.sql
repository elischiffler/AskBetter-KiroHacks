-- Chat history table for storing analyzed conversations per user
create table public.chat_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Chat',
  overall_score integer not null default 0,
  prompt_count integer not null default 0,
  analysis_result jsonb not null,
  created_at timestamptz not null default now()
);

-- Index for fast user lookups sorted by recency
create index chat_histories_user_id_created_at_idx
  on public.chat_histories (user_id, created_at desc);

-- RLS: users can only see/manage their own rows
alter table public.chat_histories enable row level security;

create policy "Users can view own histories"
  on public.chat_histories for select
  using (auth.uid() = user_id);

create policy "Users can insert own histories"
  on public.chat_histories for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own histories"
  on public.chat_histories for delete
  using (auth.uid() = user_id);
