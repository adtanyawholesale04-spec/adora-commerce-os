export default function StorefrontPaymentLoading() {
  return (
    <main className="min-h-screen bg-surface text-ink" aria-busy="true">
      <div className="h-16 border-b border-line bg-panel" />
      <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <div className="h-5 w-28 animate-pulse rounded-md bg-panel-strong" />
        <div className="mt-6 h-10 max-w-md animate-pulse rounded-md bg-panel-strong" />
        <div className="mt-10 grid gap-5 border-y border-line py-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md bg-panel-strong" />
          ))}
        </div>
        <div className="mt-10 h-64 animate-pulse rounded-md bg-panel" />
      </div>
      <span className="sr-only">กำลังโหลดข้อมูลการชำระเงิน / Loading payment details</span>
    </main>
  );
}
