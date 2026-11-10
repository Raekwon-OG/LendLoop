import React, { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8">
      {/* Top Left Navigation Header */}
      <div className="fixed top-6 left-6 z-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-stone-600 shadow-xs backdrop-blur-xs transition-all hover:border-emerald-800/40 hover:bg-emerald-50/70 hover:text-emerald-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 text-stone-400 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:text-emerald-800"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          Back to home
        </Link>
      </div>

      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-bold text-stone-900">
          <Logo size={36} />
          LendLoop
        </Link>
        <p className="mt-2 text-sm text-stone-600">
          Borrow what you need. Lend what you don&apos;t.
        </p>
      </div>
      <div className="flex w-full max-w-md justify-center">
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center text-sm text-stone-400">
              Loading authentication...
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
}
