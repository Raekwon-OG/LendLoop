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
import { formatTimeAgo } from "@/lib/date";

type RequestStatusFilter = "All" | "pending" | "approved" | "declined" | "cancelled";

export default function MyRequestsPage() {
  const requests = useQuery(api.borrowRequests.getMyRequests);
  const activeLoans = useQuery(api.loans.getMyActiveLoans);
  const cancelMutation = useMutation(api.borrowRequests.cancel);

  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>("All");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this borrow request?")) {
      return;
    }

    setCancellingId(requestId);
    try {
      await cancelMutation({ requestId: requestId as Id<"borrowRequests"> });
    } catch (err) {
      console.error("Failed to cancel request:", err);
      alert("Failed to cancel request. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRequests = (requests ?? []).filter((req) => {
    if (statusFilter === "All") return true;
    return req.status === statusFilter;
  });

  // Filter loans where caller is the borrower
  const myBorrowedItems = (activeLoans ?? []).filter((l) => !l.isCallerLender);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            My Borrowing Requests
          </h1>
          <InfoTooltip text="Track tools you have reserved, pending approvals, and active loans currently in your possession." />
        </div>
        <div>
          <Link href="/dashboard/tools">
            <Button size="sm">Browse More Tools</Button>
          </Link>
        </div>
      </div>

      {/* Active Borrowed Items (In Possession) */}
      {myBorrowedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900">Items Currently in Your Possession</h2>
            <Badge variant="borrowed">{myBorrowedItems.length} Active</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBorrowedItems.map((loan) => {
              const isOverdue = loan.computedStatus === "overdue" || loan.status === "overdue";
              return (
                <Card
                  key={loan._id}
                  className={isOverdue ? "border-amber-300 bg-amber-50/20" : "border-stone-200"}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {loan.toolCategory}
                      </span>
                      <Badge variant={isOverdue ? "danger" : "available"}>
                        {isOverdue ? "Overdue" : "In Your Care"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{loan.toolTitle}</CardTitle>
                    <CardDescription>
                      Lent by <strong className="text-stone-800">{loan.lenderName}</strong>
                      {loan.lenderEmail ? ` (${loan.lenderEmail})` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 flex items-center justify-between">
                      <span>Borrowed: {new Date(loan.startDate).toLocaleDateString()}</span>
                      <span className={isOverdue ? "font-bold text-red-700" : ""}>
                        Due Return: {new Date(loan.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    {loan.lastReminderSentAt ? (
                      <div className="mt-3 flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 border border-amber-200">
                        <span>🔔</span>
                        <span>
                          Automated reminder sent {formatTimeAgo(loan.lastReminderSentAt)} ({loan.reminderCount ?? 1} total)
                        </span>
                      </div>
                    ) : null}
                    <p className="text-xs text-stone-500 mt-3 italic">
                      When finished, return the equipment to {loan.lenderName}. They will mark the
                      loan as returned on their dashboard.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-stone-900">Reservation Requests</h2>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {(["All", "pending", "approved", "declined", "cancelled"] as RequestStatusFilter[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                    statusFilter === status
                      ? "bg-emerald-900 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </div>

        {/* Loading Skeleton */}
        {requests === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-5 w-48 bg-stone-200 rounded mb-2" />
                  <div className="h-4 w-72 bg-stone-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mb-3">
                📋
              </div>
              <h3 className="text-base font-semibold text-stone-900">
                You haven&apos;t requested any tools yet
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-6">
                Browse equipment shared by your neighbors and reserve what you need for your next
                DIY project.
              </p>
              <Link href="/dashboard/tools">
                <Button size="sm">Browse Community Tools</Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-stone-500">
                No borrow requests currently have the &quot;{statusFilter}&quot; status.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setStatusFilter("All")}
              >
                Reset Filter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const startFormatted = new Date(req.startDate).toLocaleDateString();
              const endFormatted = new Date(req.endDate).toLocaleDateString();

              return (
                <Card key={req._id}>
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          {req.toolCategory}
                        </span>
                        <Badge
                          variant={
                            req.status === "approved"
                              ? "available"
                              : req.status === "pending"
                                ? "accent"
                                : req.status === "declined"
                                  ? "danger"
                                  : "neutral"
                          }
                        >
                          {req.status === "pending"
                            ? "Pending Approval"
                            : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-stone-900">{req.toolTitle}</h3>

                      <p className="text-xs text-stone-600">
                        Owner: <strong>{req.ownerName}</strong>
                        {req.ownerEmail ? ` (${req.ownerEmail})` : ""}
                      </p>

                      <div className="text-xs text-stone-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span>
                          Dates: <strong>{startFormatted}</strong> &rarr;{" "}
                          <strong>{endFormatted}</strong>
                        </span>
                        <span>Requested: {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>

                      {req.note && (
                        <p className="text-xs text-stone-500 italic mt-2 bg-stone-50 p-2 rounded-md border border-stone-100">
                          &quot;{req.note}&quot;
                        </p>
                      )}
                    </div>

                    {req.status === "pending" && (
                      <div className="sm:self-center shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(req._id)}
                          isLoading={cancellingId === req._id}
                        >
                          Cancel Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
