-- Phase 1C guarded Storefront mutation and server-read boundaries.

create or replace function public.storefront_has_active_entitlement(
  p_organization_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_entitlements oe
    join public.features f on f.id = oe.feature_id
    where oe.organization_id = p_organization_id
      and f.code = 'storefront'
      and f.feature_type = 'BOOLEAN'
      and f.status = 'ACTIVE'
      and oe.enabled
      and (oe.valid_from is null or oe.valid_from <= now())
      and (oe.valid_until is null or oe.valid_until > now())
  )
$$;

create or replace function public.api_upsert_storefront_settings(
  p_organization_id uuid,
  p_tagline text,
  p_description text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_storefront_id uuid;
  v_tagline text := nullif(trim(p_tagline), '');
  v_description text := nullif(trim(p_description), '');
  v_before jsonb;
  v_after jsonb;
  v_existing jsonb;
begin
  if p_organization_id is null or p_request_id is null then
    raise exception 'Organization and request id are required'
      using errcode = '22023';
  end if;

  if v_tagline is not null and char_length(v_tagline) > 160 then
    raise exception 'Storefront tagline is too long' using errcode = '22023';
  end if;
  if v_description is not null and char_length(v_description) > 1000 then
    raise exception 'Storefront description is too long'
      using errcode = '22023';
  end if;

  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null
     or not public.has_org_permission(
       p_organization_id,
       'storefront.manage'
     ) then
    raise exception 'Storefront management permission required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.status = 'ACTIVE'
  ) then
    raise exception 'Active organization required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'storefront:settings:' || p_organization_id::text,
      0
    )
  );

  select a.after_json
  into v_existing
  from public.audit_logs a
  where a.organization_id = p_organization_id
    and a.action = 'STOREFRONT_SETTINGS_UPDATED'
    and a.request_id = p_request_id
  order by a.created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing || jsonb_build_object('reused_existing', true);
  end if;

  select
    s.id,
    jsonb_build_object(
      'storefront_id', s.id,
      'publication_status', s.publication_status,
      'tagline', s.tagline,
      'description', s.description
    )
  into v_storefront_id, v_before
  from public.organization_storefronts s
  where s.organization_id = p_organization_id
  for update;

  insert into public.organization_storefronts (
    organization_id,
    tagline,
    description
  )
  values (
    p_organization_id,
    v_tagline,
    v_description
  )
  on conflict (organization_id) do update
  set tagline = excluded.tagline,
      description = excluded.description
  returning id into v_storefront_id;

  select jsonb_build_object(
    'storefront_id', s.id,
    'publication_status', s.publication_status,
    'tagline', s.tagline,
    'description', s.description,
    'reused_existing', false
  )
  into v_after
  from public.organization_storefronts s
  where s.id = v_storefront_id;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason,
    request_id
  )
  values (
    p_organization_id,
    v_actor_profile_id,
    'USER',
    'ORGANIZATION_STOREFRONT',
    v_storefront_id,
    'STOREFRONT_SETTINGS_UPDATED',
    v_before,
    v_after,
    'Storefront settings update',
    p_request_id
  );

  return v_after;
end;
$$;

