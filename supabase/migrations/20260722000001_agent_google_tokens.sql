-- Table to store Google Calendar OAuth tokens per agent
-- Tokens are service-role only — never read directly from client SDK
create table if not exists public.agent_google_tokens (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expiry timestamptz not null,
  google_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(agent_id)
);

alter table public.agent_google_tokens enable row level security;

-- No client-side access at all — all token operations go through edge functions
-- using the service role key
create policy "No direct client access to tokens"
  on public.agent_google_tokens
  for all
  using (false);

-- Add a separate view for agents to see their connection status only
create view public.agent_google_connection_status
  with (security_invoker = true) as
  select
    agent_id,
    google_email,
    token_expiry,
    (token_expiry > now()) as is_connected
  from public.agent_google_tokens
  where agent_id = auth.uid();

grant select on public.agent_google_connection_status to authenticated;
