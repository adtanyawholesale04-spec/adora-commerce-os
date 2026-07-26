with security_definer_functions as (
  select p.oid,
         p.proname,
         pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
),
transaction_functions as (
  select oid
  from security_definer_functions
  where proname in (
    'next_document_number',
    'reserve_inventory',
    'release_inventory_reservation',
    'convert_reservation_to_allocation',
    'post_inventory_movement'
  )
),
helper_functions as (
  select oid
  from security_definer_functions
  where proname in (
    'current_profile_id',
    'is_org_member',
    'has_org_permission'
  )
),
inventory_api_wrappers as (
  select oid
  from security_definer_functions
  where proname in (
    'api_reserve_inventory',
    'api_release_inventory_reservation',
    'api_convert_reservation_to_allocation',
    'api_post_inventory_movement'
  )
),
product_cost_api_wrappers as (
  select oid
  from security_definer_functions
  where proname in (
    'api_get_product_variant_cost',
    'api_update_product_variant_cost'
  )
),
guarded_operations_api_wrappers as (
  select oid
  from security_definer_functions
  where proname in (
    'api_process_refund',
    'api_override_qc_session',
    'api_create_shipment_label'
  )
),
shipping_workflow_api_wrappers as (
  select oid, proname
  from security_definer_functions
  where proname in (
    'api_complete_qc_session',
    'api_mark_shipment_ready_for_handoff',
    'api_record_carrier_tracking_event'
  )
)
select 'security_definer_total' as check_name,
       count(*)::text as result
from security_definer_functions
union all
select 'security_definer_public_execute' as check_name,
       count(*)::text as result
from security_definer_functions
where has_function_privilege('public', oid, 'EXECUTE')
union all
select 'security_definer_anon_execute' as check_name,
       count(*)::text as result
from security_definer_functions
where has_function_privilege('anon', oid, 'EXECUTE')
union all
select 'transaction_functions_authenticated_execute' as check_name,
       count(*)::text as result
from transaction_functions
where has_function_privilege('authenticated', oid, 'EXECUTE')
union all
select 'helper_functions_authenticated_execute' as check_name,
       count(*)::text as result
from helper_functions
where has_function_privilege('authenticated', oid, 'EXECUTE')
union all
select 'inventory_api_wrappers_authenticated_execute' as check_name,
       count(*)::text as result
from inventory_api_wrappers
where has_function_privilege('authenticated', oid, 'EXECUTE')
union all
select 'product_cost_api_wrappers_authenticated_execute' as check_name,
       count(*)::text as result
from product_cost_api_wrappers
where has_function_privilege('authenticated', oid, 'EXECUTE')
union all
select 'guarded_operations_api_wrappers_authenticated_execute' as check_name,
       count(*)::text as result
from guarded_operations_api_wrappers
where has_function_privilege('authenticated', oid, 'EXECUTE')
union all
select 'shipping_workflow_api_wrappers_authenticated_execute' as check_name,
       count(*)::text as result
from shipping_workflow_api_wrappers
where has_function_privilege('authenticated', oid, 'EXECUTE')
union all
select 'carrier_tracking_service_role_execute' as check_name,
       count(*)::text as result
from shipping_workflow_api_wrappers
where proname = 'api_record_carrier_tracking_event'
  and has_function_privilege('service_role', oid, 'EXECUTE')
order by check_name;
