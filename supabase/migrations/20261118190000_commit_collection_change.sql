-- Atomic collection change (packs, recycle, craft) with optimistic locking on wallets.version.
-- Returns 'ok' | 'conflict' (stale or null version) | 'duplicate' (pack already opened).
-- Raises (rolling back the whole call) when the wallet is unknown (P0002), the wallet payload
-- lacks a key (22023), or a count would go below zero or the card isn't owned (P0001).
-- Deltas for the same (card_id, rarity) are summed first, so they net out.
create function public.commit_collection_change(
  p_user_id uuid,
  p_expected_version int,
  p_wallet jsonb,
  p_owned_deltas jsonb,
  p_opening jsonb default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_version int;
  v_expected_removals int;
  v_applied_removals int;
begin
  if not (p_wallet ?& array['fragments', 'pityE', 'pityL', 'packsOpened', 'lastPackDate', 'starterGiven']) then
    raise exception 'incomplete wallet' using errcode = '22023';
  end if;

  select version into v_version from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;
  if v_version is distinct from p_expected_version then
    return 'conflict';
  end if;

  if p_opening is not null then
    insert into public.pack_openings (user_id, kind, pack_date, cards)
    values (p_user_id, p_opening ->> 'kind', (p_opening ->> 'packDate')::date, p_opening -> 'cards')
    on conflict do nothing;
    if not found then
      return 'duplicate';
    end if;
  end if;

  with net as (
    select d.card_id, d.rarity, sum(d.delta) as delta
    from jsonb_to_recordset(p_owned_deltas) as d (card_id text, rarity text, delta int)
    group by d.card_id, d.rarity
  )
  insert into public.owned_cards as owned (user_id, card_id, rarity, count)
  select p_user_id, net.card_id, net.rarity, net.delta from net where net.delta > 0
  on conflict (user_id, card_id, rarity) do update set count = owned.count + excluded.count;

  select count(*) into v_expected_removals from (
    select 1
    from jsonb_to_recordset(p_owned_deltas) as d (card_id text, rarity text, delta int)
    group by d.card_id, d.rarity
    having sum(d.delta) < 0
  ) as removals;

  with net as (
    select d.card_id, d.rarity, sum(d.delta) as delta
    from jsonb_to_recordset(p_owned_deltas) as d (card_id text, rarity text, delta int)
    group by d.card_id, d.rarity
  )
  update public.owned_cards as owned set count = owned.count + net.delta
  from net
  where net.delta < 0 and owned.user_id = p_user_id and owned.card_id = net.card_id
    and owned.rarity = net.rarity and owned.count + net.delta >= 0;
  get diagnostics v_applied_removals = row_count;
  if v_applied_removals <> v_expected_removals then
    raise exception 'insufficient cards' using errcode = 'P0001';
  end if;

  -- User-wide on purpose: any row this call (or an earlier one) emptied is removed.
  delete from public.owned_cards where user_id = p_user_id and count = 0;

  update public.wallets set
    fragments = (p_wallet ->> 'fragments')::int,
    pity_e = (p_wallet ->> 'pityE')::int,
    pity_l = (p_wallet ->> 'pityL')::int,
    packs_opened = (p_wallet ->> 'packsOpened')::int,
    last_pack_date = (p_wallet ->> 'lastPackDate')::date,
    starter_given = (p_wallet ->> 'starterGiven')::boolean,
    version = version + 1
  where user_id = p_user_id;

  return 'ok';
end $$;
revoke execute on function public.commit_collection_change(uuid, int, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_collection_change(uuid, int, jsonb, jsonb, jsonb) to service_role;
