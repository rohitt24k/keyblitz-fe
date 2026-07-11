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
      <body className={`antialiased ${spaceMono.variable} dark font-sans`}>
        <StoreProvider>
          <MutableDataProvider>
            <ThemeManager>
              <div className="xs:w-112.5 max-xs:px-4 mx-auto flex h-svh flex-col sm:w-150 md:w-185 lg:w-245 xl:w-300">
                {/* <Header /> */}
                <div className="mt-8 flex flex-1 flex-col justify-center pb-[15vh]">
                  {children}
                </div>
              </div>
            </ThemeManager>
          </MutableDataProvider>
        </StoreProvider>
      </body>
      <>
        <Script src="https://tweakcn.com/live-preview.min.js" async></Script>
      </>
    </html>
  );
}
