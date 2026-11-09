import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-stone-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-lg font-black text-white">
            L
          </span>
          LendLoop
        </Link>
        <p className="mt-2 text-sm text-stone-600">
          Borrow what you need. Lend what you don&apos;t.
        </p>
      </div>
      <div className="flex w-full max-w-md justify-center">{children}</div>
    </div>
  );
}
