import React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { getUserRole } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getUserRole();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-sm font-black text-white">
                L
              </span>
              <span className="text-lg font-bold text-stone-900">LendLoop</span>
            </Link>
            <span className="hidden rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-600 sm:inline-block">
              Neighborhood Tool Lending
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-stone-600 transition-colors hover:text-stone-900"
            >
              Public Directory
            </Link>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            <div className="sticky top-24 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
              <h2 className="mb-2 px-3 text-xs font-semibold tracking-wider text-stone-600 uppercase">
                Navigation
              </h2>
              <DashboardNav role={role} />
            </div>
          </aside>

          {/* Page Body */}
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
