\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
) values (
  'b1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
  'phase1b@example.test', now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb, now(), now()
);

insert into public.platform_interest_topics (id, slug, name)
values ('b1000000-0000-0000-0000-000000000010', 'fashion', 'Fashion');

insert into public.platform_terms_versions (
  id, terms_type, version, status, document_uri, content_hash, effective_at
) values (
  'b1000000-0000-0000-0000-000000000020', 'COMMUNITY', '2026-07-29',
  'ACTIVE', '/terms/community/2026-07-29',
  repeat('a', 64), now()
);

select set_config('request.jwt.claim.role', 'service_role', true);

select public.api_bootstrap_platform_account(
  'b1000000-0000-0000-0000-000000000001', 'Phase 1B User',
  'PLATFORM_DIRECT', null, null, 'b1000000-0000-0000-0000-000000000101'
);
select public.api_bootstrap_platform_account(
  'b1000000-0000-0000-0000-000000000001', 'Phase 1B User',
  'PLATFORM_DIRECT', null, null, 'b1000000-0000-0000-0000-000000000101'
);

do $$
declare v_profile_id uuid;
begin
  select id into v_profile_id from public.profiles
  where auth_user_id = 'b1000000-0000-0000-0000-000000000001';
  if v_profile_id is null then raise exception 'bootstrap did not create profile'; end if;
  if (select count(*) from public.platform_account_acquisitions where profile_id = v_profile_id) <> 1
    or (select count(*) from public.platform_account_events
      where profile_id = v_profile_id and event_type = 'CUSTOMER_ACCOUNT_CREATED') <> 1
  then raise exception 'bootstrap idempotency failed'; end if;
  if exists (select 1 from public.organization_memberships where profile_id = v_profile_id)
    or exists (select 1 from public.customer_profile_links where profile_id = v_profile_id)
  then raise exception 'bootstrap created tenant side effects'; end if;
end $$;

select public.api_update_platform_interests(
  'b1000000-0000-0000-0000-000000000001',
  array['b1000000-0000-0000-0000-000000000010'::uuid],
  'b1000000-0000-0000-0000-000000000102'
);
select public.api_record_community_terms_decision(
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000020', 'ACCEPTED',
  'b1000000-0000-0000-0000-000000000103'
);
select public.api_update_public_profile_draft(
  'b1000000-0000-0000-0000-000000000001', 'Phase 1B User',
  'phase1b_user', 'Private draft', true,
  'b1000000-0000-0000-0000-000000000104'
);
select public.api_complete_platform_onboarding(
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000105'
);

do $$
declare v_snapshot jsonb;
begin
  v_snapshot := public.api_get_platform_onboarding_snapshot(
    'b1000000-0000-0000-0000-000000000001'
  );
  if v_snapshot #>> '{onboarding,status}' <> 'COMPLETED'
    or (v_snapshot ->> 'store_membership_count')::integer <> 0
  then raise exception 'completed private snapshot is incorrect'; end if;

  begin
    update public.platform_account_acquisitions set source = 'REFERRAL';
    raise exception 'acquisition mutation was allowed';
  exception when raise_exception then
    if sqlerrm = 'acquisition mutation was allowed' then raise; end if;
  end;
  begin
    delete from public.profile_terms_events;
    raise exception 'terms history deletion was allowed';
  exception when raise_exception then
    if sqlerrm = 'terms history deletion was allowed' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if has_table_privilege('authenticated', 'public.public_profile_drafts', 'SELECT')
    or has_table_privilege('anon', 'public.platform_account_events', 'SELECT')
    or has_function_privilege('authenticated',
      'public.api_get_platform_onboarding_snapshot(uuid)', 'EXECUTE')
  then raise exception 'direct role exposure detected'; end if;
  begin
    perform public.api_get_platform_onboarding_snapshot(
      'b1000000-0000-0000-0000-000000000001'
    );
    raise exception 'authenticated function execution was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'phase_1b_platform_signup_boundary|pass' as result;

rollback;
