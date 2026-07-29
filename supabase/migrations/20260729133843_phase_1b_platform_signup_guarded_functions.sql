-- Phase 1B Part 3: server-only guarded platform signup operations.

create or replace function public.api_bootstrap_platform_account(
  p_auth_user_id uuid,
  p_display_name text,
  p_acquisition_source text,
  p_campaign_reference text,
  p_referral_reference text,
  p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_acquisition public.platform_account_acquisitions%rowtype;
  v_name text := btrim(p_display_name);
  v_campaign text := nullif(btrim(p_campaign_reference), '');
  v_referral text := nullif(btrim(p_referral_reference), '');
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_auth_user_id is null or p_request_id is null or length(v_name) not between 1 and 200 then
    raise exception 'Invalid bootstrap input' using errcode = '22023';
  end if;
  if p_acquisition_source not in ('PLATFORM_DIRECT', 'PLATFORM_CAMPAIGN', 'REFERRAL')
    or (p_acquisition_source = 'PLATFORM_DIRECT' and (v_campaign is not null or v_referral is not null))
    or (p_acquisition_source = 'PLATFORM_CAMPAIGN' and (v_campaign is null or v_referral is not null))
    or (p_acquisition_source = 'REFERRAL' and (v_campaign is not null or v_referral is null))
    or length(coalesce(v_campaign, v_referral, '')) > 160
  then raise exception 'invalid_acquisition_source' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = p_auth_user_id
      and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
  ) then raise exception 'auth_contact_not_verified' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_auth_user_id::text, 0));
  insert into public.profiles (auth_user_id, display_name)
  values (p_auth_user_id, v_name)
  on conflict (auth_user_id) do nothing;
  select * into v_profile from public.profiles where auth_user_id = p_auth_user_id for update;

  select * into v_acquisition from public.platform_account_acquisitions
  where profile_id = v_profile.id;
  if v_acquisition.profile_id is not null and (
    v_acquisition.source is distinct from p_acquisition_source
    or v_acquisition.campaign_reference is distinct from v_campaign
    or v_acquisition.referral_reference is distinct from v_referral
  ) then raise exception 'acquisition_already_captured' using errcode = '23505';
  end if;

  insert into public.platform_account_acquisitions
    (profile_id, source, campaign_reference, referral_reference, request_id)
  values (v_profile.id, p_acquisition_source, v_campaign, v_referral, p_request_id)
  on conflict (profile_id) do nothing;
  insert into public.platform_account_onboarding (profile_id) values (v_profile.id)
  on conflict (profile_id) do nothing;
  insert into public.platform_account_events (profile_id, event_type, request_id)
  values (v_profile.id, 'CUSTOMER_ACCOUNT_CREATED', p_request_id)
  on conflict do nothing;
  insert into public.platform_account_events (profile_id, event_type, request_id, metadata_json)
  values (v_profile.id, 'ACQUISITION_CAPTURED', p_request_id,
    jsonb_build_object('source', p_acquisition_source))
  on conflict do nothing;

  return jsonb_build_object('result', 'account_ready', 'profile_id', v_profile.id);
end;
$$;

create or replace function public.api_get_platform_onboarding_snapshot(p_auth_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_profile public.profiles%rowtype; v_result jsonb;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  select * into v_profile from public.profiles where auth_user_id = p_auth_user_id;
  if v_profile.id is null then raise exception 'Profile not found' using errcode = '22023'; end if;
  select jsonb_build_object(
    'profile_id', v_profile.id, 'display_name', v_profile.display_name,
    'onboarding', to_jsonb(o),
    'active_interests', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'slug', t.slug, 'name', t.name, 'selected', coalesce(i.selected, false))
      order by t.sort_order, t.slug)
      from public.platform_interest_topics t
      left join public.profile_platform_interests i
        on i.interest_topic_id = t.id and i.profile_id = v_profile.id
      where t.status = 'ACTIVE'), '[]'::jsonb),
    'current_terms', (select jsonb_build_object(
      'id', tv.id, 'version', tv.version,
      'accepted', coalesce((select e.event_type = 'ACCEPTED'
        from public.profile_terms_events e where e.profile_id = v_profile.id
          and e.terms_version_id = tv.id order by e.occurred_at desc, e.id desc limit 1), false))
      from public.platform_terms_versions tv
      where tv.terms_type = 'COMMUNITY' and tv.status = 'ACTIVE'),
    'public_profile_draft', (select to_jsonb(d) - 'profile_id' from public.public_profile_drafts d
      where d.profile_id = v_profile.id),
    'store_membership_count', (select count(*) from public.organization_memberships m
      where m.profile_id = v_profile.id and m.status = 'ACTIVE')
  ) into v_result
  from public.platform_account_onboarding o where o.profile_id = v_profile.id;
  return v_result;
