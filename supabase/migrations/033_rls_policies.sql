-- ADORA Commerce OS (ACOS)
-- 033_rls_policies.sql

do $$
declare r record; p_name text;
begin
  for r in
    select distinct table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'organization_id'
  loop
    execute format('alter table public.%I enable row level security', r.table_name);

    p_name := r.table_name || '_tenant_select';
    begin
      execute format(
        'create policy %I on public.%I for select using (public.is_org_member(organization_id))',
        p_name, r.table_name
      );
    exception when duplicate_object then null;
    end;

    p_name := r.table_name || '_tenant_insert';
    begin
      execute format(
        'create policy %I on public.%I for insert with check (public.is_org_member(organization_id))',
        p_name, r.table_name
      );
    exception when duplicate_object then null;
    end;

    p_name := r.table_name || '_tenant_update';
    begin
      execute format(
        'create policy %I on public.%I for update
         using (public.is_org_member(organization_id))
         with check (public.is_org_member(organization_id))',
        p_name, r.table_name
      );
    exception when duplicate_object then null;
    end;

    p_name := r.table_name || '_tenant_delete';
    begin
      execute format(
        'create policy %I on public.%I for delete using (public.is_org_member(organization_id))',
        p_name, r.table_name
      );
    exception when duplicate_object then null;
    end;
  end loop;
end;
$$;

alter table public.profiles enable row level security;

create policy profiles_self_select
on public.profiles for select
using (auth_user_id = auth.uid());

create policy profiles_self_update
on public.profiles for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

alter table public.permissions enable row level security;
create policy permissions_authenticated_read
on public.permissions for select to authenticated using (true);

alter table public.features enable row level security;
create policy features_authenticated_read
on public.features for select to authenticated using (true);

alter table public.plans enable row level security;
create policy plans_authenticated_read
on public.plans for select to authenticated using (status = 'ACTIVE');
