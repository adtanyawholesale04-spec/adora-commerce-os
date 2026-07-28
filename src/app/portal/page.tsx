import {
  ArrowRight,
  CircleAlert,
  Coins,
  CreditCard,
  Gift,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { getCustomerPortalReadModel, type PortalOrder } from "@/lib/portal/customer";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { AddressManager } from "@/app/portal/address-manager";

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
    order: "คำสั่งซื้อ",
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
    private: "Private portal"
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
    order: "Order",
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
    private: "Private portal"
  }
} as const;

export default async function PortalPage() {
  const preferences = await getAdminPreferences();
  const text = copy[preferences.locale];
  const model = await getCustomerPortalReadModel();
  const snapshot = model.snapshot;

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
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

        {model.state !== "ready" || !snapshot ? (
          <PortalState state={model.state} text={text} detail={model.errorMessage} />
        ) : (
          <div className="grid gap-6 py-8">
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat icon={<Package aria-hidden />} label={text.orders} value={(snapshot.orders ?? []).length.toString()} />
              <Stat icon={<Coins aria-hidden />} label={text.loyalty} value={formatPoints(snapshot.loyalty?.reduce((sum, account) => sum + Number(account.points_balance), 0) ?? 0)} />
              <Stat icon={<Gift aria-hidden />} label={text.coupons} value={(snapshot.coupons ?? []).length.toString()} />
              <Stat icon={<MapPin aria-hidden />} label={text.addresses} value={(snapshot.addresses ?? []).length.toString()} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
              <Panel title={text.orders} icon={<Package aria-hidden className="h-4 w-4 text-brand" />}>
                {(snapshot.orders ?? []).length === 0 ? <Empty text={text.emptyOrders} /> : <OrderList orders={snapshot.orders ?? []} text={text} />}
              </Panel>
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
              <Panel title={text.consents} icon={<CreditCard aria-hidden className="h-4 w-4 text-brand" />}>
                {(snapshot.consents ?? []).length === 0 ? <Empty text={text.emptyConsents} /> : (snapshot.consents ?? []).map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0 last:pb-0">
                    <div><p className="text-sm font-semibold">{consent.channel}</p><p className="text-xs text-muted">{consent.purpose}</p></div>
                    <span className={consent.status === "GRANTED" ? "text-xs font-semibold text-success" : "text-xs text-muted"}>{consent.status === "GRANTED" ? text.granted : text.revoked}</span>
                  </div>
                ))}
              </Panel>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function PortalState({ state, text, detail }: { state: string; text: (typeof copy)["th"] | (typeof copy)["en"]; detail: string | null }) {
  const title = state === "anonymous" ? text.signIn : state === "unlinked" ? text.notLinked : state === "missing_membership" ? text.noMembership : text.unavailable;
  const message = state === "unlinked" ? text.notLinkedDetail : detail ?? text.tryAgain;
  return <section className="mx-auto grid max-w-xl place-items-center py-24 text-center"><div className="grid h-14 w-14 place-items-center rounded-lg bg-warning/15 text-warning"><CircleAlert aria-hidden className="h-7 w-7" /></div><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{message}</p><ArrowRight aria-hidden className="mt-6 h-5 w-5 text-brand" /></section>;
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]"><div className="flex items-center gap-2 border-b border-line pb-4"><span>{icon}</span><h2 className="text-base font-semibold">{title}</h2></div><div className="pt-1">{children}</div></section>;
}

function OrderList({ orders, text }: { orders: PortalOrder[]; text: (typeof copy)["th"] | (typeof copy)["en"] }) {
  return <div className="divide-y divide-line">{orders.map((order) => <div key={order.id} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{order.order_number}</span><span className="rounded-full bg-panel-strong px-2 py-1 text-[11px] font-semibold text-muted">{order.order_status}</span></div><p className="mt-2 text-xs text-muted">{new Date(order.created_at).toLocaleDateString()} · {order.payment_status}</p><p className="mt-2 text-xs text-muted">{order.items.map((item) => `${item.product_name} × ${item.quantity}`).join(", ")}</p></div><div className="text-left sm:text-right"><p className="text-lg font-semibold">{formatMoney(Number(order.grand_total), order.currency_code)}</p><p className="text-xs text-muted">{Number(order.amount_due) > 0 ? text.due : text.paid}</p></div></div>)}</div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-4 rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]"><span className="text-brand">{icon}</span><div><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="py-5 text-sm text-muted">{text}</p>; }
function formatPoints(value: number) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value); }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat("th-TH", { style: "currency", currency: currency === "THB" ? "THB" : "USD", maximumFractionDigits: 2 }).format(value); }
