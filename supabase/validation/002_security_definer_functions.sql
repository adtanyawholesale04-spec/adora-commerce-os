select n.nspname as schema_name,
       p.proname as function_name,
       p.prosecdef as security_definer,
       coalesce(array_to_string(p.proacl, ', '), '(default execute privileges)') as execute_acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;
