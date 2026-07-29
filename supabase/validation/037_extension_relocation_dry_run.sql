begin;

do $$
begin
  if (
    select n.nspname <> 'extensions'
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;

  if (
    select n.nspname <> 'extensions'
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'unaccent'
  ) then
    alter extension unaccent set schema extensions;
  end if;
end
$$;

set local search_path = public, extensions, pg_catalog;

do $$
declare
  v_index_count integer;
begin
  if extensions.similarity('adora', 'adora') <> 1 then
    raise exception 'pg_trgm similarity failed after relocation';
  end if;

  if extensions.unaccent('Crème') <> 'Creme' then
    raise exception 'unaccent failed after relocation';
  end if;

  select count(*)
  into v_index_count
  from pg_indexes
  where schemaname = 'public'
    and indexdef ~ '(gin_trgm_ops|gist_trgm_ops)';

  if v_index_count <> 2 then
    raise exception 'expected 2 trigram indexes after relocation, got %', v_index_count;
  end if;
end
$$;

select 'extension_relocation_dry_run' as check_name, 'pass' as result;

rollback;
