create table public.seasons (
  id text primary key,
  name text not null
);

create table public.riders (
  id text primary key,
  uci_id text unique,
  name text not null,
  nation text not null,
  birth_year int,
  category text not null,
  brand text,
  cote numeric not null default 1,
  uci_rank int,
  active boolean not null default true
);

create table public.competitions (
  id text primary key,
  season_id text not null references public.seasons (id),
  name text not null,
  venue text,
  country text,
  round int,
  date_from date not null,
  date_to date not null,
  referee text,
  check (date_to >= date_from)
);

create table public.cards (
  id text primary key,
  type text not null check (type in ('PILOT', 'TECHNIQUE', 'EQUIPMENT', 'REFEREE')),
  edition text not null,
  name text not null,
  subject_id text,
  rarities text[] not null,
  effects jsonb not null default '[]'
);

create table public.balance (
  version int primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value text
);

-- Public read, admin-only write (writes happen with the service role, which bypasses RLS).
do $$
declare t text;
begin
  foreach t in array array['seasons', 'riders', 'competitions', 'cards', 'balance', 'app_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  end loop;
end $$;
