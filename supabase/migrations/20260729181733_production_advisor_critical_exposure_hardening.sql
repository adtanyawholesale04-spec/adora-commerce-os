-- ADORA Commerce OS (ACOS)
-- Production advisor reconciliation Part 1.
-- Forward-only hardening for Supabase-managed automatic RLS and trigger helpers.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute
      'revoke execute on function public.rls_auto_enable() ' ||
      'from public, anon, authenticated';
  end if;
end;
$$;

alter function public.set_updated_at()
  set search_path = pg_catalog;

alter function public.prevent_update_delete()
  set search_path = pg_catalog;
