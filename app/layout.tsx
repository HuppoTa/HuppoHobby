import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUPPO HOBBY | Hot Wheels & Matchbox",
  description: "Khám phá xe mô hình Hot Wheels và Matchbox tại HUPPO HOBBY. Chọn xe, gom giỏ và chốt đơn qua Zalo.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
