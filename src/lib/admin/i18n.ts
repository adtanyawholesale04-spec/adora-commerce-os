import type { AdminLocale } from "@/lib/admin/preferences";
import type { DashboardReadModelState } from "@/lib/admin/dashboard";
import type { AdminNavStatus } from "@/lib/admin/navigation";
import type { CustomerReadModelState } from "@/lib/admin/customers";
import type { FulfillmentReadModelState } from "@/lib/admin/fulfillment";
import type { InventoryReadModelState } from "@/lib/admin/inventory";
import type { OrderReadModelState } from "@/lib/admin/orders";
import type { PaymentReadModelState } from "@/lib/admin/payments";
import type { ProductReadModelState } from "@/lib/admin/products";
import type { PromotionsReadModelState } from "@/lib/admin/promotions";
import type { QcReadModelState } from "@/lib/admin/qc";
import type { ReturnsReadModelState } from "@/lib/admin/returns";
import type { ShippingReadModelState } from "@/lib/admin/shipping";
import type { SettingsReadModelState } from "@/lib/admin/settings";
import type { UsersReadModelState } from "@/lib/admin/users";

export const adminCopy = {
  en: {
    common: {
      admin: "Admin",
      light: "Light",
      dark: "Dark",
      thai: "TH",
      english: "EN",
      hidden: "Hidden",
      unavailable: "Unavailable",
      anonymous: "Anonymous",
      granted: "Granted",
      requires: "Requires",
      noOrganization: "No organization",
      noDirectUiAction: "No direct UI action",
      serverRpcOnly: "Server/RPC only"
    },
    shell: {
      productName: "ACOS Admin",
      sectionName: "Commerce Core",
      sectionDescription:
        "Operational workspace with server-side auth, tenant context, and permission-aware navigation.",
      pageCode: "CORE-UI-001",
      pageTitle: "Admin App Shell",
      pageDescription:
        "Read-first navigation for commerce operations, role-aware access, and guarded workflow boundaries.",
      modulesMapped: "A3 modules mapped",
      noSensitiveWrites: "No direct sensitive writes",
      actionReadyModules: "Action-ready modules",
      readOrWrapperBacked: "Read or wrapper-backed",
      grantedPermissions: "Granted permissions",
      moduleBoundary: "Module Boundary",
      tenantContext: "Tenant Context",
      user: "User",
      organization: "Organization",
      organizationStatus: "Organization status",
      membership: "Membership",
      guardrails: "Guardrails",
      sensitiveWrites: "Sensitive writes",
      serviceRole: "Service role",
      neverInBrowser: "Never in browser",
      tenantScope: "Tenant scope",
      membershipDerived: "Membership-derived",
      authorization: "Authorization",
      permissionAndEntitlement: "Permission + entitlement",
      signedIn: "Signed in",
      notSignedIn: "Not signed in",
      signOut: "Sign out",
      signInRequired: "Sign in required",
      supabaseEnvMissing: "Supabase env missing",
      email: "Email",
      sendMagicLink: "Send magic link",
      emailRequired: "Email is required.",
      switch: "Switch",
      magicLinkSent: "Magic link sent.",
      signedOut: "Signed out.",
      signInFailed: "Sign-in failed.",
      organizationSwitched: "Organization switched.",
      organizationDenied: "Organization denied.",
      serverAuthActive: "Server auth boundary active",
      dashboardSnapshot: "Dashboard Snapshot",
      products: "Products",
      availableStock: "Available stock",
      customers: "Customers",
      openOrders: "Open orders",
      paymentDue: "Payment due",
      fulfillmentQueue: "Fulfillment queue",
      qcQueue: "QC queue",
      shippingQueue: "Shipping queue",
      productViewRequired: "Requires product.view",
      inventoryViewRequired: "Requires inventory.view",
      customerViewRequired: "Requires customer.view",
      orderViewRequired: "Requires order.view",
      warehousePickRequired: "Requires warehouse.pick",
      warehouseQcRequired: "Requires warehouse.qc",
      shippingCreateRequired: "Requires shipping.create"
    },
    dashboardStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Dashboard aggregates are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Dashboard aggregates are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Report permission required",
        detail: "Dashboard aggregates require report.view; module navigation still shows permission boundaries."
      },
      query_error: {
        title: "Dashboard read failed",
        detail: "The database rejected a dashboard aggregate request or returned an unexpected response."
      },
      ready: {
        title: "Dashboard ready",
        detail: "Dashboard aggregates are scoped to the active organization and granted permissions."
      }
    },
    products: {
      pageCode: "CORE-UI-002",
      pageTitle: "Products",
      organizationInventoryVisible: "Inventory visible",
      organizationInventoryHidden: "Inventory hidden",
      products: "Products",
      active: "Active",
      variants: "Variants",
      available: "Available",
      uncategorized: "Uncategorized",
      noBrand: "No brand",
      onHand: "On hand",
      reserved: "Reserved",
      stockCode: "Stock code",
      variant: "Variant",
      barcode: "Barcode",
      price: "Price",
      status: "Status",
      noVariants: "No variants returned.",
      readBoundary: "Read Boundary",
      tenant: "Tenant",
      productAccess: "Product access",
      inventoryAccess: "Inventory access",
      blockedInScreen: "Blocked In This Screen",
      createEdit: "Create/edit",
      costFields: "Cost fields",
      costNotSelected: "Not selected",
      inventoryMutation: "Inventory mutation",
      rpcWrapperOnly: "RPC wrapper only",
      snapshotScope: "Snapshot Scope",
      productLimit: "Product limit",
      variantLimit: "Variant limit",
      balanceLimit: "Balance limit",
      fiftyLatest: "50 latest",
      twoHundredLatest: "200 latest",
      fiveHundredRows: "500 rows"
    },
    inventory: {
      pageCode: "CORE-UI-003",
      pageTitle: "Inventory",
      warehouses: "Warehouses",
      balanceRows: "Balance rows",
      movementRows: "Recent movements",
      onHand: "On hand",
      reserved: "Reserved",
      allocated: "Allocated",
      available: "Available",
      warehouseSummary: "Warehouse summary",
      balances: "Inventory balances",
      recentMovements: "Recent movements",
      warehouse: "Warehouse",
      stockCode: "Stock code",
      variant: "Variant",
      product: "Product",
      updated: "Updated",
      movementType: "Movement",
      quantityDelta: "Quantity delta",
      reference: "Reference",
      reason: "Reason",
      createdAt: "Created",
      readBoundary: "Read Boundary",
      inventoryAccess: "Inventory access",
      productLabels: "Product labels",
      labelsVisible: "Visible with product.view",
      labelsHidden: "Variant IDs only",
      blockedInScreen: "Blocked In This Screen",
      inventoryAdjust: "Inventory adjustment",
      adjustReserveRelease: "Adjust, reserve, release",
      wrapperOnly: "Guarded wrapper only",
      reservationAllocation: "Reservation/allocation",
      notInFirstRead: "Not included in first read model",
      snapshotScope: "Snapshot Scope",
      warehouseLimit: "Warehouse limit",
      balanceLimit: "Balance limit",
      movementLimit: "Movement limit",
      oneHundred: "100 latest",
      fiveHundred: "500 latest",
      fifty: "50 latest",
      noWarehouses: "No warehouses returned.",
      noBalances: "No inventory balances returned.",
      noMovements: "No movements returned."
    },
    customers: {
      pageCode: "CORE-UI-004",
      pageTitle: "Customers",
      customers: "Customers",
      customer: "Customer",
      active: "Active",
      blocked: "Blocked",
      lifetimeSpend: "Lifetime spend",
      customerAccess: "Customer access",
      orderSignals: "Order signals",
      visibleWithOrderView: "Visible with order.view",
      hiddenWithoutOrderView: "Hidden without order.view",
      customerSnapshot: "Customer snapshot",
      customerList: "Customer list",
      contact: "Contact",
      status: "Status",
      orders: "Orders",
      spend: "Spend",
      latestOrder: "Latest order",
      updated: "Updated",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      profileContactEdit: "Profile/contact edit",
      customerServiceRequired: "Customer service required",
      customerMerge: "Customer merge",
      ownerApprovedWorkflow: "Owner-approved workflow required",
      anonymizeDelete: "Anonymize/delete",
      privacyWorkflowRequired: "Privacy workflow required",
      snapshotScope: "Snapshot Scope",
      customerLimit: "Customer limit",
      orderSignalLimit: "Order signal limit",
      relatedTables: "Related tables",
      seventyFiveLatest: "75 latest",
      twoHundredFiftyLatest: "250 latest",
      deferredReadContracts: "Deferred read contracts",
      noCustomers: "No customers returned."
    },
    orders: {
      pageCode: "CORE-UI-005",
      pageTitle: "Orders",
      orders: "Orders",
      confirmed: "Confirmed",
      paid: "Paid",
      amountDue: "Amount due",
      order: "Order",
      customer: "Customer",
      source: "Source",
      total: "Total",
      payment: "Payment",
      fulfillment: "Fulfillment",
      status: "Status",
      created: "Created",
      updated: "Updated",
      latestOrders: "Latest orders",
      orderList: "Order list",
      orderStatus: "Order status",
      paymentStatus: "Payment status",
      fulfillmentStatus: "Fulfillment status",
      paidAmount: "Paid",
      dueAmount: "Due",
      paymentDue: "Payment due",
      orderAccess: "Order access",
      customerLabels: "Customer labels",
      labelsVisible: "Visible with customer.view",
      labelsHidden: "Customer IDs only",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      createEditCancel: "Create/edit/cancel",
      reprice: "Reprice",
      paymentSettlement: "Payment settlement",
      fulfillmentMutation: "Fulfillment mutation",
      serviceRequired: "Service contract required",
      wrapperOrServiceRequired: "Wrapper/service required",
      snapshotScope: "Snapshot Scope",
      orderLimit: "Order limit",
      customerLabelLimit: "Customer label limit",
      relatedReads: "Related reads",
      seventyFiveLatest: "75 latest",
      deferredReadContracts: "Deferred read contracts",
      noOrders: "No orders returned."
    },
    payments: {
      pageCode: "CORE-UI-006",
      pageTitle: "Payments",
      payments: "Payments",
      payment: "Payment",
      transactions: "Transactions",
      refunds: "Refunds",
      refund: "Refund",
      amountExpected: "Expected",
      amountReceived: "Received",
      refundAmount: "Refunded",
      balance: "Balance",
      order: "Order",
      status: "Status",
      type: "Type",
      method: "Method",
      amount: "Amount",
      provider: "Provider",
      reason: "Reason",
      created: "Created",
      updated: "Updated",
      paymentList: "Payment list",
      recentTransactions: "Recent transactions",
      refundHistory: "Refund history",
      paymentAccess: "Payment access",
      orderLabels: "Order labels",
      labelsVisible: "Visible with order.view",
      labelsHidden: "Payment/order IDs only",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      paymentVerification: "Payment verification",
      paymentSettlement: "Payment settlement",
      refundProcessing: "Refund processing",
      paymentProofs: "Payment proofs",
      serviceRequired: "Service contract required",
      wrapperOnly: "Guarded wrapper only",
      notSelected: "Not selected",
      snapshotScope: "Snapshot Scope",
      paymentLimit: "Payment limit",
      transactionLimit: "Transaction limit",
      refundLimit: "Refund limit",
      seventyFiveLatest: "75 latest",
      oneHundredLatest: "100 latest",
      fiftyLatest: "50 latest",
      noPayments: "No payments returned.",
      noTransactions: "No payment transactions returned.",
      noRefunds: "No refunds returned."
    },
    fulfillment: {
      pageCode: "CORE-UI-007",
      pageTitle: "Fulfillment",
      fulfillments: "Fulfillments",
      fulfillment: "Fulfillment",
      activeFulfillments: "Active fulfillments",
      totalItems: "Item lines",
      totalQuantity: "Total quantity",
      fulfillmentQueue: "Fulfillment queue",
      fulfillmentItems: "Fulfillment items",
      qcSessions: "QC sessions",
      shipments: "Shipments",
      shipment: "Shipment",
      sessions: "Sessions",
      items: "Items",
      order: "Order",
      variant: "Variant",
      quantity: "Quantity",
      warehouse: "Warehouse",
      status: "Status",
      packed: "Packed",
      updated: "Updated",
      created: "Created",
      started: "Started",
      completed: "Completed",
      method: "Method",
      tracking: "Tracking",
      packages: "Packages",
      failureReason: "Failure reason",
      fulfillmentAccess: "Fulfillment access",
      qcSignals: "QC signals",
      shippingSignals: "Shipping signals",
      visibleWithWarehouseQc: "Visible with warehouse.qc",
      hiddenWithoutWarehouseQc: "Hidden without warehouse.qc",
      visibleWithShippingCreate: "Visible with shipping.create",
      hiddenWithoutShippingCreate: "Hidden without shipping.create",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      pickPackMutation: "Pick/pack mutation",
      qcCompletion: "QC completion",
      shipmentLabel: "Shipment label",
      carrierWebhook: "Carrier webhook",
      serviceRequired: "Service contract required",
      wrapperOnly: "Guarded wrapper only",
      edgeBoundaryOnly: "Edge Function boundary only",
      snapshotScope: "Snapshot Scope",
      fulfillmentLimit: "Fulfillment limit",
      itemLimit: "Item limit",
      qcLimit: "QC limit",
      shipmentLimit: "Shipment limit",
      seventyFiveLatest: "75 latest",
      oneHundredFiftyLatest: "150 latest",
      fiftyLatestOrHidden: "50 latest or hidden",
      qcHiddenDetail: "QC session data is hidden until the active membership has warehouse.qc.",
      shippingHiddenDetail:
        "Shipment data is hidden until the active membership has shipping.create.",
      noFulfillments: "No fulfillments returned.",
      noItems: "No fulfillment items returned.",
      noQcSessions: "No QC sessions returned.",
      noShipments: "No shipments returned."
    },
    qc: {
      pageCode: "CORE-UI-008",
      pageTitle: "Warehouse QC",
      sessions: "Sessions",
      activeSessions: "Active sessions",
      scannedQuantity: "Scanned quantity",
      rejectedScans: "Rejected scans",
      qcQueue: "QC queue",
      itemTotals: "QC item totals",
      recentScanSignals: "Recent scan signals",
      scans: "Scans",
      items: "Items",
      item: "Item",
      fulfillment: "Fulfillment",
      qcStatus: "QC status",
      fulfillmentStatus: "Fulfillment status",
      status: "Status",
      progress: "Progress",
      blockingItems: "Blocking items",
      started: "Started",
      updated: "Updated",
      required: "Required",
      scanned: "Scanned",
      remaining: "Remaining",
      scannedAt: "Scanned at",
      scanType: "Scan type",
      match: "Match",
      quantity: "Quantity",
      errorCode: "Error code",
      qcAccess: "QC access",
      fulfillmentLabels: "Fulfillment labels",
      productLabels: "Product labels",
      overridePermission: "Override permission",
      visibleWithWarehousePick: "Visible with warehouse.pick",
      hiddenWithoutWarehousePick: "Fulfillment IDs only",
      visibleWithProductView: "Visible with product.view",
      hiddenWithoutProductView: "Fulfillment item IDs only",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      scanIngestion: "Scan ingestion",
      normalCompletion: "Normal completion",
      overrideAction: "QC override",
      stockDeduction: "Stock deduction",
      finalLabelGate: "Final label gate",
      serviceRequired: "Service contract required",
      wrapperOnly: "Guarded wrapper only",
      notQcResponsibility: "Not a QC responsibility",
      shippingWrapperOnly: "Shipping wrapper only",
      snapshotScope: "Snapshot Scope",
      sessionLimit: "Session limit",
      itemTotalLimit: "Item total limit",
      scanSignalLimit: "Scan signal limit",
      scanValues: "Scan values",
      seventyFiveLatest: "75 latest",
      twoHundredLatest: "200 latest",
      oneHundredLatest: "100 latest",
      notSelected: "Not selected",
      noSessions: "No QC sessions returned.",
      noItemTotals: "No QC item totals returned.",
      noScans: "No scan signals returned."
    },
    shipping: {
      pageCode: "CORE-UI-009",
      pageTitle: "Shipping",
      shipments: "Shipments",
      readyForHandoff: "Ready handoff",
      inTransit: "In transit",
      trackingEvents: "Tracking events",
      shipmentQueue: "Shipment queue",
      packageManifest: "Package manifest",
      packageItems: "Package items",
      trackingTimeline: "Tracking timeline",
      providers: "Providers",
      events: "Events",
      items: "Items",
      shipment: "Shipment",
      fulfillment: "Fulfillment",
      provider: "Provider",
      providerCode: "Provider code",
      method: "Method",
      tracking: "Tracking",
      packages: "Packages",
      packageNo: "Package",
      item: "Item",
      quantity: "Quantity",
      status: "Status",
      weight: "Weight",
      dimensions: "Dimensions",
      eventAt: "Event at",
      eventCode: "Event code",
      description: "Description",
      created: "Created",
      shippingAccess: "Shipping access",
      printLabelAccess: "Print label access",
      fulfillmentLabels: "Fulfillment labels",
      qcSignals: "QC signals",
      visibleWithWarehousePick: "Visible with warehouse.pick",
      hiddenWithoutWarehousePick: "Fulfillment IDs only",
      visibleWithWarehouseQc: "Visible with warehouse.qc",
      hiddenWithoutWarehouseQc: "QC status hidden",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      labelCreation: "Label creation",
      shipmentHandoff: "Shipment handoff",
      trackingUpdate: "Tracking update",
      carrierWebhook: "Carrier webhook",
      costAndCod: "Cost/COD",
      wrapperOnly: "Guarded wrapper only",
      edgeBoundaryOnly: "Edge Function boundary only",
      notSelected: "Not selected",
      snapshotScope: "Snapshot Scope",
      shipmentLimit: "Shipment limit",
      packageLimit: "Package limit",
      packageItemLimit: "Package item limit",
      trackingLimit: "Tracking limit",
      sensitiveFields: "Sensitive fields",
      seventyFiveLatest: "75 latest",
      oneHundredFiftyLatest: "150 latest",
      twoHundredLatest: "200 latest",
      oneHundredLatest: "100 latest",
      noShipments: "No shipments returned.",
      noPackages: "No shipment packages returned.",
      noPackageItems: "No package items returned.",
      noTrackingEvents: "No tracking events returned.",
      noProviders: "No matching providers returned."
    },
    returns: {
      pageCode: "CORE-UI-010",
      pageTitle: "Returns",
      returns: "Returns",
      openReturns: "Open returns",
      inspected: "Inspected",
      refundAmount: "Refund amount",
      returnQueue: "Return queue",
      returnItems: "Return items",
      statusHistory: "Status history",
      dispositions: "Dispositions",
      exchangeReplacements: "Exchange replacements",
      exchanges: "Exchanges",
      events: "Events",
      returnCase: "Return",
      type: "Type",
      order: "Order",
      item: "Item",
      items: "Items",
      quantity: "Quantity",
      status: "Status",
      condition: "Condition",
      restockable: "Restockable",
      replacementVariant: "Replacement variant",
      requested: "Requested",
      updated: "Updated",
      created: "Created",
      fromStatus: "From",
      toStatus: "To",
      reason: "Reason",
      disposition: "Disposition",
      warehouse: "Warehouse",
      inventoryMovement: "Inventory movement",
      replacementOrder: "Replacement order",
      replacementItem: "Replacement item",
      priceDifference: "Price difference",
      returnAccess: "Return access",
      orderLabels: "Order labels",
      productLabels: "Product labels",
      inspectPermission: "Inspect permission",
      managePermission: "Manage permission",
      visibleWithOrderView: "Visible with order.view",
      hiddenWithoutOrderView: "Return/order IDs only",
      visibleWithProductView: "Visible with product.view",
      hiddenWithoutProductView: "Variant IDs only",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      createApproveReject: "Create/approve/reject",
      inspectionDisposition: "Inspection disposition",
      restockMovement: "Restock movement",
      refundProcessing: "Refund processing",
      exchangeFulfillment: "Exchange fulfillment",
      serviceRequired: "Service contract required",
      wrapperOrServiceRequired: "Wrapper/service required",
      paymentWrapperOnly: "Payment wrapper only",
      snapshotScope: "Snapshot Scope",
      returnLimit: "Return limit",
      itemLimit: "Item limit",
      historyLimit: "History limit",
      dispositionLimit: "Disposition limit",
      exchangeLimit: "Exchange limit",
      seventyFiveLatest: "75 latest",
      twoHundredLatest: "200 latest",
      oneHundredFiftyLatest: "150 latest",
      oneHundredLatest: "100 latest",
      noReturns: "No returns returned.",
      noItems: "No return items returned.",
      noHistory: "No return status history returned.",
      noDispositions: "No return dispositions returned.",
      noExchanges: "No exchange replacements returned."
    },
    promotions: {
      pageCode: "CORE-UI-011",
      pageTitle: "Promotions",
      campaigns: "Campaigns",
      activeCampaigns: "Active campaigns",
      rulesAndActions: "Rules/actions",
      totalBenefitAmount: "Total benefit",
      campaignQueue: "Campaign queue",
      versionHistory: "Version history",
      ruleList: "Rule list",
      actionList: "Action list",
      couponAndTriggers: "Coupons and trigger codes",
      appliedBenefits: "Applied benefits",
      campaign: "Campaign",
      version: "Version",
      versions: "Versions",
      rules: "Rules",
      actions: "Actions",
      coupons: "Coupons",
      triggerCodes: "Trigger codes",
      codes: "Codes",
      benefits: "Benefits",
      order: "Order",
      status: "Status",
      scope: "Scope",
      priority: "Priority",
      stacking: "Stacking",
      stackable: "Stackable",
      exclusive: "Exclusive",
      usageLimit: "Usage limit",
      latestVersion: "Latest version",
      updated: "Updated",
      effectiveFrom: "Effective from",
      effectiveUntil: "Effective until",
      published: "Published",
      ruleType: "Rule type",
      minQuantity: "Min quantity",
      minSpend: "Min spend",
      repeatable: "Repeatable",
      actionType: "Action type",
      maxDiscount: "Max discount",
      created: "Created",
      code: "Code",
      window: "Window",
      benefitType: "Benefit type",
      originalAmount: "Original",
      benefitAmount: "Benefit",
      finalAmount: "Final",
      promotionAccess: "Promotion access",
      createPermission: "Create permission",
      publishPermission: "Publish permission",
      orderLabels: "Order labels",
      visibleWithOrderView: "Visible with order.view",
      hiddenWithoutOrderView: "Order IDs only",
      readBoundary: "Read Boundary",
      blockedInScreen: "Blocked In This Screen",
      createEdit: "Create/edit",
      publishValidate: "Publish/validate",
      previewSimulator: "Preview/simulator",
      checkoutEvaluation: "Checkout evaluation",
      rewriteAppliedBenefits: "Rewrite applied benefits",
      serviceRequired: "Service contract required",
      engineRequired: "Promotion engine required",
      productionEngineOnly: "Production engine only",
      serverEngineOnly: "Server engine only",
      forbiddenHistoricalRewrite: "Forbidden historical rewrite",
      snapshotScope: "Snapshot Scope",
      campaignLimit: "Campaign limit",
      versionLimit: "Version limit",
      ruleActionLimit: "Rule/action limit",
      couponTriggerLimit: "Coupon/trigger limit",
      appliedBenefitLimit: "Applied benefit limit",
      rawConfig: "Raw config/snapshot",
      notSelected: "Not selected",
      seventyFiveLatest: "75 latest",
      oneHundredFiftyLatest: "150 latest",
      twoHundredLatest: "200 latest",
      noCampaigns: "No promotion campaigns returned.",
      noVersions: "No campaign versions returned.",
      noRules: "No promotion rules returned.",
      noActions: "No promotion actions returned.",
      noCoupons: "No coupons returned.",
      noTriggerCodes: "No trigger codes returned.",
      noAppliedBenefits: "No applied benefits returned."
    },
    users: {
      pageCode: "CORE-UI-012",
      pageTitle: "Users / Roles",
      members: "Members",
      activeMembers: "Active members",
      roles: "Roles",
      permissions: "Permissions",
      memberDirectory: "Member directory",
      roleMatrix: "Role matrix",
      rolePermissions: "Role permissions",
      permissionCatalog: "Permission catalog",
      invitations: "Invitations",
      member: "Member",
      role: "Role",
      status: "Status",
      membershipStatus: "Membership",
      profileStatus: "Profile",
      defaultOrg: "Default org",
      systemRole: "System role",
      permissionCode: "Permission code",
      permissionName: "Permission name",
      email: "Email",
      invitedBy: "Invited by",
      expires: "Expires",
      accepted: "Accepted",
      joined: "Joined",
      updated: "Updated",
      memberAccess: "Member access",
      managePermission: "Manage permission",
      auditPermission: "Audit permission",
      authSource: "Auth source",
      supabaseAuthNotSelected: "Supabase Auth data not selected",
      readBoundary: "Read Boundary",
      guardedActionReadiness: "Guarded Action Readiness",
      memberInviteAction: "Member invite request",
      actionId: "Action ID",
      tenant: "Tenant",
      requiredPermission: "Required permission",
      permissionState: "Permission state",
      persistence: "Persistence",
      audit: "Audit",
      skeletonReady: "Skeleton ready",
      skeletonOnly: "Skeleton only",
      readyWithPermission: "Ready with permission",
      permissionRequired: "Permission required",
      persistenceDisabled: "Persistence disabled until the write contract is approved",
      auditRequired: "Audit required before persistence",
      submitDisabled: "Disabled until persistence contract",
      inviteEmailPreview: "new.user@example.com",
      roleSelectionPreview: "Role selection preview",
      blockedInScreen: "Blocked In This Screen",
      inviteUser: "Invite user",
      deactivateMember: "Deactivate member",
      roleAssignment: "Role assignment",
      permissionCatalogEdit: "Permission catalog edit",
      supportAccessGrant: "Support access grant",
      adminServiceRequired: "Admin access service required",
      adminServiceAuditRequired: "Admin access service + audit required",
      forbiddenNoNewPermission: "No new permission without owner approval",
      supportGrantWorkflowRequired: "Time-bound audited support workflow required",
      snapshotScope: "Snapshot Scope",
      memberLimit: "Member limit",
      roleLimit: "Role limit",
      permissionLimit: "Permission limit",
      rolePermissionLimit: "Role-permission limit",
      invitationLimit: "Invitation limit",
      authUserData: "Auth user data",
      notSelected: "Not selected",
      oneHundredFiftyLatest: "150 latest",
      oneHundredLatest: "100 latest",
      threeHundredLatest: "300 latest",
      sixHundredLatest: "600 latest",
      seventyFiveLatest: "75 latest",
      noMembers: "No organization members returned.",
      noRoles: "No roles returned.",
      noRolePermissions: "No role-permission rows returned.",
      noPermissions: "No permission catalog rows returned.",
      noInvitations: "No invitations returned."
    },
    settings: {
      pageCode: "CORE-UI-013",
      pageTitle: "Settings",
      activeSubscriptions: "Active subscriptions",
      enabledFeatures: "Enabled features",
      enabledEntitlements: "Enabled entitlements",
      usageCounters: "Usage counters",
      organizationProfile: "Organization profile",
      organizationName: "Organization name",
      organizationId: "Organization ID",
      slug: "Slug",
      timezone: "Timezone",
      currency: "Currency",
      status: "Status",
      created: "Created",
      updated: "Updated",
      subscriptions: "Subscriptions",
      planFeatures: "Plan features",
      entitlements: "Entitlements",
      plan: "Plan",
      feature: "Feature",
      source: "Source",
      type: "Type",
      enabled: "Enabled",
      used: "Used",
      limit: "Limit",
      billingCycle: "Billing cycle",
      periodStart: "Period start",
      periodEnd: "Period end",
      validFrom: "Valid from",
      validUntil: "Valid until",
      cancelAtPeriodEnd: "Cancel at period end",
      settingsAccess: "Settings access",
      editPermission: "Edit permission",
      dataApiBoundary: "Data API boundary",
      rlsAndGrants: "RLS + explicit grants",
      serviceRole: "Service role",
      neverSelected: "Never selected in browser reads",
      readBoundary: "Read Boundary",
      guardedActionReadiness: "Guarded Action Readiness",
      organizationProfileAction: "Organization profile update request",
      actionId: "Action ID",
      requiredPermission: "Required permission",
      permissionState: "Permission state",
      persistence: "Persistence",
      audit: "Audit",
      skeletonReady: "Skeleton ready",
      skeletonOnly: "Skeleton only",
      readyWithPermission: "Ready with permission",
      permissionRequired: "Permission required",
      persistenceDisabled: "Persistence disabled until the write contract is approved",
      auditRequired: "Audit required before persistence",
      submitDisabled: "Disabled until persistence contract",
      blockedInScreen: "Blocked In This Screen",
      organizationProfileEdit: "Organization profile edit",
      subscriptionPlanChange: "Subscription plan change",
      entitlementOverride: "Entitlement override",
      usageReset: "Usage reset",
      supportTenantAccess: "Support tenant access",
      settingsServiceRequired: "Settings service required",
      ownerCommercialWorkflowRequired: "Owner commercial workflow required",
      adminServiceAuditRequired: "Admin service + audit required",
      supportWorkflowRequired: "Time-bound support workflow required",
      snapshotScope: "Snapshot Scope",
      organizationLimit: "Organization limit",
      subscriptionLimit: "Subscription limit",
      planFeatureLimit: "Plan-feature limit",
      entitlementLimit: "Entitlement limit",
      usageLimit: "Usage limit",
      configJson: "config_json",
      notSelected: "Not selected",
      oneActiveOrganization: "1 active organization",
      twentyFiveLatest: "25 latest",
      twoHundredLatest: "200 latest",
      noOrganizationRow: "No organization row returned.",
      noSubscriptions: "No subscriptions returned.",
      noEntitlements: "No entitlements returned.",
      noUsageCounters: "No usage counters returned.",
      noPlanFeatures: "No plan features returned."
    },
    productStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail:
          "Admin product reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Product catalog reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Product permission required",
        detail: "This screen requires product.view for the active organization."
      },
      query_error: {
        title: "Product read failed",
        detail:
          "The database rejected the read request or returned an unexpected response."
      },
      ready: {
        title: "No products found",
        detail: "No product records were returned for the active organization."
      }
    },
    inventoryStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Inventory reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Inventory reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Inventory permission required",
        detail: "This screen requires inventory.view for the active organization."
      },
      query_error: {
        title: "Inventory read failed",
        detail: "The database rejected the inventory read request or returned an unexpected response."
      },
      ready: {
        title: "No inventory found",
        detail: "No warehouse, balance, or movement records were returned for the active organization."
      }
    },
    customerStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Customer reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Customer reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Customer permission required",
        detail: "This screen requires customer.view for the active organization."
      },
      query_error: {
        title: "Customer read failed",
        detail: "The database rejected the customer read request or returned an unexpected response."
      },
      ready: {
        title: "No customers found",
        detail: "No customer records were returned for the active organization."
      }
    },
    orderStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Order reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Order reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Order permission required",
        detail: "This screen requires order.view for the active organization."
      },
      query_error: {
        title: "Order read failed",
        detail: "The database rejected the order read request or returned an unexpected response."
      },
      ready: {
        title: "No orders found",
        detail: "No order records were returned for the active organization."
      }
    },
    paymentStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Payment reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Payment reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Payment permission required",
        detail: "This screen requires payment.view for the active organization."
      },
      query_error: {
        title: "Payment read failed",
        detail: "The database rejected the payment read request or returned an unexpected response."
      },
      ready: {
        title: "No payments found",
        detail: "No payment records were returned for the active organization."
      }
    },
    fulfillmentStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Fulfillment reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Fulfillment reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Fulfillment permission required",
        detail: "This screen requires warehouse.pick for the active organization."
      },
      query_error: {
        title: "Fulfillment read failed",
        detail: "The database rejected the fulfillment read request or returned an unexpected response."
      },
      ready: {
        title: "No fulfillments found",
        detail: "No fulfillment records were returned for the active organization."
      }
    },
    qcStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Warehouse QC reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Warehouse QC reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Warehouse QC permission required",
        detail: "This screen requires warehouse.qc for the active organization."
      },
      query_error: {
        title: "Warehouse QC read failed",
        detail: "The database rejected the QC read request or returned an unexpected response."
      },
      ready: {
        title: "No QC sessions found",
        detail: "No Warehouse QC records were returned for the active organization."
      }
    },
    shippingStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Shipping reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Shipping reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Shipping permission required",
        detail: "This screen requires shipping.create for the active organization."
      },
      query_error: {
        title: "Shipping read failed",
        detail: "The database rejected the shipping read request or returned an unexpected response."
      },
      ready: {
        title: "No shipments found",
        detail: "No shipping records were returned for the active organization."
      }
    },
    returnStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Return reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Return reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Return permission required",
        detail: "This screen requires return.view for the active organization."
      },
      query_error: {
        title: "Return read failed",
        detail: "The database rejected the return read request or returned an unexpected response."
      },
      ready: {
        title: "No returns found",
        detail: "No return records were returned for the active organization."
      }
    },
    promotionStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Promotion reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Promotion reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Promotion permission required",
        detail: "This screen requires promotion.view for the active organization."
      },
      query_error: {
        title: "Promotion read failed",
        detail: "The database rejected the promotion read request or returned an unexpected response."
      },
      ready: {
        title: "No promotions found",
        detail: "No promotion records were returned for the active organization."
      }
    },
    userStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "User and role reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "User and role reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Member permission required",
        detail: "This screen requires members.view for the active organization."
      },
      query_error: {
        title: "User and role read failed",
        detail: "The database rejected the user/role read request or returned an unexpected response."
      },
      ready: {
        title: "No users found",
        detail: "No member or role records were returned for the active organization."
      }
    },
    settingStates: {
      missing_env: {
        title: "Supabase environment is not configured",
        detail: "Settings reads are unavailable until public Supabase env is present."
      },
      anonymous: {
        title: "Sign in required",
        detail: "Settings reads are only available to authenticated admin users."
      },
      missing_membership: {
        title: "No active organization",
        detail: "The current profile has no active organization membership."
      },
      permission_denied: {
        title: "Settings permission required",
        detail: "This screen requires organization.settings.view for the active organization."
      },
      query_error: {
        title: "Settings read failed",
        detail: "The database rejected the settings read request or returned an unexpected response."
      },
      ready: {
        title: "No settings data found",
        detail: "No organization, subscription, entitlement, or usage records were returned."
      }
    },
    navStatus: {
      READY_FOR_READ: "Read ready",
      READY_FOR_GUARDED_ACTION: "Guarded actions ready",
      PARTIAL_ACTION_READY: "Partial actions ready",
      NEEDS_SERVICE: "Needs service",
      NEEDS_READ_MODEL: "Needs read model",
      COMMERCIAL_WRITES_BLOCKED: "Commercial writes blocked"
    }
  },
  th: {
    common: {
      admin: "แอดมิน",
      light: "สว่าง",
      dark: "มืด",
      thai: "TH",
      english: "EN",
      hidden: "ซ่อน",
      unavailable: "ไม่มีข้อมูล",
      anonymous: "ยังไม่เข้าสู่ระบบ",
      granted: "มีสิทธิ์",
      requires: "ต้องมีสิทธิ์",
      noOrganization: "ไม่มีองค์กร",
      noDirectUiAction: "ไม่มีปุ่มสั่งงานตรงจากหน้า UI",
      serverRpcOnly: "ผ่าน Server/RPC เท่านั้น"
    },
    shell: {
      productName: "ACOS Admin",
      sectionName: "Commerce Core",
      sectionDescription:
        "พื้นที่ทำงานหลังบ้านที่ยึด auth ฝั่ง server, tenant context และ navigation ตามสิทธิ์",
      pageCode: "CORE-UI-001",
      pageTitle: "Admin App Shell",
      pageDescription:
        "โครงนำทางแบบ read-first สำหรับงาน commerce, การเข้าถึงตาม role และ workflow ที่ต้องผ่าน boundary",
      modulesMapped: "โมดูล A3 ที่ map แล้ว",
      noSensitiveWrites: "ไม่มี sensitive write โดยตรง",
      actionReadyModules: "โมดูลที่พร้อมต่อ action",
      readOrWrapperBacked: "อ่านได้หรือมี wrapper รองรับ",
      grantedPermissions: "สิทธิ์ที่ได้รับ",
      moduleBoundary: "ขอบเขตโมดูล",
      tenantContext: "บริบทองค์กร",
      user: "ผู้ใช้",
      organization: "องค์กร",
      organizationStatus: "สถานะองค์กร",
      membership: "สมาชิก",
      guardrails: "กติกาป้องกัน",
      sensitiveWrites: "Sensitive writes",
      serviceRole: "Service role",
      neverInBrowser: "ห้ามอยู่ใน browser",
      tenantScope: "Tenant scope",
      membershipDerived: "อิงจาก membership",
      authorization: "Authorization",
      permissionAndEntitlement: "Permission + entitlement",
      signedIn: "เข้าสู่ระบบแล้ว",
      notSignedIn: "ยังไม่เข้าสู่ระบบ",
      signOut: "ออกจากระบบ",
      signInRequired: "ต้องเข้าสู่ระบบ",
      supabaseEnvMissing: "ยังไม่ได้ตั้งค่า Supabase env",
      email: "อีเมล",
      sendMagicLink: "ส่ง magic link",
      emailRequired: "กรุณากรอกอีเมล",
      switch: "เปลี่ยน",
      magicLinkSent: "ส่ง magic link แล้ว",
      signedOut: "ออกจากระบบแล้ว",
      signInFailed: "เข้าสู่ระบบไม่สำเร็จ",
      organizationSwitched: "เปลี่ยนองค์กรแล้ว",
      organizationDenied: "ไม่มีสิทธิ์ใช้องค์กรนี้",
      serverAuthActive: "Server auth boundary พร้อมใช้งาน",
      dashboardSnapshot: "ภาพรวม Dashboard",
      products: "สินค้า",
      availableStock: "สต๊อกพร้อมขาย",
      customers: "ลูกค้า",
      openOrders: "คำสั่งซื้อที่เปิดอยู่",
      paymentDue: "ยอดรอชำระ",
      fulfillmentQueue: "คิว fulfillment",
      qcQueue: "คิว QC",
      shippingQueue: "คิวจัดส่ง",
      productViewRequired: "ต้องมี product.view",
      inventoryViewRequired: "ต้องมี inventory.view",
      customerViewRequired: "ต้องมี customer.view",
      orderViewRequired: "ต้องมี order.view",
      warehousePickRequired: "ต้องมี warehouse.pick",
      warehouseQcRequired: "ต้องมี warehouse.qc",
      shippingCreateRequired: "ต้องมี shipping.create"
    },
    dashboardStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "Dashboard aggregate ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "Dashboard aggregate ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดู report",
        detail: "Dashboard aggregate ต้องใช้ report.view แต่ module navigation ยังแสดง boundary ตามสิทธิ์"
      },
      query_error: {
        title: "อ่าน Dashboard ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธ aggregate request หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "Dashboard พร้อมใช้งาน",
        detail: "Dashboard aggregate ถูกจำกัดตาม active organization และสิทธิ์ที่ได้รับ"
      }
    },
    products: {
      pageCode: "CORE-UI-002",
      pageTitle: "สินค้า",
      organizationInventoryVisible: "เห็นยอดสต๊อก",
      organizationInventoryHidden: "ซ่อนยอดสต๊อก",
      products: "สินค้า",
      active: "Active",
      variants: "Variants",
      available: "พร้อมขาย",
      uncategorized: "ยังไม่จัดหมวด",
      noBrand: "ไม่มีแบรนด์",
      onHand: "คงคลัง",
      reserved: "จองไว้",
      stockCode: "รหัสสต๊อก",
      variant: "ตัวเลือกสินค้า",
      barcode: "บาร์โค้ด",
      price: "ราคา",
      status: "สถานะ",
      noVariants: "ไม่พบ variants",
      readBoundary: "ขอบเขตการอ่าน",
      tenant: "Tenant",
      productAccess: "สิทธิ์สินค้า",
      inventoryAccess: "สิทธิ์สต๊อก",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      createEdit: "สร้าง/แก้ไข",
      costFields: "Cost fields",
      costNotSelected: "ไม่ query",
      inventoryMutation: "แก้ไขสต๊อก",
      rpcWrapperOnly: "ผ่าน RPC wrapper เท่านั้น",
      snapshotScope: "ขอบเขต snapshot",
      productLimit: "จำกัดสินค้า",
      variantLimit: "จำกัด variants",
      balanceLimit: "จำกัด balance",
      fiftyLatest: "ล่าสุด 50 รายการ",
      twoHundredLatest: "ล่าสุด 200 รายการ",
      fiveHundredRows: "500 rows"
    },
    inventory: {
      pageCode: "CORE-UI-003",
      pageTitle: "สต๊อกสินค้า",
      warehouses: "คลังสินค้า",
      balanceRows: "รายการยอดคงคลัง",
      movementRows: "movement ล่าสุด",
      onHand: "คงคลัง",
      reserved: "จองไว้",
      allocated: "จัดสรรแล้ว",
      available: "พร้อมขาย",
      warehouseSummary: "สรุปตามคลัง",
      balances: "ยอดคงคลัง",
      recentMovements: "ความเคลื่อนไหวล่าสุด",
      warehouse: "คลัง",
      stockCode: "รหัสสต๊อก",
      variant: "ตัวเลือกสินค้า",
      product: "สินค้า",
      updated: "อัปเดต",
      movementType: "ประเภท movement",
      quantityDelta: "จำนวนที่เปลี่ยน",
      reference: "อ้างอิง",
      reason: "เหตุผล",
      createdAt: "สร้างเมื่อ",
      readBoundary: "ขอบเขตการอ่าน",
      inventoryAccess: "สิทธิ์สต๊อก",
      productLabels: "ป้ายกำกับสินค้า",
      labelsVisible: "แสดงได้เมื่อมี product.view",
      labelsHidden: "แสดงเฉพาะ variant ID",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      inventoryAdjust: "ปรับสต๊อก",
      adjustReserveRelease: "ปรับ, จอง, ปล่อยจอง",
      wrapperOnly: "ผ่าน guarded wrapper เท่านั้น",
      reservationAllocation: "reservation/allocation",
      notInFirstRead: "ยังไม่รวมใน read model แรก",
      snapshotScope: "ขอบเขต snapshot",
      warehouseLimit: "จำกัดคลัง",
      balanceLimit: "จำกัด balance",
      movementLimit: "จำกัด movement",
      oneHundred: "ล่าสุด 100 รายการ",
      fiveHundred: "ล่าสุด 500 รายการ",
      fifty: "ล่าสุด 50 รายการ",
      noWarehouses: "ไม่พบข้อมูลคลังสินค้า",
      noBalances: "ไม่พบยอดคงคลัง",
      noMovements: "ไม่พบ movement"
    },
    customers: {
      pageCode: "CORE-UI-004",
      pageTitle: "ลูกค้า",
      customers: "ลูกค้า",
      customer: "ลูกค้า",
      active: "Active",
      blocked: "ถูกบล็อก",
      lifetimeSpend: "ยอดซื้อสะสม",
      customerAccess: "สิทธิ์ลูกค้า",
      orderSignals: "สัญญาณคำสั่งซื้อ",
      visibleWithOrderView: "แสดงเมื่อมี order.view",
      hiddenWithoutOrderView: "ซ่อนเมื่อไม่มี order.view",
      customerSnapshot: "ภาพรวมลูกค้า",
      customerList: "รายการลูกค้า",
      contact: "ข้อมูลติดต่อ",
      status: "สถานะ",
      orders: "คำสั่งซื้อ",
      spend: "ยอดซื้อ",
      latestOrder: "คำสั่งซื้อล่าสุด",
      updated: "อัปเดต",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      profileContactEdit: "แก้ไขโปรไฟล์/ติดต่อ",
      customerServiceRequired: "ต้องผ่าน customer service",
      customerMerge: "รวมลูกค้า",
      ownerApprovedWorkflow: "ต้องมี workflow ที่ owner อนุมัติ",
      anonymizeDelete: "ลบ/นิรนามข้อมูล",
      privacyWorkflowRequired: "ต้องผ่าน privacy workflow",
      snapshotScope: "ขอบเขต snapshot",
      customerLimit: "จำกัดลูกค้า",
      orderSignalLimit: "จำกัด order signal",
      relatedTables: "ตารางที่เกี่ยวข้อง",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      twoHundredFiftyLatest: "ล่าสุด 250 รายการ",
      deferredReadContracts: "รอ read contract รอบถัดไป",
      noCustomers: "ไม่พบข้อมูลลูกค้า"
    },
    orders: {
      pageCode: "CORE-UI-005",
      pageTitle: "คำสั่งซื้อ",
      orders: "คำสั่งซื้อ",
      confirmed: "ยืนยันแล้ว",
      paid: "ชำระแล้ว",
      amountDue: "ยอดค้างชำระ",
      order: "คำสั่งซื้อ",
      customer: "ลูกค้า",
      source: "ช่องทาง",
      total: "ยอดรวม",
      payment: "การชำระเงิน",
      fulfillment: "การจัดส่ง/เตรียมสินค้า",
      status: "สถานะ",
      created: "สร้างเมื่อ",
      updated: "อัปเดต",
      latestOrders: "คำสั่งซื้อล่าสุด",
      orderList: "รายการคำสั่งซื้อ",
      orderStatus: "สถานะคำสั่งซื้อ",
      paymentStatus: "สถานะชำระเงิน",
      fulfillmentStatus: "สถานะ fulfillment",
      paidAmount: "ชำระแล้ว",
      dueAmount: "ค้างชำระ",
      paymentDue: "กำหนดชำระ",
      orderAccess: "สิทธิ์คำสั่งซื้อ",
      customerLabels: "ชื่อลูกค้า",
      labelsVisible: "แสดงเมื่อมี customer.view",
      labelsHidden: "แสดงเฉพาะ Customer ID",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      createEditCancel: "สร้าง/แก้ไข/ยกเลิก",
      reprice: "คำนวณราคาใหม่",
      paymentSettlement: "ยืนยัน/ปิดยอดชำระเงิน",
      fulfillmentMutation: "เปลี่ยนสถานะ fulfillment",
      serviceRequired: "ต้องมี service contract",
      wrapperOrServiceRequired: "ต้องผ่าน wrapper/service",
      snapshotScope: "ขอบเขต snapshot",
      orderLimit: "จำกัดคำสั่งซื้อ",
      customerLabelLimit: "จำกัดชื่อลูกค้า",
      relatedReads: "ข้อมูลเกี่ยวข้อง",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      deferredReadContracts: "รอ read contract รอบถัดไป",
      noOrders: "ไม่พบคำสั่งซื้อ"
    },
    payments: {
      pageCode: "CORE-UI-006",
      pageTitle: "การชำระเงิน",
      payments: "การชำระเงิน",
      payment: "รายการชำระเงิน",
      transactions: "ธุรกรรม",
      refunds: "รายการคืนเงิน",
      refund: "คืนเงิน",
      amountExpected: "ยอดที่ต้องชำระ",
      amountReceived: "ยอดที่รับแล้ว",
      refundAmount: "ยอดคืนเงิน",
      balance: "ยอดคงเหลือ",
      order: "คำสั่งซื้อ",
      status: "สถานะ",
      type: "ประเภท",
      method: "วิธีชำระ",
      amount: "จำนวนเงิน",
      provider: "ผู้ให้บริการ",
      reason: "เหตุผล",
      created: "สร้างเมื่อ",
      updated: "อัปเดต",
      paymentList: "รายการชำระเงิน",
      recentTransactions: "ธุรกรรมล่าสุด",
      refundHistory: "ประวัติคืนเงิน",
      paymentAccess: "สิทธิ์การชำระเงิน",
      orderLabels: "เลขคำสั่งซื้อ",
      labelsVisible: "แสดงเมื่อมี order.view",
      labelsHidden: "แสดงเฉพาะ Payment/Order ID",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      paymentVerification: "ตรวจสอบการชำระเงิน",
      paymentSettlement: "ยืนยัน/ปิดยอดชำระเงิน",
      refundProcessing: "ดำเนินการคืนเงิน",
      paymentProofs: "หลักฐานการชำระเงิน",
      serviceRequired: "ต้องมี service contract",
      wrapperOnly: "ต้องผ่าน guarded wrapper",
      notSelected: "ไม่ query",
      snapshotScope: "ขอบเขต snapshot",
      paymentLimit: "จำกัด payment",
      transactionLimit: "จำกัด transaction",
      refundLimit: "จำกัด refund",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      oneHundredLatest: "ล่าสุด 100 รายการ",
      fiftyLatest: "ล่าสุด 50 รายการ",
      noPayments: "ไม่พบข้อมูลการชำระเงิน",
      noTransactions: "ไม่พบธุรกรรมชำระเงิน",
      noRefunds: "ไม่พบรายการคืนเงิน"
    },
    fulfillment: {
      pageCode: "CORE-UI-007",
      pageTitle: "Fulfillment",
      fulfillments: "รายการเตรียมส่ง",
      fulfillment: "รายการเตรียมส่ง",
      activeFulfillments: "กำลังดำเนินการ",
      totalItems: "จำนวนบรรทัดสินค้า",
      totalQuantity: "จำนวนรวม",
      fulfillmentQueue: "คิวเตรียมส่ง",
      fulfillmentItems: "รายการสินค้าในคิว",
      qcSessions: "รอบตรวจ QC",
      shipments: "รายการขนส่ง",
      shipment: "ขนส่ง",
      sessions: "รอบตรวจ",
      items: "รายการ",
      order: "คำสั่งซื้อ",
      variant: "สินค้า/ตัวเลือก",
      quantity: "จำนวน",
      warehouse: "คลัง",
      status: "สถานะ",
      packed: "แพ็คเมื่อ",
      updated: "อัปเดต",
      created: "สร้างเมื่อ",
      started: "เริ่มเมื่อ",
      completed: "เสร็จเมื่อ",
      method: "วิธีส่ง",
      tracking: "เลขติดตาม",
      packages: "กล่อง",
      failureReason: "เหตุผลที่ไม่ผ่าน",
      fulfillmentAccess: "สิทธิ์ fulfillment",
      qcSignals: "สัญญาณ QC",
      shippingSignals: "สัญญาณขนส่ง",
      visibleWithWarehouseQc: "แสดงเมื่อมี warehouse.qc",
      hiddenWithoutWarehouseQc: "ซ่อนเมื่อไม่มี warehouse.qc",
      visibleWithShippingCreate: "แสดงเมื่อมี shipping.create",
      hiddenWithoutShippingCreate: "ซ่อนเมื่อไม่มี shipping.create",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      pickPackMutation: "เปลี่ยนสถานะหยิบ/แพ็ค",
      qcCompletion: "ปิดรอบ QC",
      shipmentLabel: "สร้าง/พิมพ์ label",
      carrierWebhook: "Webhook ขนส่ง",
      serviceRequired: "ต้องมี service contract",
      wrapperOnly: "ต้องผ่าน guarded wrapper",
      edgeBoundaryOnly: "ผ่าน Edge Function boundary เท่านั้น",
      snapshotScope: "ขอบเขต snapshot",
      fulfillmentLimit: "จำกัด fulfillment",
      itemLimit: "จำกัด item",
      qcLimit: "จำกัด QC",
      shipmentLimit: "จำกัด shipment",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      oneHundredFiftyLatest: "ล่าสุด 150 รายการ",
      fiftyLatestOrHidden: "ล่าสุด 50 รายการ หรือซ่อน",
      qcHiddenDetail: "ข้อมูล QC จะถูกซ่อนจนกว่า membership นี้จะมีสิทธิ์ warehouse.qc",
      shippingHiddenDetail:
        "ข้อมูลขนส่งจะถูกซ่อนจนกว่า membership นี้จะมีสิทธิ์ shipping.create",
      noFulfillments: "ไม่พบรายการเตรียมส่ง",
      noItems: "ไม่พบสินค้าในคิวเตรียมส่ง",
      noQcSessions: "ไม่พบรอบตรวจ QC",
      noShipments: "ไม่พบรายการขนส่ง"
    },
    qc: {
      pageCode: "CORE-UI-008",
      pageTitle: "Warehouse QC",
      sessions: "รอบตรวจ",
      activeSessions: "รอบที่กำลังตรวจ",
      scannedQuantity: "จำนวนที่สแกน",
      rejectedScans: "สแกนไม่ผ่าน",
      qcQueue: "คิวตรวจ QC",
      itemTotals: "ยอดตรวจรายสินค้า",
      recentScanSignals: "สัญญาณสแกนล่าสุด",
      scans: "สแกน",
      items: "รายการ",
      item: "สินค้า",
      fulfillment: "รายการเตรียมส่ง",
      qcStatus: "สถานะ QC",
      fulfillmentStatus: "สถานะ fulfillment",
      status: "สถานะ",
      progress: "ความคืบหน้า",
      blockingItems: "รายการค้างตรวจ",
      started: "เริ่มเมื่อ",
      updated: "อัปเดต",
      required: "ต้องตรวจ",
      scanned: "สแกนแล้ว",
      remaining: "คงเหลือ",
      scannedAt: "สแกนเมื่อ",
      scanType: "ชนิดสแกน",
      match: "ผลตรวจ",
      quantity: "จำนวน",
      errorCode: "รหัสข้อผิดพลาด",
      qcAccess: "สิทธิ์ QC",
      fulfillmentLabels: "เลข fulfillment",
      productLabels: "ชื่อสินค้า",
      overridePermission: "สิทธิ์ override",
      visibleWithWarehousePick: "แสดงเมื่อมี warehouse.pick",
      hiddenWithoutWarehousePick: "แสดงเฉพาะ Fulfillment ID",
      visibleWithProductView: "แสดงเมื่อมี product.view",
      hiddenWithoutProductView: "แสดงเฉพาะ Fulfillment Item ID",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      scanIngestion: "รับข้อมูล scan",
      normalCompletion: "ปิดรอบ QC ปกติ",
      overrideAction: "QC override",
      stockDeduction: "ตัดสต็อก",
      finalLabelGate: "เงื่อนไข label สุดท้าย",
      serviceRequired: "ต้องมี service contract",
      wrapperOnly: "ต้องผ่าน guarded wrapper",
      notQcResponsibility: "ไม่ใช่หน้าที่ของ QC",
      shippingWrapperOnly: "ผ่าน shipping wrapper เท่านั้น",
      snapshotScope: "ขอบเขต snapshot",
      sessionLimit: "จำกัดรอบตรวจ",
      itemTotalLimit: "จำกัดยอดรายสินค้า",
      scanSignalLimit: "จำกัดสัญญาณสแกน",
      scanValues: "ค่าที่สแกนจริง",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      twoHundredLatest: "ล่าสุด 200 รายการ",
      oneHundredLatest: "ล่าสุด 100 รายการ",
      notSelected: "ไม่ query",
      noSessions: "ไม่พบรอบตรวจ QC",
      noItemTotals: "ไม่พบยอดตรวจรายสินค้า",
      noScans: "ไม่พบสัญญาณสแกน"
    },
    shipping: {
      pageCode: "CORE-UI-009",
      pageTitle: "Shipping",
      shipments: "รายการขนส่ง",
      readyForHandoff: "พร้อมส่งมอบ",
      inTransit: "กำลังขนส่ง",
      trackingEvents: "เหตุการณ์ติดตาม",
      shipmentQueue: "คิวขนส่ง",
      packageManifest: "รายการพัสดุ",
      packageItems: "สินค้าในพัสดุ",
      trackingTimeline: "ไทม์ไลน์ติดตาม",
      providers: "ขนส่ง",
      events: "เหตุการณ์",
      items: "รายการ",
      shipment: "เลขขนส่ง",
      fulfillment: "รายการเตรียมส่ง",
      provider: "ขนส่ง",
      providerCode: "รหัสขนส่ง",
      method: "วิธีส่ง",
      tracking: "เลขติดตาม",
      packages: "พัสดุ",
      packageNo: "กล่อง",
      item: "สินค้า",
      quantity: "จำนวน",
      status: "สถานะ",
      weight: "น้ำหนัก",
      dimensions: "ขนาด",
      eventAt: "เวลาเหตุการณ์",
      eventCode: "รหัสเหตุการณ์",
      description: "รายละเอียด",
      created: "สร้างเมื่อ",
      shippingAccess: "สิทธิ์ขนส่ง",
      printLabelAccess: "สิทธิ์พิมพ์ label",
      fulfillmentLabels: "เลข fulfillment",
      qcSignals: "สัญญาณ QC",
      visibleWithWarehousePick: "แสดงเมื่อมี warehouse.pick",
      hiddenWithoutWarehousePick: "แสดงเฉพาะ Fulfillment ID",
      visibleWithWarehouseQc: "แสดงเมื่อมี warehouse.qc",
      hiddenWithoutWarehouseQc: "ซ่อนสถานะ QC",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      labelCreation: "สร้าง label",
      shipmentHandoff: "ส่งมอบพัสดุ",
      trackingUpdate: "อัปเดต tracking",
      carrierWebhook: "carrier webhook",
      costAndCod: "ต้นทุน/COD",
      wrapperOnly: "ต้องผ่าน guarded wrapper",
      edgeBoundaryOnly: "ผ่าน Edge Function boundary เท่านั้น",
      notSelected: "ไม่ query",
      snapshotScope: "ขอบเขต snapshot",
      shipmentLimit: "จำกัด shipment",
      packageLimit: "จำกัด package",
      packageItemLimit: "จำกัด package item",
      trackingLimit: "จำกัด tracking",
      sensitiveFields: "ข้อมูลอ่อนไหว",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      oneHundredFiftyLatest: "ล่าสุด 150 รายการ",
      twoHundredLatest: "ล่าสุด 200 รายการ",
      oneHundredLatest: "ล่าสุด 100 รายการ",
      noShipments: "ไม่พบรายการขนส่ง",
      noPackages: "ไม่พบพัสดุ",
      noPackageItems: "ไม่พบสินค้าในพัสดุ",
      noTrackingEvents: "ไม่พบเหตุการณ์ติดตาม",
      noProviders: "ไม่พบขนส่งที่เกี่ยวข้อง"
    },
    returns: {
      pageCode: "CORE-UI-010",
      pageTitle: "Returns",
      returns: "รายการคืน",
      openReturns: "เคสที่ยังเปิด",
      inspected: "ตรวจแล้ว",
      refundAmount: "ยอดคืนเงิน",
      returnQueue: "คิวคืนสินค้า",
      returnItems: "สินค้าที่คืน",
      statusHistory: "ประวัติสถานะ",
      dispositions: "ผลตรวจสภาพ",
      exchangeReplacements: "รายการเปลี่ยนสินค้า",
      exchanges: "เปลี่ยนสินค้า",
      events: "เหตุการณ์",
      returnCase: "เลขคืนสินค้า",
      type: "ประเภท",
      order: "คำสั่งซื้อ",
      item: "สินค้า",
      items: "รายการ",
      quantity: "จำนวน",
      status: "สถานะ",
      condition: "สภาพสินค้า",
      restockable: "กลับเข้าสต๊อกได้",
      replacementVariant: "ตัวแทนเปลี่ยน",
      requested: "แจ้งคืนเมื่อ",
      updated: "อัปเดต",
      created: "สร้างเมื่อ",
      fromStatus: "จาก",
      toStatus: "เป็น",
      reason: "เหตุผล",
      disposition: "ผลตรวจ",
      warehouse: "คลัง",
      inventoryMovement: "movement สต๊อก",
      replacementOrder: "ออเดอร์ทดแทน",
      replacementItem: "สินค้าทดแทน",
      priceDifference: "ส่วนต่างราคา",
      returnAccess: "สิทธิ์คืนสินค้า",
      orderLabels: "เลขออเดอร์",
      productLabels: "ชื่อสินค้า",
      inspectPermission: "สิทธิ์ตรวจคืน",
      managePermission: "สิทธิ์จัดการคืน",
      visibleWithOrderView: "แสดงเมื่อมี order.view",
      hiddenWithoutOrderView: "แสดงเฉพาะ Return/Order ID",
      visibleWithProductView: "แสดงเมื่อมี product.view",
      hiddenWithoutProductView: "แสดงเฉพาะ Variant ID",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      createApproveReject: "สร้าง/อนุมัติ/ปฏิเสธ",
      inspectionDisposition: "ตรวจสภาพสินค้า",
      restockMovement: "คืนเข้าสต๊อก",
      refundProcessing: "ดำเนินการคืนเงิน",
      exchangeFulfillment: "ส่งสินค้าทดแทน",
      serviceRequired: "ต้องมี service contract",
      wrapperOrServiceRequired: "ต้องผ่าน wrapper/service",
      paymentWrapperOnly: "ผ่าน payment wrapper เท่านั้น",
      snapshotScope: "ขอบเขต snapshot",
      returnLimit: "จำกัด return",
      itemLimit: "จำกัด item",
      historyLimit: "จำกัด history",
      dispositionLimit: "จำกัด disposition",
      exchangeLimit: "จำกัด exchange",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      twoHundredLatest: "ล่าสุด 200 รายการ",
      oneHundredFiftyLatest: "ล่าสุด 150 รายการ",
      oneHundredLatest: "ล่าสุด 100 รายการ",
      noReturns: "ไม่พบรายการคืนสินค้า",
      noItems: "ไม่พบสินค้าที่คืน",
      noHistory: "ไม่พบประวัติสถานะคืนสินค้า",
      noDispositions: "ไม่พบผลตรวจสภาพคืนสินค้า",
      noExchanges: "ไม่พบรายการเปลี่ยนสินค้า"
    },
    promotions: {
      pageCode: "CORE-UI-011",
      pageTitle: "Promotions",
      campaigns: "แคมเปญ",
      activeCampaigns: "แคมเปญที่ใช้งาน",
      rulesAndActions: "กฎ/action",
      totalBenefitAmount: "มูลค่าส่วนลด",
      campaignQueue: "รายการแคมเปญ",
      versionHistory: "ประวัติเวอร์ชัน",
      ruleList: "รายการกฎ",
      actionList: "รายการ action",
      couponAndTriggers: "คูปองและ trigger code",
      appliedBenefits: "ส่วนลดที่ใช้แล้ว",
      campaign: "แคมเปญ",
      version: "เวอร์ชัน",
      versions: "เวอร์ชัน",
      rules: "กฎ",
      actions: "Actions",
      coupons: "คูปอง",
      triggerCodes: "Trigger codes",
      codes: "โค้ด",
      benefits: "ส่วนลด",
      order: "คำสั่งซื้อ",
      status: "สถานะ",
      scope: "ขอบเขต",
      priority: "ลำดับสำคัญ",
      stacking: "การซ้อนส่วนลด",
      stackable: "ซ้อนได้",
      exclusive: "ไม่ซ้อน",
      usageLimit: "จำกัดการใช้",
      latestVersion: "เวอร์ชันล่าสุด",
      updated: "อัปเดต",
      effectiveFrom: "เริ่มมีผล",
      effectiveUntil: "สิ้นสุด",
      published: "เผยแพร่",
      ruleType: "ชนิดกฎ",
      minQuantity: "จำนวนขั้นต่ำ",
      minSpend: "ยอดขั้นต่ำ",
      repeatable: "ใช้ซ้ำ",
      actionType: "ชนิด action",
      maxDiscount: "ส่วนลดสูงสุด",
      created: "สร้างเมื่อ",
      code: "โค้ด",
      window: "ช่วงเวลา",
      benefitType: "ชนิดส่วนลด",
      originalAmount: "ยอดเดิม",
      benefitAmount: "ส่วนลด",
      finalAmount: "ยอดสุทธิ",
      promotionAccess: "สิทธิ์โปรโมชั่น",
      createPermission: "สิทธิ์สร้าง",
      publishPermission: "สิทธิ์เผยแพร่",
      orderLabels: "เลขออเดอร์",
      visibleWithOrderView: "แสดงเมื่อมี order.view",
      hiddenWithoutOrderView: "แสดงเฉพาะ Order ID",
      readBoundary: "ขอบเขตการอ่าน",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      createEdit: "สร้าง/แก้ไข",
      publishValidate: "เผยแพร่/ตรวจ validation",
      previewSimulator: "Preview/simulator",
      checkoutEvaluation: "คำนวณตอน checkout",
      rewriteAppliedBenefits: "แก้ย้อนหลังส่วนลดที่ใช้แล้ว",
      serviceRequired: "ต้องมี service contract",
      engineRequired: "ต้องมี promotion engine",
      productionEngineOnly: "ใช้ production engine เท่านั้น",
      serverEngineOnly: "คำนวณบน server เท่านั้น",
      forbiddenHistoricalRewrite: "ห้ามแก้ย้อนหลัง",
      snapshotScope: "ขอบเขต snapshot",
      campaignLimit: "จำกัด campaign",
      versionLimit: "จำกัด version",
      ruleActionLimit: "จำกัด rule/action",
      couponTriggerLimit: "จำกัด coupon/trigger",
      appliedBenefitLimit: "จำกัด applied benefit",
      rawConfig: "raw config/snapshot",
      notSelected: "ไม่เลือกอ่าน",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      oneHundredFiftyLatest: "ล่าสุด 150 รายการ",
      twoHundredLatest: "ล่าสุด 200 รายการ",
      noCampaigns: "ไม่พบแคมเปญโปรโมชั่น",
      noVersions: "ไม่พบเวอร์ชันแคมเปญ",
      noRules: "ไม่พบกฎโปรโมชั่น",
      noActions: "ไม่พบ promotion action",
      noCoupons: "ไม่พบคูปอง",
      noTriggerCodes: "ไม่พบ trigger code",
      noAppliedBenefits: "ไม่พบส่วนลดที่ใช้แล้ว"
    },
    users: {
      pageCode: "CORE-UI-012",
      pageTitle: "Users / Roles",
      members: "สมาชิก",
      activeMembers: "สมาชิกที่ใช้งาน",
      roles: "บทบาท",
      permissions: "สิทธิ์",
      memberDirectory: "รายชื่อสมาชิก",
      roleMatrix: "Role matrix",
      rolePermissions: "สิทธิ์ตามบทบาท",
      permissionCatalog: "Permission catalog",
      invitations: "คำเชิญ",
      member: "สมาชิก",
      role: "บทบาท",
      status: "สถานะ",
      membershipStatus: "membership",
      profileStatus: "profile",
      defaultOrg: "องค์กรเริ่มต้น",
      systemRole: "system role",
      permissionCode: "permission code",
      permissionName: "ชื่อสิทธิ์",
      email: "อีเมล",
      invitedBy: "เชิญโดย",
      expires: "หมดอายุ",
      accepted: "ตอบรับ",
      joined: "เข้าร่วม",
      updated: "อัปเดต",
      memberAccess: "สิทธิ์สมาชิก",
      managePermission: "สิทธิ์จัดการ",
      auditPermission: "สิทธิ์ audit",
      authSource: "แหล่ง auth",
      supabaseAuthNotSelected: "ไม่อ่านข้อมูล Supabase Auth",
      readBoundary: "ขอบเขตการอ่าน",
      guardedActionReadiness: "Guarded action readiness",
      memberInviteAction: "คำขอเชิญสมาชิก",
      actionId: "Action ID",
      tenant: "tenant",
      requiredPermission: "สิทธิ์ที่ต้องมี",
      permissionState: "สถานะ permission",
      persistence: "persistence",
      audit: "audit",
      skeletonReady: "skeleton ready",
      skeletonOnly: "skeleton only",
      readyWithPermission: "พร้อมตาม permission",
      permissionRequired: "ต้องมี permission",
      persistenceDisabled: "ยังปิด persistence จนกว่า write contract จะอนุมัติ",
      auditRequired: "ต้องมี audit ก่อนเปิด persistence",
      submitDisabled: "ปิดไว้จนกว่า persistence contract พร้อม",
      inviteEmailPreview: "new.user@example.com",
      roleSelectionPreview: "ตัวอย่างเลือก role",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      inviteUser: "เชิญผู้ใช้",
      deactivateMember: "ปิดใช้งานสมาชิก",
      roleAssignment: "กำหนดบทบาท",
      permissionCatalogEdit: "แก้ permission catalog",
      supportAccessGrant: "ให้สิทธิ์ support access",
      adminServiceRequired: "ต้องมี admin access service",
      adminServiceAuditRequired: "ต้องมี admin access service + audit",
      forbiddenNoNewPermission: "ห้ามเพิ่มสิทธิ์ใหม่โดยไม่มี owner approval",
      supportGrantWorkflowRequired: "ต้องเป็น workflow จำกัดเวลาและมี audit",
      snapshotScope: "ขอบเขต snapshot",
      memberLimit: "จำกัด member",
      roleLimit: "จำกัด role",
      permissionLimit: "จำกัด permission",
      rolePermissionLimit: "จำกัด role-permission",
      invitationLimit: "จำกัด invitation",
      authUserData: "ข้อมูล auth user",
      notSelected: "ไม่เลือกอ่าน",
      oneHundredFiftyLatest: "ล่าสุด 150 รายการ",
      oneHundredLatest: "ล่าสุด 100 รายการ",
      threeHundredLatest: "ล่าสุด 300 รายการ",
      sixHundredLatest: "ล่าสุด 600 รายการ",
      seventyFiveLatest: "ล่าสุด 75 รายการ",
      noMembers: "ไม่พบสมาชิกองค์กร",
      noRoles: "ไม่พบบทบาท",
      noRolePermissions: "ไม่พบสิทธิ์ตามบทบาท",
      noPermissions: "ไม่พบ permission catalog",
      noInvitations: "ไม่พบคำเชิญ"
    },
    settings: {
      pageCode: "CORE-UI-013",
      pageTitle: "Settings",
      activeSubscriptions: "subscription ที่ใช้งาน",
      enabledFeatures: "feature ที่เปิดใช้",
      enabledEntitlements: "entitlement ที่เปิดใช้",
      usageCounters: "usage counter",
      organizationProfile: "ข้อมูลองค์กร",
      organizationName: "ชื่อองค์กร",
      organizationId: "รหัสองค์กร",
      slug: "slug",
      timezone: "timezone",
      currency: "สกุลเงิน",
      status: "สถานะ",
      created: "สร้างเมื่อ",
      updated: "อัปเดต",
      subscriptions: "subscription",
      planFeatures: "plan feature",
      entitlements: "entitlement",
      plan: "แพ็กเกจ",
      feature: "feature",
      source: "แหล่งที่มา",
      type: "ประเภท",
      enabled: "เปิดใช้",
      used: "ใช้แล้ว",
      limit: "limit",
      billingCycle: "รอบบิล",
      periodStart: "เริ่มรอบ",
      periodEnd: "จบรอบ",
      validFrom: "เริ่มใช้",
      validUntil: "หมดอายุ",
      cancelAtPeriodEnd: "ยกเลิกเมื่อจบรอบ",
      settingsAccess: "สิทธิ์ Settings",
      editPermission: "สิทธิ์แก้ไข",
      dataApiBoundary: "ขอบเขต Data API",
      rlsAndGrants: "RLS + explicit grants",
      serviceRole: "service role",
      neverSelected: "ไม่เลือกอ่านใน browser",
      readBoundary: "ขอบเขตการอ่าน",
      guardedActionReadiness: "Guarded action readiness",
      organizationProfileAction: "คำขอแก้ข้อมูลองค์กร",
      actionId: "Action ID",
      requiredPermission: "สิทธิ์ที่ต้องมี",
      permissionState: "สถานะ permission",
      persistence: "persistence",
      audit: "audit",
      skeletonReady: "skeleton ready",
      skeletonOnly: "skeleton only",
      readyWithPermission: "พร้อมตาม permission",
      permissionRequired: "ต้องมี permission",
      persistenceDisabled: "ยังปิด persistence จนกว่า write contract จะอนุมัติ",
      auditRequired: "ต้องมี audit ก่อนเปิด persistence",
      submitDisabled: "ปิดไว้จนกว่า persistence contract พร้อม",
      blockedInScreen: "สิ่งที่หน้านี้ยังไม่เปิด",
      organizationProfileEdit: "แก้ข้อมูลองค์กร",
      subscriptionPlanChange: "เปลี่ยนแพ็กเกจ",
      entitlementOverride: "override entitlement",
      usageReset: "reset usage",
      supportTenantAccess: "support tenant access",
      settingsServiceRequired: "ต้องมี settings service",
      ownerCommercialWorkflowRequired: "ต้องมี owner commercial workflow",
      adminServiceAuditRequired: "ต้องมี admin service + audit",
      supportWorkflowRequired: "ต้องเป็น support workflow จำกัดเวลา",
      snapshotScope: "ขอบเขต snapshot",
      organizationLimit: "จำกัดองค์กร",
      subscriptionLimit: "จำกัด subscription",
      planFeatureLimit: "จำกัด plan-feature",
      entitlementLimit: "จำกัด entitlement",
      usageLimit: "จำกัด usage",
      configJson: "config_json",
      notSelected: "ไม่เลือกอ่าน",
      oneActiveOrganization: "องค์กรที่ใช้งาน 1 รายการ",
      twentyFiveLatest: "ล่าสุด 25 รายการ",
      twoHundredLatest: "ล่าสุด 200 รายการ",
      noOrganizationRow: "ไม่พบข้อมูลองค์กร",
      noSubscriptions: "ไม่พบ subscription",
      noEntitlements: "ไม่พบ entitlement",
      noUsageCounters: "ไม่พบ usage counter",
      noPlanFeatures: "ไม่พบ plan feature"
    },
    productStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่านสินค้าใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน catalog ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดูสินค้า",
        detail: "หน้านี้ต้องใช้สิทธิ์ product.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูลสินค้าไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีสินค้า",
        detail: "ไม่พบข้อมูลสินค้าขององค์กรที่ใช้งานอยู่"
      }
    },
    inventoryStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่านสต๊อกใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่านสต๊อกใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดูสต๊อก",
        detail: "หน้านี้ต้องใช้สิทธิ์ inventory.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูลสต๊อกไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูลสต๊อก",
        detail: "ไม่พบข้อมูลคลัง, balance หรือ movement ขององค์กรที่ใช้งานอยู่"
      }
    },
    customerStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่านลูกค้าใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่านข้อมูลลูกค้าใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดูลูกค้า",
        detail: "หน้านี้ต้องใช้สิทธิ์ customer.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูลลูกค้าไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูลลูกค้า",
        detail: "ไม่พบข้อมูลลูกค้าขององค์กรที่ใช้งานอยู่"
      }
    },
    orderStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่านคำสั่งซื้อใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่านคำสั่งซื้อใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดูคำสั่งซื้อ",
        detail: "หน้านี้ต้องใช้สิทธิ์ order.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูลคำสั่งซื้อไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีคำสั่งซื้อ",
        detail: "ไม่พบข้อมูลคำสั่งซื้อขององค์กรที่ใช้งานอยู่"
      }
    },
    paymentStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่านการชำระเงินใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่านการชำระเงินใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดูการชำระเงิน",
        detail: "หน้านี้ต้องใช้สิทธิ์ payment.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูลการชำระเงินไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูลการชำระเงิน",
        detail: "ไม่พบข้อมูลการชำระเงินขององค์กรที่ใช้งานอยู่"
      }
    },
    fulfillmentStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่าน fulfillment ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน fulfillment ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดู fulfillment",
        detail: "หน้านี้ต้องใช้สิทธิ์ warehouse.pick ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูล fulfillment ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูล fulfillment",
        detail: "ไม่พบข้อมูล fulfillment ขององค์กรที่ใช้งานอยู่"
      }
    },
    qcStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่าน Warehouse QC ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน Warehouse QC ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดู Warehouse QC",
        detail: "หน้านี้ต้องใช้สิทธิ์ warehouse.qc ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูล Warehouse QC ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูล Warehouse QC",
        detail: "ไม่พบข้อมูล Warehouse QC ขององค์กรที่ใช้งานอยู่"
      }
    },
    shippingStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่าน Shipping ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน Shipping ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดู Shipping",
        detail: "หน้านี้ต้องใช้สิทธิ์ shipping.create ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูล Shipping ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูล Shipping",
        detail: "ไม่พบข้อมูล Shipping ขององค์กรที่ใช้งานอยู่"
      }
    },
    returnStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่าน Returns ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน Returns ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดู Returns",
        detail: "หน้านี้ต้องใช้สิทธิ์ return.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูล Returns ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูล Returns",
        detail: "ไม่พบข้อมูล Returns ขององค์กรที่ใช้งานอยู่"
      }
    },
    promotionStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่าน Promotions ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน Promotions ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดู Promotions",
        detail: "หน้านี้ต้องใช้สิทธิ์ promotion.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูล Promotions ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูล Promotions",
        detail: "ไม่พบข้อมูล Promotions ขององค์กรที่ใช้งานอยู่"
      }
    },
    userStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่าน Users/Roles ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน Users/Roles ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดูสมาชิก",
        detail: "หน้านี้ต้องใช้สิทธิ์ members.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูล Users/Roles ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูล Users/Roles",
        detail: "ไม่พบข้อมูลสมาชิกหรือบทบาทขององค์กรที่ใช้งานอยู่"
      }
    },
    settingStates: {
      missing_env: {
        title: "ยังไม่ได้ตั้งค่า Supabase environment",
        detail: "หน้าอ่าน Settings ใช้งานไม่ได้จนกว่าจะมี Supabase public env"
      },
      anonymous: {
        title: "ต้องเข้าสู่ระบบ",
        detail: "การอ่าน Settings ใช้ได้เฉพาะผู้ใช้หลังบ้านที่ authenticated แล้ว"
      },
      missing_membership: {
        title: "ไม่มีองค์กรที่ใช้งานอยู่",
        detail: "profile นี้ยังไม่มี active organization membership"
      },
      permission_denied: {
        title: "ต้องมีสิทธิ์ดู Settings",
        detail: "หน้านี้ต้องใช้สิทธิ์ organization.settings.view ขององค์กรที่ใช้งานอยู่"
      },
      query_error: {
        title: "อ่านข้อมูล Settings ไม่สำเร็จ",
        detail: "ฐานข้อมูลปฏิเสธการอ่าน หรือส่งผลลัพธ์ที่ไม่เป็นไปตามที่คาดไว้"
      },
      ready: {
        title: "ยังไม่มีข้อมูล Settings",
        detail: "ไม่พบข้อมูลองค์กร, subscription, entitlement หรือ usage ขององค์กรที่ใช้งานอยู่"
      }
    },
    navStatus: {
      READY_FOR_READ: "พร้อมอ่าน",
      READY_FOR_GUARDED_ACTION: "พร้อมต่อ guarded actions",
      PARTIAL_ACTION_READY: "พร้อมบาง action",
      NEEDS_SERVICE: "ต้องมี service",
      NEEDS_READ_MODEL: "ต้องมี read model",
      COMMERCIAL_WRITES_BLOCKED: "commercial writes ยังถูกล็อก"
    }
  }
} satisfies Record<
  AdminLocale,
  {
    common: Record<string, string>;
    shell: Record<string, string>;
    dashboardStates: Record<DashboardReadModelState, { title: string; detail: string }>;
    products: Record<string, string>;
    inventory: Record<string, string>;
    customers: Record<string, string>;
    orders: Record<string, string>;
    payments: Record<string, string>;
    fulfillment: Record<string, string>;
    qc: Record<string, string>;
    shipping: Record<string, string>;
    returns: Record<string, string>;
    promotions: Record<string, string>;
    users: Record<string, string>;
    settings: Record<string, string>;
    productStates: Record<ProductReadModelState, { title: string; detail: string }>;
    inventoryStates: Record<InventoryReadModelState, { title: string; detail: string }>;
    customerStates: Record<CustomerReadModelState, { title: string; detail: string }>;
    orderStates: Record<OrderReadModelState, { title: string; detail: string }>;
    paymentStates: Record<PaymentReadModelState, { title: string; detail: string }>;
    fulfillmentStates: Record<FulfillmentReadModelState, { title: string; detail: string }>;
    qcStates: Record<QcReadModelState, { title: string; detail: string }>;
    shippingStates: Record<ShippingReadModelState, { title: string; detail: string }>;
    returnStates: Record<ReturnsReadModelState, { title: string; detail: string }>;
    promotionStates: Record<PromotionsReadModelState, { title: string; detail: string }>;
    userStates: Record<UsersReadModelState, { title: string; detail: string }>;
    settingStates: Record<SettingsReadModelState, { title: string; detail: string }>;
    navStatus: Record<AdminNavStatus, string>;
  }
>;
