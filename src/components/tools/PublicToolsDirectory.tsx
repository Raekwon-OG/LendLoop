"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TOOL_CATEGORIES } from "@/types";

interface PublicToolsDirectoryProps {
  initialCategory?: string;
}

export function PublicToolsDirectory({ initialCategory = "All" }: PublicToolsDirectoryProps) {
  const { isSignedIn } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  // Live Convex query
  const queryCategory = selectedCategory === "All" ? undefined : selectedCategory;
  const tools = useQuery(api.tools.getAvailable, { category: queryCategory });

  const categories = ["All", ...TOOL_CATEGORIES];

  const isLoading = tools === undefined;

  return (
    <section id="tools" className="border-t border-stone-200 bg-stone-100/60 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              Community Catalog
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              Available Tools
            </h2>
            <p className="mt-1 max-w-xl text-sm text-stone-600">
              Browse equipment currently available in your neighborhood. Sign in to reserve an item
              or share your own gear.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-500">
              {isLoading
                ? "Checking inventory..."
                : `${tools.length} ${tools.length === 1 ? "tool" : "tools"} available`}
            </span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        {isLoading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((placeholder) => (
              <div
                key={placeholder}
                className="animate-pulse rounded-xl border border-stone-200 bg-white p-6 shadow-xs"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-4 w-20 rounded bg-stone-200" />
                  <div className="h-4 w-16 rounded bg-stone-200" />
                </div>
                <div className="mb-2 h-6 w-3/4 rounded bg-stone-200" />
                <div className="mb-4 h-4 w-1/2 rounded bg-stone-100" />
                <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                  <div className="h-3 w-20 rounded bg-stone-200" />
                  <div className="h-8 w-16 rounded bg-stone-200" />
                </div>
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
            {selectedCategory === "All" ? (
              <>
                <h3 className="text-lg font-semibold text-stone-900">
                  No tools currently listed in this area
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                  Be the first neighbor to list a drill, ladder, lawn mower, or pressure washer and
                  start the sharing cooperative in your community.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  {isSignedIn ? (
                    <Link href="/dashboard/listings">
                      <Button variant="primary">List the First Tool</Button>
                    </Link>
                  ) : (
                    <Link href="/sign-in">
                      <Button variant="primary">Sign In to Lend or Borrow</Button>
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-stone-900">
                  No equipment listed under &quot;{selectedCategory}&quot;
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
                  Try viewing all categories or be the first to list equipment in this category.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedCategory("All")}>
                    View All Categories
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Live Tool Cards Grid */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <div
                key={tool._id}
                className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-6 shadow-xs transition-colors hover:border-emerald-600"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
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
                  {isSignedIn ? (
                    <Link href={`/dashboard/tools`}>
                      <Button variant="outline" size="sm">
                        Borrow
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/sign-in">
                      <Button variant="outline" size="sm">
                        Sign In to Borrow
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
