-- Display texts become per-language objects { "<code>": text }. Adding a language adds a key, not a migration.
-- The server never reads them (it only computes mechanics).
alter table public.seasons alter column name type jsonb using jsonb_build_object('fr', name);
alter table public.competitions alter column name type jsonb using jsonb_build_object('fr', name);
alter table public.cards alter column name type jsonb using jsonb_build_object('fr', name);

alter table public.seasons add constraint seasons_name_per_language check (jsonb_typeof(name) = 'object');
alter table public.competitions add constraint competitions_name_per_language check (jsonb_typeof(name) = 'object');
alter table public.cards add constraint cards_name_per_language check (jsonb_typeof(name) = 'object');

update public.cards c
set effects = (
  select coalesce(
    jsonb_agg(
      case
        when jsonb_typeof(e -> 'description') = 'string' then
          jsonb_set(e, '{description}', jsonb_build_object('fr', replace(e ->> 'description', '{value}', '{{value}}')))
        else e
      end
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(c.effects) with ordinality as t(e, ord)
)
where jsonb_typeof(c.effects) = 'array';
