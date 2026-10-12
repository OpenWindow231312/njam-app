-- Njam: saved Ask Njam conversations
--
-- Two tables, Row Level Security on both from the start.
--   chat_conversations  one row per conversation, owned by one person.
--   chat_messages       the messages in it, in order. An assistant message
--                       stores the JSON blocks the ask-njam function returned
--                       (text, product, recipe, suggestions), so a saved
--                       conversation can be drawn again exactly as it was.
--
-- A conversation is private to the person who had it, not shared with their
-- household: what you ask an assistant is closer to a diary than to the
-- household's scan history.
--
-- A product block stores only the product id, never a verdict. The app runs
-- the verdict engine again when it draws the block, so an old conversation
-- always shows the verdict for your rules as they are today.

create table public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.users (id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The menu lists your conversations, most recently used first.
create index chat_conversations_user_id_updated_at_idx
  on public.chat_conversations (user_id, updated_at desc);

create table public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.chat_conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  -- Always a JSON array of blocks, even for a plain user message.
  blocks           jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(blocks) = 'array'),
  created_at       timestamptz not null default now()
);

create index chat_messages_conversation_id_created_at_idx
  on public.chat_messages (conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages      enable row level security;

-- (select auth.uid()) rather than auth.uid(): Postgres then works the id out
-- once per query instead of once per row. Same check, cheaper.

-- Conversations: you read, start, rename and delete only your own.
create policy chat_conversations_select on public.chat_conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy chat_conversations_insert on public.chat_conversations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy chat_conversations_update on public.chat_conversations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy chat_conversations_delete on public.chat_conversations
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Messages: reached through their conversation, so the owner check follows
-- the foreign key. There is no update policy on purpose: a message that was
-- said is history and is never edited, only deleted with its conversation.
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

create policy chat_messages_delete on public.chat_messages
  for delete to authenticated
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );
