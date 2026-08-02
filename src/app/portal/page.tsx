import {
  ArrowRight,
  CircleAlert,
  Coins,
  ChevronDown,
  Gift,
  Home,
  MapPin,
  Bell,
  LogIn,
  LogOut,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import {
  getCustomerPortalReadModel,
  type PortalNotification,
  type PortalOrder
} from "@/lib/portal/customer";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { AddressManager } from "@/app/portal/address-manager";
import { ConsentPreferenceManager } from "@/app/portal/consent-preference-manager";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { signOutFromCustomerPortalAction } from "@/app/portal/auth-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const copy = {
  th: {
    eyebrow: "ADORA CUSTOMER",
    title: "พื้นที่ของคุณ",
    subtitle: "ดูคำสั่งซื้อ สิทธิประโยชน์ และข้อมูลบัญชีของคุณในพื้นที่ส่วนตัว",
    account: "บัญชีของฉัน",
    orders: "คำสั่งซื้อล่าสุด",
    addresses: "ที่อยู่จัดส่ง",
    add: "เพิ่มที่อยู่",
    edit: "แก้ไข",
    archive: "เก็บถาวร",
    cancel: "ยกเลิก",
    save: "บันทึก",
    recipient: "ผู้รับ",
    phone: "โทรศัพท์",
    address: "ที่อยู่",
    district: "เขต/อำเภอ",
    province: "จังหวัด",
    postal: "รหัสไปรษณีย์",
    label: "ชื่อที่อยู่",
    defaultAddress: "ใช้เป็นที่อยู่หลัก",
    confirmArchive: "ต้องการเก็บที่อยู่นี้หรือไม่?",
    saved: "บันทึกแล้ว",
    loyalty: "คะแนนสะสม",
    coupons: "สิทธิประโยชน์",
    consents: "การสื่อสารที่อนุญาต",
    consentDescription: "เลือกการสื่อสารที่คุณต้องการรับ การเปลี่ยนแปลงนี้ไม่ส่งข้อความทันที",
    consentSaved: "บันทึกการตั้งค่าแล้ว",
    consentError: "ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองอีกครั้ง",
    notifications: "การแจ้งเตือน",
    notificationDescription: "ข่าวสารและสถานะล่าสุดสำหรับบัญชีของคุณ",
    emptyNotifications: "ยังไม่มีการแจ้งเตือน",
    notificationError: "ไม่สามารถโหลดการแจ้งเตือนได้ในขณะนี้",
    unread: "ยังไม่อ่าน",
    order: "คำสั่งซื้อ",
    orderDetails: "ดูรายละเอียด",
    paymentStatus: "สถานะการชำระเงิน",
    fulfillmentStatus: "สถานะการจัดส่ง",
    item: "สินค้า",
    quantity: "จำนวน",
    unitPrice: "ราคาต่อหน่วย",
    lineTotal: "รวมรายการ",
    paid: "ชำระแล้ว",
    due: "ค้างชำระ",
    emptyOrders: "ยังไม่มีคำสั่งซื้อที่แสดงได้",
    emptyAddresses: "ยังไม่มีที่อยู่จัดส่ง",
    empty: "ยังไม่มีที่อยู่จัดส่ง",
    emptyLoyalty: "ยังไม่มีบัญชีคะแนน",
    emptyCoupons: "ยังไม่มีสิทธิประโยชน์ที่ใช้งานอยู่",
    emptyConsents: "ยังไม่มีข้อมูลการสื่อสาร",
    readOnly: "ดูข้อมูลอย่างเดียว",
    protected: "ข้อมูลของคุณถูกจำกัดตามบัญชีและองค์กรที่ยืนยันแล้ว",
    signIn: "กรุณาเข้าสู่ระบบเพื่อดูข้อมูลส่วนตัว",
    notLinked: "บัญชีนี้ยังไม่ได้เชื่อมกับ customer profile",
    notLinkedDetail: "ระบบยังไม่แสดงข้อมูลร้านค้า จนกว่าจะมีการยืนยัน ownership link",
    noMembership: "ไม่พบองค์กรที่เข้าถึงได้",
    unavailable: "ไม่สามารถโหลดข้อมูลได้ในขณะนี้",
    tryAgain: "กรุณาลองใหม่อีกครั้ง",
    organization: "องค์กร",
    status: "สถานะ",
    points: "คะแนน",
    active: "ใช้งานอยู่",
    granted: "อนุญาต",
    revoked: "ยกเลิกแล้ว",
    private: "Private portal",
    home: "หน้าหลัก",
    signInCta: "เข้าสู่ระบบลูกค้า",
    signOut: "ออกจากระบบ",
    signedIn: "เข้าสู่ระบบแล้ว",
    callbackError: "ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่",
    overview: "ภาพรวม",
    accountShort: "บัญชี"
  },
  en: {
    eyebrow: "ADORA CUSTOMER",
    title: "Your space",
    subtitle: "A private view of your orders, benefits, and account information.",
    account: "My account",
    orders: "Recent orders",
    addresses: "Delivery addresses",
    add: "Add address",
    edit: "Edit",
    archive: "Archive",
    cancel: "Cancel",
    save: "Save",
    recipient: "Recipient",
    phone: "Phone",
    address: "Address",
    district: "District",
    province: "Province",
    postal: "Postal code",
    label: "Address label",
    defaultAddress: "Use as default address",
    confirmArchive: "Archive this address?",
    saved: "Saved",
    loyalty: "Loyalty points",
    coupons: "Benefits",
    consents: "Communication consent",
    consentDescription: "Choose which communications you want to receive. Changing a preference does not send a message.",
    consentSaved: "Preference saved",
    consentError: "We could not save this preference. Please try again.",
    notifications: "Notifications",
    notificationDescription: "Recent updates and account activity for you.",
    emptyNotifications: "No notifications yet",
    notificationError: "Notifications are unavailable right now.",
    unread: "Unread",
    order: "Order",
    orderDetails: "View details",
    paymentStatus: "Payment status",
    fulfillmentStatus: "Fulfillment status",
    item: "Item",
    quantity: "Quantity",
    unitPrice: "Unit price",
    lineTotal: "Line total",
    paid: "Paid",
    due: "Due",
    emptyOrders: "No orders to show yet",
    emptyAddresses: "No delivery addresses yet",
    empty: "No delivery addresses yet",
    emptyLoyalty: "No loyalty accounts yet",
    emptyCoupons: "No active benefits yet",
    emptyConsents: "No communication settings yet",
    readOnly: "Read-only view",
    protected: "Your data is scoped to your verified account and organization.",
    signIn: "Sign in to view your private account.",
    notLinked: "This account is not linked to a customer profile yet.",
    notLinkedDetail: "Store data stays hidden until an ownership link is verified.",
    noMembership: "No accessible organization found.",
    unavailable: "We could not load your portal right now.",
    tryAgain: "Please try again later.",
    organization: "Organization",
    status: "Status",
    points: "Points",
    active: "Active",
    granted: "Granted",
    revoked: "Revoked",
    private: "Private portal",
    home: "Portal home",
    signInCta: "Customer sign in",
    signOut: "Sign out",
    signedIn: "Signed in",
    callbackError: "The sign-in link is invalid or expired. Please request a new one.",
    overview: "Overview",
    accountShort: "Account"
  }
} as const;

type PortalPageProps = {
  searchParams: Promise<{ auth?: string }>;
};

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const [{ auth }, preferences] = await Promise.all([
    searchParams,
    getAdminPreferences()
  ]);
  const text = copy[preferences.locale];
  const model = await getCustomerPortalReadModel();
  const snapshot = model.snapshot;

  return (
    <main className="min-h-screen bg-surface pb-24 text-ink md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-8 lg:py-8">
        <div className="sticky top-0 z-30 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
          <Link className="text-sm font-semibold tracking-[0.08em] text-brand" href="/">
            <span className="font-extrabold text-accent">ADORA</span>{" "}
            <span className="font-normal text-ink">ACOS</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {model.context.userEmail ? (
              <form action={signOutFromCustomerPortalAction} className="flex items-center gap-2">
                <span className="hidden max-w-48 truncate text-xs text-muted sm:inline">
                  {text.signedIn}: {model.context.userEmail}
                </span>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-sm font-semibold hover:bg-panel-strong"
                  type="submit"
                >
                  <LogOut aria-hidden className="h-4 w-4" />
                  {text.signOut}
                </button>
              </form>
            ) : model.state === "anonymous" ? (
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white hover:brightness-95"
                href="/portal/login"
              >
                <LogIn aria-hidden className="h-4 w-4" />
                {text.signInCta}
              </Link>
            ) : null}
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/portal" />
          </div>
        </div>
        <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand">
              <Sparkles aria-hidden className="h-4 w-4" />
              {text.eyebrow}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{text.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{text.subtitle}</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3 shadow-[var(--shadow-panel)]">
            <ShieldCheck aria-hidden className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-semibold">{text.private}</p>
              <p className="text-xs text-muted">{text.readOnly}</p>
            </div>
          </div>
        </header>

        <nav
          aria-label={preferences.locale === "th" ? "เมนูพอร์ทัลลูกค้า" : "Customer portal navigation"}
          className="-mx-1 hidden gap-1 overflow-x-auto py-4 md:flex"
        >
          <a className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-brand hover:bg-brand/10" href="#portal-home">
            {text.home}
          </a>
          <a className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-panel-strong hover:text-ink" href="#portal-orders">
            {text.orders}
          </a>
          <a className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-panel-strong hover:text-ink" href="#portal-notifications">
            {text.notifications}
          </a>
          <a className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-muted hover:bg-panel-strong hover:text-ink" href="#portal-account">
            {text.account}
          </a>
        </nav>

        {model.state !== "ready" || !snapshot ? (
          <section id="portal-home">
            <PortalState
              state={model.state}
              text={text}
              detail={auth === "callback_error" ? text.callbackError : model.errorMessage}
            />
          </section>
        ) : (
          <div id="portal-home" className="grid scroll-mt-24 gap-5 py-6 lg:gap-6 lg:py-8">
            <section id="portal-account" className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-lg border border-line bg-panel p-6 shadow-[var(--shadow-panel)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
                      <UserRound aria-hidden className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">{text.account}</p>
                      <h2 className="mt-1 text-xl font-semibold">{snapshot.customer?.display_name ?? snapshot.customer?.customer_code}</h2>
                      <p className="mt-1 text-sm text-muted">{snapshot.customer?.email ?? snapshot.customer?.phone ?? snapshot.customer?.customer_code}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                    {text.active}
                  </span>
                </div>
                <div className="mt-6 grid gap-3 border-t border-line pt-5 text-sm sm:grid-cols-2">
                  <Info label={text.organization} value={model.context.organizationName ?? snapshot.organization_id} />
                  <Info label={text.status} value={snapshot.customer?.status ?? text.active} />
                </div>
              </div>
              <div className="rounded-lg border border-brand/25 bg-brand/10 p-6">
                <ShieldCheck aria-hidden className="h-5 w-5 text-brand" />
                <p className="mt-3 text-sm font-semibold">{text.protected}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{text.readOnly}</p>
              </div>
            </section>

            <section aria-label={text.overview} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <Stat icon={<Package aria-hidden />} label={text.orders} value={(snapshot.orders ?? []).length.toString()} />
              <Stat icon={<Coins aria-hidden />} label={text.loyalty} value={formatPoints(snapshot.loyalty?.reduce((sum, account) => sum + Number(account.points_balance), 0) ?? 0)} />
              <Stat icon={<Gift aria-hidden />} label={text.coupons} value={(snapshot.coupons ?? []).length.toString()} />
              <Stat icon={<MapPin aria-hidden />} label={text.addresses} value={(snapshot.addresses ?? []).length.toString()} />
            </section>

            <div id="portal-notifications" className="scroll-mt-24">
              <NotificationInbox
                notifications={model.notifications}
                hasError={model.notificationsError}
                text={text}
                locale={preferences.locale}
              />
            </div>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
              <div id="portal-orders" className="scroll-mt-24">
                <Panel title={text.orders} icon={<Package aria-hidden className="h-4 w-4 text-brand" />}>
                {(snapshot.orders ?? []).length === 0 ? <Empty text={text.emptyOrders} /> : <OrderList orders={snapshot.orders ?? []} text={text} locale={preferences.locale} />}
                </Panel>
              </div>
              <div className="grid content-start gap-6">
                <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
                  <AddressManager addresses={snapshot.addresses ?? []} copy={text} />
                </section>
                <Panel title={text.coupons} icon={<Gift aria-hidden className="h-4 w-4 text-accent" />}>
                  {(snapshot.coupons ?? []).length === 0 ? <Empty text={text.emptyCoupons} /> : (snapshot.coupons ?? []).map((coupon) => (
                    <div key={coupon.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0 last:pb-0">
                      <span className="font-mono text-sm font-semibold">{coupon.code}</span>
                      <span className="text-xs text-success">{text.active}</span>
                    </div>
                  ))}
                </Panel>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Panel title={text.loyalty} icon={<Coins aria-hidden className="h-4 w-4 text-brand" />}>
                {(snapshot.loyalty ?? []).length === 0 ? <Empty text={text.emptyLoyalty} /> : (snapshot.loyalty ?? []).map((account) => (
                  <div key={account.account_id} className="flex items-center justify-between border-b border-line py-3 last:border-0 last:pb-0">
                    <div><p className="text-sm font-semibold">{text.points}</p><p className="text-xs text-muted">{account.status}</p></div>
                    <p className="text-xl font-semibold text-brand">{formatPoints(Number(account.points_balance))}</p>
                  </div>
                ))}
              </Panel>
              <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
                <ConsentPreferenceManager consents={snapshot.consents ?? []} copy={text} />
              </section>
            </section>
          </div>
        )}
      </div>
      {model.state === "ready" ? <MobilePortalNavigation text={text} /> : null}
    </main>
  );
}

function NotificationInbox({
  notifications,
  hasError,
  text,
  locale
}: {
  notifications: PortalNotification[];
  hasError: boolean;
  text: (typeof copy)["th"] | (typeof copy)["en"];
  locale: "th" | "en";
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell aria-hidden className="h-4 w-4 text-brand" />
            <h2 className="text-base font-semibold">{text.notifications}</h2>
          </div>
          <p className="mt-1 text-xs text-muted">{text.notificationDescription}</p>
        </div>
        {notifications.some((notification) => notification.recipient_status === "UNREAD") ? (
          <span className="w-fit rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
            {notifications.filter((notification) => notification.recipient_status === "UNREAD").length} {text.unread}
          </span>
        ) : null}
      </div>
      {hasError ? (
        <p className="px-5 py-6 text-sm text-danger">{text.notificationError}</p>
      ) : notifications.length === 0 ? (
        <Empty text={text.emptyNotifications} />
      ) : (
        <div className="divide-y divide-line">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`grid gap-3 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start ${
                notification.recipient_status === "UNREAD" ? "bg-brand/5" : ""
              }`}
            >
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  notification.recipient_status === "UNREAD" ? "bg-brand" : "bg-panel-strong"
                }`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{notification.title}</h3>
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {formatNotificationLabel(notification.notification_type)}
                  </span>
                </div>
                {notification.body ? <p className="mt-1 text-sm leading-6 text-muted">{notification.body}</p> : null}
              </div>
              <time className="text-xs text-muted" dateTime={notification.created_at}>
                {new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(notification.created_at))}
              </time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatNotificationLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PortalState({ state, text, detail }: { state: string; text: (typeof copy)["th"] | (typeof copy)["en"]; detail: string | null }) {
  const title = state === "anonymous" ? text.signIn : state === "unlinked" ? text.notLinked : state === "missing_membership" ? text.noMembership : text.unavailable;
  const message = state === "unlinked" ? text.notLinkedDetail : detail ?? text.tryAgain;
  return <section className="mx-auto grid max-w-xl place-items-center py-24 text-center"><div className="grid h-14 w-14 place-items-center rounded-lg bg-warning/15 text-warning"><CircleAlert aria-hidden className="h-7 w-7" /></div><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{message}</p>{state === "anonymous" ? <Link className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:brightness-95" href="/portal/login">{text.signInCta}<ArrowRight aria-hidden className="h-4 w-4" /></Link> : <ArrowRight aria-hidden className="mt-6 h-5 w-5 text-brand" />}</section>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]"><div className="flex items-center gap-2 border-b border-line pb-4"><span>{icon}</span><h2 className="text-base font-semibold">{title}</h2></div><div className="pt-1">{children}</div></section>;
}

function OrderList({ orders, text, locale }: { orders: PortalOrder[]; text: (typeof copy)["th"] | (typeof copy)["en"]; locale: "th" | "en" }) {
  return <div className="divide-y divide-line">{orders.map((order) => <details key={order.id} className="group py-4"><summary className="grid cursor-pointer list-none gap-4 rounded-md outline-none sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center focus-visible:ring-2 focus-visible:ring-brand"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{order.order_number}</span><OrderStatusBadge status={order.order_status} /></div><p className="mt-2 text-xs text-muted">{formatDate(order.created_at, locale)} · {order.payment_status}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{order.items.map((item) => `${item.product_name} × ${item.quantity}`).join(", ")}</p></div><div className="flex items-end justify-between gap-4 sm:block sm:text-right"><p className="text-lg font-semibold">{formatMoney(Number(order.grand_total), order.currency_code, locale)}</p><div className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold text-brand"><span>{text.orderDetails}</span><ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" /></div><p className={`text-xs font-semibold ${Number(order.amount_due) > 0 ? "text-warning" : "text-success"}`}>{Number(order.amount_due) > 0 ? text.due : text.paid}</p></div></summary><div className="mt-4 rounded-md border border-line bg-surface p-4"><div className="grid gap-3 border-b border-line pb-4 text-xs sm:grid-cols-2"><Info label={text.paymentStatus} value={order.payment_status} /><Info label={text.fulfillmentStatus} value={order.fulfillment_status} /></div><div className="divide-y divide-line">{order.items.map((item) => <div key={item.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><p className="font-medium">{item.product_name}{item.variant_name ? ` · ${item.variant_name}` : ""}</p>{item.sku ? <p className="mt-1 font-mono text-xs text-muted">{item.sku}</p> : null}</div><span className="text-xs text-muted">{text.quantity}: {item.quantity}</span><span className="text-right font-semibold">{formatMoney(Number(item.line_total), order.currency_code, locale)}</span></div>)}</div></div></details>)}</div>;
}

function MobilePortalNavigation({ text }: { text: (typeof copy)["th"] | (typeof copy)["en"] }) {
  const items = [
    { href: "#portal-home", label: text.overview, icon: Home },
    { href: "#portal-orders", label: text.orders, icon: ReceiptText },
    { href: "#portal-notifications", label: text.notifications, icon: Bell },
    { href: "#portal-account", label: text.accountShort, icon: UserRound }
  ];

  return (
    <nav
      aria-label={text.overview}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-panel/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgb(2_44_74/0.08)] backdrop-blur md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => (
        <a key={href} className="grid min-h-14 place-items-center content-center gap-1 rounded-md px-1 text-center text-[11px] font-semibold text-muted hover:bg-panel-strong hover:text-brand" href={href}>
          <Icon aria-hidden className="h-5 w-5" />
          <span className="max-w-full truncate">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone = normalized === "COMPLETED" || normalized === "DELIVERED"
    ? "border-success/30 bg-success/10 text-success"
    : normalized === "CANCELLED" || normalized === "FAILED"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-warning/30 bg-warning/10 text-warning";
  return <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${tone}`}>{status}</span>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="grid min-h-28 content-between gap-3 rounded-lg border border-line bg-panel p-4 shadow-[var(--shadow-panel)] lg:flex lg:min-h-0 lg:items-center lg:gap-4 lg:p-5"><span className="[&>svg]:h-5 [&>svg]:w-5 text-brand">{icon}</span><div className="min-w-0"><p className="truncate text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="py-5 text-sm text-muted">{text}</p>; }
function formatPoints(value: number) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value); }
function formatDate(value: string, locale: "th" | "en") { return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium" }).format(new Date(value)); }
function formatMoney(value: number, currency: string, locale: "th" | "en") { return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { style: "currency", currency: currency === "THB" ? "THB" : "USD", maximumFractionDigits: 2 }).format(value); }
