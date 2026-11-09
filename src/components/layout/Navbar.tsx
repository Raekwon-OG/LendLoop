"use client";

import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-base font-black text-white shadow-xs">
            L
          </span>
          <div className="flex flex-col">
            <span className="text-lg leading-tight font-bold text-stone-900">LendLoop</span>
            <span className="hidden text-[10px] leading-none text-stone-500 sm:inline">
              Neighborhood Tool Sharing
            </span>
          </div>
        </Link>

        {/* Navigation / Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="#tools"
            className="hidden px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 sm:inline-block"
          >
            Available Tools
          </Link>
          <Link
            href="#how-it-works"
            className="hidden px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 sm:inline-block"
          >
            How It Works
          </Link>

          {!isLoaded ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-stone-100" />
          ) : isSignedIn ? (
            <>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
