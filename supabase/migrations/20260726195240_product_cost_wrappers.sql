-- ADORA Commerce OS (ACOS)
-- 040_product_cost_wrappers.sql
--
-- Purpose:
-- - Expose product variant cost fields through guarded RPC functions.
-- - Keep direct browser/API column access to cost fields revoked.
-- - Separate general product editing from sensitive margin/cost editing.

create or replace function public.api_get_product_variant_cost(
  p_organization_id uuid,
  p_variant_id uuid
)
returns table (
  variant_id uuid,
  organization_id uuid,
  cost_price numeric,
  minimum_selling_price numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'product.cost.view') then
    raise exception 'Missing permission: product.cost.view' using errcode = '42501';
  end if;

  return query
  select pv.id,
         pv.organization_id,
         pv.cost_price,
         pv.minimum_selling_price
  from public.product_variants pv
  where pv.organization_id = p_organization_id
    and pv.id = p_variant_id;

  if not found then
    raise exception 'Product variant not found';
  end if;
end;
$$;

create or replace function public.api_update_product_variant_cost(
  p_organization_id uuid,
  p_variant_id uuid,
  p_cost_price numeric,
  p_minimum_selling_price numeric default null
)
returns table (
  variant_id uuid,
  organization_id uuid,
  cost_price numeric,
  minimum_selling_price numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'product.cost.edit') then
    raise exception 'Missing permission: product.cost.edit' using errcode = '42501';
  end if;

  if p_cost_price is not null and p_cost_price < 0 then
    raise exception 'Cost price cannot be negative' using errcode = '22023';
  end if;

  if p_minimum_selling_price is not null and p_minimum_selling_price < 0 then
    raise exception 'Minimum selling price cannot be negative' using errcode = '22023';
  end if;

  return query
  update public.product_variants pv
  set cost_price = p_cost_price,
      minimum_selling_price = p_minimum_selling_price,
      updated_at = now()
  where pv.organization_id = p_organization_id
    and pv.id = p_variant_id
  returning pv.id,
            pv.organization_id,
            pv.cost_price,
            pv.minimum_selling_price;

  if not found then
    raise exception 'Product variant not found';
  end if;
end;
$$;

revoke execute on function public.api_get_product_variant_cost(uuid, uuid)
  from public, anon;
revoke execute on function public.api_update_product_variant_cost(uuid, uuid, numeric, numeric)
  from public, anon;

grant execute on function public.api_get_product_variant_cost(uuid, uuid)
  to authenticated;
grant execute on function public.api_update_product_variant_cost(uuid, uuid, numeric, numeric)
  to authenticated;
