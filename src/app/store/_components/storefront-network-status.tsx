"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function StorefrontNetworkStatus({ message }: { message: string }) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning-surface px-4 py-2 text-center text-sm font-semibold text-sidebar"
    >
      <WifiOff aria-hidden className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
