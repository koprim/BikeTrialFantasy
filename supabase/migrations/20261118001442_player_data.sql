create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Joueur' check (char_length(btrim(display_name)) between 1 and 30),
  created_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  fragments int not null default 0 check (fragments >= 0),
  pity_e int not null default 0 check (pity_e >= 0),
  pity_l int not null default 0 check (pity_l >= 0),
  packs_opened int not null default 0 check (packs_opened >= 0),
  last_pack_date date,
  starter_given boolean not null default false,
  version int not null default 0 check (version >= 0)
);

create table public.owned_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null references public.cards (id),
  rarity text not null check (rarity in ('C', 'R', 'E', 'L')),
  count int not null check (count >= 0),
  primary key (user_id, card_id, rarity)
);

create table public.pack_openings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('starter', 'daily')),
  pack_date date not null,
  cards jsonb not null check (jsonb_typeof(cards) = 'array'),
  opened_at timestamptz not null default now(),
  unique (user_id, kind, pack_date)
);
create unique index pack_openings_one_starter on public.pack_openings (user_id) where kind = 'starter';

create table public.teams (
  user_id uuid not null references auth.users (id) on delete cascade,
  competition_id text not null references public.competitions (id),
  team jsonb not null check (jsonb_typeof(team) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, competition_id)
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.wallets (user_id) values (new.id);
  return new;
end $$;

-- Only the trigger may run it, never a client through RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Owner-only read; only the service role (Edge Functions) writes game state.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'wallets', 'owned_cards', 'pack_openings', 'teams'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner read" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

revoke all on sequence public.pack_openings_id_seq from anon, authenticated;

-- Renaming is the only direct write a player may do.
create policy "owner rename" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant update (display_name) on public.profiles to authenticated;
