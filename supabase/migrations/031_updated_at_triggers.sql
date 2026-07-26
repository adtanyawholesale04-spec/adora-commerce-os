-- ADORA Commerce OS (ACOS)
-- 031_updated_at_triggers.sql

do $$
declare r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and t.table_type = 'BASE TABLE'
  loop
    begin
      execute format(
        'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
        r.table_name || '_auto_set_updated_at',
        r.table_name
      );
    exception when duplicate_object then null;
    end;
  end loop;
end;
$$;
