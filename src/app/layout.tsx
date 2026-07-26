import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADORA Commerce OS",
  description: "Conversational commerce operating system for Thai social commerce."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
