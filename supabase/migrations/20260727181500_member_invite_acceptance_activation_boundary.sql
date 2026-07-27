-- ADORA Commerce OS (ACOS)
-- A3 member invite acceptance callback and membership activation boundary
--
-- Purpose:
-- - Allow an authenticated invite callback to accept exactly one pending invitation.
-- - Bind acceptance to the authenticated Supabase Auth user's email.
-- - Create or reuse the global profile, activate the organization membership, and audit the transition.
-- - Keep role assignment out of scope until the approved member-role assignment boundary exists.

create or replace function public.api_accept_member_invitation(
  p_invitation_id uuid
)
returns table (
  invitation_id uuid,
  organization_id uuid,
  profile_id uuid,
  membership_id uuid,
  invitation_status varchar,
  membership_status varchar,
  created_profile boolean,
  activated_membership boolean,
  reused_existing boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid;
  v_auth_email varchar;
  v_display_name varchar;
  v_profile record;
  v_invitation record;
  v_membership record;
  v_should_default boolean;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select lower(trim(au.email))
  into v_auth_email
  from auth.users au
  where au.id = v_auth_user_id
  limit 1;

  if v_auth_email is null or length(v_auth_email) = 0 then
    raise exception 'Authenticated user email is required' using errcode = '42501';
  end if;

  select p.id, p.status
  into v_profile
  from public.profiles p
  where p.auth_user_id = v_auth_user_id
  limit 1;

  if v_profile.id is null then
    v_display_name := nullif(split_part(v_auth_email, '@', 1), '');

    insert into public.profiles (auth_user_id, display_name, status)
    values (v_auth_user_id, coalesce(v_display_name, v_auth_email), 'ACTIVE')
    returning id, status into v_profile;

    created_profile := true;
  else
    created_profile := false;
  end if;

  if v_profile.status <> 'ACTIVE' then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  select
    oi.id,
    oi.organization_id,
    lower(trim(oi.email)) as email,
    oi.status,
    oi.invited_by,
    oi.expires_at,
    oi.accepted_by_profile_id,
    oi.accepted_at
  into v_invitation
  from public.organization_invitations oi
  where oi.id = p_invitation_id
  for update;

  if v_invitation.id is null then
    raise exception 'Invitation not found' using errcode = '22023';
  end if;

  if v_invitation.email <> v_auth_email then
    raise exception 'Invitation email does not match authenticated user' using errcode = '42501';
  end if;

  if v_invitation.status = 'ACCEPTED' then
    if v_invitation.accepted_by_profile_id is distinct from v_profile.id then
      raise exception 'Invitation was accepted by another profile' using errcode = '42501';
    end if;

    select om.id, om.status
    into v_membership
    from public.organization_memberships om
    where om.organization_id = v_invitation.organization_id
      and om.profile_id = v_profile.id
    limit 1;

    if v_membership.id is null or v_membership.status <> 'ACTIVE' then
      raise exception 'Accepted invitation membership is not active' using errcode = '22023';
    end if;

    invitation_id := v_invitation.id;
    organization_id := v_invitation.organization_id;
    profile_id := v_profile.id;
    membership_id := v_membership.id;
    invitation_status := 'ACCEPTED';
    membership_status := 'ACTIVE';
    activated_membership := false;
    reused_existing := true;
    return next;
    return;
  end if;

  if v_invitation.status <> 'PENDING' then
    raise exception 'Invitation is not pending' using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    update public.organization_invitations oi
    set status = 'EXPIRED'
    where oi.id = v_invitation.id
      and oi.status = 'PENDING';

    raise exception 'Invitation is expired' using errcode = '22023';
  end if;

  select om.id, om.status
  into v_membership
  from public.organization_memberships om
  where om.organization_id = v_invitation.organization_id
    and om.profile_id = v_profile.id
  for update;

  if v_membership.id is null then
    select not exists (
      select 1
      from public.organization_memberships om
      where om.profile_id = v_profile.id
        and om.status = 'ACTIVE'
        and om.is_default = true
    )
    into v_should_default;

    insert into public.organization_memberships (
      organization_id,
      profile_id,
      status,
      is_default,
      joined_at,
      invited_by
    ) values (
      v_invitation.organization_id,
      v_profile.id,
      'ACTIVE',
      coalesce(v_should_default, false),
      now(),
      v_invitation.invited_by
    )
    returning id, status into v_membership;

    activated_membership := true;
    reused_existing := false;
  elsif v_membership.status = 'INVITED' then
    update public.organization_memberships om
    set
      status = 'ACTIVE',
      joined_at = coalesce(om.joined_at, now()),
      invited_by = coalesce(om.invited_by, v_invitation.invited_by)
    where om.id = v_membership.id
    returning id, status into v_membership;

    activated_membership := true;
    reused_existing := false;
  elsif v_membership.status = 'ACTIVE' then
    activated_membership := false;
    reused_existing := true;
  else
    raise exception 'Existing membership cannot be activated from invitation' using errcode = '22023';
  end if;

  update public.organization_invitations oi
  set
    status = 'ACCEPTED',
    accepted_by_profile_id = v_profile.id,
    accepted_at = now()
  where oi.id = v_invitation.id
  returning oi.status into invitation_status;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason
  ) values (
    v_invitation.organization_id,
    v_profile.id,
    'USER',
    'organization_invitation',
    v_invitation.id,
    'admin.member.invite.accepted',
    jsonb_build_object(
      'id', v_invitation.id,
      'status', v_invitation.status,
      'accepted_by_profile_id', v_invitation.accepted_by_profile_id,
      'accepted_at', v_invitation.accepted_at
    ),
    jsonb_build_object(
      'id', v_invitation.id,
      'email', v_invitation.email,
      'status', 'ACCEPTED',
      'profile_id', v_profile.id,
      'membership_id', v_membership.id,
      'membership_status', v_membership.status,
      'created_profile', created_profile,
      'activated_membership', activated_membership,
      'role_assignment', 'deferred'
    ),
    'member_invite_accepted_membership_activated'
  );

  invitation_id := v_invitation.id;
  organization_id := v_invitation.organization_id;
  profile_id := v_profile.id;
  membership_id := v_membership.id;
  invitation_status := 'ACCEPTED';
  membership_status := v_membership.status;
  return next;
end;
$$;

revoke execute on function public.api_accept_member_invitation(uuid)
  from public, anon;
grant execute on function public.api_accept_member_invitation(uuid)
  to authenticated;