create or replace function public.api_set_storefront_product_listing(
  p_organization_id uuid,
  p_product_id uuid,
  p_public_handle text,
  p_visibility text,
  p_sort_order integer,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_storefront_id uuid;
  v_listing_id uuid;
  v_handle text := lower(trim(p_public_handle));
  v_visibility text := upper(trim(p_visibility));
  v_before jsonb;
  v_after jsonb;
  v_existing jsonb;
begin
  if p_organization_id is null
     or p_product_id is null
     or p_request_id is null then
    raise exception 'Organization, product and request id are required'
      using errcode = '22023';
  end if;

  if v_visibility not in ('HIDDEN', 'VISIBLE') then
    raise exception 'Invalid Storefront product visibility'
      using errcode = '22023';
  end if;

  if p_sort_order is null or p_sort_order < 0 then
    raise exception 'Storefront sort order must be non-negative'
      using errcode = '22023';
  end if;

  if char_length(v_handle) not between 3 and 63
     or v_handle !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
     or v_handle like '%--%'
     or v_handle = any (
       array[
         'admin', 'api', 'auth', 'login', 'logout', 'onboarding',
         'portal', 'signup', 'store', 'support', 'www'
       ]
     ) then
    raise exception 'Invalid or reserved Storefront product handle'
      using errcode = '22023';
  end if;

  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null
     or not public.has_org_permission(
       p_organization_id,
       'storefront.manage'
     ) then
    raise exception 'Storefront management permission required'
      using errcode = '42501';
  end if;

  select s.id
  into v_storefront_id
  from public.organization_storefronts s
  join public.organizations o on o.id = s.organization_id
  where s.organization_id = p_organization_id
    and o.status = 'ACTIVE';

  if v_storefront_id is null then
    raise exception 'Storefront settings must exist first'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and p.organization_id = p_organization_id
  ) then
    raise exception 'Same-tenant product required' using errcode = '22023';
  end if;

  if v_visibility = 'VISIBLE' and not exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and p.organization_id = p_organization_id
      and p.status = 'ACTIVE'
      and exists (
        select 1
        from public.product_variants pv
        where pv.organization_id = p.organization_id
          and pv.product_id = p.id
          and pv.status = 'ACTIVE'
      )
  ) then
    raise exception 'Visible Storefront product must be active with an active variant'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'storefront:listing:' || p_organization_id::text
        || ':' || p_product_id::text,
      0
    )
  );

  select a.after_json
  into v_existing
  from public.audit_logs a
  where a.organization_id = p_organization_id
    and a.action = 'STOREFRONT_PRODUCT_LISTING_UPDATED'
    and a.request_id = p_request_id
  order by a.created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing || jsonb_build_object('reused_existing', true);
  end if;

  select
    l.id,
    jsonb_build_object(
      'listing_id', l.id,
      'product_id', l.product_id,
      'public_handle', l.public_handle,
      'visibility', l.visibility,
      'sort_order', l.sort_order
    )
  into v_listing_id, v_before
  from public.storefront_product_listings l
  where l.organization_id = p_organization_id
    and l.product_id = p_product_id
  for update;

  insert into public.storefront_product_listings (
    organization_id,
    storefront_id,
    product_id,
    public_handle,
    visibility,
    sort_order,
    visible_at,
    created_by,
    updated_by
  )
  values (
    p_organization_id,
    v_storefront_id,
    p_product_id,
    v_handle,
    v_visibility,
    p_sort_order,
    case when v_visibility = 'VISIBLE' then now() else null end,
    v_actor_profile_id,
    v_actor_profile_id
  )
  on conflict (organization_id, product_id) do update
  set public_handle = excluded.public_handle,
      visibility = excluded.visibility,
      sort_order = excluded.sort_order,
      visible_at = case
        when excluded.visibility = 'VISIBLE'
          then coalesce(
            public.storefront_product_listings.visible_at,
            now()
          )
        else null
      end,
      updated_by = excluded.updated_by
  returning id into v_listing_id;

  select jsonb_build_object(
    'listing_id', l.id,
    'product_id', l.product_id,
    'public_handle', l.public_handle,
    'visibility', l.visibility,
    'sort_order', l.sort_order,
    'reused_existing', false
  )
  into v_after
  from public.storefront_product_listings l
  where l.id = v_listing_id;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason,
    request_id
  )
  values (
    p_organization_id,
    v_actor_profile_id,
    'USER',
    'STOREFRONT_PRODUCT_LISTING',
    v_listing_id,
    'STOREFRONT_PRODUCT_LISTING_UPDATED',
    v_before,
    v_after,
    'Storefront product listing update',
    p_request_id
  );

  return v_after;
end;
$$;

