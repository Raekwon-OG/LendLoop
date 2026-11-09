"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { BorrowRequestModal } from "@/components/requests/BorrowRequestModal";
import { TOOL_CATEGORIES } from "@/types";

interface ToolItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  condition: "Like New" | "Good" | "Fair";
  status: string;
  isAvailable: boolean;
  createdAt: number;
}

export default function BrowseToolsDashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedToolForBorrow, setSelectedToolForBorrow] = useState<ToolItem | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const tools = useQuery(
    api.tools.getAvailable,
    selectedCategory === "All" ? {} : { category: selectedCategory }
  );

  const categories = useQuery(api.tools.getAvailableCategories);

  const filteredTools = (tools ?? []).filter((tool) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tool.title.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q)
    );
  });

  const handleRequestSuccess = () => {
    setSuccessBanner("Your borrow request was submitted successfully! The owner will review it.");
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Browse Community Tools
        </h1>
        <InfoTooltip text="Search and reserve equipment shared by trusted neighbors in your community lending loop." />
      </div>

      {successBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <span>{successBanner}</span>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search equipment by name or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-xs text-stone-400 hover:text-stone-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              selectedCategory === "All"
                ? "bg-emerald-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            All Tools
          </button>
          {TOOL_CATEGORIES.map((cat) => {
            const count = categories?.find((c) => c.name === cat)?.count ?? 0;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-emerald-900 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {cat} {count > 0 && <span className="opacity-75">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool Grid */}
      {tools === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-20 bg-stone-200 rounded mb-2" />
                <div className="h-6 w-3/4 bg-stone-200 rounded mb-2" />
                <div className="h-4 w-full bg-stone-100 rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-stone-200 rounded mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-xl mb-3">
              🔍
            </div>
            <h3 className="text-base font-semibold text-stone-900">No tools found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery
                ? `No available tools matching "${searchQuery}". Try a different search term or category.`
                : "No tools are currently listed in this category."}
            </p>
            {(searchQuery || selectedCategory !== "All") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                Reset Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map((tool) => (
            <Card key={tool._id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {tool.category}
                  </span>
                  <Badge variant="available">Available</Badge>
                </div>
                <CardTitle className="text-lg text-stone-900">{tool.title}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 mb-4">
                  <span>Condition: <strong>{tool.condition}</strong></span>
                  <span>Listed: {new Date(tool.createdAt).toLocaleDateString()}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedToolForBorrow(tool)}
                >
                  Request to Borrow
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Borrow Request Modal */}
      <BorrowRequestModal
        isOpen={Boolean(selectedToolForBorrow)}
        onClose={() => setSelectedToolForBorrow(null)}
        tool={selectedToolForBorrow}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}
