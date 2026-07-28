import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PortalReadState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "unlinked"
  | "ready"
  | "query_error";

export type CustomerPortalSnapshot = {
  available: boolean;
  organization_id: string;
  reason?: string;
  customer?: {
    id: string;
    customer_code: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    status: string;
  };
  addresses?: PortalAddress[];
  orders?: PortalOrder[];
  loyalty?: PortalLoyaltyAccount[];
  coupons?: PortalCoupon[];
  consents?: PortalConsent[];
};

export type PortalAddress = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  country_code: string;
  is_default: boolean;
};

export type PortalOrder = {
  id: string;
  order_number: string;
  source: string;
  currency_code: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  grand_total: number | string;
  amount_paid: number | string;
  amount_due: number | string;
  created_at: string;
  items: PortalOrderItem[];
};

type PortalOrderItem = {
  id: string;
  sku: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
};

export type PortalLoyaltyAccount = {
  account_id: string;
  program_id: string;
  points_balance: number | string;
  status: string;
  transactions: Array<{
    id: string;
    transaction_type: string;
    points_delta: number | string;
    order_id: string | null;
    expires_at: string | null;
    created_at: string;
  }>;
};

export type PortalCoupon = {
  id: string;
  code: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

export type PortalConsent = {
  id: string;
  channel: string;
  purpose: string;
  status: string;
  destination: string | null;
  policy_version: string | null;
  granted_at: string | null;
  revoked_at: string | null;
};

export type CustomerPortalReadModel = {
  context: AdminShellContext;
  state: PortalReadState;
  snapshot: CustomerPortalSnapshot | null;
  errorMessage: string | null;
};

export async function getCustomerPortalReadModel(): Promise<CustomerPortalReadModel> {
  const context = await getAdminShellContext();

  if (context.mode === "missing_env" || context.mode === "anonymous") {
    return { context, state: context.mode, snapshot: null, errorMessage: null };
  }

  if (!context.activeOrganizationId) {
    return { context, state: "missing_membership", snapshot: null, errorMessage: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("api_get_customer_portal_snapshot", {
    p_organization_id: context.activeOrganizationId,
    p_client_request_id: crypto.randomUUID()
  });

  if (error) {
    return { context, state: "query_error", snapshot: null, errorMessage: error.message };
  }

  const snapshot = data as CustomerPortalSnapshot;
  return {
    context,
    state: snapshot.available ? "ready" : "unlinked",
    snapshot,
    errorMessage: null
  };
}