create or replace function public.api_set_storefront_publication(
  p_organization_id uuid,
  p_publication_status text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_storefront public.organization_storefronts%rowtype;
  v_status text := upper(trim(p_publication_status));
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_existing jsonb;
begin
  if p_organization_id is null or p_request_id is null then
    raise exception 'Organization and request id are required'
      using errcode = '22023';
  end if;
  if v_status not in ('PRIVATE', 'PUBLISHED') then
    raise exception 'Invalid Storefront publication status'
      using errcode = '22023';
  end if;

  v_action := case
    when v_status = 'PUBLISHED' then 'STOREFRONT_PUBLISHED'
    else 'STOREFRONT_UNPUBLISHED'
  end;

  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null
     or not public.has_org_permission(
       p_organization_id,
       'storefront.publish'
     ) then
    raise exception 'Storefront publication permission required'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'storefront:publication:' || p_organization_id::text,
      0
    )
  );

  select a.after_json
  into v_existing
  from public.audit_logs a
  where a.organization_id = p_organization_id
    and a.action = v_action
    and a.request_id = p_request_id
  order by a.created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing || jsonb_build_object('reused_existing', true);
  end if;

  select s.*
  into v_storefront
  from public.organization_storefronts s
  where s.organization_id = p_organization_id
  for update;

  if v_storefront.id is null then
    raise exception 'Storefront settings must exist first'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
  ) then
    raise exception 'Organization not found' using errcode = '22023';
  end if;

  if v_status = 'PUBLISHED' then
    if not exists (
      select 1
      from public.organizations o
      where o.id = p_organization_id
        and o.status = 'ACTIVE'
    ) then
      raise exception 'Active organization required for publication'
        using errcode = '22023';
    end if;

    if not public.storefront_has_active_entitlement(p_organization_id) then
      raise exception 'Active Storefront entitlement required'
        using errcode = '42501';
    end if;

    if not exists (
      select 1
      from public.storefront_product_listings l
      join public.products p
        on p.organization_id = l.organization_id
       and p.id = l.product_id
      where l.organization_id = p_organization_id
        and l.visibility = 'VISIBLE'
        and p.status = 'ACTIVE'
        and exists (
          select 1
          from public.product_variants pv
          where pv.organization_id = p.organization_id
            and pv.product_id = p.id
            and pv.status = 'ACTIVE'
        )
    ) then
      raise exception 'At least one eligible visible product is required'
        using errcode = '22023';
    end if;
  end if;

  v_before := jsonb_build_object(
    'storefront_id', v_storefront.id,
    'publication_status', v_storefront.publication_status,
    'published_at', v_storefront.published_at
  );

  update public.organization_storefronts
  set publication_status = v_status,
      published_at = case
        when v_status = 'PUBLISHED'
          then coalesce(v_storefront.published_at, now())
        else null
      end,
      published_by = case
        when v_status = 'PUBLISHED' then v_actor_profile_id
        else null
      end
  where id = v_storefront.id;

  select jsonb_build_object(
    'storefront_id', s.id,
    'publication_status', s.publication_status,
    'published_at', s.published_at,
    'reused_existing', false
  )
  into v_after
  from public.organization_storefronts s
  where s.id = v_storefront.id;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason,
    request_id
  )
  values (
    p_organization_id,
    v_actor_profile_id,
    'USER',
    'ORGANIZATION_STOREFRONT',
    v_storefront.id,
    v_action,
    v_before,
    v_after,
    case
      when v_status = 'PUBLISHED' then 'Storefront publication'
      else 'Storefront unpublication'
    end,
    p_request_id
  );

  return v_after;
end;
$$;

