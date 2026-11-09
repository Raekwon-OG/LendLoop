import React from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ToolSummary } from "@/types";

interface PublicToolsDirectoryProps {
  tools?: ToolSummary[];
  isLoading?: boolean;
}

export function PublicToolsDirectory({ tools = [], isLoading = false }: PublicToolsDirectoryProps) {
  return (
    <section id="tools" className="border-t border-stone-200 bg-stone-100/60 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              Community Catalog
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Available Tools
            </h2>
            <p className="mt-1 max-w-xl text-sm text-stone-600">
              Browse equipment shared by neighbors in your area. Sign in to request a reservation or
              list a tool of your own.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-500">
              {tools.length} {tools.length === 1 ? "tool" : "tools"} listed
            </span>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((placeholder) => (
              <div
                key={placeholder}
                className="animate-pulse rounded-xl border border-stone-200 bg-white p-6"
              >
                <div className="mb-3 h-4 w-1/3 rounded bg-stone-200" />
                <div className="mb-4 h-6 w-3/4 rounded bg-stone-200" />
                <div className="h-4 w-1/2 rounded bg-stone-200" />
              </div>
            ))}
          </div>
        ) : tools.length === 0 ? (
          /* Empty State */
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center sm:p-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-stone-900">
              No tools currently listed in this area
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
              Be the first neighbor to offer a spare drill, ladder, lawn mower, or pressure washer
              and kickstart your neighborhood lending circle.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="primary">Sign In to Lend or Borrow</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard/listings">
                  <Button variant="primary">List the First Tool</Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        ) : (
          /* Tool Cards Grid (wired for Phase 3 Convex consumption) */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <div
                key={tool._id}
                className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-6 shadow-xs transition-colors hover:border-emerald-600"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium tracking-wide text-stone-500 uppercase">
                      {tool.category}
                    </span>
                    <Badge variant={tool.isAvailable ? "available" : "borrowed"}>
                      {tool.isAvailable ? "Available" : "Checked Out"}
                    </Badge>
                  </div>
                  <h4 className="text-lg font-semibold text-stone-900">{tool.title}</h4>
                  {tool.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-stone-600">{tool.description}</p>
                  )}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                  <span className="text-xs text-stone-500">Condition: {tool.condition}</span>
                  <Link href={`/sign-in`}>
                    <Button variant="outline" size="sm">
                      Borrow
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
