-- Atomic collection change (packs, recycle, craft) with optimistic locking on wallets.version.
-- Returns 'ok' | 'conflict' (stale version) | 'duplicate' (pack already opened).
-- Raises (rolling back the whole call) when a count would drop below what the player owns.
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
  select version into v_version from public.wallets where user_id = p_user_id for update;
  if v_version is null then
    raise exception 'wallet not found for user %', p_user_id;
  end if;
  if v_version <> p_expected_version then
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

  insert into public.owned_cards as owned (user_id, card_id, rarity, count)
  select p_user_id, d.card_id, d.rarity, d.delta
  from jsonb_to_recordset(p_owned_deltas) as d (card_id text, rarity text, delta int)
  where d.delta > 0
  on conflict (user_id, card_id, rarity) do update set count = owned.count + excluded.count;

  select count(*) into v_expected_removals
  from jsonb_to_recordset(p_owned_deltas) as d (card_id text, rarity text, delta int)
  where d.delta < 0;

  update public.owned_cards as owned set count = owned.count + d.delta
  from jsonb_to_recordset(p_owned_deltas) as d (card_id text, rarity text, delta int)
  where d.delta < 0 and owned.user_id = p_user_id and owned.card_id = d.card_id and owned.rarity = d.rarity;
  get diagnostics v_applied_removals = row_count;
  if v_applied_removals <> v_expected_removals then
    raise exception 'cannot remove cards the player does not own';
  end if;

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
