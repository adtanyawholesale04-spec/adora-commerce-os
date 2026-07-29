-- Phase 1B Part 8B: durable shared platform-signup rate limiting.

create table public.platform_signup_rate_limit_buckets (
  scope text not null,
  identity_digest text not null,
  key_version smallint not null,
  window_started_at timestamptz not null,
  window_ends_at timestamptz not null,
  attempt_count integer not null,
  last_attempt_at timestamptz not null,
  expires_at timestamptz not null,
  constraint platform_signup_rate_limit_buckets_pkey
    primary key (scope, identity_digest, key_version),
  constraint platform_signup_rate_limit_buckets_scope_check
    check (scope in ('IP', 'DESTINATION', 'GLOBAL')),
  constraint platform_signup_rate_limit_buckets_digest_check
    check (identity_digest ~ '^[0-9a-f]{64}$'),
  constraint platform_signup_rate_limit_buckets_key_version_check
    check (key_version between 1 and 32767),
  constraint platform_signup_rate_limit_buckets_window_check
    check (
      window_ends_at > window_started_at
      and expires_at = window_ends_at + interval '24 hours'
    ),
  constraint platform_signup_rate_limit_buckets_attempt_count_check
    check (attempt_count >= 1)
);

create index platform_signup_rate_limit_buckets_expires_at_idx
  on public.platform_signup_rate_limit_buckets (expires_at);

alter table public.platform_signup_rate_limit_buckets enable row level security;

revoke all on table public.platform_signup_rate_limit_buckets
  from public, anon, authenticated, service_role;

create or replace function public.api_consume_platform_signup_rate_limit(
  p_scope text,
  p_identity_digest text,
  p_key_version integer,
  p_window_seconds integer,
  p_attempt_limit integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_bucket public.platform_signup_rate_limit_buckets%rowtype;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if p_scope not in ('IP', 'DESTINATION', 'GLOBAL')
    or p_identity_digest is null
    or p_identity_digest !~ '^[0-9a-f]{64}$'
    or p_key_version is null
    or p_key_version not between 1 and 32767
    or p_window_seconds is null
    or p_window_seconds not between 60 and 86400
    or p_attempt_limit is null
    or p_attempt_limit not between 1 and 10000
  then
    raise exception 'Invalid rate-limit input' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_scope || ':' || p_key_version::text || ':' || p_identity_digest,
      0
    )
  );

  insert into public.platform_signup_rate_limit_buckets (
    scope,
    identity_digest,
    key_version,
    window_started_at,
    window_ends_at,
    attempt_count,
    last_attempt_at,
    expires_at
  )
  values (
    p_scope,
    p_identity_digest,
    p_key_version,
    v_now,
    v_now + pg_catalog.make_interval(secs => p_window_seconds),
    1,
    v_now,
    v_now + pg_catalog.make_interval(secs => p_window_seconds)
      + interval '24 hours'
  )
  on conflict (scope, identity_digest, key_version) do update
  set
    window_started_at = case
      when platform_signup_rate_limit_buckets.window_ends_at <= v_now then v_now
      else platform_signup_rate_limit_buckets.window_started_at
    end,
    window_ends_at = case
      when platform_signup_rate_limit_buckets.window_ends_at <= v_now
        then v_now + pg_catalog.make_interval(secs => p_window_seconds)
      else platform_signup_rate_limit_buckets.window_ends_at
    end,
    attempt_count = case
      when platform_signup_rate_limit_buckets.window_ends_at <= v_now then 1
      when platform_signup_rate_limit_buckets.attempt_count < 2147483647
        then platform_signup_rate_limit_buckets.attempt_count + 1
      else platform_signup_rate_limit_buckets.attempt_count
    end,
    last_attempt_at = v_now,
    expires_at = case
      when platform_signup_rate_limit_buckets.window_ends_at <= v_now
        then v_now + pg_catalog.make_interval(secs => p_window_seconds)
          + interval '24 hours'
      else platform_signup_rate_limit_buckets.window_ends_at + interval '24 hours'
    end
  returning * into v_bucket;

  return pg_catalog.jsonb_build_object(
    'allowed', v_bucket.attempt_count <= p_attempt_limit,
    'remaining', case
      when v_bucket.attempt_count < p_attempt_limit
        then p_attempt_limit - v_bucket.attempt_count
      else 0
    end,
    'reset_at', v_bucket.window_ends_at
  );
end;
$$;

create or replace function public.api_cleanup_platform_signup_rate_limits(
  p_batch_size integer default 1000
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if p_batch_size not between 1 and 5000 then
    raise exception 'Invalid cleanup batch size' using errcode = '22023';
  end if;

  with expired as (
    select b.ctid
    from public.platform_signup_rate_limit_buckets b
    where b.expires_at <= clock_timestamp()
    order by b.expires_at
    limit p_batch_size
    for update skip locked
  )
  delete from public.platform_signup_rate_limit_buckets b
  using expired
  where b.ctid = expired.ctid;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.api_consume_platform_signup_rate_limit(
  text, text, integer, integer, integer
) from public, anon, authenticated;
revoke all on function public.api_cleanup_platform_signup_rate_limits(integer)
  from public, anon, authenticated;

grant execute on function public.api_consume_platform_signup_rate_limit(
  text, text, integer, integer, integer
) to service_role;
grant execute on function public.api_cleanup_platform_signup_rate_limits(integer)
  to service_role;
