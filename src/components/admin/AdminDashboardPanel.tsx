"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTimeAgo } from "@/lib/date";

type AdminTab = "members" | "listings" | "loans";

export function AdminDashboardPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("members");
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Queries
  const users = useQuery(api.users.listUsers);
  const tools = useQuery(api.tools.adminListAllTools);
  const loans = useQuery(
    api.loans.getAllLoans,
    loanStatusFilter === "all" ? {} : { statusFilter: loanStatusFilter }
  );

  // Mutations
  const setTrustedLenderMutation = useMutation(api.users.setTrustedLender);
  const setRoleMutation = useMutation(api.users.setRole);
  const removeToolMutation = useMutation(api.tools.adminRemoveTool);
  const returnLoanMutation = useMutation(api.loans.markReturned);

  // Stats
  const totalUsers = users?.length ?? 0;
  const trustedLendersCount = users?.filter((u) => u.isTrustedLender).length ?? 0;
  const totalTools = tools?.length ?? 0;
  const activeLoansCount = loans?.filter((l) => l.status === "active").length ?? 0;

  // Handlers
  const handleToggleTrusted = async (userId: string, currentStatus: boolean, userName: string) => {
    setProcessingId(userId);
    setFeedback(null);
    try {
      await setTrustedLenderMutation({
        targetUserId: userId as Id<"users">,
        isTrustedLender: !currentStatus,
      });
      setFeedback({
        type: "success",
        text: `Updated "${userName}": Trusted Lender status is now ${!currentStatus ? "ENABLED" : "REVOKED"}.`,
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update Trusted Lender status.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: "user" | "admin", userName: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (
      !confirm(
        `Are you sure you want to change ${userName}'s role from "${currentRole}" to "${newRole}"?`
      )
    ) {
      return;
    }

    setProcessingId(userId);
    setFeedback(null);
    try {
      await setRoleMutation({
        targetUserId: userId as Id<"users">,
        newRole,
      });
      setFeedback({
        type: "success",
        text: `Updated role for "${userName}" to ${newRole.toUpperCase()}.`,
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change user role.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdminRemoveTool = async (toolId: string, toolTitle: string) => {
    const reason = prompt(`Reason for moderating/removing "${toolTitle}":`, "Violates community guidelines");
    if (reason === null) return; // user cancelled

    setProcessingId(toolId);
    setFeedback(null);
    try {
      await removeToolMutation({
        toolId: toolId as Id<"tools">,
        reason: reason.trim() || undefined,
      });
      setFeedback({
        type: "success",
        text: `Listing "${toolTitle}" removed by administrator.`,
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove listing.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAdminMarkReturned = async (loanId: string, toolTitle: string) => {
    if (!confirm(`Mark loan for "${toolTitle}" as returned? This will restore the tool's availability.`)) {
      return;
    }

    setProcessingId(loanId);
    setFeedback(null);
    try {
      await returnLoanMutation({
        loanId: loanId as Id<"loans">,
      });
      setFeedback({
        type: "success",
        text: `Loan for "${toolTitle}" marked as returned! Tool is now available.`,
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to mark loan as returned.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Total Members
          </span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{totalUsers}</p>
          <p className="text-xs text-stone-500 mt-0.5">Registered neighbors</p>
        </Card>

        <Card className="p-4 bg-white border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Trusted Lenders
          </span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{trustedLendersCount}</p>
          <p className="text-xs text-stone-500 mt-0.5">Community-endorsed</p>
        </Card>

        <Card className="p-4 bg-white border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Total Listings
          </span>
          <p className="text-2xl font-bold text-stone-900 mt-1">{totalTools}</p>
          <p className="text-xs text-stone-500 mt-0.5">Shared equipment items</p>
        </Card>

        <Card className="p-4 bg-white border-stone-200">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Active Loans
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{activeLoansCount}</p>
          <p className="text-xs text-stone-500 mt-0.5">Currently with borrowers</p>
        </Card>
      </div>

      {/* Action Notification Alert */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "members"
              ? "border-emerald-800 text-emerald-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Members & Trusted Lenders ({totalUsers})
        </button>

        <button
          onClick={() => setActiveTab("listings")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "listings"
              ? "border-emerald-800 text-emerald-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Listings Moderation ({totalTools})
        </button>

        <button
          onClick={() => setActiveTab("loans")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "loans"
              ? "border-emerald-800 text-emerald-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Global Loans Oversight ({loans?.length ?? 0})
        </button>
      </div>

      {/* Tab 1: Community Members & Trusted Lenders */}
      {activeTab === "members" && (
        <Card>
          <CardHeader>
            <CardTitle>Community Members Management</CardTitle>
            <CardDescription>
              Grant or revoke Trusted Lender status and manage administrative privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users === undefined ? (
              <p className="text-sm text-stone-500 py-4">Loading member directory...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-stone-500 py-4">No registered users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs text-stone-500 uppercase tracking-wider bg-stone-50">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Trusted Lender</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 font-semibold text-stone-900">
                          {user.name}
                        </td>
                        <td className="py-3 px-4 text-stone-600">{user.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant={user.role === "admin" ? "accent" : "neutral"}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {user.isTrustedLender ? (
                            <Badge variant="available">⭐ Trusted Lender</Badge>
                          ) : (
                            <span className="text-xs text-stone-400">Standard</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleTrusted(user._id, user.isTrustedLender, user.name)
                            }
                            isLoading={processingId === user._id}
                          >
                            {user.isTrustedLender ? "Revoke Trusted" : "Make Trusted"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleRole(user._id, user.role, user.name)
                            }
                            disabled={processingId === user._id}
                          >
                            {user.role === "admin" ? "Demote" : "Make Admin"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Equipment Listings Moderation */}
      {activeTab === "listings" && (
        <Card>
          <CardHeader>
            <CardTitle>Community Listings Moderation</CardTitle>
            <CardDescription>
              Review all community equipment. Administrators can remove inappropriate or abandoned listings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tools === undefined ? (
              <p className="text-sm text-stone-500 py-4">Loading equipment listings...</p>
            ) : tools.length === 0 ? (
              <p className="text-sm text-stone-500 py-4">No equipment listings found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs text-stone-500 uppercase tracking-wider bg-stone-50">
                    <tr>
                      <th className="py-3 px-4">Tool</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {tools.map((tool) => (
                      <tr key={tool._id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-stone-900">{tool.title}</p>
                          <p className="text-xs text-stone-500 line-clamp-1">
                            {tool.description}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-stone-600">{tool.category}</td>
                        <td className="py-3 px-4">
                          <p className="text-stone-900 font-medium">{tool.ownerName}</p>
                          <p className="text-xs text-stone-400">{tool.ownerEmail}</p>
                          {tool.isOwnerTrusted && (
                            <span className="text-[10px] text-emerald-800 font-bold block mt-0.5">
                              ⭐ Trusted
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              tool.status === "available"
                                ? "available"
                                : tool.status === "borrowed"
                                  ? "borrowed"
                                  : "neutral"
                            }
                          >
                            {tool.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-stone-600">{tool.condition}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleAdminRemoveTool(tool._id, tool.title)}
                            isLoading={processingId === tool._id}
                          >
                            Remove Listing
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Global Loans Oversight */}
      {activeTab === "loans" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>Global Loans Oversight</CardTitle>
                <CardDescription>
                  Monitor all active, overdue, and returned borrowing transactions.
                </CardDescription>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {["all", "active", "overdue", "returned"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setLoanStatusFilter(st)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer capitalize ${
                      loanStatusFilter === st
                        ? "bg-emerald-900 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loans === undefined ? (
              <p className="text-sm text-stone-500 py-4">Loading loans...</p>
            ) : loans.length === 0 ? (
              <p className="text-sm text-stone-500 py-4">No loans match the current filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs text-stone-500 uppercase tracking-wider bg-stone-50">
                    <tr>
                      <th className="py-3 px-4">Equipment</th>
                      <th className="py-3 px-4">Borrower</th>
                      <th className="py-3 px-4">Lender</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loans.map((loan) => {
                      const isOverdue = loan.isOverdue || loan.computedStatus === "overdue";
                      return (
                        <tr key={loan._id} className="hover:bg-stone-50/50">
                          <td className="py-3 px-4 font-semibold text-stone-900">
                            {loan.toolTitle}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-stone-900">{loan.borrowerName}</p>
                            <p className="text-xs text-stone-400">{loan.borrowerEmail}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-stone-900">{loan.lenderName}</p>
                            <p className="text-xs text-stone-400">{loan.lenderEmail}</p>
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                loan.status === "returned"
                                  ? "neutral"
                                  : isOverdue
                                    ? "danger"
                                    : "borrowed"
                              }
                            >
                              {isOverdue ? "Overdue" : loan.status}
                            </Badge>
                            {loan.lastReminderSentAt && (
                              <p className="text-[10px] text-amber-700 mt-1 font-medium">
                                🔔 Reminder sent {formatTimeAgo(loan.lastReminderSentAt)}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {loan.status !== "returned" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleAdminMarkReturned(loan._id, loan.toolTitle)
                                }
                                isLoading={processingId === loan._id}
                              >
                                Mark Returned
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
