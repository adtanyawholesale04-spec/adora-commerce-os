import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { getAdminPreferences } from "@/lib/admin/preferences";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  display: "swap",
  variable: "--font-noto-sans-thai"
});

export const metadata: Metadata = {
  title: "ADORA Commerce OS",
  description: "Conversational commerce operating system for Thai social commerce."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preferences = await getAdminPreferences();

  return (
    <html lang={preferences.locale} data-theme={preferences.theme}>
      <body className={notoSansThai.variable}>{children}</body>
    </html>
  );
}
