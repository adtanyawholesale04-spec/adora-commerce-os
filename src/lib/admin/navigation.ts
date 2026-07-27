import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  LifeBuoy,
  PackageSearch,
  RotateCcw,
  Settings,
  Shield,
  ShoppingCart,
  Truck,
  UserRound,
  UsersRound,
  Warehouse
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminNavStatus =
  | "READY_FOR_READ"
  | "READY_FOR_GUARDED_ACTION"
  | "PARTIAL_ACTION_READY"
  | "NEEDS_SERVICE"
  | "NEEDS_READ_MODEL"
  | "COMMERCIAL_WRITES_BLOCKED";

export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  requiredPermissions: string[];
  status: AdminNavStatus;
  actionBoundary: string;
};

export const adminNavigation: AdminNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: BarChart3,
    requiredPermissions: ["report.view"],
    status: "READY_FOR_READ",
    actionBoundary: "Server aggregation only"
  },
  {
    id: "products",
    label: "Products",
    href: "/admin/products",
    icon: PackageSearch,
    requiredPermissions: ["product.view"],
    status: "READY_FOR_READ",
    actionBoundary: "Cost fields use guarded wrappers"
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/admin/inventory",
    icon: Boxes,
    requiredPermissions: ["inventory.view"],
    status: "READY_FOR_GUARDED_ACTION",
    actionBoundary: "Inventory mutations use RPC wrappers"
  },
  {
    id: "customers",
    label: "Customers",
    href: "/admin/customers",
    icon: UserRound,
    requiredPermissions: ["customer.view"],
    status: "READY_FOR_READ",
    actionBoundary: "Writes need customer service"
  },
  {
    id: "orders",
    label: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    requiredPermissions: ["order.view"],
    status: "NEEDS_SERVICE",
    actionBoundary: "Order actions need server service"
  },
  {
    id: "payments",
    label: "Payments",
    href: "/admin/payments",
    icon: CreditCard,
    requiredPermissions: ["payment.view"],
    status: "PARTIAL_ACTION_READY",
    actionBoundary: "Refund uses guarded wrapper"
  },
  {
    id: "fulfillment",
    label: "Fulfillment",
    href: "/admin/fulfillment",
    icon: Warehouse,
    requiredPermissions: ["warehouse.pick", "warehouse.pack"],
    status: "PARTIAL_ACTION_READY",
    actionBoundary: "State changes need approved service"
  },
  {
    id: "qc",
    label: "QC",
    href: "/admin/qc",
    icon: Shield,
    requiredPermissions: ["warehouse.qc"],
    status: "PARTIAL_ACTION_READY",
    actionBoundary: "Completion and override use wrappers"
  },
  {
    id: "shipping",
    label: "Shipping",
    href: "/admin/shipping",
    icon: Truck,
    requiredPermissions: ["shipping.create", "shipping.print_label"],
    status: "READY_FOR_GUARDED_ACTION",
    actionBoundary: "Label, handoff, tracking use wrappers"
  },
  {
    id: "returns",
    label: "Returns",
    href: "/admin/returns",
    icon: RotateCcw,
    requiredPermissions: ["return.view"],
    status: "NEEDS_SERVICE",
    actionBoundary: "Disposition and restock need service"
  },
  {
    id: "promotions",
    label: "Promotions",
    href: "/admin/promotions",
    icon: FileText,
    requiredPermissions: ["promotion.view"],
    status: "NEEDS_SERVICE",
    actionBoundary: "Publish/evaluate needs promotion engine"
  },
  {
    id: "users",
    label: "Users / Roles",
    href: "/admin/users",
    icon: UsersRound,
    requiredPermissions: ["members.view"],
    status: "NEEDS_SERVICE",
    actionBoundary: "Mutations need audited admin service"
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    requiredPermissions: ["organization.settings.view"],
    status: "COMMERCIAL_WRITES_BLOCKED",
    actionBoundary: "Subscription writes require owner decision"
  },
  {
    id: "support",
    label: "Support Access",
    href: "/admin/support",
    icon: LifeBuoy,
    requiredPermissions: ["audit.view"],
    status: "NEEDS_SERVICE",
    actionBoundary: "Support grants require time-bound audit"
  }
];

export function canAccessNavItem(
  item: AdminNavItem,
  permissionCodes: ReadonlySet<string>
) {
  return item.requiredPermissions.some((permission) =>
    permissionCodes.has(permission)
  );
}
