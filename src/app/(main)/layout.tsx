import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import ThemeManager from "@/components/ThemeManager";
import StoreProvider from "@/lib/storeProvider";
import RestartButton from "@/components/RestartButton";
import { Space_Mono } from "next/font/google";
import MutableDataProvider from "@/context/mutableDataProvider";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-spacemono",
});

export const metadata: Metadata = {
  title: "keyblitz",
  description: "type like a rabbit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} font-sans`}>
        <StoreProvider>
          <MutableDataProvider>
            <ThemeManager>
              <div className="px-4 xs:w-[450px] sm:w-[600px] md:w-[740px] lg:w-[980px] xl:w-[1200px] mx-auto h-svh">
                <Header />
                <div className="mt-8">{children}</div>
                <RestartButton />
              </div>
            </ThemeManager>
          </MutableDataProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
