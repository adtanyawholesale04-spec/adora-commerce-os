-- ADORA Commerce OS (ACOS)
-- 001_extensions_helpers.sql

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_update_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'Table % is append-only; UPDATE/DELETE is not allowed', tg_table_name;
end;
$$;

create table if not exists public.document_sequences (
  organization_id uuid not null,
  document_type varchar(60) not null,
  prefix varchar(40) not null default '',
  current_value bigint not null default 0,
  reset_policy varchar(30) not null default 'NEVER'
    check (reset_policy in ('NEVER','YEARLY','MONTHLY','DAILY')),
  last_reset_key varchar(20),
  updated_at timestamptz not null default now(),
  primary key (organization_id, document_type)
);

create or replace function public.next_document_number(
  p_organization_id uuid,
  p_document_type varchar,
  p_prefix varchar default '',
  p_reset_policy varchar default 'NEVER'
)
returns varchar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_reset_key varchar;
  v_value bigint;
  v_prefix varchar;
begin
  if p_reset_policy not in ('NEVER','YEARLY','MONTHLY','DAILY') then
    raise exception 'Unsupported reset policy: %', p_reset_policy;
  end if;

  v_reset_key := case p_reset_policy
    when 'YEARLY' then to_char(v_now, 'YYYY')
    when 'MONTHLY' then to_char(v_now, 'YYYYMM')
    when 'DAILY' then to_char(v_now, 'YYYYMMDD')
    else null
  end;

  insert into public.document_sequences (
    organization_id, document_type, prefix, current_value, reset_policy, last_reset_key
  )
  values (
    p_organization_id, p_document_type, coalesce(p_prefix,''), 0, p_reset_policy, v_reset_key
  )
  on conflict (organization_id, document_type) do nothing;

  update public.document_sequences
  set prefix = coalesce(p_prefix, prefix),
      reset_policy = p_reset_policy,
      current_value = case
        when p_reset_policy <> 'NEVER'
         and last_reset_key is distinct from v_reset_key
        then 1 else current_value + 1 end,
      last_reset_key = v_reset_key,
      updated_at = now()
  where organization_id = p_organization_id
    and document_type = p_document_type
  returning prefix, current_value into v_prefix, v_value;

  return concat(
    v_prefix,
    case when p_reset_policy = 'NEVER' then '' else v_reset_key || '-' end,
    lpad(v_value::text, 6, '0')
  );
end;
$$;
