import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { UserSyncProvider } from "@/components/providers/UserSyncProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LendLoop — Borrow what you need. Lend what you don't.",
  description:
    "Neighborhood tool-lending application. Borrow tools from neighbors, lend tools you rarely use.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="flex min-h-full flex-col">
          <Suspense fallback={null}>
            <ConvexClientProvider>
              <UserSyncProvider>{children}</UserSyncProvider>
            </ConvexClientProvider>
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}
