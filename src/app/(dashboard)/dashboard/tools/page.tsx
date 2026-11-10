"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { BorrowRequestModal } from "@/components/requests/BorrowRequestModal";
import { formatConvexError } from "@/lib/errors";
import { TOOL_CATEGORIES } from "@/types";

interface ToolItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  condition: "Like New" | "Good" | "Fair";
  status: string;
  isAvailable: boolean;
  imageUrl?: string | null;
  ownerId: string;
  ownerName: string;
  isOwnerTrusted: boolean;
  createdAt: number;
}

export default function BrowseToolsDashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedToolForBorrow, setSelectedToolForBorrow] = useState<ToolItem | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const convexUser = useQuery(api.users.getCurrentUser);
  const isAdmin = convexUser?.role === "admin";

  const tools = useQuery(
    api.tools.listCatalog,
    selectedCategory === "All" ? {} : { category: selectedCategory }
  );

  const categories = useQuery(api.tools.getAvailableCategories);
  const myTools = useQuery(api.tools.getMyTools);

  const setTrustedMutation = useMutation(api.users.setTrustedLender);
  const adminRemoveToolMutation = useMutation(api.tools.adminRemoveTool);

  const myToolIds = new Set(myTools?.map((t) => t._id));

  const filteredTools = (tools ?? []).filter((tool) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tool.title.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q) ||
      tool.ownerName.toLowerCase().includes(q)
    );
  });

  const handleRequestSuccess = () => {
    setFeedbackBanner({
      type: "success",
      text: "Your borrow request was submitted successfully! The owner will review it.",
    });
    setTimeout(() => {
      setFeedbackBanner(null);
    }, 6000);
  };

  const handleToggleTrustedLender = async (
    ownerId: string,
    ownerName: string,
    currentlyTrusted: boolean
  ) => {
    setProcessingId(ownerId);
    setFeedbackBanner(null);
    try {
      await setTrustedMutation({
        targetUserId: ownerId as Id<"users">,
        isTrustedLender: !currentlyTrusted,
      });
      setFeedbackBanner({
        type: "success",
        text: !currentlyTrusted
          ? `Marked "${ownerName}" as a Trusted Lender!`
          : `Revoked Trusted Lender badge from "${ownerName}".`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: "error",
        text: formatConvexError(err, "Failed to update Trusted Lender status."),
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdminRemoveListing = async (toolId: string, toolTitle: string) => {
    const reason = window.prompt(
      `Admin Moderation — Reason for removing "${toolTitle}":`,
      "Violates community lending guidelines"
    );
    if (reason === null) return;

    setProcessingId(toolId);
    setFeedbackBanner(null);
    try {
      await adminRemoveToolMutation({
        toolId: toolId as Id<"tools">,
        reason: reason.trim() || undefined,
      });
      setFeedbackBanner({
        type: "success",
        text: `Listing "${toolTitle}" was removed by administrator.`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: "error",
        text: formatConvexError(err, "Failed to remove listing."),
      });
    } finally {
      setProcessingId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="available">Available</Badge>;
      case "borrowed":
        return <Badge variant="borrowed">Borrowed</Badge>;
      case "maintenance":
        return <Badge variant="neutral">Maintenance</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Browse Community Tools
          </h1>
          <InfoTooltip text="Search and reserve equipment shared by neighbors. View availability status, filter by category, and identify Trusted Lenders." />
        </div>
        {isAdmin && (
          <Link href="/dashboard/admin">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            >
              🛡️ Open Full Admin Panel &rarr;
            </Button>
          </Link>
        )}
      </div>

      {feedbackBanner && (
        <div
          className={`rounded-xl border p-4 text-sm flex items-center justify-between ${
            feedbackBanner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs font-semibold underline ml-4 cursor-pointer"
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
          {filteredTools.map((tool) => {
            const isMyTool = myToolIds.has(tool._id);
            const isMaintenance = tool.status === "maintenance";

            return (
              <Card
                key={tool._id}
                className="flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow"
              >
                <div>
                  {tool.imageUrl && (
                    <div className="h-44 w-full overflow-hidden border-b border-stone-100 bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tool.imageUrl}
                        alt={tool.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {tool.category}
                      </span>
                      {renderStatusBadge(tool.status)}
                    </div>
                    <CardTitle className="text-lg text-stone-900">{tool.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {tool.description}
                    </CardDescription>

                    {/* Lender & Trusted Lender Badge */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
                      <span>
                        Lender: <strong className="text-stone-800">{tool.ownerName}</strong>
                      </span>
                      {tool.isOwnerTrusted && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          ✓ Trusted Lender
                        </span>
                      )}
                    </div>
                  </CardHeader>
                </div>

                <CardContent>
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 mb-4">
                    <span>
                      Condition: <strong>{tool.condition}</strong>
                    </span>
                    <span>Listed: {new Date(tool.createdAt).toLocaleDateString()}</span>
                  </div>

                  {isMyTool ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 py-2 px-3 text-xs font-medium text-stone-500">
                      <span>🔒</span>
                      <span>Your Equipment (Owner)</span>
                    </div>
                  ) : isMaintenance ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      Currently in Maintenance
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedToolForBorrow(tool)}
                    >
                      {tool.status === "borrowed"
                        ? "Reserve Future Dates"
                        : "Request to Borrow"}
                    </Button>
                  )}

                  {/* Inline Admin Controls */}
                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t border-amber-200/70 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={processingId === tool.ownerId}
                        onClick={() =>
                          handleToggleTrustedLender(
                            tool.ownerId,
                            tool.ownerName,
                            tool.isOwnerTrusted
                          )
                        }
                        className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          tool.isOwnerTrusted
                            ? "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        {tool.isOwnerTrusted ? "Revoke Trusted" : "★ Mark Trusted Lender"}
                      </button>
                      <button
                        type="button"
                        disabled={processingId === tool._id}
                        onClick={() => handleAdminRemoveListing(tool._id, tool.title)}
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