end;
$$;

create or replace function public.api_update_platform_interests(
  p_auth_user_id uuid, p_interest_topic_ids uuid[], p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare v_profile_id uuid; v_ids uuid[]; v_count integer;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501'; end if;
  if p_request_id is null or coalesce(cardinality(p_interest_topic_ids), 0) not between 1 and 20 then
    raise exception 'invalid_interest_selection' using errcode = '22023'; end if;
  select id into v_profile_id from public.profiles where auth_user_id = p_auth_user_id and status = 'ACTIVE';
  select array_agg(distinct x order by x), count(distinct x) into v_ids, v_count
  from unnest(p_interest_topic_ids) x;
  if v_profile_id is null or v_count <> cardinality(p_interest_topic_ids)
    or v_count <> (select count(*) from public.platform_interest_topics t
      where t.id = any(v_ids) and t.status = 'ACTIVE')
  then raise exception 'invalid_interest_selection' using errcode = '22023'; end if;
  if exists (select 1 from public.platform_account_events e where e.profile_id = v_profile_id
    and e.event_type = 'PLATFORM_INTERESTS_UPDATED' and e.request_id = p_request_id) then
    if (select metadata_json -> 'interest_topic_ids' from public.platform_account_events e
      where e.profile_id = v_profile_id and e.event_type = 'PLATFORM_INTERESTS_UPDATED'
        and e.request_id = p_request_id) <> to_jsonb(v_ids::text[])
    then raise exception 'request_conflict' using errcode = '23505'; end if;
    return jsonb_build_object('result', 'onboarding_in_progress', 'reused', true);
  end if;
  update public.profile_platform_interests set selected = false, deselected_at = now()
  where profile_id = v_profile_id and selected and not (interest_topic_id = any(v_ids));
  insert into public.profile_platform_interests
    (profile_id, interest_topic_id, selected, selected_at, deselected_at)
  select v_profile_id, x, true, now(), null from unnest(v_ids) x
  on conflict (profile_id, interest_topic_id) do update
    set selected = true, selected_at = now(), deselected_at = null;
  update public.platform_account_onboarding
  set status = 'IN_PROGRESS', started_at = coalesce(started_at, now())
  where profile_id = v_profile_id and status = 'NOT_STARTED';
  insert into public.platform_account_events (profile_id, event_type, request_id, metadata_json)
  values (v_profile_id, 'PLATFORM_INTERESTS_UPDATED', p_request_id,
    jsonb_build_object('interest_topic_ids', to_jsonb(v_ids::text[])));
  return jsonb_build_object('result', 'onboarding_in_progress', 'reused', false);
end;
$$;

create or replace function public.api_record_community_terms_decision(
  p_auth_user_id uuid, p_terms_version_id uuid, p_event_type text, p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare v_profile_id uuid;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501'; end if;
  if p_request_id is null or p_event_type not in ('ACCEPTED', 'WITHDRAWN') then
    raise exception 'Invalid terms decision' using errcode = '22023'; end if;
  select id into v_profile_id from public.profiles where auth_user_id = p_auth_user_id and status = 'ACTIVE';
  if v_profile_id is null or not exists (select 1 from public.platform_terms_versions
    where id = p_terms_version_id and terms_type = 'COMMUNITY' and status = 'ACTIVE')
  then raise exception 'terms_version_not_current' using errcode = '22023'; end if;
  if exists (select 1 from public.profile_terms_events where profile_id = v_profile_id
    and terms_version_id = p_terms_version_id and request_id = p_request_id
    and event_type <> p_event_type)
  then raise exception 'request_conflict' using errcode = '23505'; end if;
  insert into public.profile_terms_events
    (profile_id, terms_version_id, event_type, request_id)
  values (v_profile_id, p_terms_version_id, p_event_type, p_request_id)
  on conflict do nothing;
  insert into public.platform_account_events (profile_id, event_type, request_id)
  values (v_profile_id, 'COMMUNITY_TERMS_' || p_event_type, p_request_id)
  on conflict do nothing;
  return jsonb_build_object('result', 'onboarding_in_progress');
end;
$$;

create or replace function public.api_update_public_profile_draft(
  p_auth_user_id uuid, p_display_name text, p_handle_candidate text,
  p_bio text, p_opt_in_intent boolean, p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare v_profile_id uuid; v_handle text := nullif(lower(btrim(p_handle_candidate)), '');
  v_previous boolean;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501'; end if;
  if p_request_id is null or length(btrim(p_display_name)) not between 1 and 120
    or length(coalesce(p_bio, '')) > 500
    or (v_handle is not null and (length(v_handle) not between 3 and 40
      or v_handle !~ '^[a-z0-9](?:[a-z0-9_]{1,38}[a-z0-9])?$'))
  then raise exception 'Invalid public profile draft' using errcode = '22023'; end if;
  select id into v_profile_id from public.profiles where auth_user_id = p_auth_user_id and status = 'ACTIVE';
  select opt_in_intent into v_previous from public.public_profile_drafts where profile_id = v_profile_id;
  begin
    insert into public.public_profile_drafts
      (profile_id, display_name, handle_candidate, bio, opt_in_intent)
    values (v_profile_id, btrim(p_display_name), v_handle, nullif(btrim(p_bio), ''),
      coalesce(p_opt_in_intent, false))
    on conflict (profile_id) do update set display_name = excluded.display_name,
      handle_candidate = excluded.handle_candidate, bio = excluded.bio,
      opt_in_intent = excluded.opt_in_intent;
  exception when unique_violation then
    raise exception 'public_handle_unavailable' using errcode = '23505';
  end;
  update public.platform_account_onboarding
  set public_profile_opt_in_intent = coalesce(p_opt_in_intent, false)
  where profile_id = v_profile_id;
  if v_previous is distinct from coalesce(p_opt_in_intent, false) then
    insert into public.platform_account_events (profile_id, event_type, request_id,
      metadata_json) values (v_profile_id, 'PUBLIC_PROFILE_INTENT_UPDATED', p_request_id,
      jsonb_build_object('opt_in_intent', coalesce(p_opt_in_intent, false)))
    on conflict do nothing;
  end if;
  return jsonb_build_object('result', 'onboarding_in_progress');
end;
$$;

create or replace function public.api_complete_platform_onboarding(
  p_auth_user_id uuid, p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare v_profile_id uuid; v_status text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'Request required' using errcode = '22023'; end if;
  select p.id into v_profile_id from public.profiles p join auth.users u on u.id = p.auth_user_id
  where p.auth_user_id = p_auth_user_id and p.status = 'ACTIVE'
    and length(btrim(p.display_name)) > 0
    and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null);
  if v_profile_id is null then raise exception 'auth_contact_not_verified' using errcode = '42501'; end if;
  if not exists (select 1 from public.profile_platform_interests
    where profile_id = v_profile_id and selected)
  then raise exception 'invalid_interest_selection' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.platform_terms_versions tv
    where tv.terms_type = 'COMMUNITY' and tv.status = 'ACTIVE'
      and (select e.event_type from public.profile_terms_events e
        where e.profile_id = v_profile_id and e.terms_version_id = tv.id
        order by e.occurred_at desc, e.id desc limit 1) = 'ACCEPTED'
  ) then raise exception 'current_terms_not_accepted' using errcode = '22023'; end if;
  select status into v_status from public.platform_account_onboarding where profile_id = v_profile_id for update;
  if v_status <> 'COMPLETED' then
    update public.platform_account_onboarding set status = 'COMPLETED',
      started_at = coalesce(started_at, now()), completed_at = now()
    where profile_id = v_profile_id;
    insert into public.platform_account_events (profile_id, event_type, request_id)
    values (v_profile_id, 'ONBOARDING_COMPLETED', p_request_id) on conflict do nothing;
  end if;
  return jsonb_build_object('result', 'onboarding_completed', 'profile_id', v_profile_id);
end;
$$;

revoke all on function public.api_bootstrap_platform_account(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.api_get_platform_onboarding_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.api_update_platform_interests(uuid, uuid[], uuid) from public, anon, authenticated;
revoke all on function public.api_record_community_terms_decision(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.api_update_public_profile_draft(uuid, text, text, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.api_complete_platform_onboarding(uuid, uuid) from public, anon, authenticated;

grant execute on function public.api_bootstrap_platform_account(uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.api_get_platform_onboarding_snapshot(uuid) to service_role;
grant execute on function public.api_update_platform_interests(uuid, uuid[], uuid) to service_role;
grant execute on function public.api_record_community_terms_decision(uuid, uuid, text, uuid) to service_role;
grant execute on function public.api_update_public_profile_draft(uuid, text, text, text, boolean, uuid) to service_role;
grant execute on function public.api_complete_platform_onboarding(uuid, uuid) to service_role;
