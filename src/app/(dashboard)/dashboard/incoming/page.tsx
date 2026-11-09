"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type IncomingStatusFilter = "pending" | "All" | "approved" | "declined";

export default function IncomingRequestsPage() {
  const incomingRequests = useQuery(api.borrowRequests.getIncomingRequests);
  const activeLoans = useQuery(api.loans.getMyActiveLoans);

  const approveMutation = useMutation(api.borrowRequests.approve);
  const declineMutation = useMutation(api.borrowRequests.decline);
  const returnMutation = useMutation(api.loans.markReturned);

  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active loans where the caller is the lender
  const myLentItems = (activeLoans ?? []).filter((l) => l.isCallerLender);

  const handleApprove = async (requestId: string, toolTitle: string) => {
    setProcessingId(requestId);
    setActionMessage(null);

    try {
      await approveMutation({ requestId: requestId as unknown as string });
      setActionMessage({
        type: "success",
        text: `Successfully approved loan for "${toolTitle}". The item is now tracked in your Active Loans.`,
      });
    } catch (err: unknown) {
      console.error("Failed to approve request:", err);
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to approve request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string, toolTitle: string) => {
    if (!confirm(`Decline borrowing request for "${toolTitle}"?`)) {
      return;
    }

    setProcessingId(requestId);
    setActionMessage(null);

    try {
      await declineMutation({ requestId: requestId as unknown as string });
      setActionMessage({
        type: "success",
        text: `Declined borrow request for "${toolTitle}".`,
      });
    } catch (err: unknown) {
      console.error("Failed to decline request:", err);
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to decline request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkReturned = async (loanId: string, toolTitle: string) => {
    if (!confirm(`Confirm return of "${toolTitle}"? This will mark the equipment as available again.`)) {
      return;
    }

    setProcessingId(loanId);
    setActionMessage(null);

    try {
      await returnMutation({ loanId: loanId as unknown as string });
      setActionMessage({
        type: "success",
        text: `"${toolTitle}" marked as returned! It is now available in the community catalog.`,
      });
    } catch (err: unknown) {
      console.error("Failed to return loan:", err);
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to mark item returned.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = (incomingRequests ?? []).filter((req) => {
    if (statusFilter === "All") return true;
    return req.status === statusFilter;
  });

  const pendingCount = (incomingRequests ?? []).filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Incoming Loan Requests
          </h1>
          {pendingCount > 0 && (
            <Badge variant="accent">{pendingCount} Pending</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Review reservation requests from neighbors and manage equipment currently on loan.
        </p>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`rounded-xl border p-4 text-sm flex items-center justify-between ${
            actionMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Loans Section (Lent Out) */}
      {myLentItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900">Your Equipment Currently on Loan</h2>
            <Badge variant="borrowed">{myLentItems.length} On Loan</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myLentItems.map((loan) => {
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
                      <Badge variant={isOverdue ? "danger" : "borrowed"}>
                        {isOverdue ? "Overdue" : "Active Loan"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{loan.toolTitle}</CardTitle>
                    <CardDescription>
                      Borrowed by <strong className="text-stone-800">{loan.borrowerName}</strong>
                      {loan.borrowerEmail ? ` (${loan.borrowerEmail})` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 flex items-center justify-between mb-4">
                      <span>Lent On: {new Date(loan.startDate).toLocaleDateString()}</span>
                      <span className={isOverdue ? "font-bold text-red-700" : ""}>
                        Due Back: {new Date(loan.dueDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleMarkReturned(loan._id, loan.toolTitle)}
                        isLoading={processingId === loan._id}
                      >
                        Mark as Returned
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Incoming Requests Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-stone-900">Neighbor Reservation Requests</h2>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {(["pending", "All", "approved", "declined"] as IncomingStatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                  statusFilter === status
                    ? "bg-emerald-900 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {status === "pending" ? `Pending (${pendingCount})` : status}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeleton */}
        {incomingRequests === undefined ? (
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
        ) : incomingRequests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-xl mb-3">
                📬
              </div>
              <h3 className="text-base font-semibold text-stone-900">No requests yet</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-6">
                When neighbors want to borrow one of your listed tools, their requests will appear
                here for approval.
              </p>
              <Link href="/dashboard/listings">
                <Button size="sm">Manage My Listings</Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-stone-500">
                No incoming requests matching &quot;{statusFilter}&quot;.
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
                                : "neutral"
                          }
                        >
                          {req.status === "pending"
                            ? "Awaiting Your Approval"
                            : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-stone-900">{req.toolTitle}</h3>

                      <p className="text-xs text-stone-600">
                        Requested by: <strong>{req.requesterName}</strong>
                        {req.requesterEmail ? ` (${req.requesterEmail})` : ""}
                      </p>

                      <div className="text-xs text-stone-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span>
                          Requested Dates: <strong>{startFormatted}</strong> &rarr;{" "}
                          <strong>{endFormatted}</strong>
                        </span>
                        <span>Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>

                      {req.note && (
                        <p className="text-xs text-stone-500 italic mt-2 bg-stone-50 p-2 rounded-md border border-stone-100">
                          &quot;{req.note}&quot;
                        </p>
                      )}
                    </div>

                    {req.status === "pending" && (
                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req._id, req.toolTitle)}
                          isLoading={processingId === req._id}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecline(req._id, req.toolTitle)}
                          disabled={processingId === req._id}
                        >
                          Decline
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
