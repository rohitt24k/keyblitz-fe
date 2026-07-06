import type { Metadata } from "next";
import "./globals.css";
import { Space_Mono } from "next/font/google";
import MutableDataProvider from "@/context/mutableDataProvider";
import StoreProvider from "@/lib/store-provider";
import ThemeManager from "@/components/ThemeManager";
import Script from "next/script";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-spacemono",
});

export const metadata: Metadata = {
  title: "keyblitz",
  description: "type like a rabbit",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`antialiased ${spaceMono.variable} font-sans dark`}>
        <StoreProvider>
          <MutableDataProvider>
            <ThemeManager>{children}</ThemeManager>
          </MutableDataProvider>
        </StoreProvider>
      </body>
      <>
        <Script src="https://tweakcn.com/live-preview.min.js" async></Script>
      </>
    </html>
  );
}
