create table public.threat_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('sms','email','url','social')),
  content text not null,
  prediction text not null,
  risk_score int not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('Safe','Medium','High')),
  reasons jsonb not null default '[]'::jsonb,
  highlighted_words jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index threat_logs_created_at_idx on public.threat_logs (created_at desc);
create index threat_logs_risk_level_idx on public.threat_logs (risk_level);
create index threat_logs_type_idx on public.threat_logs (type);

alter table public.threat_logs enable row level security;

create policy "anyone can read threat logs"
  on public.threat_logs for select
  using (true);

create policy "anyone can insert threat logs"
  on public.threat_logs for insert
  with check (true);

alter publication supabase_realtime add table public.threat_logs;
alter table public.threat_logs replica identity full;