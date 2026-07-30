export default function StorefrontLoading() {
  return (
    <main className="min-h-screen bg-surface text-ink" aria-busy="true">
      <div className="h-16 border-b border-line bg-panel" />
      <div className="min-h-[500px] animate-pulse bg-sidebar" />
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:px-8">
        <div className="h-16 animate-pulse rounded-md bg-panel-strong" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="aspect-[4/3] animate-pulse rounded-lg border border-line bg-panel"
            />
          ))}
        </div>
      </div>
      <span className="sr-only">กำลังโหลดหน้าร้าน / Loading Storefront</span>
    </main>
  );
}
