import React, { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12 sm:px-6 lg:px-8">
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
