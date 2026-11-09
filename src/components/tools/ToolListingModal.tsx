"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { TOOL_CATEGORIES, type ToolCategory, type ToolCondition, type ToolStatus } from "@/types";

interface ToolToEdit {
  _id: string;
  title: string;
  description: string;
  category: string;
  condition: ToolCondition;
  status: ToolStatus;
}

interface ToolListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolToEdit?: ToolToEdit | null;
  onSuccess?: () => void;
}

interface ToolFormProps {
  toolToEdit?: ToolToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function ToolForm({ toolToEdit, onClose, onSuccess }: ToolFormProps) {
  const isEditing = Boolean(toolToEdit);

  const [title, setTitle] = useState(toolToEdit ? toolToEdit.title : "");
  const [description, setDescription] = useState(toolToEdit ? toolToEdit.description : "");
  const [category, setCategory] = useState<ToolCategory>(
    toolToEdit && TOOL_CATEGORIES.includes(toolToEdit.category as ToolCategory)
      ? (toolToEdit.category as ToolCategory)
      : "Power Tools"
  );
  const [condition, setCondition] = useState<ToolCondition>(
    toolToEdit ? toolToEdit.condition : "Good"
  );
  const [status, setStatus] = useState<ToolStatus>(
    toolToEdit ? toolToEdit.status : "available"
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createToolMutation = useMutation(api.tools.create);
  const updateToolMutation = useMutation(api.tools.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      setError("Please enter a tool title.");
      return;
    }

    if (!trimmedDesc) {
      setError("Please provide a short description or usage notes.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && toolToEdit) {
        await updateToolMutation({
          toolId: toolToEdit._id,
          title: trimmedTitle,
          description: trimmedDesc,
          category,
          condition,
          status,
        });
      } else {
        await createToolMutation({
          title: trimmedTitle,
          description: trimmedDesc,
          category,
          condition,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error("[ToolListingModal] Mutation error:", err);
      setError(err instanceof Error ? err.message : "Failed to save tool listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-stone-900">
            {isEditing ? "Edit Equipment Listing" : "Share a Tool"}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {isEditing
              ? "Update your tool's details or availability status."
              : "Offer an unused tool to neighbors in your lending loop."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
        >
          <span className="sr-only">Close</span>
          ✕
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="tool-title"
            className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
          >
            Tool Name & Model *
          </label>
          <input
            id="tool-title"
            type="text"
            required
            placeholder="e.g. DeWalt 20V Cordless Drill, 6ft Aluminum Ladder"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        {/* Category & Condition Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label
              htmlFor="tool-category"
              className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
            >
              Category *
            </label>
            <select
              id="tool-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ToolCategory)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 bg-white focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            >
              {TOOL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label
              htmlFor="tool-condition"
              className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
            >
              Condition *
            </label>
            <select
              id="tool-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as ToolCondition)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 bg-white focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            >
              <option value="Like New">Like New (flawless)</option>
              <option value="Good">Good (minor cosmetic wear)</option>
              <option value="Fair">Fair (fully functional, worn)</option>
            </select>
          </div>
        </div>

        {/* Status (when editing) */}
        {isEditing && (
          <div>
            <label
              htmlFor="tool-status"
              className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
            >
              Listing Status
            </label>
            <select
              id="tool-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ToolStatus)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 bg-white focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            >
              <option value="available">Available (ready to lend)</option>
              <option value="maintenance">Maintenance (temporarily unavailable)</option>
              <option value="archived">Archived (hidden from public)</option>
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label
            htmlFor="tool-desc"
            className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
          >
            Description & Notes *
          </label>
          <textarea
            id="tool-desc"
            rows={3}
            required
            placeholder="Included accessories (batteries, charger, bits), safety recommendations, or pickup instructions."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {isEditing ? "Save Changes" : "List Equipment"}
          </Button>
        </div>
      </form>
    </>
  );
}

export function ToolListingModal({
  isOpen,
  onClose,
  toolToEdit = null,
  onSuccess,
}: ToolListingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200">
        <ToolForm
          key={toolToEdit?._id ?? "create-new-tool"}
          toolToEdit={toolToEdit}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}
