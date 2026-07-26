select 'table_count' as check_name, count(*)::text as result
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
union all
select 'migration_count' as check_name, count(*)::text as result
from supabase_migrations.schema_migrations
union all
select 'permissions_seeded' as check_name, count(*)::text as result
from public.permissions
union all
select 'features_seeded' as check_name, count(*)::text as result
from public.features
union all
select 'plans_seeded' as check_name, count(*)::text as result
from public.plans
union all
select 'tenant_tables_without_rls' as check_name, count(*)::text as result
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'organization_id'
  )
  and not c.relrowsecurity
union all
select 'public_tables_without_rls' as check_name, count(*)::text as result
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
union all
select 'append_only_triggers' as check_name, count(*)::text as result
from pg_trigger
where tgname in (
  'inventory_movements_append_only',
  'customer_credit_transactions_append_only',
  'loyalty_transactions_append_only',
  'audit_logs_append_only'
)
  and not tgisinternal
union all
select 'public_security_definer_functions' as check_name, count(*)::text as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by check_name;
