"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { ToolListingModal } from "@/components/tools/ToolListingModal";
import { formatConvexError } from "@/lib/errors";
import type { ToolCondition, ToolStatus } from "@/types";

export default function MyListingsPage() {
  const myTools = useQuery(api.tools.getMyTools);
  const removeToolMutation = useMutation(api.tools.remove);
  const updateToolMutation = useMutation(api.tools.update);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All");
  const [toolToEdit, setToolToEdit] = useState<{
    _id: string;
    title: string;
    description: string;
    category: string;
    condition: ToolCondition;
    status: ToolStatus;
  } | null>(null);

  const isLoading = myTools === undefined;

  const handleOpenCreate = () => {
    setToolToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tool: {
    _id: string;
    title: string;
    description: string;
    category: string;
    condition: ToolCondition;
    status: ToolStatus;
  }) => {
    setToolToEdit(tool);
    setIsModalOpen(true);
  };

  const handleDelete = async (toolId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from your listings?`)) {
      return;
    }

    try {
      await removeToolMutation({ toolId: toolId as Id<"tools"> });
    } catch (err: unknown) {
      console.error("[MyListingsPage] Delete error:", err);
      alert(formatConvexError(err, "Failed to remove listing. Please try again."));
    }
  };

  const handleToggleMaintenance = async (toolId: string, currentStatus: ToolStatus) => {
    const nextStatus = currentStatus === "available" ? "maintenance" : "available";
    try {
      await updateToolMutation({
        toolId: toolId as Id<"tools">,
        status: nextStatus,
      });
    } catch (err: unknown) {
      console.error("[MyListingsPage] Status update error:", err);
      alert(formatConvexError(err, "Failed to update equipment status. Please try again."));
    }
  };

  const filteredTools = myTools
    ? myTools.filter((t) => (selectedStatusFilter === "All" ? true : t.status === selectedStatusFilter))
    : [];

  const statusFilters = [
    { label: "All", value: "All" },
    { label: "Available", value: "available" },
    { label: "Borrowed", value: "borrowed" },
    { label: "Maintenance", value: "maintenance" },
    { label: "Archived", value: "archived" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            My Equipment Listings
          </h1>
          <InfoTooltip text="Manage the tools and hardware you are sharing with your neighborhood. Create listings, edit details, or toggle maintenance mode." />
          {!isLoading && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
              {myTools.length} {myTools.length === 1 ? "tool" : "tools"}
            </span>
          )}
        </div>
        <div>
          <Button size="sm" onClick={handleOpenCreate}>
            + List a Tool
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      {!isLoading && myTools.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedStatusFilter(tab.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                selectedStatusFilter === tab.value
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-stone-200 rounded w-1/3 mb-2" />
                <div className="h-6 bg-stone-200 rounded w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-stone-100 rounded w-full mb-4" />
                <div className="h-8 bg-stone-100 rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : myTools.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Equipment Listed Yet</CardTitle>
            <CardDescription>
              You haven&apos;t shared any tools with your neighborhood cooperative yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center bg-stone-50/50">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                🛠️
              </div>
              <h3 className="text-base font-semibold text-stone-900">
                Put your unused tools to work
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-6">
                Most power tools are used for less than 15 minutes in their entire lifetime. Share
                your gear and help neighbors finish their DIY projects.
              </p>
              <Button size="sm" onClick={handleOpenCreate}>
                List Your First Tool
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredTools.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-stone-500">
              No listings currently match the &quot;{selectedStatusFilter}&quot; status filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setSelectedStatusFilter("All")}
            >
              Reset Filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTools.map((tool) => (
            <Card key={tool._id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {tool.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={
                        tool.status === "available"
                          ? "available"
                          : tool.status === "borrowed"
                            ? "borrowed"
                            : "neutral"
                      }
                    >
                      {tool.status.charAt(0).toUpperCase() + tool.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 mb-4">
                  <span>Condition: <strong>{tool.condition}</strong></span>
                  <span>Listed: {new Date(tool.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {tool.status !== "borrowed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleMaintenance(tool._id, tool.status)}
                    >
                      {tool.status === "available" ? "Mark Maintenance" : "Mark Available"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenEdit({
                        _id: tool._id,
                        title: tool.title,
                        description: tool.description,
                        category: tool.category,
                        condition: tool.condition,
                        status: tool.status,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(tool._id, tool.title)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <ToolListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        toolToEdit={toolToEdit}
      />
    </div>
  );
}