create or replace function public.api_change_storefront_slug(
  p_organization_id uuid,
  p_new_slug text,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_new_slug text := lower(trim(p_new_slug));
  v_reason text := trim(p_reason);
  v_old_slug text;
  v_existing jsonb;
  v_after jsonb;
begin
  if p_organization_id is null or p_request_id is null then
    raise exception 'Organization and request id are required'
      using errcode = '22023';
  end if;
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'Slug change reason is required and must be bounded'
      using errcode = '22023';
  end if;
  if char_length(v_new_slug) not between 3 and 63
     or v_new_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
     or v_new_slug like '%--%'
     or v_new_slug = any (
       array[
         'admin', 'api', 'auth', 'login', 'logout', 'onboarding',
         'portal', 'signup', 'store', 'support', 'www'
       ]
     ) then
    raise exception 'Invalid or reserved organization slug'
      using errcode = '22023';
  end if;

  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null
     or not public.has_org_permission(
       p_organization_id,
       'organization.settings.edit'
     )
     or not public.has_org_permission(
       p_organization_id,
       'storefront.publish'
     ) then
    raise exception 'Organization settings and Storefront publication permissions required'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('storefront:slug:' || p_organization_id::text, 0)
  );

  select a.after_json
  into v_existing
  from public.audit_logs a
  where a.organization_id = p_organization_id
    and a.action = 'ORGANIZATION_SLUG_UPDATED'
    and a.request_id = p_request_id
  order by a.created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing || jsonb_build_object('reused_existing', true);
  end if;

  select o.slug
  into v_old_slug
  from public.organizations o
  where o.id = p_organization_id
    and o.status = 'ACTIVE'
  for update;

  if v_old_slug is null then
    raise exception 'Active organization required' using errcode = '22023';
  end if;
  if v_old_slug = v_new_slug then
    raise exception 'New slug must differ from current slug'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.organizations o
    where o.slug = v_new_slug
  ) or exists (
    select 1
    from public.storefront_slug_history h
    where h.old_slug = v_new_slug
  ) then
    raise exception 'Organization slug is already reserved'
      using errcode = '23505';
  end if;

  insert into public.storefront_slug_history (
    organization_id,
    old_slug,
    new_slug,
    changed_by,
    request_id
  )
  values (
    p_organization_id,
    v_old_slug,
    v_new_slug,
    v_actor_profile_id,
    p_request_id
  );

  update public.organizations
  set slug = v_new_slug
  where id = p_organization_id;

  v_after := jsonb_build_object(
    'organization_id', p_organization_id,
    'old_slug', v_old_slug,
    'new_slug', v_new_slug,
    'reused_existing', false
  );

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason,
    request_id
  )
  values (
    p_organization_id,
    v_actor_profile_id,
    'USER',
    'ORGANIZATION',
    p_organization_id,
    'ORGANIZATION_SLUG_UPDATED',
    jsonb_build_object('slug', v_old_slug),
    jsonb_build_object('slug', v_new_slug),
    v_reason,
    p_request_id
  );

  return v_after;
end;
$$;

