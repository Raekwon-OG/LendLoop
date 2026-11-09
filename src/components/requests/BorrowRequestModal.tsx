"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface BorrowRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  tool: {
    _id: string;
    title: string;
    category: string;
    condition: string;
  } | null;
  onSuccess?: () => void;
}

function formatDateToInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface RequestFormContentProps {
  tool: {
    _id: string;
    title: string;
    category: string;
    condition: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

function RequestFormContent({ tool, onClose, onSuccess }: RequestFormContentProps) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const defaultEnd = new Date(tomorrow);
  defaultEnd.setDate(defaultEnd.getDate() + 3);

  const [startDateStr, setStartDateStr] = useState(formatDateToInput(tomorrow));
  const [endDateStr, setEndDateStr] = useState(formatDateToInput(defaultEnd));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRequestMutation = useMutation(api.borrowRequests.create);

  const todayStr = formatDateToInput(today);

  // Calculate estimated reservation duration
  const startMs = new Date(startDateStr).getTime();
  const endMs = new Date(endDateStr).getTime();
  const durationDays = !isNaN(startMs) && !isNaN(endMs) && endMs >= startMs
    ? Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDateStr || !endDateStr) {
      setError("Please specify both start and end reservation dates.");
      return;
    }

    const startTimestamp = new Date(startDateStr).setHours(9, 0, 0, 0);
    const endTimestamp = new Date(endDateStr).setHours(18, 0, 0, 0);

    if (startTimestamp > endTimestamp) {
      setError("Reservation end date must be on or after the start date.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createRequestMutation({
        toolId: tool._id,
        startDate: startTimestamp,
        endDate: endTimestamp,
        note: note.trim() || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      console.error("[BorrowRequestModal] Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit borrow request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Reservation Request
          </span>
          <h3 className="text-xl font-bold tracking-tight text-stone-900 mt-0.5">
            Borrow {tool.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="neutral">{tool.category}</Badge>
            <span className="text-xs text-stone-500">Condition: <strong>{tool.condition}</strong></span>
          </div>
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
        {/* Date Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="start-date"
              className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
            >
              Start Date *
            </label>
            <input
              id="start-date"
              type="date"
              required
              min={todayStr}
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 bg-white focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
            >
              Estimated Return *
            </label>
            <input
              id="end-date"
              type="date"
              required
              min={startDateStr || todayStr}
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 bg-white focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer"
            />
          </div>
        </div>

        {durationDays > 0 && (
          <p className="text-xs text-stone-500">
            Duration: <strong className="text-stone-800">{durationDays} {durationDays === 1 ? "day" : "days"}</strong> (includes pickup and return days)
          </p>
        )}

        {/* Note */}
        <div>
          <label
            htmlFor="borrow-note"
            className="block text-xs font-semibold text-stone-800 uppercase tracking-wider mb-1"
          >
            Message to Lender (Optional)
          </label>
          <textarea
            id="borrow-note"
            rows={3}
            placeholder="Introduce your project or propose a pickup time (e.g. 'Working on building raised garden beds this weekend, free to pick up Saturday morning')."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        {/* Actions */}
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
            Send Borrow Request
          </Button>
        </div>
      </form>
    </>
  );
}

export function BorrowRequestModal({
  isOpen,
  onClose,
  tool,
  onSuccess,
}: BorrowRequestModalProps) {
  if (!isOpen || !tool) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-stone-200">
        <RequestFormContent
          key={tool._id}
          tool={tool}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
}

