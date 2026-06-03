
-- Slice 4: 24H queue message thread (append-only)
create table public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  author_kind text not null check (author_kind in ('admin','submitter')),
  body text not null check (length(btrim(body)) > 0),
  visible_to_submitter boolean not null default false,
  created_at timestamptz not null default now()
);

create index feedback_messages_feedback_id_created_idx
  on public.feedback_messages (feedback_id, created_at);

alter table public.feedback_messages enable row level security;
alter table public.feedback_messages force row level security;

-- Admin: read all
create policy "feedback_messages admin read"
  on public.feedback_messages for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Submitter: read own thread (own messages + admin messages flagged visible)
create policy "feedback_messages submitter read"
  on public.feedback_messages for select to authenticated
  using (
    exists (
      select 1 from public.feedback f
      where f.id = feedback_messages.feedback_id
        and f.user_id = auth.uid()
    )
    and (
      author_kind = 'submitter'
      or visible_to_submitter = true
    )
  );

-- Admin insert (defense-in-depth; edge fn enforces matrix)
create policy "feedback_messages admin insert"
  on public.feedback_messages for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    and author_user_id = auth.uid()
    and author_kind = 'admin'
  );

-- Submitter insert (defense-in-depth; edge fn enforces matrix)
create policy "feedback_messages submitter insert"
  on public.feedback_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.feedback f
      where f.id = feedback_messages.feedback_id
        and f.user_id = auth.uid()
    )
    and author_user_id = auth.uid()
    and author_kind = 'submitter'
    and visible_to_submitter = true
  );

-- No update/delete policies: append-only.