create or replace function public.api_get_public_storefront(
  p_organization_slug text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_slug text := lower(trim(p_organization_slug));
  v_result jsonb;
begin
  if char_length(v_slug) not between 3 and 63
     or v_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
     or v_slug like '%--%' then
    return jsonb_build_object('available', false);
  end if;

  select jsonb_build_object(
    'available', true,
    'canonical_slug', o.slug,
    'redirect_required', o.slug <> v_slug,
    'store_name', o.name,
    'tagline', s.tagline,
    'description', s.description,
    'currency_code', o.currency_code,
    'publication_updated_at', s.updated_at
  )
  into v_result
  from public.organizations o
  join public.organization_storefronts s
    on s.organization_id = o.id
  where o.status = 'ACTIVE'
    and s.publication_status = 'PUBLISHED'
    and public.storefront_has_active_entitlement(o.id)
    and (
      o.slug = v_slug
      or exists (
        select 1
        from public.storefront_slug_history h
        where h.organization_id = o.id
          and h.old_slug = v_slug
      )
    )
  limit 1;

  return coalesce(v_result, jsonb_build_object('available', false));
end;
$$;

create or replace function public.api_list_public_storefront_products(
  p_organization_slug text,
  p_after_sort_order integer default null,
  p_after_updated_at timestamptz default null,
  p_after_product_id uuid default null,
  p_limit integer default 24
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_slug text := lower(trim(p_organization_slug));
  v_organization_id uuid;
  v_items jsonb;
  v_has_more boolean;
  v_next_cursor jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 24 then
    raise exception 'Product page limit must be between 1 and 24'
      using errcode = '22023';
  end if;
  if (
    p_after_sort_order is null
    and (p_after_updated_at is not null or p_after_product_id is not null)
  ) or (
    p_after_sort_order is not null
    and (p_after_updated_at is null or p_after_product_id is null)
  ) then
    raise exception 'Complete product cursor required' using errcode = '22023';
  end if;

  select o.id
  into v_organization_id
  from public.organizations o
  join public.organization_storefronts s
    on s.organization_id = o.id
  where o.status = 'ACTIVE'
    and s.publication_status = 'PUBLISHED'
    and public.storefront_has_active_entitlement(o.id)
    and (
      o.slug = v_slug
      or exists (
        select 1
        from public.storefront_slug_history h
        where h.organization_id = o.id
          and h.old_slug = v_slug
      )
    )
  limit 1;

  if v_organization_id is null then
    return jsonb_build_object(
      'available', false,
      'items', '[]'::jsonb,
      'has_more', false,
      'next_cursor', null
    );
  end if;

  with eligible as materialized (
    select
      l.sort_order,
      p.updated_at,
      p.id as product_id,
      jsonb_build_object(
        'public_handle', l.public_handle,
        'name', p.name,
        'description', p.description,
        'category_name', c.name,
        'brand_name', b.name,
        'price_min', price.price_min,
        'price_max', price.price_max,
        'currency_code', o.currency_code,
        'availability', case
          when exists (
            select 1
            from public.product_variants stock_variant
            where stock_variant.organization_id = p.organization_id
              and stock_variant.product_id = p.id
              and stock_variant.status = 'ACTIVE'
              and coalesce((
                select sum(ib.available)
                from public.inventory_balances ib
                join public.warehouses w
                  on w.organization_id = ib.organization_id
                 and w.id = ib.warehouse_id
                 and w.status = 'ACTIVE'
                where ib.organization_id = stock_variant.organization_id
                  and ib.variant_id = stock_variant.id
              ), 0) > 0
          ) then 'IN_STOCK'
          else 'SOLD_OUT'
        end,
        'sort_order', l.sort_order,
        'updated_at', p.updated_at
      ) as item
    from public.storefront_product_listings l
    join public.organization_storefronts s
      on s.organization_id = l.organization_id
     and s.id = l.storefront_id
     and s.publication_status = 'PUBLISHED'
    join public.organizations o
      on o.id = l.organization_id
     and o.status = 'ACTIVE'
    join public.products p
      on p.organization_id = l.organization_id
     and p.id = l.product_id
     and p.status = 'ACTIVE'
    left join public.categories c
      on c.organization_id = p.organization_id
     and c.id = p.category_id
     and c.status = 'ACTIVE'
    left join public.brands b
      on b.organization_id = p.organization_id
     and b.id = p.brand_id
     and b.status = 'ACTIVE'
    cross join lateral (
      select
        min(pv.base_price) as price_min,
        max(pv.base_price) as price_max,
        count(*) as variant_count
      from public.product_variants pv
      where pv.organization_id = p.organization_id
        and pv.product_id = p.id
        and pv.status = 'ACTIVE'
    ) price
    where l.organization_id = v_organization_id
      and l.visibility = 'VISIBLE'
      and price.variant_count > 0
      and (
        p_after_sort_order is null
        or l.sort_order > p_after_sort_order
        or (
          l.sort_order = p_after_sort_order
          and p.updated_at < p_after_updated_at
        )
        or (
          l.sort_order = p_after_sort_order
          and p.updated_at = p_after_updated_at
          and p.id > p_after_product_id
        )
      )
    order by l.sort_order, p.updated_at desc, p.id
    limit p_limit + 1
  ),
  page as (
    select *
    from eligible
    order by sort_order, updated_at desc, product_id
    limit p_limit
  )
  select
    coalesce((
      select jsonb_agg(page.item order by sort_order, updated_at desc, product_id)
      from page
    ), '[]'::jsonb),
    (select count(*) > p_limit from eligible),
    (
      select jsonb_build_object(
        'sort_order', page.sort_order,
        'updated_at', page.updated_at,
        'product_id', page.product_id
      )
      from page
      order by sort_order desc, updated_at, product_id desc
      limit 1
    )
  into v_items, v_has_more, v_next_cursor;

  return jsonb_build_object(
    'available', true,
    'items', v_items,
    'has_more', coalesce(v_has_more, false),
    'next_cursor', case
      when coalesce(v_has_more, false) then v_next_cursor
      else null
    end
  );
end;
$$;

create or replace function public.api_get_public_storefront_product(
  p_organization_slug text,
  p_public_handle text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_slug text := lower(trim(p_organization_slug));
  v_handle text := lower(trim(p_public_handle));
  v_result jsonb;
begin
  select jsonb_build_object(
    'available', true,
    'canonical_slug', o.slug,
    'redirect_required', o.slug <> v_slug,
    'product', jsonb_build_object(
      'public_handle', l.public_handle,
      'name', p.name,
      'description', p.description,
      'category_name', c.name,
      'brand_name', b.name,
      'price_min', price.price_min,
      'price_max', price.price_max,
      'currency_code', o.currency_code,
      'availability', case
        when exists (
          select 1
          from public.product_variants stock_variant
          where stock_variant.organization_id = p.organization_id
            and stock_variant.product_id = p.id
            and stock_variant.status = 'ACTIVE'
            and coalesce((
              select sum(ib.available)
              from public.inventory_balances ib
              join public.warehouses w
                on w.organization_id = ib.organization_id
               and w.id = ib.warehouse_id
               and w.status = 'ACTIVE'
              where ib.organization_id = stock_variant.organization_id
                and ib.variant_id = stock_variant.id
            ), 0) > 0
        ) then 'IN_STOCK'
        else 'SOLD_OUT'
      end,
      'sort_order', l.sort_order,
      'updated_at', p.updated_at
    )
  )
  into v_result
  from public.organizations o
  join public.organization_storefronts s
    on s.organization_id = o.id
   and s.publication_status = 'PUBLISHED'
  join public.storefront_product_listings l
    on l.organization_id = o.id
   and l.storefront_id = s.id
   and l.visibility = 'VISIBLE'
   and l.public_handle = v_handle
  join public.products p
    on p.organization_id = l.organization_id
   and p.id = l.product_id
   and p.status = 'ACTIVE'
  left join public.categories c
    on c.organization_id = p.organization_id
   and c.id = p.category_id
   and c.status = 'ACTIVE'
  left join public.brands b
    on b.organization_id = p.organization_id
   and b.id = p.brand_id
   and b.status = 'ACTIVE'
  cross join lateral (
    select
      min(pv.base_price) as price_min,
      max(pv.base_price) as price_max,
      count(*) as variant_count
    from public.product_variants pv
    where pv.organization_id = p.organization_id
      and pv.product_id = p.id
      and pv.status = 'ACTIVE'
  ) price
  where o.status = 'ACTIVE'
    and price.variant_count > 0
    and public.storefront_has_active_entitlement(o.id)
    and (
      o.slug = v_slug
      or exists (
        select 1
        from public.storefront_slug_history h
        where h.organization_id = o.id
          and h.old_slug = v_slug
      )
    )
  limit 1;

  return coalesce(v_result, jsonb_build_object('available', false));
end;
$$;

create or replace function public.api_list_public_storefront_product_variants(
  p_organization_slug text,
  p_public_handle text,
  p_after_variant_name text default null,
  p_after_variant_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_slug text := lower(trim(p_organization_slug));
  v_handle text := lower(trim(p_public_handle));
  v_organization_id uuid;
  v_product_id uuid;
  v_items jsonb;
  v_has_more boolean;
  v_next_cursor jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'Variant page limit must be between 1 and 50'
      using errcode = '22023';
  end if;
  if (
    p_after_variant_name is null
    and p_after_variant_id is not null
  ) or (
    p_after_variant_name is not null
    and p_after_variant_id is null
  ) then
    raise exception 'Complete variant cursor required' using errcode = '22023';
  end if;

  select o.id, p.id
  into v_organization_id, v_product_id
  from public.organizations o
  join public.organization_storefronts s
    on s.organization_id = o.id
   and s.publication_status = 'PUBLISHED'
  join public.storefront_product_listings l
    on l.organization_id = o.id
   and l.storefront_id = s.id
   and l.visibility = 'VISIBLE'
   and l.public_handle = v_handle
  join public.products p
    on p.organization_id = l.organization_id
   and p.id = l.product_id
   and p.status = 'ACTIVE'
  where o.status = 'ACTIVE'
    and public.storefront_has_active_entitlement(o.id)
    and exists (
      select 1
      from public.product_variants active_variant
      where active_variant.organization_id = p.organization_id
        and active_variant.product_id = p.id
        and active_variant.status = 'ACTIVE'
    )
    and (
      o.slug = v_slug
      or exists (
        select 1
        from public.storefront_slug_history h
        where h.organization_id = o.id
          and h.old_slug = v_slug
      )
    )
  limit 1;

  if v_product_id is null then
    return jsonb_build_object(
      'available', false,
      'items', '[]'::jsonb,
      'has_more', false,
      'next_cursor', null
    );
  end if;

  with eligible as materialized (
    select
      pv.variant_name,
      pv.id as variant_id,
      jsonb_build_object(
        'variant_id', pv.id,
        'variant_name', pv.variant_name,
        'base_price', pv.base_price,
        'availability', case
          when coalesce((
            select sum(ib.available)
            from public.inventory_balances ib
            join public.warehouses w
              on w.organization_id = ib.organization_id
             and w.id = ib.warehouse_id
             and w.status = 'ACTIVE'
            where ib.organization_id = pv.organization_id
              and ib.variant_id = pv.id
          ), 0) > 0 then 'IN_STOCK'
          else 'SOLD_OUT'
        end
      ) as item
    from public.product_variants pv
    where pv.organization_id = v_organization_id
      and pv.product_id = v_product_id
      and pv.status = 'ACTIVE'
      and (
        p_after_variant_name is null
        or pv.variant_name > p_after_variant_name
        or (
          pv.variant_name = p_after_variant_name
          and pv.id > p_after_variant_id
        )
      )
    order by pv.variant_name, pv.id
    limit p_limit + 1
  ),
  page as (
    select *
    from eligible
    order by variant_name, variant_id
    limit p_limit
  )
  select
    coalesce((
      select jsonb_agg(page.item order by variant_name, variant_id)
      from page
    ), '[]'::jsonb),
    (select count(*) > p_limit from eligible),
    (
      select jsonb_build_object(
        'variant_name', page.variant_name,
        'variant_id', page.variant_id
      )
      from page
      order by variant_name desc, variant_id desc
      limit 1
    )
  into v_items, v_has_more, v_next_cursor;

  return jsonb_build_object(
    'available', true,
    'items', v_items,
    'has_more', coalesce(v_has_more, false),
    'next_cursor', case
      when coalesce(v_has_more, false) then v_next_cursor
      else null
    end
  );
end;
$$;

revoke all on function public.storefront_has_active_entitlement(uuid)
  from public, anon, authenticated;
grant execute on function public.storefront_has_active_entitlement(uuid)
  to service_role;

revoke all on function public.api_upsert_storefront_settings(
  uuid, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.api_upsert_storefront_settings(
  uuid, text, text, uuid
) to authenticated;

revoke all on function public.api_set_storefront_product_listing(
  uuid, uuid, text, text, integer, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.api_set_storefront_product_listing(
  uuid, uuid, text, text, integer, uuid
) to authenticated;

revoke all on function public.api_set_storefront_publication(
  uuid, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.api_set_storefront_publication(
  uuid, text, uuid
) to authenticated;

revoke all on function public.api_change_storefront_slug(
  uuid, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.api_change_storefront_slug(
  uuid, text, text, uuid
) to authenticated;

revoke all on function public.api_get_public_storefront(text)
  from public, anon, authenticated;
grant execute on function public.api_get_public_storefront(text)
  to service_role;

revoke all on function public.api_list_public_storefront_products(
  text, integer, timestamptz, uuid, integer
) from public, anon, authenticated;
grant execute on function public.api_list_public_storefront_products(
  text, integer, timestamptz, uuid, integer
) to service_role;

revoke all on function public.api_get_public_storefront_product(text, text)
  from public, anon, authenticated;
grant execute on function public.api_get_public_storefront_product(text, text)
  to service_role;

revoke all on function public.api_list_public_storefront_product_variants(
  text, text, text, uuid, integer
) from public, anon, authenticated;
grant execute on function public.api_list_public_storefront_product_variants(
  text, text, text, uuid, integer
) to service_role;
