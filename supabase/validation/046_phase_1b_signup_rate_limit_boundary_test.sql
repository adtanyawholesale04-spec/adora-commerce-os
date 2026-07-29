\set ON_ERROR_STOP on

begin;

select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_result jsonb;
  v_digest text := repeat('a', 64);
begin
  v_result := public.api_consume_platform_signup_rate_limit(
    'IP', v_digest, 1, 900, 3
  );
  if not (v_result ->> 'allowed')::boolean
    or (v_result ->> 'remaining')::integer <> 2
  then
    raise exception 'first attempt was not allowed';
  end if;

  perform public.api_consume_platform_signup_rate_limit(
    'IP', v_digest, 1, 900, 3
  );
  v_result := public.api_consume_platform_signup_rate_limit(
    'IP', v_digest, 1, 900, 3
  );
  if not (v_result ->> 'allowed')::boolean
    or (v_result ->> 'remaining')::integer <> 0
  then
    raise exception 'limit boundary was incorrect';
  end if;

  v_result := public.api_consume_platform_signup_rate_limit(
    'IP', v_digest, 1, 900, 3
  );
  if (v_result ->> 'allowed')::boolean then
    raise exception 'over-limit attempt was allowed';
  end if;

  if (
    select attempt_count
    from public.platform_signup_rate_limit_buckets
    where scope = 'IP'
      and identity_digest = v_digest
      and key_version = 1
  ) <> 4 then
    raise exception 'denied attempt was not counted';
  end if;

  v_result := public.api_consume_platform_signup_rate_limit(
    'DESTINATION', v_digest, 1, 3600, 1
  );
  if not (v_result ->> 'allowed')::boolean then
    raise exception 'scope isolation failed';
  end if;

  v_result := public.api_consume_platform_signup_rate_limit(
    'IP', v_digest, 2, 900, 1
  );
  if not (v_result ->> 'allowed')::boolean then
    raise exception 'key-version isolation failed';
  end if;
end
$$;

do $$
begin
  begin
    perform public.api_consume_platform_signup_rate_limit(
      'IP', 'raw@example.test', 1, 900, 3
    );
    raise exception 'raw identifier was accepted';
  exception
    when sqlstate '22023' then null;
  end;

  begin
    perform public.api_consume_platform_signup_rate_limit(
      'UNKNOWN', repeat('b', 64), 1, 900, 3
    );
    raise exception 'unknown scope was accepted';
  exception
    when sqlstate '22023' then null;
  end;
end
$$;

reset role;

update public.platform_signup_rate_limit_buckets
set
  window_started_at = clock_timestamp() - interval '26 hours',
  window_ends_at = clock_timestamp() - interval '25 hours',
  expires_at = clock_timestamp() - interval '1 hour'
where scope = 'DESTINATION'
  and identity_digest = repeat('a', 64)
  and key_version = 1;

select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_deleted integer;
begin
  v_deleted := public.api_cleanup_platform_signup_rate_limits(100);
  if v_deleted <> 1 then
    raise exception 'expired cleanup did not delete exactly one row';
  end if;
end
$$;

do $$
begin
  if has_table_privilege(
    'anon',
    'public.platform_signup_rate_limit_buckets',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.platform_signup_rate_limit_buckets',
    'SELECT'
  ) or has_table_privilege(
    'service_role',
    'public.platform_signup_rate_limit_buckets',
    'SELECT'
  ) then
    raise exception 'direct table access was granted';
  end if;

  if has_function_privilege(
    'anon',
    'public.api_consume_platform_signup_rate_limit(text,text,integer,integer,integer)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.api_consume_platform_signup_rate_limit(text,text,integer,integer,integer)',
    'EXECUTE'
  ) then
    raise exception 'public consume execute was granted';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.api_consume_platform_signup_rate_limit(text,text,integer,integer,integer)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.api_cleanup_platform_signup_rate_limits(integer)',
    'EXECUTE'
  ) then
    raise exception 'service role execute was not granted';
  end if;
end
$$;

select 'phase_1b_signup_rate_limit_boundary' as test_name, 'pass' as result;

rollback;
